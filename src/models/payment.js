const mongoose = require("mongoose");
const validator = require("validator");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    amount: {
      type: Number,
      required: true,
      validate(value) {
        if (value <= 0) {
          throw new Error("Amount must be a positive number.");
        }
      },
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      validate(value) {
        const validCurrencies = ["USD", "EUR", "GBP", "INR"];
        if (!validCurrencies.includes(value)) {
          throw new Error(
            "Invalid currency. Supported currencies are USD, EUR, GBP, INR."
          );
        }
      },
    },
    method: {
      type: String,
      required: true,
      enum: ["credit_card", "paypal", "bank_transfer"],
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "created", "failed"],
      default: "pending",
    },
    notes: {
      firstName: { type: String },
      lastName: { type: String },
      email: { type: String, validate: [validator.isEmail, "Invalid email"] },
      membershipType: { type: String, enum: ["silver", "gold"] },
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
