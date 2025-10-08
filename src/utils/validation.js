const validator = require("validator");

const validateSigninData = (req) => {
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName) {
    throw new Error("Please enter name");
  } else if (!validator.isEmail(email)) {
    throw new Error("Please chack your email something wrong in it.");
  } else if (!validator.isStrongPassword(password)) {
    throw new Error(
      "Please add more strong password."
    );
  }
};

const validateEditProfileData = (req) => {
  const allowedEditFilds = [
    "firstName",
    "lastName",
    "photoUrl",
    "about",
    "skills",
    "age",
    "gender",
  ];
  if (req.body.skills.length > 10) {
    throw new Error("Skills cannot be more than 10");
  } else if (!["male", "female", "others"].includes(req.body.gender)) {
    throw new Error("Gender is not proper");
  }
  const isEditAllowed = Object.keys(req.body).every((field) =>
    allowedEditFilds.includes(field)
  );
  return isEditAllowed;
};

const vlaidateNewPassword=(req)=>{
  const {password}=req.body;
  if (!validator.isStrongPassword(password)) {
    throw new Error(
      "Please add more strong password."
    );
  }
}
module.exports = {
  validateSigninData,
  validateEditProfileData,
  vlaidateNewPassword
};
