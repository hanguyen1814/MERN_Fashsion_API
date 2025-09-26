const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const asyncHandler = require("../utils/asyncHandler");
const { ok, fail } = require("../utils/apiResponse");

class CartController {
  /**
   * Tính toán tổng tiền giỏ hàng
   */
  static computeTotals(items = []) {
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const discount = 0; // TODO: Implement coupon logic
    const shippingFee = subtotal > 500000 ? 0 : 30000; // Free shipping over 500k
    const total = subtotal - discount + shippingFee;
    return { subtotal, discount, shippingFee, total };
  }

  /**
   * Lấy giỏ hàng của user hiện tại
   */
  static getMine = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Tìm hoặc tạo giỏ hàng mới
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    // Tính toán và cập nhật tổng tiền
    const totals = CartController.computeTotals(cart.items);
    Object.assign(cart, totals);
    await cart.save();

    return ok(res, cart);
  });

  /**
   * Thêm sản phẩm vào giỏ hàng
   */
  static addItem = asyncHandler(async (req, res) => {
    const { productId, sku, quantity = 1 } = req.body;
    const userId = req.user.id;

    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findById(productId);
    if (!product) {
      return fail(res, 404, "Sản phẩm không tồn tại");
    }

    // Kiểm tra variant/SKU
    const variant = product.variants.find((v) => v.sku === sku);
    if (!variant) {
      return fail(res, 404, "SKU không tồn tại");
    }

    // Kiểm tra tồn kho
    if (variant.stock < quantity) {
      return fail(res, 400, "Hết hàng/không đủ tồn");
    }

    // Tìm hoặc tạo giỏ hàng
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    // Kiểm tra item đã có trong giỏ chưa
    const existingItem = cart.items.find((item) => item.sku === sku);
    if (existingItem) {
      existingItem.quantity += Number(quantity);
    } else {
      cart.items.push({
        productId,
        sku,
        name: product.name,
        price: variant.price,
        quantity,
        image: variant.image || product.images?.[0],
      });
    }

    // Cập nhật tổng tiền
    const totals = CartController.computeTotals(cart.items);
    Object.assign(cart, totals);
    await cart.save();

    return ok(res, cart);
  });

  /**
   * Cập nhật số lượng sản phẩm trong giỏ hàng
   */
  static updateItem = asyncHandler(async (req, res) => {
    const { sku, quantity } = req.body;
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return fail(res, 404, "Chưa có giỏ hàng");
    }

    const item = cart.items.find((item) => item.sku === sku);
    if (!item) {
      return fail(res, 404, "Item không tồn tại trong giỏ hàng");
    }

    // Xóa item nếu quantity <= 0
    if (quantity <= 0) {
      cart.items = cart.items.filter((item) => item.sku !== sku);
    } else {
      item.quantity = quantity;
    }

    // Cập nhật tổng tiền
    const totals = CartController.computeTotals(cart.items);
    Object.assign(cart, totals);
    await cart.save();

    return ok(res, cart);
  });

  /**
   * Xóa toàn bộ giỏ hàng
   */
  static clear = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const cart = await Cart.findOneAndUpdate(
      { userId },
      {
        items: [],
        subtotal: 0,
        discount: 0,
        shippingFee: 0,
        total: 0,
      },
      { new: true }
    );

    return ok(res, cart || { items: [] });
  });
}

module.exports = CartController;
