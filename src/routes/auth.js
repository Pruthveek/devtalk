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
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      firstName,
      lastName,
      email,
      password: passwordHash,
    });
    const savedUser = await user.save();
    const token = await user.getJWT();

    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    };

    res.cookie("token", token, cookieOptions);

    res.json({ message: "Sign-up sucessfully", data: savedUser });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Something went wrong", error: err.message });
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
      // create a jwt token
      const token = await user.getJWT();

      const cookieOptions = {
        expires: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production",
      };

      res.cookie("token", token, cookieOptions);
      res.send(user);
    }
  } catch (err) {
    res
      .status(400)
      .json({ message: "Something went wrong", error: err.message });
  }
});

authRouter.post("/logout", async (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
  };
  res.cookie("token", "", cookieOptions).send("User logged out");
});

module.exports = authRouter;
