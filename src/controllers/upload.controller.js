const UploadService = require("../services/upload.service");
const asyncHandler = require("../utils/asyncHandler");
const { ok, fail } = require("../utils/apiResponse");
const logger = require("../config/logger");
const { FOLDERS } = require("../config/cloudinary");

/**
 * Upload single image
 * POST /api/upload/single
 */
const uploadSingleImage = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return fail(res, 400, "Không có file được upload!");
    }

    const result = await UploadService.uploadFile(req.file, FOLDERS.products, {
      tags: ["user-upload", `userId-${req.user?.id || "anonymous"}`],
    });

    if (!result.success) {
      return fail(res, 500, "Lỗi khi upload file: " + result.error);
    }

    return ok(res, result.data, { message: "Upload file thành công!" });
  } catch (error) {
    logger.error("Upload single image error:", error);
    return fail(res, 500, "Lỗi server khi upload file");
  }
});

/**
 * Upload multiple images
 * POST /api/upload/multiple
 */
const uploadMultipleImages = asyncHandler(async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return fail(res, 400, "Không có file nào được upload!");
    }

    const result = await UploadService.uploadMultipleFiles(
      req.files,
      FOLDERS.products,
      {
        tags: ["user-upload", `userId-${req.user?.id || "anonymous"}`],
      }
    );

    if (!result.success) {
      return fail(res, 500, "Lỗi khi upload files: " + result.error);
    }

    return ok(res, result.data, { message: "Upload files thành công!" });
  } catch (error) {
    logger.error("Upload multiple images error:", error);
    return fail(res, 500, "Lỗi server khi upload files");
  }
});

/**
 * Upload product images với transformation tự động
 * POST /api/upload/product
 */
const uploadProductImages = asyncHandler(async (req, res) => {
  try {
    const { files } = req;
    const { productId } = req.body;

    if (!files || Object.keys(files).length === 0) {
      return fail(res, 400, "Không có file nào được upload!");
    }

    const uploadResults = {};
    const metadata = {
      userId: req.user?.id,
      uploadType: "product",
      productId: productId || null,
    };

    // Upload từng loại file với transformation phù hợp
    for (const [fieldName, fileArray] of Object.entries(files)) {
      if (fileArray && fileArray.length > 0) {
        const uploadPromises = fileArray.map((file) => {
          let type = "main";
          if (fieldName.includes("thumbnail")) type = "thumbnail";
          else if (fieldName.includes("gallery")) type = "gallery";
          else if (fieldName.includes("variant")) type = "variant";

          return UploadService.uploadProductImage(file, type, productId);
        });

        const results = await Promise.allSettled(uploadPromises);

        const successful = [];
        const failed = [];

        results.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value.success) {
            successful.push(result.value.data);
          } else {
            failed.push({
              fileName: fileArray[index].originalname,
              error:
                result.status === "rejected"
                  ? result.reason.message
                  : result.value.error,
            });
          }
        });

        uploadResults[fieldName] = {
          successful,
          failed,
          total: fileArray.length,
          successCount: successful.length,
          failCount: failed.length,
        };
      }
    }

    return ok(res, uploadResults, {
      message: "Upload product images thành công!",
    });
  } catch (error) {
    logger.error("Upload product images error:", error);
    return fail(res, 500, "Lỗi server khi upload product images");
  }
});

/**
 * Delete image
 * DELETE /api/upload/:publicId
 */
const deleteImage = asyncHandler(async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType = "image" } = req.query;

    if (!publicId) {
      return fail(res, 400, "Public ID của file không được để trống!");
    }

    // Decode publicId nếu được encode trong URL
    const decodedPublicId = decodeURIComponent(publicId);

    const result = await UploadService.deleteFile(
      decodedPublicId,
      resourceType
    );

    if (!result.success) {
      return fail(res, 500, "Lỗi khi xóa file: " + result.error);
    }

    return ok(res, null, { message: "Xóa file thành công!" });
  } catch (error) {
    logger.error("Delete image error:", error);
    return fail(res, 500, "Lỗi server khi xóa file");
  }
});

/**
 * Delete multiple images
 * DELETE /api/upload/multiple
 */
const deleteMultipleImages = asyncHandler(async (req, res) => {
  try {
    const { publicIds } = req.body;
    const { resourceType = "image" } = req.query;

    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      return fail(res, 400, "Danh sách public IDs không hợp lệ!");
    }

    const result = await UploadService.deleteMultipleFiles(
      publicIds,
      resourceType
    );

    if (!result.success) {
      return fail(res, 500, "Lỗi khi xóa files: " + result.error);
    }

    return ok(res, result.data, { message: "Xóa files thành công!" });
  } catch (error) {
    logger.error("Delete multiple images error:", error);
    return fail(res, 500, "Lỗi server khi xóa files");
  }
});

