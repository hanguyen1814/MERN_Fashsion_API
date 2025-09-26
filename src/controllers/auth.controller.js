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

    // Cập nhật lastLogin và tạo token
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "7d" }
    );

    return ok(res, {
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  });
}

module.exports = AuthController;
