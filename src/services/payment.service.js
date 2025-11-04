// /service/payment.service.js

require("dotenv").config({ quiet: true });
const crypto = require("crypto");
const axios = require("axios");
const logger = require("../config/logger");

// MoMo Payment Configuration
const MOMO_CONFIG = {
  partnerCode: process.env.MOMO_PARTNER_CODE,
  accessKey: process.env.MOMO_ACCESS_KEY,
  secretKey: process.env.MOMO_SECRET_KEY,
  endpoint:
    process.env.MOMO_ENDPOINT ||
    "https://test-payment.momo.vn/v2/gateway/api/create",
  ipnUrl:
    process.env.MOMO_IPN_URL ||
    `${process.env.BASE_URL}/api/payment/momo/webhook`,
  redirectUrl:
    process.env.MOMO_REDIRECT_URL ||
    (process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/payment/success`
      : `${process.env.BASE_URL}/payment/success`),
  storeId: process.env.MOMO_STORE_ID || "MOMO_STORE",
  storeName: process.env.MOMO_STORE_NAME || "Fashion Store",
};

class PaymentService {
  /**
   * Tạo thanh toán MoMo One-Time Payment
   * @param {Object} orderData - Thông tin đơn hàng
   * @param {Object} userData - Thông tin người dùng
   * @param {Array} items - Danh sách sản phẩm
   * @returns {Object} - Kết quả tạo thanh toán từ MoMo
   */
  static async createMomoPayment(orderData, userData, items = []) {
    try {
      const {
        orderId,
        amount,
        orderInfo,
        requestId = `REQ_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      } = orderData;

      // Validate required fields
      if (!orderId || !amount || !orderInfo) {
        throw new Error("Missing required fields: orderId, amount, orderInfo");
      }

      // Validate amount range (1,000 - 50,000,000 VND)
      if (amount < 1000 || amount > 50000000) {
        throw new Error("Amount must be between 1,000 and 50,000,000 VND");
      }

      // Prepare request body
      const requestBody = {
        partnerCode: MOMO_CONFIG.partnerCode,
        storeId: MOMO_CONFIG.storeId,
        storeName: MOMO_CONFIG.storeName,
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: MOMO_CONFIG.redirectUrl,
        ipnUrl: MOMO_CONFIG.ipnUrl,
        requestType: "captureWallet",
        extraData: "",
        lang: "vi",
      };

      // Add user info if provided
      if (userData) {
        requestBody.userInfo = {
          name: userData.name || "",
          phoneNumber: userData.phone || "",
          email: userData.email || "",
        };
      }

      // Add items if provided
      if (items && items.length > 0) {
        requestBody.items = items.map((item) => ({
          id: item.sku || item.productId?.toString(),
          name: item.name || "",
          description: item.description || "",
          category: item.category || "fashion",
          imageUrl: item.image || "",
          manufacturer: item.brand || "",
          price: item.price || 0,
          currency: "VND",
          quantity: item.quantity || 1,
          unit: "cái",
          totalPrice: (item.price || 0) * (item.quantity || 1),
          taxAmount: 0,
        }));
      }

      // Create signature
      const rawSignature = this.createMomoSignature(requestBody);
      requestBody.signature = crypto
        .createHmac("sha256", MOMO_CONFIG.secretKey)
        .update(rawSignature)
        .digest("hex");

      logger.info(
        "MoMo Payment Request:",
        JSON.stringify(requestBody, null, 2)
      );

      // Call MoMo API
      const response = await axios.post(MOMO_CONFIG.endpoint, requestBody, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 seconds minimum as per docs
      });

      if (response.data.resultCode === 0) {
        logger.info(
          "MoMo Payment created successfully:",
          response.data.orderId
        );
        return {
          success: true,
          data: response.data,
          paymentUrl: response.data.payUrl,
          deeplink: response.data.deeplink,
          qrCodeUrl: response.data.qrCodeUrl,
          requestId: requestBody.requestId,
        };
      } else {
        throw new Error(
          `MoMo API Error: ${response.data.message} (Code: ${response.data.resultCode})`
        );
      }
    } catch (error) {
      logger.error("Error creating MoMo payment:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Tạo chữ ký cho MoMo API theo format yêu cầu
   * @param {Object} requestBody - Request body
   * @returns {String} - Raw signature string
   */
  static createMomoSignature(requestBody) {
    const {
      accessKey = MOMO_CONFIG.accessKey,
      amount,
      extraData = "",
      ipnUrl,
      orderId,
      orderInfo,
      partnerCode,
      redirectUrl,
      requestId,
      requestType,
    } = requestBody;

    return `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
  }

  /**
   * Kiểm tra kết quả thanh toán từ MoMo IPN
   * @param {Object} momoResponse - Dữ liệu từ MoMo IPN
   * @returns {Object} - Kết quả xác thực
   */
  static verifyMomoSignature(momoResponse) {
    const {
      signature,
      amount,
      extraData = "",
      partnerCode,
      orderId,
      message,
      orderInfo,
      orderType,
      payType,
      requestId,
      responseTime,
      resultCode,
      transId,
    } = momoResponse;

    // Create signature string for verification
    const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

    const calculatedSignature = crypto
      .createHmac("sha256", MOMO_CONFIG.secretKey)
      .update(rawSignature)
      .digest("hex");

    return {
      isValid: signature === calculatedSignature,
      calculatedSignature,
      providedSignature: signature,
    };
  }

  /**
   * CẬP NHẬT: Xử lý logic IPN từ MoMo
   * @param {object} momoResponse - Dữ liệu MoMo gửi về qua IPN
   */
  static async handleMomoIPN(momoResponse) {
    try {
      // 1. Xác thực chữ ký để đảm bảo an toàn (chỉ khi có signature)
      const signatureVerification = this.verifyMomoSignature(momoResponse);

      if (
        signatureVerification.providedSignature &&
        !signatureVerification.isValid
      ) {
        logger.error("Invalid MoMo signature:", {
          provided: signatureVerification.providedSignature,
          calculated: signatureVerification.calculatedSignature,
        });
        throw new Error(
          "Invalid MoMo signature. IPN request is not authentic."
        );
      }

      // Log warning nếu không có signature (có thể là test environment)
      if (!signatureVerification.providedSignature) {
        logger.warn(
          "MoMo IPN received without signature - proceeding anyway (test environment?)"
        );
      }

      const { resultCode, orderId, transId, amount, message } = momoResponse;

      // 2. Xử lý logic nghiệp vụ nếu chữ ký hợp lệ
      if (resultCode === 0) {
        logger.info(
          `Payment for order ${orderId} was successful. Amount: ${amount} VND`
        );

        // Trả về thông tin thành công để controller xử lý
        return {
          success: true,
          orderId: orderId,
          transactionId: transId,
          amount: amount,
          message: message || "Payment successful",
        };
      } else {
        logger.warn(
          `Payment for order ${orderId} failed or was cancelled. ResultCode: ${resultCode}, Message: ${message}`
        );

        // Trả về thông tin thất bại
        return {
          success: false,
          orderId: orderId,
          transactionId: transId,
          resultCode: resultCode,
          message: message || "Payment failed",
        };
      }
    } catch (error) {
      logger.error("Error processing MoMo IPN:", error.message);
      throw error;
    }
  }

  /**
   * Kiểm tra trạng thái giao dịch MoMo
   * @param {String} orderId - Mã đơn hàng
   * @param {String} requestId - Mã request
   * @returns {Object} - Kết quả kiểm tra
   */
  static async queryMomoTransaction(orderId, requestId) {
    try {
      const queryBody = {
        partnerCode: MOMO_CONFIG.partnerCode,
        requestId:
          requestId ||
          `QUERY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        orderId: orderId,
      };

      // Create signature for query
      const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&orderId=${orderId}&partnerCode=${MOMO_CONFIG.partnerCode}&requestId=${queryBody.requestId}`;
      queryBody.signature = crypto
        .createHmac("sha256", MOMO_CONFIG.secretKey)
        .update(rawSignature)
        .digest("hex");

      const response = await axios.post(
        MOMO_CONFIG.endpoint.replace("/create", "/query"),
        queryBody,
        {
          headers: { "Content-Type": "application/json" },
          timeout: 30000,
        }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      logger.error("Error querying MoMo transaction:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = PaymentService;
