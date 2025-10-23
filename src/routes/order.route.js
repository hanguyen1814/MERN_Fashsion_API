const router = require("express").Router();
const OrderController = require("../controllers/order.controller");
const auth = require("../middlewares/auth");
const { requireStaffOrAdmin, requireAdmin } = require("../middlewares/rbac");
const trackEvents = require("../middlewares/trackEvents");

// User routes
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
