const mongoose = require("mongoose");
const logger = require("./logger");

const connectDB = async (uri) => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { dbName: "mern_fashion" });
  // Log sẽ được hiển thị trong server startup summary
};

module.exports = connectDB;
