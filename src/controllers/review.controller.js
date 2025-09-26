const Review = require("../models/review.model");
const Order = require("../models/order.model");
const asyncHandler = require("../utils/asyncHandler");
const { ok, created, fail } = require("../utils/apiResponse");

class ReviewController {
  /**
   * Lấy danh sách đánh giá theo sản phẩm
   */
  static listByProduct = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const reviews = await Review.find({ productId }).sort({ createdAt: -1 });

    return ok(res, reviews);
  });

  /**
   * Tạo đánh giá mới
   */
  static create = asyncHandler(async (req, res) => {
    const { productId, rating, content } = req.body;
    const userId = req.user.id;

    // Validation
    if (!productId || !rating) {
      return fail(res, 400, "Thiếu productId/rating");
    }

    // Kiểm tra user đã mua sản phẩm chưa (để xác minh đánh giá)
    const purchased = await Order.findOne({
      userId,
      status: "completed",
      "items.productId": productId,
    });
    const isVerified = !!purchased;

    try {
      const review = await Review.create({
        userId,
        productId,
        rating,
        content,
        isVerifiedPurchase: isVerified,
      });

      return created(res, review);
    } catch (error) {
      // Xử lý duplicate key error (mỗi user chỉ đánh giá 1 lần/sản phẩm)
      if (error.code === 11000) {
        return fail(res, 409, "Mỗi sản phẩm chỉ được đánh giá 1 lần");
      }
      throw error;
    }
  });
}

module.exports = ReviewController;
