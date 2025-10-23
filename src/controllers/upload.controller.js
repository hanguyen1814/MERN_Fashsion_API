const UploadService = require("../services/upload.service");
const asyncHandler = require("../utils/asyncHandler");
const apiResponse = require("../utils/apiResponse");
const path = require("path");
const crypto = require("crypto");

/**
 * Upload single image
 * POST /api/upload/single
 */
const uploadSingleImage = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json(apiResponse.error("Không có file được upload!"));
    }

    const result = await UploadService.uploadFile(req.file, "products", {
      userId: req.user?.id,
      uploadType: "single",
    });

    if (!result.success) {
      return res
        .status(500)
        .json(apiResponse.error("Lỗi khi upload file: " + result.error));
    }

    res
      .status(200)
      .json(apiResponse.success(result.data, "Upload file thành công!"));
  } catch (error) {
    console.error("Upload single image error:", error);
    res.status(500).json(apiResponse.error("Lỗi server khi upload file"));
  }
});

/**
 * Upload multiple images
 * POST /api/upload/multiple
 */
const uploadMultipleImages = asyncHandler(async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json(apiResponse.error("Không có file nào được upload!"));
    }

    const result = await UploadService.uploadMultipleFiles(
      req.files,
      "products",
      {
        userId: req.user?.id,
        uploadType: "multiple",
      }
    );

    if (!result.success) {
      return res
        .status(500)
        .json(apiResponse.error("Lỗi khi upload files: " + result.error));
    }

    res
      .status(200)
      .json(apiResponse.success(result.data, "Upload files thành công!"));
  } catch (error) {
    console.error("Upload multiple images error:", error);
    res.status(500).json(apiResponse.error("Lỗi server khi upload files"));
  }
});

/**
 * Upload product images with specific fields
 * POST /api/upload/product
 */
const uploadProductImages = asyncHandler(async (req, res) => {
  try {
    const { files } = req;

    if (!files || Object.keys(files).length === 0) {
      return res
        .status(400)
        .json(apiResponse.error("Không có file nào được upload!"));
    }

    const uploadResults = {};
    const metadata = {
      userId: req.user?.id,
      uploadType: "product",
      productId: req.body.productId || null,
    };

    // Upload từng loại file
    for (const [fieldName, fileArray] of Object.entries(files)) {
      if (fileArray && fileArray.length > 0) {
        const result = await UploadService.uploadMultipleFiles(
          fileArray,
          `products/${fieldName}`,
          { ...metadata, fieldType: fieldName }
        );

        uploadResults[fieldName] = result.success
          ? result.data
          : { error: result.error };
      }
    }

    res
      .status(200)
      .json(
        apiResponse.success(uploadResults, "Upload product images thành công!")
      );
  } catch (error) {
    console.error("Upload product images error:", error);
    res
      .status(500)
      .json(apiResponse.error("Lỗi server khi upload product images"));
  }
});

/**
 * Delete image
 * DELETE /api/upload/:key
 */
const deleteImage = asyncHandler(async (req, res) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res
        .status(400)
        .json(apiResponse.error("Key của file không được để trống!"));
    }

    const result = await UploadService.deleteFile(key);

    if (!result.success) {
      return res
        .status(500)
        .json(apiResponse.error("Lỗi khi xóa file: " + result.error));
    }

    res.status(200).json(apiResponse.success(null, "Xóa file thành công!"));
  } catch (error) {
    console.error("Delete image error:", error);
    res.status(500).json(apiResponse.error("Lỗi server khi xóa file"));
  }
});

/**
 * Delete multiple images
 * DELETE /api/upload/multiple
 */
const deleteMultipleImages = asyncHandler(async (req, res) => {
  try {
    const { keys } = req.body;

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res
        .status(400)
        .json(apiResponse.error("Danh sách keys không hợp lệ!"));
    }

    const result = await UploadService.deleteMultipleFiles(keys);

    if (!result.success) {
      return res
        .status(500)
        .json(apiResponse.error("Lỗi khi xóa files: " + result.error));
    }

    res
      .status(200)
      .json(apiResponse.success(result.data, "Xóa files thành công!"));
  } catch (error) {
    console.error("Delete multiple images error:", error);
    res.status(500).json(apiResponse.error("Lỗi server khi xóa files"));
  }
});

