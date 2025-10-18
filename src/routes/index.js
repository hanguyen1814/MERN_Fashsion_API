const router = require("express").Router();
const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use("/auth", require("./auth.route"));
router.use("/users", require("./user.route"));
router.use("/brands", require("./brand.route"));
router.use("/categories", require("./category.route"));
router.use("/products", require("./product.route"));
router.use("/cart", require("./cart.route"));
router.use("/orders", require("./order.route"));
router.use("/payments", require("./payment.route"));
router.use("/reviews", require("./review.route"));
router.use("/wishlist", require("./wishlist.route"));
router.use("/csp", require("./csp.route"));

module.exports = router;
