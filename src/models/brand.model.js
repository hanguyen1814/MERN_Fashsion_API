// src/models/brand.model.js
const mongoose = require("mongoose");
const BrandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, default: "HNG" },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    logo: String,
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Brand", BrandSchema);
