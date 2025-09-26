const router = require("express").Router();
const OrderController = require("../controllers/order.controller");
const auth = require("../middlewares/auth");

router.get("/", auth(), OrderController.listMine);
router.post("/checkout", auth(), OrderController.checkout);

module.exports = router;
