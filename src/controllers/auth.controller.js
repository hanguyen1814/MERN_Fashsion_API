const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const { ok, created, fail } = require("../utils/apiResponse");
const User = require("../models/user.model");

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

    // Kiểm tra email đã tồn tại
    const existed = await User.findOne({ email });
    if (existed) {
      return fail(res, 409, "Email đã tồn tại");
    }

    // Tạo password hash và user mới
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName,
      email,
      phone,
      passwordHash,
    });

    return created(res, {
      id: user._id,
      email: user.email,
    });
  });

  /**
   * Đăng nhập
   */
  static login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Tìm user active
    const user = await User.findOne({ email, status: "active" });
    if (!user) {
      return fail(res, 401, "Sai email hoặc mật khẩu");
    }

    // Xác thực password
    const okPass = (await user.comparePassword)
      ? await user.comparePassword(password)
      : await bcrypt.compare(password, user.passwordHash);
    if (!okPass) {
      return fail(res, 401, "Sai email hoặc mật khẩu");
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

    if (refreshToken) {
      // Xóa refresh token khỏi database
      await User.findOneAndUpdate(
        { refreshToken },
        { $unset: { refreshToken: 1 } }
      );
    }

    return ok(res, { message: "Đăng xuất thành công" });
  });
}

module.exports = AuthController;
