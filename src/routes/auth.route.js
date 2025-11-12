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

// Google OAuth routes
router.get("/google", AuthController.googleAuth);
router.get("/google/callback", AuthController.googleCallback);

// Email verification routes
router.get("/verify-email/:token", AuthController.verifyEmail);
router.post("/resend-verification", AuthController.resendVerificationEmail);

module.exports = router;
