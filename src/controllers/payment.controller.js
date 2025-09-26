const Order = require("../models/order.model");
const WebhookLog = require("../models/webhookLog.model");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");

class PaymentController {
  /**
   * Xử lý webhook từ payment gateway (VNPay/MoMo/ZaloPay...)
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
