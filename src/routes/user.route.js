const router = require("express").Router();
const UserController = require("../controllers/user.controller");
const auth = require("../middlewares/auth");
const {
  userValidation,
  paginationValidation,
} = require("../middlewares/validation");

// Routes cho user thường (đặt trước dynamic routes để tránh /me khớp với :id)
// Chuẩn hoá theo tài liệu: GET /api/users/me (chỉ cần xác thực)
router.get("/profile/me", auth(), UserController.getProfile);
router.put(
  "/profile/me",
  auth(),
  userValidation.updateProfile,
  UserController.updateProfile
);
// Chuẩn hoá: PUT /api/users/:id/password (cho phép admin hoặc chính chủ)
router.put("/password/change", auth(), UserController.changePassword);

// Routes cho quản lý địa chỉ
router.get("/addresses", auth(), UserController.getAddresses);
router.post(
  "/addresses",
  auth(),
  userValidation.address,
  UserController.addAddress
);
router.put(
  "/addresses/:id",
  auth(),
  userValidation.addressId,
  userValidation.addressUpdate,
  UserController.updateAddress
);
router.delete(
  "/addresses/:id",
  auth(),
  userValidation.addressId,
  UserController.deleteAddress
);
router.patch(
  "/addresses/:id/default",
  auth(),
  userValidation.addressId,
  UserController.setDefaultAddress
);

// Routes cho admin
router.get(
  "/",
  auth(["admin"]),
  paginationValidation.query,
  UserController.getAllUsers
);
router.get("/stats", auth(["admin"]), UserController.getUserStats);
router.get("/:id", auth(), userValidation.userId, UserController.getUserById);
router.put(
  "/:id",
  auth(["admin"]),
  userValidation.userId,
  userValidation.updateProfile,
  UserController.updateUser
);
router.delete(
  "/:id",
  auth(["admin"]),
  userValidation.userId,
  UserController.deleteUser
);
router.patch(
  "/:id/status",
  auth(["admin"]),
  userValidation.userId,
  userValidation.changeStatus,
  UserController.changeUserStatus
);

// (các route user thường đã được chuyển lên trước)

module.exports = router;
