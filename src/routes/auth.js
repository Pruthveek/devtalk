const express = require("express");
const authRouter = express.Router();
const { validateSigninData } = require("../utils/validation");
const bcrypt = require("bcrypt");
const validator = require("validator");
const User = require("../models/user");

authRouter.post("/signin", async (req, res) => {
  try {
    validateSigninData(req);
    const { firstName, lastName, email, password } = req.body;
    const isEmailExist = await User.findOne({ email });
    if (isEmailExist) {
      return res.status(400).json({ error: "Email already exists", message: "Please signup with other email" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      firstName,
      lastName,
      email,
      password: passwordHash,
    });
    const savedUser = await user.save();
    const token = await savedUser.getJWT();
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    res.json({ success: true, message: "Sign-up successful", data: savedUser });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!validator.isEmail(email)) {
      throw new Error("Invalid credentials");
    }
    const user = await User.findOne({ email: email });
    if (!user) {
      throw new Error("Invalid credentials");
    }
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    } else {
      const token = await user.getJWT();
      res.cookie("token", token, {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production",
        expires: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      });
      res.send(user);
    }
  } catch (err) {
    res.status(400).json({ message: "Something went wrong", error: err.message });
  }
});

authRouter.post("/logout", async (req, res) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  }).send("User logged out");
});

module.exports = authRouter;
