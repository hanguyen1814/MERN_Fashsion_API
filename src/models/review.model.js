// src/models/review.model.js
const mongoose = require("mongoose");
const ReviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      index: true,
    },
    rating: { type: Number, min: 1, max: 5, required: true },
    content: String,
    images: [String],
    isVerifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true }
);
ReviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

// Helper function để cập nhật rating cho product
async function updateProductRating(productId) {
  const Review = mongoose.model("Review");
  const Product = mongoose.model("Product");

  const reviews = await Review.find({ productId });
  const ratingCount = reviews.length;
  const ratingAvg =
    ratingCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount
      : 0;

  await Product.findByIdAndUpdate(productId, {
    ratingAvg: parseFloat(ratingAvg.toFixed(2)),
    ratingCount,
  });
}

// Post-save hook: cập nhật rating khi tạo hoặc cập nhật review
ReviewSchema.post("save", async function () {
  await updateProductRating(this.productId);
});

// Post-remove hook: cập nhật rating khi xóa review
ReviewSchema.post(
  ["deleteOne", "findOneAndDelete", "findOneAndRemove"],
  async function () {
    if (this.productId) {
      await updateProductRating(this.productId);
    }
  }
);

module.exports = mongoose.model("Review", ReviewSchema);
