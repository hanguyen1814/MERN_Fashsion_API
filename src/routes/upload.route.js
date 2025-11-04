const express = require("express");
const router = express.Router();
const {
  uploadSingleImage,
  uploadMultipleImages,
  uploadProductImages,
  deleteImage,
  deleteMultipleImages,
  getTransformedUrl,
  generateUploadSignature,
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
  // authenticate(),
  // rbac(["admin", "staff"]),
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
 * @desc    Upload product images with automatic transformations
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
    { name: "variantImages", maxCount: 10 },
  ]),
  uploadProductImages
);

/**
 * @route   DELETE /api/upload/:publicId
 * @desc    Delete single image
 * @access  Private (Admin, Staff)
 */
router.delete(
  "/:publicId",
  authenticate(),
  rbac(["admin", "staff"]),
  deleteImage
);

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
 * @route   GET /api/upload/transform/:publicId
 * @desc    Get transformed URL (resize, crop, etc.)
 * @access  Public
 */
router.get("/transform/:publicId", getTransformedUrl);

/**
 * @route   POST /api/upload/signature
 * @desc    Generate upload signature for client-side upload
 * @access  Private (Admin, Staff)
 */
router.post(
  "/signature",
  authenticate(),
  rbac(["admin", "staff"]),
  generateUploadSignature
);

module.exports = router;
