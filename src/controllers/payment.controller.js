const Order = require("../models/order.model");
const WebhookLog = require("../models/webhookLog.model");
const PaymentService = require("../services/payment.service");
const asyncHandler = require("../utils/asyncHandler");
const { ok, error } = require("../utils/apiResponse");

class PaymentController {
  /**
   * Tạo thanh toán MoMo
   */
  static createMomoPayment = asyncHandler(async (req, res) => {
    try {
      const { orderId, userInfo, items } = req.body;

      // Tìm đơn hàng
      const order = await Order.findOne({ code: orderId });
      if (!order) {
        return error(res, "Đơn hàng không tồn tại", 404);
      }

      // Kiểm tra trạng thái đơn hàng
      if (order.status !== "pending") {
        return error(res, "Đơn hàng đã được xử lý", 400);
      }

      // Chuẩn bị dữ liệu thanh toán
      const paymentData = {
        orderId: order.code,
        amount: order.total,
        orderInfo: `Thanh toán đơn hàng ${order.code} - Fashion Store`,
      };

      // Lấy thông tin user nếu có
      let userData = null;
      if (order.userId) {
        // Có thể populate user info từ database
        userData = userInfo || {};
      }

      // Tạo thanh toán MoMo
      const result = await PaymentService.createMomoPayment(
        paymentData,
        userData,
        order.items || []
      );

      if (result.success) {
        // Cập nhật thông tin thanh toán vào đơn hàng
        order.payment.provider = "momo";
        order.payment.status = "pending";
        order.payment.raw = {
          requestId: paymentData.requestId,
          momoOrderId: result.data.orderId,
        };
        await order.save();

        return ok(res, {
          message: "Tạo thanh toán MoMo thành công",
          paymentUrl: result.paymentUrl,
          deeplink: result.deeplink,
          qrCodeUrl: result.qrCodeUrl,
          orderId: order.code,
        });
      } else {
        return error(res, result.error || "Tạo thanh toán thất bại", 400);
      }
    } catch (err) {
      console.error("Error creating MoMo payment:", err);
      return error(res, "Lỗi hệ thống", 500);
    }
  });

  /**
   * Xử lý webhook từ MoMo
   */
  static momoWebhook = asyncHandler(async (req, res) => {
    try {
      // Ghi log webhook
      await WebhookLog.create({
        source: "momo",
        event: "ipn",
        payload: req.body,
      });

      console.log("MoMo IPN received:", req.body);

      // Xử lý IPN từ MoMo
      const result = await PaymentService.handleMomoIPN(req.body);

      if (result.success) {
        // Cập nhật đơn hàng thành công
        const order = await Order.findOne({ code: result.orderId });
        if (order) {
          order.payment.status = "paid";
          order.payment.transactionId = result.transactionId;
          order.status = "paid";
          order.timeline.push({
            status: "paid",
            note: `Thanh toán MoMo thành công - ${result.message}`,
          });
          await order.save();

          console.log(`Order ${result.orderId} updated to PAID`);
        }
      } else {
        // Xử lý thanh toán thất bại
        const order = await Order.findOne({ code: result.orderId });
        if (order) {
          order.payment.status = "failed";
          order.timeline.push({
            status: "pending",
            note: `Thanh toán MoMo thất bại - ${result.message}`,
          });
          await order.save();

          console.log(`Order ${result.orderId} payment failed`);
        }
      }

      // MoMo yêu cầu trả về status 200 để xác nhận đã nhận IPN
      return res.status(200).json({ message: "OK" });
    } catch (err) {
      console.error("Error processing MoMo webhook:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * Xử lý redirect từ MoMo sau khi thanh toán
   */
  static momoRedirect = asyncHandler(async (req, res) => {
    try {
      const { resultCode, orderId, message } = req.query;

      if (resultCode === "0") {
        // Thanh toán thành công
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment/success?orderId=${orderId}`
        );
      } else {
        // Thanh toán thất bại
        return res.redirect(
          `${
            process.env.FRONTEND_URL
          }/payment/failed?orderId=${orderId}&message=${encodeURIComponent(
            message
          )}`
        );
      }
    } catch (err) {
      console.error("Error processing MoMo redirect:", err);
      return res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
    }
  });

  /**
   * Kiểm tra trạng thái thanh toán MoMo
   */
  static checkMomoPaymentStatus = asyncHandler(async (req, res) => {
    try {
      const { orderId } = req.params;

      const order = await Order.findOne({ code: orderId });
      if (!order) {
        return error(res, "Đơn hàng không tồn tại", 404);
      }

      // Nếu có requestId từ lần tạo thanh toán trước
      if (order.payment.raw?.requestId) {
        const queryResult = await PaymentService.queryMomoTransaction(
          orderId,
          order.payment.raw.requestId
        );

        if (queryResult.success) {
          return ok(res, {
            orderId: orderId,
            status: order.status,
            paymentStatus: order.payment.status,
            momoStatus: queryResult.data,
          });
        }
      }

      return ok(res, {
        orderId: orderId,
        status: order.status,
        paymentStatus: order.payment.status,
      });
    } catch (err) {
      console.error("Error checking MoMo payment status:", err);
      return error(res, "Lỗi hệ thống", 500);
    }
  });

  /**
   * Xử lý webhook từ payment gateway (VNPay/MoMo/ZaloPay...) - Legacy method
   */
  static webhook = asyncHandler(async (req, res) => {
    // Ghi log webhook để tracking
    await WebhookLog.create({
      source: "payment",
      event: "callback",
      payload: req.body,
    });

    // Xử lý callback từ payment gateway
    const { orderCode, success, transactionId } = req.body || {};

    if (orderCode) {
      const order = await Order.findOne({ code: orderCode });

      if (order) {
        if (success) {
          // Thanh toán thành công
          order.payment.status = "paid";
          order.payment.transactionId =
            transactionId || order.payment.transactionId;
          order.status = "paid";
          order.timeline.push({
            status: "paid",
            note: "Thanh toán thành công",
          });
        } else {
          // Thanh toán thất bại
          order.payment.status = "failed";
          order.timeline.push({
            status: "pending",
            note: "Thanh toán thất bại",
          });
        }

        await order.save();
      }
    }

    return ok(res, { received: true });
  });
}

module.exports = PaymentController;
