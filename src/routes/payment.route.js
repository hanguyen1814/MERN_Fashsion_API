const router = require("express").Router();
const PaymentController = require("../controllers/payment.controller");

// Webhook public (cổng thanh toán sẽ gọi)
// Có thể thêm xác thực chữ ký tuỳ provider
router.post("/webhook", PaymentController.webhook);

module.exports = router;
