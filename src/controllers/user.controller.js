const bcrypt = require("bcrypt");
const asyncHandler = require("../utils/asyncHandler");
const { ok, created, fail } = require("../utils/apiResponse");
const User = require("../models/user.model");

class UserController {
  /**
   * Lấy danh sách tất cả người dùng (chỉ admin)
   */
  static getAllUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, role, status, search } = req.query;

    // Xây dựng filter
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Tính toán pagination
    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .select("-passwordHash -refreshToken")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    return ok(res, {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  });

  /**
   * Lấy thông tin người dùng theo ID
   */
  static getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id).select("-passwordHash -refreshToken");

    if (!user) {
      return fail(res, 404, "Không tìm thấy người dùng");
    }

    // Chỉ cho phép admin xem thông tin người khác, hoặc user xem thông tin của chính mình
    if (req.user.role !== "admin" && req.user.id !== id) {
      return fail(res, 403, "Không có quyền truy cập");
    }

    return ok(res, { user });
  });

  /**
   * Lấy thông tin profile của user hiện tại
   */
  static getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select(
      "-passwordHash -refreshToken"
    );

    if (!user) {
      return fail(res, 404, "Không tìm thấy người dùng");
    }

    return ok(res, { user });
  });

  /**
   * Cập nhật thông tin profile của user hiện tại
   */
  static updateProfile = asyncHandler(async (req, res) => {
    const { fullName, phone, avatarUrl } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-passwordHash -refreshToken");

    if (!user) {
      return fail(res, 404, "Không tìm thấy người dùng");
    }

    return ok(res, { user, message: "Cập nhật thông tin thành công" });
  });

  /**
   * Đổi mật khẩu
   */
  static changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return fail(res, 400, "Thiếu mật khẩu hiện tại hoặc mật khẩu mới");
    }

    const user = await User.findById(userId);
    if (!user) {
      return fail(res, 404, "Không tìm thấy người dùng");
    }

    // Kiểm tra mật khẩu hiện tại
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );
    if (!isCurrentPasswordValid) {
      return fail(res, 400, "Mật khẩu hiện tại không đúng");
    }

    // Hash mật khẩu mới
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = newPasswordHash;
    await user.save();

    return ok(res, { message: "Đổi mật khẩu thành công" });
  });

  /**
   * Cập nhật thông tin người dùng (chỉ admin)
   */
  static updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { fullName, email, phone, role, status, loyaltyPoints } = req.body;

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (loyaltyPoints !== undefined) updateData.loyaltyPoints = loyaltyPoints;

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-passwordHash -refreshToken");

    if (!user) {
      return fail(res, 404, "Không tìm thấy người dùng");
    }

    return ok(res, {
      user,
      message: "Cập nhật thông tin người dùng thành công",
    });
  });

  /**
   * Xóa người dùng (chỉ admin)
   */
  static deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Không cho phép xóa chính mình
    if (req.user.id === id) {
      return fail(res, 400, "Không thể xóa tài khoản của chính mình");
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return fail(res, 404, "Không tìm thấy người dùng");
    }

    return ok(res, { message: "Xóa người dùng thành công" });
  });

  /**
   * Thay đổi trạng thái người dùng (chỉ admin)
   */
  static changeUserStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["active", "inactive", "banned"].includes(status)) {
      return fail(res, 400, "Trạng thái không hợp lệ");
    }

    // Không cho phép thay đổi trạng thái của chính mình
    if (req.user.id === id) {
      return fail(res, 400, "Không thể thay đổi trạng thái của chính mình");
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).select("-passwordHash -refreshToken");

    if (!user) {
      return fail(res, 404, "Không tìm thấy người dùng");
    }

    return ok(res, { user, message: "Thay đổi trạng thái thành công" });
  });

  /**
   * Quản lý địa chỉ của người dùng
   */
  static manageAddresses = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { action, addressId, address } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return fail(res, 404, "Không tìm thấy người dùng");
    }

    switch (action) {
      case "add":
        if (!address) {
          return fail(res, 400, "Thiếu thông tin địa chỉ");
        }

        // Nếu là địa chỉ mặc định, bỏ default của các địa chỉ khác
        if (address.isDefault) {
          user.addresses.forEach((addr) => (addr.isDefault = false));
        }

        user.addresses.push(address);
        await user.save();
        return ok(res, { message: "Thêm địa chỉ thành công" });

      case "update":
        if (!addressId || !address) {
          return fail(res, 400, "Thiếu thông tin");
        }

        const addressIndex = user.addresses.findIndex(
          (addr) => addr._id.toString() === addressId
        );
        if (addressIndex === -1) {
          return fail(res, 404, "Không tìm thấy địa chỉ");
        }

        // Nếu là địa chỉ mặc định, bỏ default của các địa chỉ khác
        if (address.isDefault) {
          user.addresses.forEach((addr) => (addr.isDefault = false));
        }

        user.addresses[addressIndex] = {
          ...user.addresses[addressIndex].toObject(),
          ...address,
        };
        await user.save();
        return ok(res, { message: "Cập nhật địa chỉ thành công" });

      case "delete":
        if (!addressId) {
          return fail(res, 400, "Thiếu ID địa chỉ");
        }

        user.addresses = user.addresses.filter(
          (addr) => addr._id.toString() !== addressId
        );
        await user.save();
        return ok(res, { message: "Xóa địa chỉ thành công" });

      case "set_default":
        if (!addressId) {
          return fail(res, 400, "Thiếu ID địa chỉ");
        }

        user.addresses.forEach((addr) => (addr.isDefault = false));
        const defaultAddress = user.addresses.find(
          (addr) => addr._id.toString() === addressId
        );
        if (defaultAddress) {
          defaultAddress.isDefault = true;
          await user.save();
          return ok(res, { message: "Đặt địa chỉ mặc định thành công" });
        } else {
          return fail(res, 404, "Không tìm thấy địa chỉ");
        }

      default:
        return fail(res, 400, "Hành động không hợp lệ");
    }
  });

  /**
   * Thống kê người dùng (chỉ admin)
   */
  static getUserStats = asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });
    const inactiveUsers = await User.countDocuments({ status: "inactive" });
    const bannedUsers = await User.countDocuments({ status: "banned" });

    const customers = await User.countDocuments({ role: "customer" });
    const admins = await User.countDocuments({ role: "admin" });
    const staffs = await User.countDocuments({ role: "staff" });

    // Người dùng mới trong 30 ngày qua
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    return ok(res, {
      stats: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        banned: bannedUsers,
        roles: {
          customer: customers,
          admin: admins,
          staff: staffs,
        },
        newUsersLast30Days: newUsers,
      },
    });
  });
}

module.exports = UserController;
