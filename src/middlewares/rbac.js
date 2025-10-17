const User = require("../models/user.model");
const { fail } = require("../utils/apiResponse");

/**
 * Role-Based Access Control middleware
 * Kiểm tra quyền truy cập dựa trên role và resource
 */

// Định nghĩa permissions cho từng role
const PERMISSIONS = {
  customer: [
    "user:read:own",
    "user:update:own",
    "product:read:all",
    "cart:read:own",
    "cart:write:own",
    "order:read:own",
    "order:write:own",
    "review:read:all",
    "review:write:own",
    "wishlist:read:own",
    "wishlist:write:own",
  ],
  staff: [
    "user:read:all",
    "user:update:all",
    "product:read:all",
    "product:write:all",
    "category:read:all",
    "category:write:all",
    "brand:read:all",
    "brand:write:all",
    "order:read:all",
    "order:update:all",
    "review:read:all",
    "review:delete:all",
  ],
  admin: [
    "user:read:all",
    "user:write:all",
    "user:update:all",
    "user:delete:all",
    "product:read:all",
    "product:write:all",
    "product:delete:all",
    "category:read:all",
    "category:write:all",
    "category:delete:all",
    "brand:read:all",
    "brand:write:all",
    "brand:delete:all",
    "order:read:all",
    "order:write:all",
    "order:delete:all",
    "review:read:all",
    "review:write:all",
    "review:delete:all",
    "stats:read:all",
    "csp:read:all",
    "csp:write:all",
    "csp:delete:all",
  ],
};

/**
 * Kiểm tra quyền truy cập resource
 */
const checkPermission = (
  requiredPermission,
  userRole,
  resourceOwnerId = null,
  userId = null
) => {
  const userPermissions = PERMISSIONS[userRole] || [];

  // Kiểm tra permission chính
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Kiểm tra permission với :own (chỉ cho phép truy cập resource của chính mình)
  if (requiredPermission.includes(":own") && resourceOwnerId && userId) {
    const allPermission = requiredPermission.replace(":own", ":all");
    const isOwner = resourceOwnerId.toString() === userId.toString();
    // Cho phép nếu là chủ sở hữu và có quyền :own, hoặc có quyền :all
    if (
      (isOwner && userPermissions.includes(requiredPermission)) ||
      userPermissions.includes(allPermission)
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Middleware RBAC chính
 */
const rbac = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        const { fail } = require("../utils/apiResponse");
        return fail(res, 401, "Unauthorized");
      }

      const { id: userId, role } = req.user;
      let resourceOwnerId = null;

      // Lấy resourceOwnerId từ params hoặc body/query (an toàn với undefined)
      if (req.params && req.params.id) {
        resourceOwnerId = req.params.id;
      } else if (req.body && req.body.userId) {
        resourceOwnerId = req.body.userId;
      } else if (req.query && req.query.userId) {
        resourceOwnerId = req.query.userId;
      }

      // Fallback: nếu yêu cầu ":own" mà chưa xác định được owner từ request
      if (
        !resourceOwnerId &&
        typeof permission === "string" &&
        permission.includes(":own")
      ) {
        resourceOwnerId = userId;
      }

      // Kiểm tra quyền
      const hasPermission = checkPermission(
        permission,
        role,
        resourceOwnerId,
        userId
      );

      if (!hasPermission) {
        const { fail } = require("../utils/apiResponse");
        return fail(res, 403, "Không có quyền truy cập tài nguyên này");
      }

      next();
    } catch (Error) {
      console.log(Error);
      const { fail } = require("../utils/apiResponse");
      return fail(res, 500, "Lỗi kiểm tra quyền truy cập");
    }
  };
};

/**
 * Middleware kiểm tra ownership (chỉ cho phép truy cập resource của chính mình)
 */
const checkOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({ ok: false, error: { code: 401, message: "Unauthorized" } });
      }

      const { id: userId } = req.user;
      const resourceId = req.params.id;

      if (!resourceId) {
        return res.status(400).json({
          ok: false,
          error: { code: 400, message: "Thiếu ID tài nguyên" },
        });
      }

      // Kiểm tra ownership dựa trên resource type
      let resource = null;
      switch (resourceType) {
        case "user":
          resource = await User.findById(resourceId).select("_id");
          break;
        case "order":
          const Order = require("../models/order.model");
          resource = await Order.findById(resourceId).select("userId");
          if (resource) resource = { _id: resource.userId };
          break;
        case "review":
          const Review = require("../models/review.model");
          resource = await Review.findById(resourceId).select("userId");
          if (resource) resource = { _id: resource.userId };
          break;
        case "cart":
          const Cart = require("../models/cart.model");
          resource = await Cart.findById(resourceId).select("userId");
          if (resource) resource = { _id: resource.userId };
          break;
        case "wishlist":
          const Wishlist = require("../models/wishlist.model");
          resource = await Wishlist.findById(resourceId).select("userId");
          if (resource) resource = { _id: resource.userId };
          break;
        default:
          return res.status(400).json({
            ok: false,
            error: { code: 400, message: "Loại tài nguyên không hợp lệ" },
          });
      }

      if (!resource) {
        return res.status(404).json({
          ok: false,
          error: { code: 404, message: "Tài nguyên không tồn tại" },
        });
      }

      if (resource._id.toString() !== userId.toString()) {
        return res.status(403).json({
          ok: false,
          error: {
            code: 403,
            message: "Không có quyền truy cập tài nguyên này",
          },
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: {
          code: 500,
          message: "Lỗi kiểm tra quyền sở hữu",
        },
      });
    }
  };
};

/**
 * Middleware kiểm tra admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    const { fail } = require("../utils/apiResponse");
    return fail(res, 403, "Yêu cầu quyền admin");
  }
  next();
};

/**
 * Middleware kiểm tra staff hoặc admin role
 */
const requireStaffOrAdmin = (req, res, next) => {
  if (!req.user || !["staff", "admin"].includes(req.user.role)) {
    const { fail } = require("../utils/apiResponse");
    return fail(res, 403, "Yêu cầu quyền staff hoặc admin");
  }
  next();
};

module.exports = {
  rbac,
  checkOwnership,
  requireAdmin,
  requireStaffOrAdmin,
  PERMISSIONS,
};
