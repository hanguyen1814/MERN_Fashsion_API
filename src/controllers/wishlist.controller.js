const Wishlist = require("../models/wishlist.model");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");

class WishlistController {
  /**
   * Lấy danh sách wishlist của user hiện tại
   */
  static getMine = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Tìm hoặc tạo wishlist mới
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({
        userId,
        productIds: [],
      });
    }

    return ok(res, wishlist);
  });

  /**
   * Thêm/xóa sản phẩm khỏi wishlist
   */
  static toggle = asyncHandler(async (req, res) => {
    const { productId } = req.body;
    const userId = req.user.id;

    // Tìm hoặc tạo wishlist mới
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({
        userId,
        productIds: [],
      });
    }

    // Kiểm tra sản phẩm đã có trong wishlist chưa
    const existingIndex = wishlist.productIds.findIndex(
      (id) => id.toString() === productId
    );

    if (existingIndex >= 0) {
      // Xóa sản phẩm khỏi wishlist
      wishlist.productIds.splice(existingIndex, 1);
    } else {
      // Thêm sản phẩm vào wishlist
      wishlist.productIds.push(productId);
    }

    await wishlist.save();
    return ok(res, wishlist);
  });
}

module.exports = WishlistController;
