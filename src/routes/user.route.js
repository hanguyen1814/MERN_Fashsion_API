const router = require("express").Router();
const UserController = require("../controllers/user.controller");
const auth = require("../middlewares/auth");

// Routes cho admin
router.get("/", auth(["admin"]), UserController.getAllUsers);
router.get("/stats", auth(["admin"]), UserController.getUserStats);
router.get("/:id", auth(), UserController.getUserById);
router.put("/:id", auth(["admin"]), UserController.updateUser);
router.delete("/:id", auth(["admin"]), UserController.deleteUser);
router.patch("/:id/status", auth(["admin"]), UserController.changeUserStatus);

// Routes cho user thường
router.get("/profile/me", auth(), UserController.getProfile);
router.put("/profile/me", auth(), UserController.updateProfile);
router.put("/password/change", auth(), UserController.changePassword);
router.post("/addresses/manage", auth(), UserController.manageAddresses);

module.exports = router;

