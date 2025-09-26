// src/models/product.model.js
const mongoose = require('mongoose');
const VariantSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  color: String,
  size: String,
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: Number,
  discount: { type: Number, default: 0 },
  stock: { type: Number, default: 0, min: 0 },
  image: String,
  images: [String],
  attrs: mongoose.Schema.Types.Mixed // material, fit, ... (thay cho models/variant_models)
}, { _id: false });

const ProductSchema = new mongoose.Schema({
  name:   { type: String, required: true },
  slug:   { type: String, required: true, unique: true, lowercase: true },
  description: String,
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  tags: [String],
  variants: { type: [VariantSchema], validate: v => Array.isArray(v) && v.length > 0 },
  status: { type: String, enum: ['draft','active','archived'], default: 'active', index: true },
  ratingAvg:   { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0 },
  salesCount:  { type: Number, default: 0 }
}, { timestamps: true });

ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
module.exports = mongoose.model('Product', ProductSchema);
