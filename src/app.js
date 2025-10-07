const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();

const connectDB = require("./config/database");
require("dotenv").config();
require("./utils/cronjob");

const PORT = process.env.PORT || 7777;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// parse cookies so req.cookies is available
app.use(cookieParser());

// allow cross-origin requests with credentials (adjust origin for your frontend)
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Routers
app.use("/auth", require("./routes/auth"));
app.use("/profile", require("./routes/profile"));
app.use("/request", require("./routes/request"));
app.use("/user", require("./routes/user"));
app.use("/payment", require("./routes/payment"));

// Optional health check route
app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is healthy" });
});

// Start server
connectDB()
  .then(() => {
    console.log("Database connection established...");
    app.listen(PORT, () => {
      console.log("Server is listening successfully on port number " + PORT);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
  });
