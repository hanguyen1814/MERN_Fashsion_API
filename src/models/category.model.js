// src/models/category.model.js
const mongoose = require('mongoose');
const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: String,
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  image: String,
  status: { type: String, enum: ['active','inactive'], default: 'active' }
}, { timestamps: true });
module.exports = mongoose.model('Category', CategorySchema);
