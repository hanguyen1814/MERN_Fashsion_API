const router = require("express").Router();
const ReviewController = require("../controllers/review.controller");
const auth = require("../middlewares/auth");

router.get("/product/:productId", ReviewController.listByProduct);
router.post("/", auth(), ReviewController.create);

module.exports = router;
