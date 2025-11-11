const Review = require("../models/review.model");
const Order = require("../models/order.model");
const asyncHandler = require("../utils/asyncHandler");
const { ok, created, fail } = require("../utils/apiResponse");
const { sanitizePlainText } = require("../utils/sanitize");
const {
  validateStrictImageType,
  validateFileSize,
} = require("../middlewares/upload");
const logger = require("../config/logger");

class ReviewController {
  /**
   * Helper: Populate user info cho review
   */
  static populateUserInfo(review) {
    if (!review) return review;
    const reviewObj = review.toObject ? review.toObject() : review;
    if (reviewObj.userId && typeof reviewObj.userId === "object") {
      reviewObj.user = {
        _id: reviewObj.userId._id,
        fullName: reviewObj.userId.fullName,
        avatarUrl: reviewObj.userId.avatarUrl,
        role: reviewObj.userId.role,
        email: reviewObj.userId.email,
      };
      delete reviewObj.userId;
    }
    return reviewObj;
  }

  /**
   * Helper: Tổ chức reviews thành dạng cây với replies
   */
  static async buildReviewTree(reviews) {
    if (!Array.isArray(reviews)) return reviews;

    // Lấy tất cả replies của các reviews này
    const reviewIds = reviews.map((r) => r._id);
    const replies = await Review.find({
      parentId: { $in: reviewIds },
    })
      .populate("userId", "fullName avatarUrl role email")
      .sort({ createdAt: 1 })
      .lean();

    // Tạo map replies theo parentId
    const repliesMap = {};
    replies.forEach((reply) => {
      const parentIdStr = reply.parentId?.toString() || reply.parentId;
      if (!repliesMap[parentIdStr]) {
        repliesMap[parentIdStr] = [];
      }
      repliesMap[parentIdStr].push(this.populateUserInfo(reply));
    });

    // Gắn replies vào từng review
    return reviews.map((review) => {
      const reviewObj = this.populateUserInfo(review);
      reviewObj.replies = repliesMap[review._id.toString()] || [];
      return reviewObj;
    });
  }
  /**
   * Lấy danh sách đánh giá theo sản phẩm (chỉ reviews gốc, có kèm replies)
   */
  static listByProduct = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const sortField = req.query.sort || "-createdAt";

    // Chỉ lấy reviews gốc (không phải replies)
    const filter = { productId, parentId: null };

