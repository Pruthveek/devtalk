const express = require("express");
const connectDB = require("./config/database");
const app = express();
const User = require("./models/user");

app.post("/signin",async(req,res)=>{
  const user= new User({
    firstName:"om",
    lastName:"Rangani",
    email:"omr@gmail.com",
    password:"om@#rangani",
    age:27,
    gender:"male"
  })
  try{
    await user.save();
    res.send("user added sucessfully...")
  }catch(err){
    res.status(400).send("Something went wrong : "+err.message)
  }
})

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
