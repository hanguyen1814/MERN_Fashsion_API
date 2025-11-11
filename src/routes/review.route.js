const router = require("express").Router();
const ReviewController = require("../controllers/review.controller");
const auth = require("../middlewares/auth");
const {
  reviewValidation,
  paginationValidation,
} = require("../middlewares/validation");
const { uploadMultiple, handleMulterError } = require("../middlewares/upload");
const { requireAdmin } = require("../middlewares/rbac");
const rateLimit = require("express-rate-limit");

// Rate limiter riêng cho review write actions
const reviewWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // tối đa 20 hành động ghi trong 15 phút
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.get(
  "/product/:productId",
  reviewValidation.productIdParam,
  paginationValidation.query,
  ReviewController.listByProduct
);
router.get(
  "/product/:productId/summary",
  reviewValidation.productIdParam,
  ReviewController.summaryByProduct
);

// Admin routes - đặt trước routes có params để tránh conflict
router.get(
  "/admin",
  auth(),
  requireAdmin,
  paginationValidation.query,
  ReviewController.listAdmin
);
router.delete(
  "/admin/:id",
  auth(),
  requireAdmin,
  reviewValidation.reviewIdParam,
  ReviewController.removeAdmin
);

// User routes
router.post(
  "/",
  auth(),
  reviewWriteLimiter,
  uploadMultiple("images", 5),
  handleMulterError,
  reviewValidation.create,
  ReviewController.create
);

// Reply endpoint - cho phép admin và user thường reply (đặt trước /:id)
router.post(
  "/:id/reply",
  auth(),
  reviewWriteLimiter,
  reviewValidation.reviewIdParam,
  reviewValidation.reply,
  ReviewController.reply
);

router.put(
  "/:id",
  auth(),
  reviewWriteLimiter,
  uploadMultiple("images", 5),
  handleMulterError,
  reviewValidation.reviewIdParam,
  reviewValidation.update,
  ReviewController.update
);
router.delete(
  "/:id",
  auth(),
  reviewWriteLimiter,
  reviewValidation.reviewIdParam,
  ReviewController.remove
);

module.exports = router;
