const mongoos = require("mongoose");

const userSchema = new mongoos.Schema({
  firstName: {
    type: String,
    require: true,
  },
  lastName: {
    type: String,
    require: true,
  },
  email: {
    type: String,
    require: true,
  },
  password: {
    type: String,
    require: true,
  },
  age: {
    type: Number,
    min: 18,
    max: 65,
  },
  gender: {
    type: String,
    enum: ["male", "female", "others"],
    required: true,
  },
});

// const User=mongoos.model("User",userSchema);
module.exports= mongoos.model("User",userSchema);