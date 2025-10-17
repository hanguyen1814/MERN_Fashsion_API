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

  /**
   * Tạo đơn hàng trực tiếp từ danh sách sản phẩm (không qua giỏ hàng)
   */
  static checkoutDirect = asyncHandler(async (req, res) => {
    const {
      items = [], // [{ productId, sku, quantity }]
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

    if (!Array.isArray(items) || items.length === 0) {
      return fail(res, 400, "Danh sách sản phẩm trống");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let subtotal = 0;
      const orderItems = [];

      // Kiểm tra và trừ kho từng item
      for (const reqItem of items) {
        const { productId, sku, quantity = 1 } = reqItem;
        if (!productId || !sku || quantity <= 0) {
          throw new Error(
            "Thiếu thông tin sản phẩm hoặc số lượng không hợp lệ"
          );
        }

        const product = await Product.findById(productId).session(session);
        if (!product) {
          throw new Error("Sản phẩm không tồn tại");
        }

        const variant = product.variants.find((v) => v.sku === sku);
        if (!variant) {
          throw new Error(`SKU ${sku} không tồn tại`);
        }
        if (variant.stock < quantity) {
          throw new Error(`SKU ${sku} hết hàng/không đủ tồn`);
        }

        // Trừ kho
        variant.stock -= quantity;
        await product.save({ session });

        // Ghi log tồn kho tạm thời (refId sẽ cập nhật sau khi có order)
        await InventoryLog.create(
          [
            {
              productId: product._id,
              sku,
              quantity: -quantity,
              reason: "order",
              refId: "pending",
            },
          ],
          { session }
        );

        const price = variant.price;
        subtotal += price * quantity;
        orderItems.push({
          productId: product._id,
          sku,
          name: product.name,
          price,
          quantity,
          image: variant.image || product.image,
        });
      }

      // Tạm thời không áp dụng coupon, phí ship tính 0 (có thể mở rộng sau)
      const discount = 0;
      const shippingFee = 0;
      const total = subtotal - discount + shippingFee;

      const orderData = {
        code: genOrderCode(),
        userId,
        items: orderItems,
        shippingAddress: {
          fullName,
          phone,
          street,
          ward,
          district,
          province,
        },
        shippingMethod: "standard",
        couponCode: undefined,
        subtotal,
        discount,
        shippingFee,
        total,
        status: "pending",
        timeline: [{ status: "pending", note: "Đơn mới tạo" }],
        payment: {
          method,
          provider,
          status: method === "cod" ? "paid" : "pending",
        },
      };

      const [order] = await Order.create([orderData], { session });

      // Cập nhật refId cho inventory log nếu cần (bỏ qua để tránh quét cả collection)

      await session.commitTransaction();
      return created(res, order);
    } catch (error) {
      await session.abortTransaction();
      return fail(res, 400, error.message);
    } finally {
      session.endSession();
    }
  });

  /**
   * Cập nhật trạng thái đơn hàng (staff/admin)
   * body: { status, note }
   */
  static updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params; // order id hoặc code?
    const { status, note } = req.body;

    if (!status) return fail(res, 400, "Thiếu trạng thái mới");

    // Cho phép cập nhật bằng code hoặc _id
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { code: id };

    const order = await Order.findOne(query);
    if (!order) return fail(res, 404, "Không tìm thấy đơn hàng");

    order.status = status;
    order.timeline.push({
      status,
      note: note || `Cập nhật trạng thái: ${status}`,
    });
    await order.save();

    return ok(res, order);
  });
}

module.exports = OrderController;
