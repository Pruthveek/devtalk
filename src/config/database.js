const mongoose = require("mongoose");

const connectDB = async () => {
  await mongoose.connect(
    "mongodb+srv://pruthmala_db_user:MongoDB%40512@learnnode.4ma1rgb.mongodb.net/devtalk"
  );
};

module.exports = connectDB;
