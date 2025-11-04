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
    images: {
      type: [String],
      validate: {
        validator: function (arr) {
          return !arr || arr.length <= 5;
        },
        message: "Tối đa 5 ảnh cho mỗi đánh giá",
      },
    },
    isVerifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true }
);
ReviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

// Helper function để cập nhật rating cho product
async function updateProductRating(productId) {
  const Review = mongoose.model("Review");
  const Product = mongoose.model("Product");

  const results = await Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: "$productId",
        ratingCount: { $sum: 1 },
        ratingAvg: { $avg: "$rating" },
      },
    },
  ]);

  const ratingCount = results.length ? results[0].ratingCount : 0;
  const ratingAvg = results.length ? results[0].ratingAvg : 0;

  await Product.findByIdAndUpdate(productId, {
    ratingAvg: parseFloat((ratingAvg || 0).toFixed(2)),
    ratingCount,
  });
}

// Post-save hook: cập nhật rating khi tạo hoặc cập nhật review (save)
ReviewSchema.post("save", async function () {
  await updateProductRating(this.productId);
});

// Post-update hook: cập nhật rating khi update bằng findOneAndUpdate
ReviewSchema.post("findOneAndUpdate", async function (doc) {
  if (doc && doc.productId) {
    await updateProductRating(doc.productId);
  }
});

// Post-delete hooks: cập nhật rating khi xóa review bằng findOneAndDelete/Remove
ReviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc && doc.productId) {
    await updateProductRating(doc.productId);
  }
});
ReviewSchema.post("findOneAndRemove", async function (doc) {
  if (doc && doc.productId) {
    await updateProductRating(doc.productId);
  }
});

module.exports = mongoose.model("Review", ReviewSchema);
