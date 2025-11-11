const mongoose = require("mongoose");
const Cart = require("../models/cart.model");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const User = require("../models/user.model");
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
    const {
      page = 1,
      limit = 20,
      status,
      sort = "createdAt",
      order = "desc",
    } = req.query;

    const query = { userId };
    if (status) query.status = status;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const sortObj = {};
    sortObj[sort] = order === "asc" ? 1 : -1;

    const [orders, total] = await Promise.all([
      Order.find(query).sort(sortObj).skip(skip).limit(limitNumber),
      Order.countDocuments(query),
    ]);

    return ok(res, {
      orders,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
      },
    });
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
      // Kiểm tra tồn kho, trừ kho và tính toán giá từ database
      let subtotal = 0;
      const orderItems = [];

      for (const item of cart.items) {
        const product = await Product.findById(item.productId).session(session);

        // Kiểm tra sản phẩm tồn tại và trạng thái
        if (!product) {
          throw new Error(`Sản phẩm không tồn tại: ${item.productId}`);
        }
        if (product.status !== "active") {
          throw new Error(`Sản phẩm không còn hoạt động: ${product.name}`);
        }

        const variant = product.variants.find((v) => v.sku === item.sku);
        if (!variant) {
          throw new Error(`SKU ${item.sku} không tồn tại`);
        }
        if (variant.stock < item.quantity) {
          throw new Error(`SKU ${item.sku} hết hàng/không đủ tồn`);
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

        // Tính giá từ database (không dùng giá từ cart để tránh manipulation)
        const price = variant.price;
        subtotal += price * item.quantity;
        orderItems.push({
          productId: product._id,
          sku: item.sku,
          name: product.name,
          price,
          quantity: item.quantity,
          image: variant.image || product.image,
        });
      }

      // Tính toán lại subtotal, discount, shipping, total từ DB
      // Tạm thời không áp dụng coupon, phí ship tính theo quy tắc trong CartController
      const discount = 0; // TODO: Implement coupon logic
      const shippingFee = subtotal > 500000 ? 0 : 30000; // Free shipping over 500k
      const total = subtotal - discount + shippingFee;

      // Tạo đơn hàng
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
        couponCode: undefined, // Bỏ qua coupon từ cart
        subtotal,
        discount,
        shippingFee,
        total,
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

  /**
   * Lấy danh sách đơn hàng cho admin
   */
  static listAdmin = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      status,
      userId,
      startDate,
      endDate,
      sort = "createdAt",
      order = "desc",
      search,
    } = req.query;

    // Xây dựng query
    const query = {};

    if (status) query.status = status;
    if (userId) query.userId = userId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { "shippingAddress.fullName": { $regex: search, $options: "i" } },
      ];
    }

    // Xây dựng sort
    const sortObj = {};
    sortObj[sort] = order === "asc" ? 1 : -1;

    // Thực hiện query với pagination
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNumber - 1) * limitNumber;
    const orders = await Order.find(query)
      .populate("userId", "fullName email phone")
      .sort(sortObj)
      .skip(skip)
      .limit(limitNumber);

    const total = await Order.countDocuments(query);

    // Format response
    const formattedOrders = orders.map((order) => ({
      _id: order._id,
      code: order.code,
      userId: order.userId?._id || null,
      customer: order.userId
        ? {
            fullName: order.userId.fullName,
            email: order.userId.email,
            phone: order.userId.phone,
          }
        : null,
      items: order.items,
      shippingAddress: order.shippingAddress,
      subtotal: order.subtotal,
      discount: order.discount,
      shippingFee: order.shippingFee,
      total: order.total,
      status: order.status,
      timeline: order.timeline,
      payment: order.payment,
      createdAt: order.createdAt,
    }));

    return ok(res, {
      orders: formattedOrders,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
      },
    });
  });

  /**
   * Lấy chi tiết đơn hàng cho admin
   */
  static getAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Cho phép tìm bằng _id hoặc code
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { code: id };

    const order = await Order.findOne(query).populate(
      "userId",
      "fullName email phone"
    );

    if (!order) {
      return fail(res, 404, "Không tìm thấy đơn hàng");
    }

    return ok(res, order);
  });

  /**
   * Thống kê đơn hàng cho admin
   */
  static statsAdmin = asyncHandler(async (req, res) => {
    const { period = "7d", status } = req.query;

    // Tính ngày bắt đầu dựa trên period
    const now = new Date();
    let startDate;
    switch (period) {
      case "1d":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Query cơ bản
    const baseQuery = {
      createdAt: { $gte: startDate, $lte: now },
    };

    if (status && status !== "all") {
      baseQuery.status = status;
    }

    // Thống kê tổng quan
    const overview = await Order.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
          averageOrderValue: { $avg: "$total" },
        },
      },
    ]);

    // Thống kê theo trạng thái
    const statusBreakdown = await Order.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Thống kê theo ngày
    const dailyStats = await Order.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          orders: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top customers
    const topCustomers = await Order.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: "$userId",
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$total" },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          userId: "$_id",
          fullName: "$user.fullName",
          totalOrders: 1,
          totalSpent: 1,
        },
      },
    ]);

    // Format status breakdown
    const statusBreakdownObj = {};
    statusBreakdown.forEach((item) => {
      statusBreakdownObj[item._id] = item.count;
    });

    const result = {
      period,
      startDate,
      endDate: now,
      overview: overview[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
      },
      statusBreakdown: statusBreakdownObj,
      dailyStats,
      topCustomers,
    };

    return ok(res, result);
  });

  /**
   * Xuất danh sách đơn hàng (CSV/Excel)
   */
  static exportAdmin = asyncHandler(async (req, res) => {
    const { format = "csv", status, startDate, endDate } = req.query;

    // Xây dựng query
    const query = {};

    if (status && status !== "all") query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .populate("userId", "fullName email phone")
      .sort({ createdAt: -1 });

    if (format === "csv") {
      // Tạo CSV
      const csvHeader =
        "Order Code,Customer Name,Email,Phone,Status,Total,Items,Payment Method,Created At\n";
      const csvRows = orders
        .map((order) => {
          const items = order.items
            .map((item) => `${item.name} (${item.sku}) x${item.quantity}`)
            .join("; ");
          return [
            order.code,
            order.userId.fullName,
            order.userId.email,
            order.userId.phone,
            order.status,
            order.total,
            `"${items}"`,
            order.payment.method,
            order.createdAt.toISOString(),
          ].join(",");
        })
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
      return res.send(csvHeader + csvRows);
    } else {
      // Tạo Excel (cần thêm thư viện xlsx)
      return fail(res, 400, "Excel export chưa được hỗ trợ");
    }
  });
}

module.exports = OrderController;
