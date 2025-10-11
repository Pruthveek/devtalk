const express = require("express");
const { userAuth } = require("../middlewares/auth");
const razorpay = require("../utils/razorpay");
const Payment = require("../models/payment");
const { membershipAmounts } = require("../utils/constants");
const paymentRouter = express.Router();
const User = require("../models/user");
const {
  validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");

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

// paymentRouter.post("/payment/webhook", async (req, res) => {
//   console.log("Webhook Body", req.body);
//   try {
//     console.log("Webhook Called");
//     const webhookSignature = req.get("x-razorpay-signature");
//     console.log("Webhook Signature", webhookSignature);

//     const isWebhookValid = validateWebhookSignature(
//       JSON.stringify(req.body),
//       webhookSignature,
//       process.env.RAZORPAY_WEBHOOK_SECRET
//     );

//     if (!isWebhookValid) {
//       console.log("Invalid Webhook Signature");
//       return res.status(400).json({ msg: "Webhook signature is invalid" });
//     }
//     console.log("Valid Webhook Signature");

//     // Udpate my payment Status in DB
//     const paymentDetails = req.body.payload.payment.entity;

//     const payment = await Payment.findOne({ orderId: paymentDetails.order_id });
//     if (!payment) {
//       console.error("Payment not found in DB");
//       return res.status(404).json({ message: "Payment not found" });
//     }
//     payment.status = paymentDetails.status;
//     await payment.save();
//     console.log("Payment saved");

//     const user = await User.findOne({ _id: payment.userId });
//     user.isPremium = true;
//     user.membershipType = paymentDetails.notes?.membershipType || "basic";
//     console.log("User saved");

//     await user.save();
//     res.sendStatus(200);
//   } catch (err) {
//     res
//       .status(500)
//       .json({ message: "Invalid webhook signature", error: err.message });
//   }
// });


paymentRouter.post("/payment/webhook", async (req, res) => {
  // The raw body is needed for signature validation, which we get from the middleware
  const body = req.body;
  const webhookSignature = req.get("x-razorpay-signature");

  if (!webhookSignature) {
    console.error("Webhook signature missing from header");
    return res.status(400).json({ msg: "Webhook signature is missing" });
  }

  // 1. Validate the webhook signature first
  try {
    const isWebhookValid = validateWebhookSignature(
      body, // Use the raw body, NOT JSON.stringify(req.body)
      webhookSignature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );

    if (!isWebhookValid) {
      console.warn("Invalid Webhook Signature received.");
      return res.status(400).json({ msg: "Webhook signature is invalid" });
    }
  } catch (err) {
    console.error("Error during webhook signature validation:", err);
    return res.status(500).json({ msg: "Error validating webhook signature" });
  }

  // 2. Process the event payload after successful validation
  const { event, payload } = req.body;

  // We only care about the 'payment.captured' event
  if (event !== 'payment.captured') {
    console.log(`Ignoring webhook event: ${event}`);
    return res.status(200).json({ msg: "Event ignored" });
  }

  const paymentDetails = payload.payment.entity;
  const orderId = paymentDetails.order_id;

  // 3. Use a database transaction to ensure data consistency
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the corresponding payment record in your DB
    const payment = await Payment.findOne({ orderId: orderId }).session(session);

    if (!payment) {
      console.error(`Payment not found in DB for orderId: ${orderId}`);
      // Still send 200, as the webhook is valid but we can't process it.
      // A 404 might cause Razorpay to retry unnecessarily.
      return res.status(200).json({ message: "Payment not found, webhook acknowledged." });
    }
    
    // Idempotency Check: If already processed, just send success.
    if (payment.status === 'captured') {
      console.log(`Payment for orderId: ${orderId} has already been processed.`);
      await session.abortTransaction();
      session.endSession();
      return res.status(200).json({ msg: "Already processed" });
    }

    // Update payment status
    payment.status = paymentDetails.status; // 'captured'
    payment.razorpayPaymentId = paymentDetails.id;
    await payment.save({ session });

    // Update the user to grant premium access
    const user = await User.findById(payment.userId).session(session);
    if (user) {
      user.isPremium = true;
      user.membershipType = paymentDetails.notes?.membershipType || "basic";
      await user.save({ session });
    } else {
      // If user is not found, we must abort the transaction
      throw new Error(`User not found for userId: ${payment.userId}`);
    }

    // If all DB operations are successful, commit the transaction
    await session.commitTransaction();
    console.log(`Successfully processed payment for orderId: ${orderId}`);

    res.status(200).json({ msg: "Webhook processed successfully" });

  } catch (err) {
    // If any error occurs during the process, abort the transaction
    await session.abortTransaction();
    console.error("Error processing webhook:", err.message);
    // Send a 500 error to indicate a server-side problem
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  } finally {
    // Always end the session
    session.endSession();
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
