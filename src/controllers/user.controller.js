const bcrypt = require("bcrypt");
const asyncHandler = require("../utils/asyncHandler");
const { ok, created, fail } = require("../utils/apiResponse");
const User = require("../models/user.model");

class UserController {
  // Chuẩn hoá dữ liệu người dùng về định dạng response yêu cầu
  static formatUser(userDoc) {
    if (!userDoc) return null;
    const user = userDoc.toObject ? userDoc.toObject() : userDoc;
    const defaultAddress = Array.isArray(user.addresses)
      ? user.addresses.find((a) => a && a.isDefault) || user.addresses[0]
      : null;
    const addressString = defaultAddress
      ? [
          defaultAddress.street,
          defaultAddress.ward,
          defaultAddress.district,
          defaultAddress.province,
        ]
          .filter(Boolean)
          .join(", ")
      : null;

    return {
      user_id: user._id,
      full_name: user.fullName || null,
      email: user.email || null,
      phone: user.phone || null,
      address: addressString,
      avatar: user.avatarUrl || null,
      role: user.role || null,
      status: user.status || null,
      emailVerified: user.emailVerified || false,
      created_at: user.createdAt || null,
    };
  }
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

    const data = users.map((u) => UserController.formatUser(u));
    const total = await User.countDocuments(filter);
    const meta = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    };
    return ok(res, data, meta);
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

    return ok(res, UserController.formatUser(user));
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

    return ok(res, UserController.formatUser(user));
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

    return ok(res, { message: "User updated successfully" });
  });

  /**
   * Đổi mật khẩu
   */
  static changePassword = asyncHandler(async (req, res) => {
    const currentPassword = req.body.currentPassword || req.body.oldPass;
    const newPassword = req.body.newPassword || req.body.newPass;
    // Cho phép truyền id qua params; nếu không có thì dùng id từ token
    const paramsId = req.params && req.params.id ? req.params.id : null;
    const userId = paramsId || req.user.id;

    // Nếu có paramsId nhưng không phải admin và không trùng user hiện tại -> cấm
    if (paramsId && req.user.role !== "admin" && req.user.id !== paramsId) {
      return fail(res, 403, "Không có quyền cập nhật mật khẩu người dùng này");
    }

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

    return ok(res, { message: "Password updated successfully" });
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

    return ok(res, { message: "User updated successfully" });
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

    return ok(res, { message: "User deleted successfully" });
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
   * Lấy danh sách địa chỉ của người dùng
   */
  static getAddresses = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const user = await User.findById(userId).select("addresses");

    if (!user) {
      return fail(res, 404, "Không tìm thấy người dùng");
    }

    // Sắp xếp: địa chỉ mặc định lên đầu
    const addresses = user.addresses
      .map((addr) => addr.toObject())
      .sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return 0;
      });

    return ok(res, { addresses });
  });

  /**
   * Thêm địa chỉ mới
   */
  static addAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { fullName, phone, street, ward, district, province, isDefault } =
      req.body;

    const user = await User.findById(userId);
    if (!user) {
      return fail(res, 404, "Không tìm thấy người dùng");
    }

    // Nếu là địa chỉ mặc định, bỏ default của các địa chỉ khác
    if (isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    // Nếu đây là địa chỉ đầu tiên, tự động đặt làm mặc định
    if (user.addresses.length === 0) {
      user.addresses.push({
        fullName,
        phone,
        street,
        ward,
        district,
        province,
        isDefault: true,
      });
    } else {
      user.addresses.push({
        fullName,
        phone,
        street,
        ward,
        district,
        province,
        isDefault: isDefault || false,
      });
    }

    await user.save();

    const newAddress = user.addresses[user.addresses.length - 1];
    return created(res, {
      address: newAddress.toObject(),
      message: "Thêm địa chỉ thành công",
    });
  });

  /**
   * Cập nhật địa chỉ
   */
  static updateAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { fullName, phone, street, ward, district, province, isDefault } =
      req.body;

    const user = await User.findById(userId);
    if (!user) {
      return fail(res, 404, "Không tìm thấy người dùng");
    }

    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === id
    );

    if (addressIndex === -1) {
      return fail(res, 404, "Không tìm thấy địa chỉ");
    }

    // Nếu đặt làm mặc định, bỏ default của các địa chỉ khác
    if (isDefault === true) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    // Cập nhật thông tin địa chỉ
    if (fullName !== undefined)
      user.addresses[addressIndex].fullName = fullName;
    if (phone !== undefined) user.addresses[addressIndex].phone = phone;
    if (street !== undefined) user.addresses[addressIndex].street = street;
    if (ward !== undefined) user.addresses[addressIndex].ward = ward;
    if (district !== undefined)
      user.addresses[addressIndex].district = district;
    if (province !== undefined)
      user.addresses[addressIndex].province = province;
    if (isDefault !== undefined)
      user.addresses[addressIndex].isDefault = isDefault;

    await user.save();

    return ok(res, {
      address: user.addresses[addressIndex].toObject(),
      message: "Cập nhật địa chỉ thành công",
    });
  });

  /**
   * Xóa địa chỉ
   */
  static deleteAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return fail(res, 404, "Không tìm thấy người dùng");
    }

    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === id
    );

    if (addressIndex === -1) {
      return fail(res, 404, "Không tìm thấy địa chỉ");
    }

    const wasDefault = user.addresses[addressIndex].isDefault;

    // Xóa địa chỉ
    user.addresses.splice(addressIndex, 1);

    // Nếu địa chỉ bị xóa là mặc định và còn địa chỉ khác, đặt địa chỉ đầu tiên làm mặc định
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    return ok(res, { message: "Xóa địa chỉ thành công" });
  });

  /**
   * Đặt địa chỉ mặc định
   */
  static setDefaultAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return fail(res, 404, "Không tìm thấy người dùng");
    }

    const address = user.addresses.find((addr) => addr._id.toString() === id);

    if (!address) {
      return fail(res, 404, "Không tìm thấy địa chỉ");
    }

    // Bỏ default của tất cả địa chỉ
    user.addresses.forEach((addr) => (addr.isDefault = false));

    // Đặt địa chỉ này làm mặc định
    address.isDefault = true;

    await user.save();

    return ok(res, {
      address: address.toObject(),
      message: "Đặt địa chỉ mặc định thành công",
    });
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
