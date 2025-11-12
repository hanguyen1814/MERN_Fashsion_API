const router = require("express").Router();
const OrderController = require("../controllers/order.controller");
const auth = require("../middlewares/auth");
const { requireStaffOrAdmin, requireAdmin } = require("../middlewares/rbac");
const trackEvents = require("../middlewares/trackEvents");

// User routes - Đặt routes cụ thể trước routes có param
router.get("/", auth(), OrderController.listMine);
router.post(
  "/checkout",
  auth(),
  trackEvents("purchase"),
  OrderController.checkout
);
router.post(
  "/checkout-direct",
  auth(),
  trackEvents("purchase"),
  OrderController.checkoutDirect
);
// Routes có param phải đặt sau routes cụ thể
router.get("/:id", auth(), OrderController.getMine);
router.post("/:id/cancel", auth(), OrderController.cancelOrder);

// Staff/Admin routes
router.patch(
  "/:id/status",
  auth(),
  requireStaffOrAdmin,
  OrderController.updateStatus
);

// Admin routes
router.get("/admin", auth(), requireAdmin, OrderController.listAdmin);
router.get("/admin/stats", auth(), requireAdmin, OrderController.statsAdmin);
router.get("/admin/export", auth(), requireAdmin, OrderController.exportAdmin);
router.get("/admin/:id", auth(), requireAdmin, OrderController.getAdmin);

module.exports = router;
