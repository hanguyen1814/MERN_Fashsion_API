const mongoose = require("mongoose");
const Cart = require("../models/cart.model");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const InventoryLog = require("../models/inventoryLog.model");
const { genOrderCode } = require("../utils/orderCode");
const asyncHandler = require("../utils/asyncHandler");
const { ok, created, fail } = require("../utils/apiResponse");

class OrderController {
  /**
   * Lấy danh sách đơn hàng của user hiện tại
   */
  static listMine = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    return ok(res, orders);
  });

  /**
   * Tạo đơn hàng mới từ giỏ hàng
   */
  static checkout = asyncHandler(async (req, res) => {
    const {
      fullName,
      phone,
      street,
      ward,
      district,
      province,
      method = "cod",
      provider,
    } = req.body;
    const userId = req.user.id;

    // Kiểm tra giỏ hàng
    const cart = await Cart.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      return fail(res, 400, "Giỏ hàng trống");
    }

    // Sử dụng transaction để đảm bảo tính nhất quán
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Kiểm tra tồn kho và trừ kho
      for (const item of cart.items) {
        const product = await Product.findById(item.productId).session(session);
        const variant = product.variants.find((v) => v.sku === item.sku);

        if (!variant || variant.stock < item.quantity) {
          throw new Error(`SKU ${item.sku} hết hàng`);
        }

        // Trừ kho
        variant.stock -= item.quantity;
        await product.save({ session });

        // Ghi log tồn kho
        await InventoryLog.create(
          [
            {
              productId: product._id,
              sku: item.sku,
              quantity: -item.quantity,
              reason: "order",
              refId: "pending",
            },
          ],
          { session }
        );
      }

      // Tạo đơn hàng
      const orderData = {
        code: genOrderCode(),
        userId,
        items: cart.items.map((item) => ({
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
        shippingAddress: {
          fullName,
          phone,
          street,
          ward,
          district,
          province,
        },
        shippingMethod: "standard",
        couponCode: cart.couponCode,
        subtotal: cart.subtotal,
        discount: cart.discount,
        shippingFee: cart.shippingFee,
        total: cart.total,
        status: "pending",
        timeline: [
          {
            status: "pending",
            note: "Đơn mới tạo",
          },
        ],
        payment: {
          method,
          provider,
          status: method === "cod" ? "paid" : "pending",
        },
      };

      const order = await Order.create([orderData], { session });

      // Dọn giỏ hàng
      cart.items = [];
      cart.subtotal = 0;
      cart.discount = 0;
      cart.shippingFee = 0;
      cart.total = 0;
      await cart.save({ session });

      await session.commitTransaction();
      return created(res, order[0]);
    } catch (error) {
      await session.abortTransaction();
      return fail(res, 400, error.message);
    } finally {
      session.endSession();
    }
  });
}

module.exports = OrderController;
