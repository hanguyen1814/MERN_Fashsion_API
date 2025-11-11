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
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
      index: true,
      default: null,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: function () {
        return !this.parentId; // Chỉ required khi không phải reply
      },
    },
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
    isAdminReply: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Unique index chỉ áp dụng cho reviews gốc (không phải reply)
// Sử dụng partial index: chỉ index các document có parentId là null
ReviewSchema.index(
  { userId: 1, productId: 1 },
  {
    unique: true,
    partialFilterExpression: { parentId: null },
  }
);

// Index để tìm replies của một review
ReviewSchema.index({ parentId: 1, createdAt: 1 });

// Helper function để cập nhật rating cho product
// Chỉ tính rating từ reviews gốc (không tính replies)
async function updateProductRating(productId) {
  if (!productId) return;

  const Review = mongoose.model("Review");
  const Product = mongoose.model("Product");

  try {
    const results = await Review.aggregate([
      {
        $match: {
          productId: new mongoose.Types.ObjectId(productId),
          parentId: null, // Chỉ tính reviews gốc
          rating: { $exists: true, $ne: null }, // Đảm bảo có rating
        },
      },
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

    await Product.findByIdAndUpdate(
      productId,
      {
        ratingAvg: parseFloat((ratingAvg || 0).toFixed(2)),
        ratingCount,
      },
      { runValidators: false }
    );
  } catch (error) {
    console.error(`Error updating product rating for ${productId}:`, error);
  }
}

// Export function để có thể gọi từ controller
ReviewSchema.statics.updateProductRating = updateProductRating;

// Post-save hook: cập nhật rating khi tạo hoặc cập nhật review (save)
// Chỉ cập nhật khi là review gốc (không phải reply)
ReviewSchema.post("save", async function () {
  if (!this.parentId && this.productId) {
    await updateProductRating(this.productId);
  }
});

// Post-update hook: cập nhật rating khi update bằng findOneAndUpdate
// Chỉ cập nhật khi là review gốc (không phải reply)
ReviewSchema.post("findOneAndUpdate", async function (doc) {
  if (doc && doc.productId && !doc.parentId) {
    await updateProductRating(doc.productId);
  }
});

// Post-delete hooks: cập nhật rating khi xóa review bằng findOneAndDelete/Remove
// Chỉ cập nhật khi là review gốc (không phải reply)
ReviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc && doc.productId && !doc.parentId) {
    await updateProductRating(doc.productId);
  }
});
ReviewSchema.post("findOneAndRemove", async function (doc) {
  if (doc && doc.productId && !doc.parentId) {
    await updateProductRating(doc.productId);
  }
});

// Pre-deleteMany hook: lưu productIds trước khi xóa để cập nhật rating sau
// Lưu ý: deleteMany hook không có doc, nên cần lấy productIds từ query trước khi xóa
ReviewSchema.pre("deleteMany", async function () {
  const Review = mongoose.model("Review");
  const filter = this.getQuery();

  // Lưu productIds vào context để dùng trong post hook
  this._productIdsToUpdate = new Set();

  // Nếu có productId trong filter, thêm vào set
  if (filter.productId) {
    this._productIdsToUpdate.add(filter.productId.toString());
  }
  // Nếu xóa theo parentId, cần tìm productId của reviews bị xóa
  else if (filter.parentId) {
    // Lấy productId từ reviews bị xóa (trước khi xóa)
    const reviewsToDelete = await Review.find(filter)
      .select("productId parentId")
      .lean();
    reviewsToDelete.forEach((review) => {
      if (!review.parentId && review.productId) {
        this._productIdsToUpdate.add(review.productId.toString());
      }
    });
  }
  // Nếu xóa theo _id (mảng), cần tìm productIds
  else if (filter._id && filter._id.$in) {
    const reviewsToDelete = await Review.find({ _id: { $in: filter._id.$in } })
      .select("productId parentId")
      .lean();
    reviewsToDelete.forEach((review) => {
      if (!review.parentId && review.productId) {
        this._productIdsToUpdate.add(review.productId.toString());
      }
    });
  }
});

// Post-deleteMany hook: cập nhật rating sau khi xóa
ReviewSchema.post("deleteMany", async function () {
  if (this._productIdsToUpdate && this._productIdsToUpdate.size > 0) {
    for (const productId of this._productIdsToUpdate) {
      await updateProductRating(productId);
    }
  }
});

module.exports = mongoose.model("Review", ReviewSchema);
