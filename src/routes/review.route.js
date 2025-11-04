const router = require("express").Router();
const ReviewController = require("../controllers/review.controller");
const auth = require("../middlewares/auth");
const {
  reviewValidation,
  paginationValidation,
} = require("../middlewares/validation");
const { uploadMultiple, handleMulterError } = require("../middlewares/upload");
const rateLimit = require("express-rate-limit");

// Rate limiter riêng cho review write actions
const reviewWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // tối đa 20 hành động ghi trong 15 phút
  standardHeaders: true,
  legacyHeaders: false,
});

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
router.post(
  "/",
  auth(),
  reviewWriteLimiter,
  uploadMultiple("images", 5),
  handleMulterError,
  reviewValidation.create,
  ReviewController.create
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
