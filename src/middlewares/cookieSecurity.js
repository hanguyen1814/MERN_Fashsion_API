const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { fail } = require("../utils/apiResponse");

/**
 * Middleware để xử lý JWT với cookie security
 * Hỗ trợ cả Bearer token và secure cookie
 */
const cookieAuth = (roles = []) => {
  if (!Array.isArray(roles)) roles = [roles];

  return async (req, res, next) => {
    try {
      let token = null;

      // Ưu tiên Bearer token từ header
      const header = req.headers.authorization || "";
      if (header.startsWith("Bearer ")) {
        token = header.slice(7);
      }
      // Fallback: lấy từ secure cookie
      else if (req.cookies && req.cookies.accessToken) {
        token = req.cookies.accessToken;
      }

      if (!token) {
        return res
          .status(401)
          .json({ ok: false, error: { code: 401, message: "Unauthorized" } });
      }

      // Verify token
      const payload = jwt.verify(token, process.env.JWT_SECRET);

      // Kiểm tra user còn active không
      const user = await User.findById(payload.id).select("status role");
      if (!user || user.status !== "active") {
        return res
          .status(401)
          .json({
            ok: false,
            error: { code: 401, message: "User không hợp lệ" },
          });
      }

      // Kiểm tra role
      if (roles.length && !roles.includes(user.role)) {
        return res
          .status(403)
          .json({ ok: false, error: { code: 403, message: "Forbidden" } });
      }

      req.user = { id: payload.id, role: user.role };
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({
            ok: false,
            error: { code: 401, message: "Token đã hết hạn" },
          });
      } else if (error.name === "JsonWebTokenError") {
        return res
          .status(401)
          .json({
            ok: false,
            error: { code: 401, message: "Token không hợp lệ" },
          });
      } else {
        return res
          .status(500)
          .json({ ok: false, error: { code: 500, message: "Lỗi xác thực" } });
      }
    }
  };
};

/**
 * Tạo secure cookie options
 */
const getCookieOptions = (isRefreshToken = false) => {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Chỉ secure trong production
    sameSite: "strict",
    path: "/api/auth",
  };

  if (isRefreshToken) {
    options.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  } else {
    options.maxAge = 15 * 60 * 1000; // 15 minutes
  }

  return options;
};

/**
 * Set secure cookies cho tokens
 */
const setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, getCookieOptions(false));
  res.cookie("refreshToken", refreshToken, getCookieOptions(true));
};

/**
 * Clear token cookies
 */
const clearTokenCookies = (res) => {
  res.clearCookie("accessToken", getCookieOptions(false));
  res.clearCookie("refreshToken", getCookieOptions(true));
};

module.exports = {
  cookieAuth,
  getCookieOptions,
  setTokenCookies,
  clearTokenCookies,
};
