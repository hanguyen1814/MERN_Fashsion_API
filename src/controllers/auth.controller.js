const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const { ok, created, fail } = require("../utils/apiResponse");
const User = require("../models/user.model");
const {
  setTokenCookies,
  clearTokenCookies,
} = require("../middlewares/cookieSecurity");
const logger = require("../config/logger");
const telegramService = require("../services/telegram.service");
const emailService = require("../services/email.service");
const passport = require("../config/passport");
const crypto = require("crypto");

class AuthController {
  /**
   * Đăng ký tài khoản mới
   */
  static register = asyncHandler(async (req, res) => {
    const { fullName, email, password, phone } = req.body;

    // Validation
    if (!fullName || !email || !password) {
      return fail(res, 400, "Thiếu trường bắt buộc");
    }

    // Kiểm tra email/phone đã tồn tại
    const existed = await User.findOne({
      $or: [{ email }, ...(phone ? [{ phone }] : [])],
    });
    if (existed) {
      const isEmailDup = existed.email === email;
      return fail(
        res,
        409,
        isEmailDup ? "Email đã tồn tại" : "Số điện thoại đã tồn tại"
      );
    }

    // Tạo password hash và user mới
    const passwordHash = await bcrypt.hash(password, 10);

    // Tạo email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24); // 24 giờ

    try {
      const user = await User.create({
        fullName,
        email,
        phone,
        passwordHash,
        emailVerificationToken,
        emailVerificationExpires,
        status: "pending", // User chưa xác nhận email
        emailVerified: false,
      });

      // Gửi email xác nhận
      try {
        await emailService.sendVerificationEmail(user, emailVerificationToken);
        logger.info(`Verification email sent to: ${email}`, {
          userId: user._id,
          email: user.email,
          ip: req.ip,
          requestId: req.requestId,
          category: "email_verification",
          action: "verification_email_sent",
        });
      } catch (emailError) {
        // Log lỗi nhưng không fail registration
        logger.error(`Failed to send verification email to: ${email}`, {
          error: emailError.message,
          userId: user._id,
          email: user.email,
          ip: req.ip,
          requestId: req.requestId,
          category: "email_error",
        });
      }

      logger.info(`User registered successfully: ${email}`, {
        userId: user._id,
        email: user.email,
        ip: req.ip,
        requestId: req.requestId,
        category: "user_registration",
        action: "registration",
      });

      return created(res, {
        id: user._id,
        email: user.email,
        message:
          "Đăng ký thành công. Vui lòng kiểm tra email để xác nhận tài khoản.",
      });
    } catch (err) {
      // Xử lý lỗi trùng lặp E11000 (race condition)
      if (err && err.code === 11000) {
        const dupField = Object.keys(err.keyPattern || {})[0] || "unknown";
        const message =
          dupField === "email"
            ? "Email đã tồn tại"
            : dupField === "phone"
            ? "Số điện thoại đã tồn tại"
            : "Dữ liệu đã tồn tại";
        return fail(res, 409, message);
      }
      throw err;
    }
  });

  /**
   * Đăng nhập
   */
  static login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    logger.debug(`Login attempt for email: ${email}`, { ip: req.ip });

    // Tìm user (có thể là pending hoặc active)
    const user = await User.findOne({
      email,
      status: { $in: ["active", "pending"] },
    });
    if (!user) {
      logger.warn(`Login failed - User not found: ${email}`, {
        email,
        reason: "user_not_found",
        ip: req.ip,
        requestId: req.requestId,
        category: "user_login_failed",
        action: "login_failed",
      });
      return fail(res, 401, "Sai email hoặc mật khẩu");
    }

    // Kiểm tra email đã xác nhận chưa (chỉ cho local users)
    if (user.provider === "local" && !user.emailVerified) {
      logger.warn(`Login failed - Email not verified: ${email}`, {
        userId: user._id,
        email,
        reason: "email_not_verified",
        ip: req.ip,
        requestId: req.requestId,
        category: "user_login_failed",
        action: "login_failed",
      });
      return fail(
        res,
        403,
        "Vui lòng xác nhận email trước khi đăng nhập. Kiểm tra hộp thư của bạn hoặc yêu cầu gửi lại email xác nhận."
      );
    }

