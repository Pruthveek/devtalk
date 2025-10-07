const express = require("express");
const connectDB = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();
require("./utils/cronjob");
const PORT = process.env.PORT || 7777;
const app = express();


const allowedOrigins = [
  "http://localhost:5173", // local dev
  "https://devtalk-frontend-git-main-pruthveeks-projects.vercel.app", // production
];

app.use(cors({
  origin: function(origin, callback) {
    // allow server-to-server requests or curl (no origin)
    if (!origin) return callback(null, true);
    // check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("Blocked CORS origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // important for cookies/auth
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

app.use(express.json());
app.use(cookieParser());

const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/request");
const userRouter = require("./routes/user");
const paymentRouter = require("./routes/payment");
app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);
app.use("/", userRouter);
app.use("/", paymentRouter);

connectDB()
  .then(() => {
    console.log("Database connection established...");
    app.listen(PORT, () => {
      console.log("Server is listing sucessfully on port number " + PORT);
      console.log(`http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.log("Database cannot connected.");
  });