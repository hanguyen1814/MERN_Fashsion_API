const router = require("express").Router();
const AuthController = require("../controllers/auth.controller");
const { authValidation } = require("../middlewares/validation");

router.post("/register", authValidation.register, AuthController.register);
router.post("/login", authValidation.login, AuthController.login);
router.post(
  "/refresh",
  authValidation.refreshToken,
  AuthController.refreshToken
);
router.post("/logout", AuthController.logout);

module.exports = router;
