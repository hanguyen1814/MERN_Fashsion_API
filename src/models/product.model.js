// src/models/product.model.js
const mongoose = require("mongoose");
const VariantSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true },
    color: String,
    size: String,
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: Number,
    discount: { type: Number, default: 0 },
    stock: { type: Number, default: 0, min: 0 },
    image: String, // URL ảnh chính của variant
    images: [String], // Mảng URL ảnh gallery của variant
    imageKey: String, // S3 key của ảnh chính
    imageKeys: [String], // Mảng S3 keys của ảnh gallery
    attrs: mongoose.Schema.Types.Mixed, // material, fit, ... (thay cho models/variant_models)
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: String,
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
    categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    tags: [String],
    image: String, // URL ảnh chính của sản phẩm
    images: [String], // Mảng URL ảnh gallery của sản phẩm
    imageKey: String, // S3 key của ảnh chính
    imageKeys: [String], // Mảng S3 keys của ảnh gallery
    thumbnailImage: String, // URL ảnh thumbnail
    thumbnailImageKey: String, // S3 key của ảnh thumbnail
    variants: {
      type: [VariantSchema],
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "active",
      index: true,
    },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Text search index
ProductSchema.index({ name: "text", description: "text", tags: "text" });

// Compound indexes for better query performance
ProductSchema.index({ status: 1, createdAt: -1 });
ProductSchema.index({ brandId: 1, status: 1 });
ProductSchema.index({ categoryIds: 1, status: 1 });
ProductSchema.index({ "variants.price": 1, status: 1 });
ProductSchema.index({ "variants.color": 1, status: 1 });
ProductSchema.index({ "variants.size": 1, status: 1 });
ProductSchema.index({ ratingAvg: -1, status: 1 });
ProductSchema.index({ salesCount: -1, status: 1 });

// Single field indexes (loại bỏ duplicate indexes)
ProductSchema.index({ brandId: 1 });
ProductSchema.index({ categoryIds: 1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ updatedAt: -1 });

module.exports = mongoose.model("Product", ProductSchema);
