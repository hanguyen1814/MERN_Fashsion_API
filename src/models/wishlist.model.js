// src/models/wishlist.model.js
const mongoose = require('mongoose');
const WishlistSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, index: true },
  productIds:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
}, { timestamps: true });
module.exports = mongoose.model('Wishlist', WishlistSchema);
