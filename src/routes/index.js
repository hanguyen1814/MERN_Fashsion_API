const router = require("express").Router();
const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use("/auth", authLimiter, require("./auth.route"));
router.use("/users", require("./user.route"));
router.use("/brands", require("./brand.route"));
router.use("/categories", require("./category.route"));
router.use("/products", require("./product.route"));
router.use("/cart", require("./cart.route"));
router.use("/orders", require("./order.route"));
router.use("/payments", require("./payment.route"));
router.use("/reviews", require("./review.route"));
router.use("/wishlist", require("./wishlist.route"));
router.use("/upload", require("./upload.route"));
router.use("/csp", require("./csp.route"));
router.use("/telegram", require("./telegram.route"));

module.exports = router;
