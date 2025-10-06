const express = require("express");
const { userAuth } = require("../middlewares/auth");
const razorpay = require("../utils/razorpay");
const Payment = require("../models/payment");
const { membershipAmounts } = require("../utils/constants");
const paymentRouter = express.Router();

paymentRouter.post("/payment/create", userAuth, async (req, res) => {
  try {
    const { _id, firstName, lastName, email } = req.user;
    const { membershipType } = req.body;
    const order = await razorpay.orders.create({
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
    res
      .status(201)
      .json({
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

module.exports = paymentRouter;