    const [items, total] = await Promise.all([
      Review.find(filter)
        .populate("userId", "fullName avatarUrl role email")
        .sort(sortField)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    // Tổ chức thành dạng cây với replies
    const itemsWithReplies = await this.buildReviewTree(items);

    return ok(res, {
      items: itemsWithReplies,
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
      // Validate và xử lý file upload với bảo mật
      let finalImages = Array.isArray(images) ? images.slice(0, 5) : [];
      if (Array.isArray(req.files) && req.files.length) {
        // Validate từng file trước khi upload
        const validFiles = [];
        const maxFileSize = 5 * 1024 * 1024; // 5MB per file
        const maxFiles = 5;

        for (const file of req.files.slice(0, maxFiles)) {
          // Kiểm tra file type
          if (!validateStrictImageType(file.mimetype)) {
            logger.warn(
              `Invalid file type for review upload: ${file.mimetype}`,
              { userId, productId, fileName: file.originalname }
            );
            continue;
          }

          // Kiểm tra file size
          if (!validateFileSize(file.size, 5)) {
            logger.warn(
              `File too large for review upload: ${file.size} bytes`,
              { userId, productId, fileName: file.originalname }
            );
            continue;
          }

          validFiles.push(file);
        }

        if (validFiles.length > 0) {
          const UploadService = require("../services/upload.service");
          const { FOLDERS, TRANSFORMATIONS } = require("../config/cloudinary");
          const uploadResult = await UploadService.uploadMultipleFiles(
            validFiles,
            FOLDERS.reviews,
            {
              transformation: TRANSFORMATIONS.gallery,
              tags: ["review", `userId-${userId}`, `productId-${productId}`],
            }
          );
          if (uploadResult && uploadResult.success) {
            const uploadedUrls = uploadResult.data.successful
              .map((x) => x.url)
              .filter(Boolean);
            finalImages = [...uploadedUrls, ...finalImages].slice(0, 5);
          }
        }
      }

      const review = await Review.create({
        userId,
        productId,
        rating,
        content: sanitizePlainText(content, 1000),
        images: finalImages.length ? finalImages : undefined,
        isVerifiedPurchase: isVerified,
        parentId: null, // Đảm bảo là review gốc
      });

      // Populate user info
      await review.populate("userId", "fullName avatarUrl role email");
      const reviewObj = this.populateUserInfo(review);
      reviewObj.replies = []; // Review mới chưa có replies

      return created(res, reviewObj);
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

    // Validate và xử lý file upload với bảo mật
    let finalImages = Array.isArray(images) ? images.slice(0, 5) : undefined;
    if (Array.isArray(req.files) && req.files.length) {
      // Validate từng file trước khi upload
      const validFiles = [];
      const maxFileSize = 5 * 1024 * 1024; // 5MB per file
      const maxFiles = 5;

      for (const file of req.files.slice(0, maxFiles)) {
        // Kiểm tra file type
        if (!validateStrictImageType(file.mimetype)) {
          logger.warn(`Invalid file type for review update: ${file.mimetype}`, {
            userId,
            reviewId: id,
            fileName: file.originalname,
          });
          continue;
        }

        // Kiểm tra file size
        if (!validateFileSize(file.size, 5)) {
          logger.warn(`File too large for review update: ${file.size} bytes`, {
            userId,
            reviewId: id,
            fileName: file.originalname,
          });
          continue;
        }

        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        const UploadService = require("../services/upload.service");
        const { FOLDERS, TRANSFORMATIONS } = require("../config/cloudinary");
        const uploadResult = await UploadService.uploadMultipleFiles(
          validFiles,
          FOLDERS.reviews,
          {
            transformation: TRANSFORMATIONS.gallery,
            tags: ["review", `userId-${userId}`, `reviewId-${id}`],
          }
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
    }

    // Build update object
    const updateData = {
      content: sanitizePlainText(content, 1000),
      images: finalImages,
    };

    // Chỉ update rating nếu là review gốc và có rating trong request
    if (!review.parentId && rating !== undefined) {
      updateData.rating = rating;
    }

    const updated = await Review.findOneAndUpdate(
      { _id: id },
      { $set: updateData },
      { new: true }
    )
      .populate("userId", "fullName avatarUrl role email")
      .lean();

    // Nếu là review gốc, lấy replies
    let reviewObj = this.populateUserInfo(updated);
    if (!updated.parentId) {
      const replies = await Review.find({ parentId: id })
        .populate("userId", "fullName avatarUrl role email")
        .sort({ createdAt: 1 })
        .lean();
      reviewObj.replies = replies.map((r) => this.populateUserInfo(r));
    } else {
      reviewObj.replies = [];
    }

    return ok(res, reviewObj);
  });

  /**
   * Xóa đánh giá (chỉ chủ sở hữu hoặc staff/admin)
   * Nếu xóa review gốc, sẽ xóa luôn tất cả replies
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

    const productId = review.productId;
    const isParentReview = !review.parentId;

    // Nếu là review gốc, xóa cả replies (hook deleteMany sẽ tự động cập nhật rating)
    if (isParentReview) {
      await Review.deleteMany({ parentId: id });
    }

    const deleted = await Review.findOneAndDelete({ _id: id });

    // Đảm bảo rating được cập nhật (hook findOneAndDelete sẽ tự động xử lý, nhưng gọi thêm để chắc chắn)
    if (isParentReview && productId) {
      await Review.updateProductRating(productId);
    }

    return ok(res, deleted);
  });

  /**
   * Trả lời một review (admin hoặc user thường)
   * Chỉ được reply vào review gốc, không được reply vào reply
   */
  static reply = asyncHandler(async (req, res) => {
    const { id } = req.params; // ID của review cha
    const { content } = req.body;
    const { id: userId, role } = req.user;

    if (!content || !content.trim()) {
      return fail(res, 400, "Nội dung reply không được để trống");
    }

    // Tìm review cha
    const parentReview = await Review.findById(id);
    if (!parentReview) {
      return fail(res, 404, "Review không tồn tại");
    }

    // Chỉ cho phép reply vào review gốc (không phải reply)
    if (parentReview.parentId) {
      return fail(
        res,
        400,
        "Chỉ được phép reply vào review gốc, không được reply vào reply"
      );
    }

    // Xác định có phải admin reply không
    const isAdminReply = role === "admin" || role === "staff";

    // Tạo reply
    const reply = await Review.create({
      userId,
      productId: parentReview.productId,
      parentId: id,
      content: sanitizePlainText(content, 1000),
      isAdminReply,
      // Reply không có rating và images
    });

    // Populate user info
    await reply.populate("userId", "fullName avatarUrl role email");
    const replyObj = this.populateUserInfo(reply);

    return created(res, replyObj);
  });

  /**
   * Admin: Lấy danh sách tất cả reviews để quản lý
   */
  static listAdmin = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "20", 20);
    const sortField = req.query.sort || "-createdAt";
    const { productId, userId, isAdminReply, hasReplies } = req.query;

    // Build filter
    const filter = {};
    if (productId) filter.productId = productId;
    if (userId) filter.userId = userId;
    if (isAdminReply !== undefined) {
      filter.isAdminReply = isAdminReply === "true";
    }
    if (hasReplies === "true") {
      // Chỉ lấy reviews có replies (chỉ reviews gốc)
      const reviewsWithReplies = await Review.distinct("parentId", {
        parentId: { $ne: null },
      });
      filter._id = { $in: reviewsWithReplies };
      filter.parentId = null; // Chỉ reviews gốc
    } else if (hasReplies === "false") {
      // Chỉ lấy reviews không có replies (chỉ reviews gốc)
      const reviewsWithReplies = await Review.distinct("parentId", {
        parentId: { $ne: null },
      });
      if (reviewsWithReplies.length > 0) {
        filter._id = { $nin: reviewsWithReplies };
      }
      filter.parentId = null; // Chỉ reviews gốc
    }

    const [items, total] = await Promise.all([
      Review.find(filter)
        .populate("userId", "fullName avatarUrl role email")
        .populate("productId", "name slug")
        .populate({
          path: "parentId",
          select: "content userId",
          populate: {
            path: "userId",
            select: "fullName avatarUrl role email",
          },
        })
        .sort(sortField)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    // Format items
    const formattedItems = items.map((item) => {
      const itemObj = this.populateUserInfo(item);
      if (item.parentId && typeof item.parentId === "object") {
        itemObj.parent = {
          _id: item.parentId._id,
          content: item.parentId.content,
        };
        // Format parent user nếu có
        if (item.parentId.userId && typeof item.parentId.userId === "object") {
          itemObj.parent.user = {
            _id: item.parentId.userId._id,
            fullName: item.parentId.userId.fullName,
            avatarUrl: item.parentId.userId.avatarUrl,
            role: item.parentId.userId.role,
            email: item.parentId.userId.email,
          };
        }
      }
      if (item.productId && typeof item.productId === "object") {
        itemObj.product = {
          _id: item.productId._id,
          name: item.productId.name,
          slug: item.productId.slug,
        };
      }
      return itemObj;
    });

    return ok(res, {
      items: formattedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  /**
   * Admin: Xóa review (có thể xóa bất kỳ review nào)
   */
  static removeAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) return fail(res, 404, "Đánh giá không tồn tại");

    const productId = review.productId;
    const isParentReview = !review.parentId;

    // Nếu là review gốc, xóa cả replies (hook deleteMany sẽ tự động cập nhật rating)
    if (isParentReview) {
      await Review.deleteMany({ parentId: id });
    }

    const deleted = await Review.findOneAndDelete({ _id: id });

    // Đảm bảo rating được cập nhật (hook findOneAndDelete sẽ tự động xử lý, nhưng gọi thêm để chắc chắn)
    if (isParentReview && productId) {
      await Review.updateProductRating(productId);
    }

    return ok(res, deleted);
  });

  /**
   * Tổng hợp thống kê rating theo sản phẩm (chỉ tính reviews gốc)
   */
  static summaryByProduct = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    const pipeline = [
      {
        $match: {
          productId: require("mongoose").Types.ObjectId(productId),
          parentId: null, // Chỉ tính reviews gốc
          rating: { $exists: true, $ne: null },
        },
      },
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
