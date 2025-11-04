const Review = require("../models/review.model");
const Order = require("../models/order.model");
const asyncHandler = require("../utils/asyncHandler");
const { ok, created, fail } = require("../utils/apiResponse");
const { sanitizePlainText } = require("../utils/sanitize");

class ReviewController {
  /**
   * Lấy danh sách đánh giá theo sản phẩm
   */
  static listByProduct = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const sortField = req.query.sort || "-createdAt"; // default: newest

    const filter = { productId };

    const [items, total] = await Promise.all([
      Review.find(filter)
        .sort(sortField)
        .skip((page - 1) * limit)
        .limit(limit),
      Review.countDocuments(filter),
    ]);

    return ok(res, {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  /**
   * Tạo đánh giá mới
   */
  static create = asyncHandler(async (req, res) => {
    const { productId, rating, content, images } = req.body;
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
      // Tổng hợp danh sách ảnh: ưu tiên ảnh upload qua multipart, nếu không thì dùng URLs từ body
      let finalImages = Array.isArray(images) ? images.slice(0, 5) : [];
      if (Array.isArray(req.files) && req.files.length) {
        const UploadService = require("../services/upload.service");
        const { FOLDERS, TRANSFORMATIONS } = require("../config/cloudinary");
        const uploadResult = await UploadService.uploadMultipleFiles(
          req.files.slice(0, 5),
          FOLDERS.reviews,
          { transformation: TRANSFORMATIONS.gallery, tags: ["review"] }
        );
        if (uploadResult && uploadResult.success) {
          const uploadedUrls = uploadResult.data.successful
            .map((x) => x.url)
            .filter(Boolean);
          finalImages = [...uploadedUrls, ...finalImages].slice(0, 5);
        }
      }

      const review = await Review.create({
        userId,
        productId,
        rating,
        content: sanitizePlainText(content, 1000),
        images: finalImages.length ? finalImages : undefined,
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

  /**
   * Cập nhật đánh giá (chỉ chủ sở hữu hoặc staff/admin)
   */
  static update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rating, content, images } = req.body;
    const { id: userId, role } = req.user;

    const review = await Review.findById(id);
    if (!review) return fail(res, 404, "Đánh giá không tồn tại");

    const isOwner = review.userId.toString() === userId.toString();
    const isStaffOrAdmin = ["staff", "admin"].includes(role);
    if (!isOwner && !isStaffOrAdmin) {
      return fail(res, 403, "Không có quyền cập nhật đánh giá này");
    }

    // Kết hợp ảnh upload mới (nếu có) với ảnh URLs từ body
    let finalImages = Array.isArray(images) ? images.slice(0, 5) : undefined;
    if (Array.isArray(req.files) && req.files.length) {
      const UploadService = require("../services/upload.service");
      const { FOLDERS, TRANSFORMATIONS } = require("../config/cloudinary");
      const uploadResult = await UploadService.uploadMultipleFiles(
        req.files.slice(0, 5),
        FOLDERS.reviews,
        { transformation: TRANSFORMATIONS.gallery, tags: ["review"] }
      );
      if (uploadResult && uploadResult.success) {
        const uploadedUrls = uploadResult.data.successful
          .map((x) => x.url)
          .filter(Boolean);
        finalImages = Array.isArray(finalImages)
          ? [...uploadedUrls, ...finalImages].slice(0, 5)
          : uploadedUrls.slice(0, 5);
      }
    }

    const updated = await Review.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          rating,
          content: sanitizePlainText(content, 1000),
          images: finalImages,
        },
      },
      { new: true }
    );

    return ok(res, updated);
  });

  /**
   * Xóa đánh giá (chỉ chủ sở hữu hoặc staff/admin)
   */
  static remove = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const review = await Review.findById(id);
    if (!review) return fail(res, 404, "Đánh giá không tồn tại");

    const isOwner = review.userId.toString() === userId.toString();
    const isStaffOrAdmin = ["staff", "admin"].includes(role);
    if (!isOwner && !isStaffOrAdmin) {
      return fail(res, 403, "Không có quyền xóa đánh giá này");
    }

    const deleted = await Review.findOneAndDelete({ _id: id });
    return ok(res, deleted);
  });

  /**
   * Tổng hợp thống kê rating theo sản phẩm
   */
  static summaryByProduct = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    const pipeline = [
      { $match: { productId: require("mongoose").Types.ObjectId(productId) } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
    ];

    const buckets = await Review.aggregate(pipeline);
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let ratingCount = 0;
    let total = 0;
    for (const b of buckets) {
      distribution[b._id] = b.count;
      ratingCount += b.count;
      total += b._id * b.count;
    }
    const ratingAvg = ratingCount
      ? parseFloat((total / ratingCount).toFixed(2))
      : 0;

    return ok(res, { ratingAvg, ratingCount, distribution });
  });
}

module.exports = ReviewController;
