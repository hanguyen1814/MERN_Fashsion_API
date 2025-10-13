// src/models/user.model.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const AddressSchema = new mongoose.Schema(
  {
    fullName: String,
    phone: String,
    street: String,
    ward: String,
    district: String,
    province: String,
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["customer", "admin", "staff"],
      default: "customer",
    },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, unique: true, sparse: true },
    passwordHash: { type: String, required: true },
    addresses: [AddressSchema],
    avatarUrl: String,
    provider: {
      type: String,
      enum: ["local", "google", "facebook"],
      default: "local",
    },
    providerId: String,
    loyaltyPoints: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "inactive", "banned"],
      default: "active",
    },
    lastLogin: Date,
    refreshToken: String,
  },
  { timestamps: true }
);

// Thêm method để so sánh password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Thêm method để lấy thông tin public
UserSchema.methods.toPublicJSON = function () {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  delete userObject.refreshToken;
  return userObject;
};

// Thêm index cho tìm kiếm
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ createdAt: -1 });

module.exports = mongoose.model("User", UserSchema);
