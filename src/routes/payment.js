const express = require("express");
const paymentRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const razorpayInstance = require("../utils/razorpay");
const Payment = require("../models/payment");
const { membershipAmounts } = require("../utils/constants");

const User = require("../models/user");
const {
  validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");

paymentRouter.post("/payment/create", userAuth, async (req, res) => {
  try {
    const { _id, firstName, lastName, email } = req.user;
    const { membershipType } = req.body;
    const order = await razorpayInstance.orders.create({
      amount: membershipAmounts[membershipType] * 100,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      partial_payment: false,
      notes: {
        firstName: firstName,
        lastName: lastName,
        email: email,
        membershipType: membershipType,
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
    console.error("Razorpay create order error:", err);
    res
      .status(500)
      .json({ message: "Failed to create order", error: err.message });
  }
});

paymentRouter.post("/payment/webhook", async (req, res) => {
  try {
    console.log("Webhook Called");
    const signature = req.headers["x-razorpay-signature"];

    // req.body may be Buffer when express.raw middleware is used for this route
    const rawBody =
      Buffer.isBuffer(req.body) ? req.body.toString("utf8") : typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    // Debug: log rawBody (keep short or remove in production)
    console.log("rawBody length:", rawBody.length);
    // Debug HMAC computation to compare with incoming signature
    const crypto = require("crypto");
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
    console.log("Incoming signature:", signature);
    console.log("Computed signature:", expected);

    const isWebhookValid = validateWebhookSignature(
      rawBody,
      signature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );

    console.log("Is Webhook Valid", isWebhookValid);
    if (!isWebhookValid) {
      console.log("Invalid Webhook Signature");
      return res.status(400).json({ msg: "Webhook signature is invalid" });
    }
    console.log("Valid Webhook Signature");

    // parse from the raw body (safe) and proceed
    const payload = JSON.parse(rawBody);
    const paymentDetails = payload.payload.payment.entity;

    const payment = await Payment.findOne({ orderId: paymentDetails.order_id });
    if (!payment) {
      console.error("Payment not found in DB");
      return res.status(404).json({ message: "Payment not found" });
    }
    payment.status = paymentDetails.status;
    await payment.save();
    console.log("Payment saved");

    const user = await User.findOne({ _id: payment.userId });
    user.isPremium = true;
    user.membershipType = paymentDetails.notes?.membershipType || "basic";
    console.log("User saved");

    await user.save();

    return res.status(200).json({ msg: "Webhook received successfully" });
  } catch (err) {
    console.error("Webhook handling error:", err);
    res
      .status(500)
      .json({ message: "Invalid webhook signature", error: err.message });
  }
});

paymentRouter.get("/premium/verify", userAuth, async (req, res) => {
  const user = req.user.toJSON();
  console.log(user);
  if (user.isPremium) {
    return res.json({ ...user });
  }
  return res.json({ ...user });
});
module.exports = paymentRouter;
