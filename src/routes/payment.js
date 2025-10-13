const express = require("express");
const paymentRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const razorpayInstance = require("../utils/razorpay");
const Payment = require("../models/payment");
const { membershipAmounts,membershipDurations } = require("../utils/constants");
const User = require("../models/user");
const { validateWebhookSignature } = require("razorpay/dist/utils/razorpay-utils");
const crypto = require("crypto");

paymentRouter.post("/payment/create", userAuth, async (req, res) => {
  try {
    const { _id, firstName, lastName, email, isPremium } = req.user;
    const { membershipType } = req.body;
    if (isPremium) {
      return res.status(400).json({ message: "User is already a premium member" });
    }
    if (!membershipType || !membershipAmounts[membershipType]) {
      return res.status(400).json({ message: "Invalid or missing membership type" });
    }
    const order = await razorpayInstance.orders.create({
      amount: membershipAmounts[membershipType] * 100,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      partial_payment: false,
      notes: {
        firstName,
        lastName,
        email,
        membershipType,
      },
    });
    const payment = new Payment({
      userId: _id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      method: "credit_card",
      status: order.status,
      notes: order.notes,
    });
    const savedPayment = await payment.save();
    res.status(201).json({
      message: "Order created",
      keyId: process.env.RAZORPAY_KEY_ID,
      data: { ...savedPayment.toJSON() },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to create order", error: err.message });
  }
});

paymentRouter.post("/payment/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody =
      Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body);
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");
    const isWebhookValid = validateWebhookSignature(
      rawBody,
      signature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );
    if (!isWebhookValid) {
      return res.status(400).json({ msg: "Webhook signature is invalid" });
    }
    const payload = JSON.parse(rawBody);
    const paymentDetails = payload.payload.payment.entity;
    const payment = await Payment.findOne({ orderId: paymentDetails.order_id });
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    payment.status = paymentDetails.status;
    await payment.save();
    const user = await User.findOne({ _id: payment.userId });
    user.isPremium = true;
    user.membershipType = paymentDetails.notes?.membershipType || "basic";
    const currentDate = new Date();
    const validityDays = membershipDurations[user.membershipType] || 0;
    user.membershipValidity = new Date(currentDate.setDate(currentDate.getDate() + validityDays));
    await user.save();
    return res.status(200).json({ msg: "Webhook received successfully" });
  } catch (err) {
    res.status(500).json({ message: "Invalid webhook signature", error: err.message });
  }
});

paymentRouter.get("/premium/verify", userAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const now = new Date();
    if (user.isPremium && user.membershipValidity && user.membershipValidity < now) {
      user.isPremium = false;
      user.membershipType = "basic";
      await user.save();
    }
    return res.json({ ...user.toJSON() });
  } catch (err) {
    res.status(500).json({ message: "Failed to verify premium", error: err.message });
  }
});

module.exports = paymentRouter;