/**
 * Get image info
 * GET /api/upload/info/:key
 */
const getImageInfo = asyncHandler(async (req, res) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res
        .status(400)
        .json(apiResponse.error("Key của file không được để trống!"));
    }

    const result = await UploadService.getFileInfo(key);

    if (!result.success) {
      return res
        .status(404)
        .json(apiResponse.error("Không tìm thấy file: " + result.error));
    }

    res
      .status(200)
      .json(apiResponse.success(result.data, "Lấy thông tin file thành công!"));
  } catch (error) {
    console.error("Get image info error:", error);
    res
      .status(500)
      .json(apiResponse.error("Lỗi server khi lấy thông tin file"));
  }
});

/**
 * Generate presigned upload URL
 * POST /api/upload/presigned-upload
 */
const generatePresignedUploadUrl = asyncHandler(async (req, res) => {
  try {
    const { fileName, contentType, expiresIn } = req.body;

    if (!fileName || !contentType) {
      return res
        .status(400)
        .json(apiResponse.error("fileName và contentType là bắt buộc!"));
    }

    // Tạo key unique
    const fileExtension = path.extname(fileName);
    const uniqueFileName = `${crypto.randomUUID()}${fileExtension}`;
    const key = `products/${uniqueFileName}`;

    const result = await UploadService.generatePresignedUploadUrl(
      key,
      contentType,
      expiresIn || 300
    );

    if (!result.success) {
      return res
        .status(500)
        .json(apiResponse.error("Lỗi khi tạo presigned URL: " + result.error));
    }

    res
      .status(200)
      .json(
        apiResponse.success(result.data, "Tạo presigned upload URL thành công!")
      );
  } catch (error) {
    console.error("Generate presigned upload URL error:", error);
    res.status(500).json(apiResponse.error("Lỗi server khi tạo presigned URL"));
  }
});

/**
 * Generate presigned download URL
 * POST /api/upload/presigned-download
 */
const generatePresignedDownloadUrl = asyncHandler(async (req, res) => {
  try {
    const { key, expiresIn } = req.body;

    if (!key) {
      return res
        .status(400)
        .json(apiResponse.error("Key của file là bắt buộc!"));
    }

    const result = await UploadService.generatePresignedDownloadUrl(
      key,
      expiresIn || 3600
    );

    if (!result.success) {
      return res
        .status(500)
        .json(
          apiResponse.error(
            "Lỗi khi tạo presigned download URL: " + result.error
          )
        );
    }

    res
      .status(200)
      .json(
        apiResponse.success(
          result.data,
          "Tạo presigned download URL thành công!"
        )
      );
  } catch (error) {
    console.error("Generate presigned download URL error:", error);
    res
      .status(500)
      .json(apiResponse.error("Lỗi server khi tạo presigned download URL"));
  }
});

/**
 * List images in folder
 * GET /api/upload/list
 */
const listImages = asyncHandler(async (req, res) => {
  try {
    const { prefix = "", maxKeys = 100 } = req.query;

    const result = await UploadService.listFiles(prefix, parseInt(maxKeys));

    if (!result.success) {
      return res
        .status(500)
        .json(apiResponse.error("Lỗi khi lấy danh sách file: " + result.error));
    }

    res
      .status(200)
      .json(apiResponse.success(result.data, "Lấy danh sách file thành công!"));
  } catch (error) {
    console.error("List images error:", error);
    res
      .status(500)
      .json(apiResponse.error("Lỗi server khi lấy danh sách file"));
  }
});

module.exports = {
  uploadSingleImage,
  uploadMultipleImages,
  uploadProductImages,
  deleteImage,
  deleteMultipleImages,
  getImageInfo,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  listImages,
};
