const validator = require("validator");

const validateSigninData = (req) => {
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName) {
    throw new Error("Please enter name");
  } else if (!validator.isEmail(email)) {
    throw new Error("Please chack your email something wrong in it.");
  } else if (!validator.isStrongPassword(password)) {
    throw new Error(
      "password should contain atleast one number and one special character, Please add more strong password"
    );
  }
};

module.exports = {
  validateSigninData,
};
