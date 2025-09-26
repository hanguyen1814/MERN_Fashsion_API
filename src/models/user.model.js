// src/models/user.model.js
const mongoose = require('mongoose');
const AddressSchema = new mongoose.Schema({
  fullName: String, phone: String,
  street: String, ward: String, district: String, province: String,
  isDefault: { type: Boolean, default: false }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  role: { type: String, enum: ['customer','admin','staff'], default: 'customer' },
  fullName: { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  phone:    { type: String, unique: true, sparse: true },
  passwordHash: { type: String, required: true },
  addresses: [AddressSchema],
  avatarUrl: String,
  provider: { type: String, enum: ['local','google','facebook'], default: 'local' },
  providerId: String,
  loyaltyPoints: { type: Number, default: 0 },
  status: { type: String, enum: ['active','inactive','banned'], default: 'active' },
  lastLogin: Date
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
