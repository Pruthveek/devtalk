const express = require("express");
const connectDB = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();
require("./utils/cronjob");
const PORT = process.env.PORT || 7777;
const app = express();


const allowedOrigins = [
  process.env.FRONTEND_URL,        
  "http://localhost:5173", 
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// parse normal JSON for most routes
app.use(express.json());

// IMPORTANT: preserve raw body for razorpay webhook route only
// mount this before you register your routes
app.use(
  "/payment/webhook",
  express.raw({ type: "application/json" }) // req.body will be a Buffer for this path
);

app.use(cookieParser());

const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/request");
const userRouter = require("./routes/user");
const paymentRouter = require("./routes/payment");
// register routes after the middleware above
app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);
app.use("/", userRouter);
app.use("/", paymentRouter);

connectDB()
  .then(() => {
    console.log("Database connection established...");
    app.listen(PORT, () => {
      console.log("Server is listing sucessfully");
    });
  })
  .catch((error) => {
    console.log("Database cannot connected.");
  });