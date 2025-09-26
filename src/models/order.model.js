// src/models/order.model.js
const mongoose = require('mongoose');
const OrderItemSchema = new mongoose.Schema({
  productId: mongoose.Schema.Types.ObjectId,
  sku: String,
  name: String,
  price: Number,
  quantity: Number,
  image: String
}, { _id: false });

const TimelineSchema = new mongoose.Schema({
  status: { type: String, enum: ['pending','paid','processing','shipped','completed','cancelled','refunded'], required: true },
  at: { type: Date, default: Date.now },
  note: String
}, { _id: false });

const AddressSnapshotSchema = new mongoose.Schema({
  fullName: String, phone: String, street: String, ward: String, district: String, province: String
}, { _id: false });

const PaymentInfoSchema = new mongoose.Schema({
  method: { type: String, enum: ['cod','card','bank','ewallet','qr'], required: true },
  provider: String,            // VNPay/MoMo/ZaloPay...
  transactionId: String,
  status: { type: String, enum: ['pending','authorized','paid','failed','refunded'], default: 'pending' },
  raw: mongoose.Schema.Types.Mixed
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  items: [OrderItemSchema],
  shippingAddress: AddressSnapshotSchema,
  shippingMethod: { type: String, enum: ['standard','express','same_day'], default: 'standard' },
  couponCode: String,
  subtotal: Number,
  discount: Number,
  shippingFee: Number,
  total: Number,
  status: { type: String, enum: ['pending','paid','processing','shipped','completed','cancelled','refunded'], default: 'pending', index: true },
  timeline: [TimelineSchema],
  payment: PaymentInfoSchema
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
