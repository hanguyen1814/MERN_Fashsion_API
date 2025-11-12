// src/models/user.model.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const AddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    street: { type: String, required: true, trim: true },
    ward: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    province: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true, timestamps: false }
);

const UserSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["customer", "admin", "staff"],
      default: "customer",
    },
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    phone: { type: String, unique: true, sparse: true, index: true },
    passwordHash: {
      type: String,
      default: "",
    },
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
      enum: ["active", "inactive", "banned", "pending"],
      default: "pending",
    },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    lastLogin: Date,
    refreshToken: String,
    failedLoginAttempts: { type: Number, default: 0 },
    lastFailedLogin: Date,
    isLocked: { type: Boolean, default: false },
    lockUntil: Date,
  },
  { timestamps: true }
);

// Thêm method để so sánh password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash || typeof this.passwordHash !== "string") {
    return false;
  }
  if (typeof candidatePassword !== "string") {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Thêm method để lấy thông tin public
UserSchema.methods.toPublicJSON = function () {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  delete userObject.refreshToken;
  return userObject;
};

// Validate passwordHash cho local users
UserSchema.pre("validate", function (next) {
  if (this.provider === "local" && !this.passwordHash) {
    this.invalidate("passwordHash", "Password is required for local users");
  }
  // OAuth users (google, facebook) tự động verified và active
  if (this.provider !== "local" && this.isNew) {
    this.emailVerified = true;
    this.status = "active";
  }
  next();
});

// Thêm index cho tìm kiếm (loại bỏ duplicate indexes)
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ provider: 1, providerId: 1 }); // Index cho OAuth lookup

module.exports = mongoose.model("User", UserSchema);
