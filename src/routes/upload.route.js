const express = require("express");
const router = express.Router();
const {
  uploadSingleImage,
  uploadMultipleImages,
  uploadProductImages,
  deleteImage,
  deleteMultipleImages,
  getImageInfo,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  listImages,
} = require("../controllers/upload.controller");

const {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleMulterError,
} = require("../middlewares/upload");

const authenticate = require("../middlewares/auth");
const { rbac } = require("../middlewares/rbac");

// Middleware xử lý lỗi multer
router.use(handleMulterError);

/**
 * @route   POST /api/upload/single
 * @desc    Upload single image
 * @access  Private (Admin, Staff)
 */
router.post(
  "/single",
  authenticate(),
  rbac(["admin", "staff"]),
  uploadSingle("image"),
  uploadSingleImage
);

/**
 * @route   POST /api/upload/multiple
 * @desc    Upload multiple images
 * @access  Private (Admin, Staff)
 */
router.post(
  "/multiple",
  authenticate(),
  rbac(["admin", "staff"]),
  uploadMultiple("images", 10),
  uploadMultipleImages
);

/**
 * @route   POST /api/upload/product
 * @desc    Upload product images with specific fields
 * @access  Private (Admin, Staff)
 */
router.post(
  "/product",
  authenticate(),
  rbac(["admin", "staff"]),
  uploadFields([
    { name: "mainImage", maxCount: 1 },
    { name: "galleryImages", maxCount: 9 },
    { name: "thumbnailImage", maxCount: 1 },
  ]),
  uploadProductImages
);

/**
 * @route   DELETE /api/upload/:key
 * @desc    Delete single image
 * @access  Private (Admin, Staff)
 */
router.delete("/:key", authenticate(), rbac(["admin", "staff"]), deleteImage);

/**
 * @route   DELETE /api/upload/multiple
 * @desc    Delete multiple images
 * @access  Private (Admin, Staff)
 */
router.delete(
  "/multiple",
  authenticate(),
  rbac(["admin", "staff"]),
  deleteMultipleImages
);

/**
 * @route   GET /api/upload/info/:key
 * @desc    Get image information
 * @access  Private (Admin, Staff)
 */
router.get(
  "/info/:key",
  authenticate(),
  rbac(["admin", "staff"]),
  getImageInfo
);

/**
 * @route   POST /api/upload/presigned-upload
 * @desc    Generate presigned upload URL
 * @access  Private (Admin, Staff)
 */
router.post(
  "/presigned-upload",
  authenticate(),
  rbac(["admin", "staff"]),
  generatePresignedUploadUrl
);

/**
 * @route   POST /api/upload/presigned-download
 * @desc    Generate presigned download URL
 * @access  Private (Admin, Staff)
 */
router.post(
  "/presigned-download",
  authenticate(),
  rbac(["admin", "staff"]),
  generatePresignedDownloadUrl
);

/**
 * @route   GET /api/upload/list
 * @desc    List images in folder
 * @access  Private (Admin, Staff)
 */
router.get("/list", authenticate(), rbac(["admin", "staff"]), listImages);

module.exports = router;
