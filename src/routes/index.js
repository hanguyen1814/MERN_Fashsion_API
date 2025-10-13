const router = require("express").Router();

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

module.exports = router;
