const express = require("express");
const router = express.Router();
const cspController = require("../controllers/csp.controller");
const auth = require("../middlewares/auth");
const { requireAdmin } = require("../middlewares/rbac");

// Tất cả routes CSP đều cần authentication và quyền admin
router.use(auth);
router.use(requireAdmin);

// GET /api/csp/violations - Lấy danh sách violations với phân trang và lọc
router.get("/violations", cspController.getViolations);

// GET /api/csp/violations/:id - Lấy chi tiết một violation
router.get("/violations/:id", cspController.getViolationById);

// GET /api/csp/stats - Lấy thống kê violations
router.get("/stats", cspController.getViolationStats);

// PUT /api/csp/violations/:id/resolve - Đánh dấu một violation đã xử lý
router.put("/violations/:id/resolve", cspController.resolveViolation);

// PUT /api/csp/violations/resolve-multiple - Đánh dấu nhiều violations đã xử lý
router.put(
  "/violations/resolve-multiple",
  cspController.resolveMultipleViolations
);

module.exports = router;
