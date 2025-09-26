// (Kho) src/models/inventoryLog.model.js
const mongoose = require('mongoose');
const InventoryLogSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  sku:       { type: String, required: true, index: true },
  quantity:  { type: Number, required: true }, // + nhập, - xuất
  reason:    { type: String, enum: ['purchase','order','return','adjustment'], required: true },
  refId:     String, // orderId/purchaseId...
  note:      String
}, { timestamps: true });
module.exports = mongoose.model('InventoryLog', InventoryLogSchema);
