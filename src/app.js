const express = require("express");
const connectDB = require("./config/database");
const app = express();
const User = require("./models/user");
const { validateSigninData } = require("./utils/validation");
const bcrypt = require("bcrypt");
const validator = require("validator");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { userAuth } = require("./middlewares/auth");

app.use(express.json());
app.use(cookieParser());

//POST for signin a user and store user data in database
app.post("/signin", async (req, res) => {
  try {
    // Validation of data
    validateSigninData(req);
    // Extract fields from request body
    const { firstName, lastName, email, password } = req.body;
    // Encrypt the password
    const passwordHash = await bcrypt.hash(password, 10);
    // Creating a new instance of the User model
    const user = new User({
      firstName,
      lastName,
      email,
      password: passwordHash,
    });
    await user.save();
    res.send("user added sucessfully...");
  } catch (err) {
    res.status(400).send("Something went wrong : " + err.message);
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!validator.isEmail(email)) {
      throw new Error("Please chack your email something wrong in it.");
    }
    const user = await User.findOne({ email: email });
    if (!user) {
      throw new Error("Invalid credentials");
    }
    const isPasswordValid = await user.validatePassword(password)
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    } else {
      // create a jwt token
      const token = await user.getJWT();
      // Add the token to cookie and send the response back to the user
      res.cookie("token", token, {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        httpOnly: true,
      });
      res.send("Login sucessfully");
    }
  } catch (err) {
    res.status(400).send("Something went wrong : " + err.message);
  }
});

app.get("/profile", userAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new Error("server not respond");
    }
    res.send(user);
  } catch (err) {
    res.status(400).send("Something went wrong : " + err.message);
  }
});
//GET user data via emailid
app.get("/user", async (req, res) => {
  const email = req.body.email;
  console.log(email);
  try {
    const users = await User.find({ email: email });
    if (users.length === 0) {
      res.status(404).send("No user found");
    } else {
      res.send(users);
    }
  } catch (err) {
    res.status(500).send("Something went wrong");
  }
});

//GET all users data
app.get("/feed", async (req, res) => {
  try {
    const users = await User.find({});
    if (users.length === 0) {
      res.status(404).send("No  user found");
    } else {
      res.send(users);
    }
  } catch (err) {
    res.status(500).send("Something went wrong");
  }
});

//DELETE user data
app.delete("/user", async (req, res) => {
  const userId = req.body.userId;
  try {
    // const user= await User.findByIdAndDelete({ _id: userId })
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      res.status(404).send("No user found");
    } else {
      res.send("User deleted sucessfully");
    }
  } catch (err) {
    res.status(500).send("Something went wrong");
  }
});

//UPDATE user data from database
app.patch("/user/:userId", async (req, res) => {
  const userId = req.params?.userId;
  const data = req.body;
  try {
    const ALLOWED_UPDATES = ["photoUrl", "about", "gender", "age", "skills"];
    const isUpdateAllowed = Object.keys(data).every((k) =>
      ALLOWED_UPDATES.includes(k)
    );
    if (!isUpdateAllowed) {
      throw new Error("Update not allowed");
    }
    if (data?.skills.length > 10) {
      throw new Error("Skills cannot be more than 10");
    }
    const user = await User.findByIdAndUpdate(userId, data, {
      returnDocument: "after",
      runValidators: true,
    });
    if (!user) {
      res.status(404).send("No user found");
    } else {
      res.send(user);
    }
  } catch (err) {
    res.status(500).send("Something went wrong" + err);
  }
});

connectDB()
  .then(() => {
    console.log("Database connection established...");
    app.listen(7777, () => {
      console.log("Server is listing sucessfully on port number 7777");
      console.log("link : http://localhost:7777/");
    });
  })
  .catch((error) => {
    console.log("Database cannot connected.");
  });
