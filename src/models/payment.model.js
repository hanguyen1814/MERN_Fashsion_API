// src/models/payment.model.js
const mongoose = require('mongoose');
const PaymentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'VND' },
  method: { type: String, enum: ['cod','card','bank','ewallet','qr'], required: true },
  provider: String,
  providerTxnId: String,
  status: { type: String, enum: ['pending','authorized','paid','failed','refunded'], default: 'pending', index: true },
  extra: mongoose.Schema.Types.Mixed
}, { timestamps: true });
module.exports = mongoose.model('Payment', PaymentSchema);
