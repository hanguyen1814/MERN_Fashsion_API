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
    try {
      const user = await User.create({
        fullName,
        email,
        phone,
        passwordHash,
      });

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

    // Tìm user active
    const user = await User.findOne({ email, status: "active" });
    if (!user) {
      logger.warn(`Login failed - User not found or inactive: ${email}`, {
        email,
        reason: "user_not_found_or_inactive",
        ip: req.ip,
        requestId: req.requestId,
        category: "user_login_failed",
        action: "login_failed",
      });
      return fail(res, 401, "Tài khoản chưa kích hoạt");
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
}

module.exports = AuthController;