/**
 * Generate transformed URL (không upload, chỉ tạo URL với transformation)
 * GET /api/upload/transform/:publicId
 */
const getTransformedUrl = asyncHandler(async (req, res) => {
  try {
    const { publicId } = req.params;
    const { width, height, crop, quality, format } = req.query;

    if (!publicId) {
      return fail(res, 400, "Public ID của file không được để trống!");
    }

    const transformation = {};
    if (width) transformation.width = parseInt(width);
    if (height) transformation.height = parseInt(height);
    if (crop) transformation.crop = crop;
    if (quality) transformation.quality = quality;
    if (format) transformation.format = format;

    const url = UploadService.getTransformedUrl(
      decodeURIComponent(publicId),
      transformation
    );

    return ok(
      res,
      { url, transformation },
      {
        message: "Tạo transformed URL thành công!",
      }
    );
  } catch (error) {
    logger.error("Get transformed URL error:", error);
    return fail(res, 500, "Lỗi server khi tạo transformed URL");
  }
});

/**
 * Generate upload signature cho client-side upload
 * POST /api/upload/signature
 */
const generateUploadSignature = asyncHandler(async (req, res) => {
  try {
    const {
      folder = FOLDERS.products,
      tags = [],
      resourceType = "image",
    } = req.body;

    const signature = UploadService.generateUploadSignature(folder, {
      tags,
      resourceType,
    });

    return ok(res, signature, {
      message: "Tạo upload signature thành công!",
    });
  } catch (error) {
    logger.error("Generate upload signature error:", error);
    return fail(res, 500, "Lỗi server khi tạo upload signature");
  }
});

/**
 * Upload avatar cho user
 * POST /api/upload/avatar
 * Chỉ cho phép user upload avatar của chính họ
 */
const uploadAvatar = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return fail(res, 400, "Không có file được upload!");
    }

    const userId = req.user?.id;
    if (!userId) {
      return fail(res, 401, "Chưa đăng nhập");
    }

    // Kiểm tra file type nghiêm ngặt
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return fail(
        res,
        400,
        "Chỉ cho phép upload file ảnh định dạng JPG, PNG hoặc WEBP!"
      );
    }

    // Kiểm tra file size (tối đa 5MB cho avatar)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      return fail(res, 400, "File quá lớn! Kích thước tối đa là 5MB.");
    }

    const User = require("../models/user.model");
    const user = await User.findById(userId);
    if (!user) {
      return fail(res, 404, "Không tìm thấy người dùng");
    }

    // Xóa avatar cũ nếu có
    if (user.avatarUrl) {
      try {
        // Extract publicId từ URL Cloudinary
        // Format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.ext
        const urlMatch = user.avatarUrl.match(
          /\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/
        );
        if (urlMatch && urlMatch[1]) {
          const publicId = urlMatch[1];
          await UploadService.deleteFile(publicId);
          logger.info(`Deleted old avatar: ${publicId}`, { userId });
        }
      } catch (error) {
        logger.warn("Không thể xóa avatar cũ:", error);
        // Không throw error, tiếp tục upload avatar mới
      }
    }

    // Upload avatar mới với transformation
    const result = await UploadService.uploadFile(req.file, FOLDERS.avatars, {
      transformation: require("../config/cloudinary").TRANSFORMATIONS.avatar,
      publicId: `avatar_${userId}_${Date.now()}`,
      tags: ["avatar", `userId-${userId}`],
    });

    if (!result.success) {
      return fail(res, 500, "Lỗi khi upload avatar: " + result.error);
    }

    // Cập nhật avatarUrl trong database
    user.avatarUrl = result.data.url;
    await user.save();

    logger.info(`Avatar uploaded for user ${userId}`, {
      userId,
      publicId: result.data.publicId,
    });

    return ok(res, {
      url: result.data.url,
      publicId: result.data.publicId,
      message: "Upload avatar thành công!",
    });
  } catch (error) {
    logger.error("Upload avatar error:", error);
    return fail(res, 500, "Lỗi server khi upload avatar");
  }
});

module.exports = {
  uploadSingleImage,
  uploadMultipleImages,
  uploadProductImages,
  deleteImage,
  deleteMultipleImages,
  getTransformedUrl,
  generateUploadSignature,
  uploadAvatar,
};
