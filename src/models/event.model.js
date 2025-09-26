// (AI) src/models/event.model.js
const mongoose = require('mongoose');
const EventSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  sessionId: String,
  type: { type: String, enum: ['view','add_to_cart','remove_from_cart','purchase','search','click'], index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  keyword:   String,
  metadata:  mongoose.Schema.Types.Mixed,
  at:        { type: Date, default: Date.now, index: true }
}, { timestamps: true });
EventSchema.index({ userId: 1, at: -1 });
module.exports = mongoose.model('Event', EventSchema);
