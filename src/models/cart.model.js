// src/models/cart.model.js
const mongoose = require('mongoose');
const CartItemSchema = new mongoose.Schema({
  productId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sku:        { type: String, required: true },
  name:       String,        // snapshot để show
  price:      Number,        // snapshot
  quantity:   { type: Number, default: 1, min: 1 },
  image:      String
}, { _id: false });

const CartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, index: true },
  items: [CartItemSchema],
  couponCode: String,
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  shippingFee: { type: Number, default: 0 },
  total: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Cart', CartSchema);
