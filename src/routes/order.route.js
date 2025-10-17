const router = require("express").Router();
const OrderController = require("../controllers/order.controller");
const auth = require("../middlewares/auth");
const { requireStaffOrAdmin } = require("../middlewares/rbac");

router.get("/", auth(), OrderController.listMine);
router.post("/checkout", auth(), OrderController.checkout);
router.post("/checkout-direct", auth(), OrderController.checkoutDirect);
router.patch(
  "/:id/status",
  auth(),
  requireStaffOrAdmin,
  OrderController.updateStatus
);

module.exports = router;