    // Xác thực password
    const okPass = (await user.comparePassword)
      ? await user.comparePassword(password)
      : await bcrypt.compare(password, user.passwordHash);
    if (!okPass) {
      // Tăng số lần đăng nhập thất bại
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      user.lastFailedLogin = new Date();
      await user.save();

      const loginFailureData = {
        email,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        attemptCount: user.failedLoginAttempts,
        reason: "invalid_password",
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      };

      logger.warn(`Login failed - Invalid password for email: ${email}`, {
        userId: user._id,
        email,
        reason: "invalid_password",
        ip: req.ip,
        requestId: req.requestId,
        category: "user_login_failed",
        action: "login_failed",
        failedAttempts: user.failedLoginAttempts,
      });

      // Gửi cảnh báo Telegram nếu có nhiều lần thất bại
      if (user.failedLoginAttempts >= 3) {
        await telegramService.sendLoginFailureAlert(loginFailureData);
      }

      return fail(res, 401, "Sai email hoặc mật khẩu");
    }

    // Reset failed login attempts khi đăng nhập thành công
    if (user.failedLoginAttempts > 0) {
      user.failedLoginAttempts = 0;
      user.lastFailedLogin = null;
    }

    // Tạo access token và refresh token
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d" }
    );

    // Cập nhật lastLogin và lưu refresh token
    user.lastLogin = new Date();
    user.refreshToken = refreshToken;
    await user.save();

    // Set secure cookies
    setTokenCookies(res, accessToken, refreshToken);

    logger.info(`User logged in successfully: ${email}`, {
      userId: user._id,
      email,
      role: user.role,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      requestId: req.requestId,
      category: "user_login",
      action: "login",
    });

    return ok(res, {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  });

  /**
   * Refresh access token
   */
  static refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return fail(res, 400, "Refresh token không được cung cấp");
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );

      // Tìm user với refresh token
      const user = await User.findOne({
        _id: decoded.id,
        refreshToken,
        status: "active",
      });

      if (!user) {
        return fail(res, 401, "Refresh token không hợp lệ");
      }

      // Tạo access token mới
      const accessToken = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES || "15m" }
      );

      // Set secure cookie cho access token mới
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: "/api/auth",
      });

      return ok(res, {
        accessToken,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      return fail(res, 401, "Refresh token không hợp lệ hoặc đã hết hạn");
    }
  });

  /**
   * Đăng xuất
   */
  static logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const cookieRefreshToken = req.cookies?.refreshToken;

    const tokenToClear = refreshToken || cookieRefreshToken;

    if (tokenToClear) {
      // Xóa refresh token khỏi database
      await User.findOneAndUpdate(
        { refreshToken: tokenToClear },
        { $unset: { refreshToken: 1 } }
      );
    }

    // Clear secure cookies
    clearTokenCookies(res);

    return ok(res, { message: "Đăng xuất thành công" });
  });

  /**
   * Khởi tạo Google OAuth flow
   */
  static googleAuth = passport.authenticate("google", {
    scope: ["profile", "email"],
  });

  /**
   * Callback xử lý sau khi Google OAuth thành công
   */
  static googleCallback = asyncHandler(async (req, res, next) => {
    passport.authenticate("google", async (err, user, info) => {
      try {
        if (err) {
          logger.error("Google OAuth authentication error:", {
            error: err.message,
            stack: err.stack,
            ip: req.ip,
            requestId: req.requestId,
            category: "oauth_error",
          });
          return fail(res, 500, "Lỗi xác thực Google");
        }

        if (!user) {
          logger.warn("Google OAuth failed - No user returned", {
            info,
            ip: req.ip,
            requestId: req.requestId,
            category: "oauth_error",
          });
          return fail(res, 401, "Xác thực Google thất bại");
        }

        // Kiểm tra user status
        if (user.status !== "active") {
          return fail(res, 403, "Tài khoản chưa được kích hoạt");
        }

        // Tạo access token và refresh token
        const accessToken = jwt.sign(
          { id: user._id, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES || "15m" }
        );

        const refreshToken = jwt.sign(
          { id: user._id },
          process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d" }
        );

        // Cập nhật lastLogin và lưu refresh token
        user.lastLogin = new Date();
        user.refreshToken = refreshToken;
        await user.save();

        // Set secure cookies
        setTokenCookies(res, accessToken, refreshToken);

        logger.info(`User logged in via Google OAuth: ${user.email}`, {
          userId: user._id,
          email: user.email,
          role: user.role,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          requestId: req.requestId,
          category: "user_login",
          action: "oauth_login",
        });

        // Redirect về frontend với tokens (hoặc trả về JSON)
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const tokenParams = new URLSearchParams({
          accessToken,
          refreshToken,
          userId: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        });

        // Redirect với tokens trong query params (hoặc có thể dùng cookies)
        res.redirect(`${frontendUrl}/auth/callback?${tokenParams.toString()}`);
      } catch (error) {
        logger.error("Google OAuth callback error:", {
          error: error.message,
          stack: error.stack,
          ip: req.ip,
          requestId: req.requestId,
          category: "oauth_error",
        });
        return fail(res, 500, "Lỗi xử lý đăng nhập Google");
      }
    })(req, res, next);
  });

  /**
   * Xác nhận email đăng ký
   */
  static verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.params;

    if (!token) {
      return fail(res, 400, "Token xác nhận không hợp lệ");
    }

    // Tìm user với token hợp lệ và chưa hết hạn
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return fail(
        res,
        400,
        "Token xác nhận không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại email xác nhận."
      );
    }

    // Cập nhật user: verified và active
    user.emailVerified = true;
    user.status = "active";
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    logger.info(`Email verified successfully: ${user.email}`, {
      userId: user._id,
      email: user.email,
      ip: req.ip,
      requestId: req.requestId,
      category: "email_verification",
      action: "email_verified",
    });

    return ok(res, {
      message:
        "Email đã được xác nhận thành công. Bạn có thể đăng nhập ngay bây giờ.",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
      },
    });
  });

  /**
   * Gửi lại email xác nhận
   */
  static resendVerificationEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return fail(res, 400, "Email không được để trống");
    }

    // Tìm user chưa xác nhận email
    const user = await User.findOne({
      email,
      emailVerified: false,
      provider: "local",
    });

    if (!user) {
      // Không tiết lộ thông tin user có tồn tại hay không (security)
      return ok(res, {
        message:
          "Nếu email tồn tại và chưa được xác nhận, chúng tôi đã gửi lại email xác nhận.",
      });
    }

    // Kiểm tra rate limit: không gửi quá nhiều email trong thời gian ngắn
    const now = new Date();
    const lastSent = user.emailVerificationExpires;
    if (lastSent && now - lastSent < 5 * 60 * 1000) {
      // 5 phút
      return fail(
        res,
        429,
        "Vui lòng đợi 5 phút trước khi yêu cầu gửi lại email."
      );
    }

    // Tạo token mới
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24);

    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = emailVerificationExpires;
    await user.save();

    // Gửi email
    try {
      await emailService.sendVerificationEmail(user, emailVerificationToken);
      logger.info(`Resent verification email to: ${email}`, {
        userId: user._id,
        email: user.email,
        ip: req.ip,
        requestId: req.requestId,
        category: "email_verification",
        action: "verification_email_resent",
      });

      return ok(res, {
        message:
          "Email xác nhận đã được gửi lại. Vui lòng kiểm tra hộp thư của bạn.",
      });
    } catch (emailError) {
      logger.error(`Failed to resend verification email to: ${email}`, {
        error: emailError.message,
        userId: user._id,
        email: user.email,
        ip: req.ip,
        requestId: req.requestId,
        category: "email_error",
      });
      return fail(res, 500, "Không thể gửi email. Vui lòng thử lại sau.");
    }
  });
}

module.exports = AuthController;
