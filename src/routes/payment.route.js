const router = require("express").Router();
const PaymentController = require("../controllers/payment.controller");

// MoMo Payment Routes
router.post("/momo/create", PaymentController.createMomoPayment);
router.post("/momo/webhook", PaymentController.momoWebhook);
router.get("/momo/redirect", PaymentController.momoRedirect);
router.get("/momo/status/:orderId", PaymentController.checkMomoPaymentStatus);

// Webhook public (cổng thanh toán sẽ gọi) - Legacy
// Có thể thêm xác thực chữ ký tuỳ provider
router.post("/webhook", PaymentController.webhook);

module.exports = router;
