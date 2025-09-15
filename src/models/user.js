const mongoos = require("mongoose");
const validator = require("validator");
const url = require("url");
const path = require("path");
const jwt = require("jsonwebtoken");

const userSchema = new mongoos.Schema(
  {
    firstName: {
      type: String,
      require: true,
      // maxLength:30,
      validate(value) {
        if (value.length > 30) {
          throw new Error("The first name must be less then 30 charecters");
        }
      },
    },
    lastName: {
      type: String,
      require: true,
      // maxLength:30,
      validate(value) {
        if (value.length > 30) {
          throw new Error("The first name must be less then 30 charecters.");
        }
      },
    },
    email: {
      type: String,
      require: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate(value) {
        // const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        // const isValidEmail = emailPattern.test(value);
        if (!validator.isEmail(value)) {
          throw new Error("Please chack your email something wrong in it.");
        }
      },
    },
    password: {
      type: String,
      require: true,
      minLength: 8,
      validate(value) {
        // const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
        // const isValidPassword = strongPasswordPattern.test(value);
        if (!validator.isStrongPassword(value)) {
          throw new Error(
            "password should contain atleast one number and one special character, Please add more strong password"
          );
        }
      },
    },
    age: {
      type: Number,
      min: 12,
    },
    gender: {
      type: String,
      enum: ["male", "female", "others"],
      validate(value) {
        if (!["male", "female", "others"].includes(value)) {
          throw new Error("Gender is not proper");
        }
      },
    },
    photoUrl: {
      type: String,
      default: "https://geographyandyou.com/images/user-profile.png",
      validate(value) {
        if (!validator.isURL(value, { protocols: ["http", "https", "ftp"] })) {
          throw new Error("Please add a valid URL");
        }
        const pathname = url.parse(value).pathname || "";
        const ext = path.extname(pathname).toLowerCase();
        const allowedExt = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];

        if (!allowedExt.includes(ext)) {
          throw new Error(
            "URL must point to an image (.jpg, .jpeg, .png, .gif, .webp, .svg)"
          );
        }
      },
    },
    about: {
      type: String,
      default: "This is default about of the user",
    },
    skills: {
      type: [String],
    },
  },
  {
    timestamps: true,
  }
);
userSchema.methods.getJWT = async function () {
  const user = this;
  const token = await jwt.sign({ _id: user._id }, "Pruthveek@123", {
    expiresIn: "1d",
  });
  return token;
};
userSchema.methods.validatePassword=async function(passwordInputByUser){
  const user=this;
  const hashPassword=user.password
  const isPasswordValid = await bcrypt.compare(passwordInputByUser,hashPassword );
  return isPasswordValid;
};

// const User=mongoos.model("User",userSchema);
module.exports = mongoos.model("User", userSchema);