// src/models/review.model.js
const mongoose = require('mongoose');
const ReviewSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true },
  rating:    { type: Number, min: 1, max: 5, required: true },
  content:   String,
  images:    [String],
  isVerifiedPurchase: { type: Boolean, default: false }
}, { timestamps: true });
ReviewSchema.index({ userId: 1, productId: 1 }, { unique: true });
module.exports = mongoose.model('Review', ReviewSchema);
