const logger = require("../config/logger");

/**
 * Utility functions để logging nhất quán trong toàn bộ ứng dụng
 */
class LoggerUtils {
  /**
   * Log thông tin đăng ký user
   */
  static logUserRegistration(userId, email, ip, requestId = null) {
    logger.info(`User registered successfully: ${email}`, {
      userId,
      email,
      ip,
      requestId,
      category: "user_registration",
      action: "registration",
    });
  }

  /**
   * Log thông tin đăng nhập thành công
   */
  static logUserLogin(userId, email, role, ip, userAgent, requestId = null) {
    logger.info(`User logged in successfully: ${email}`, {
      userId,
      email,
      role,
      ip,
      userAgent,
      requestId,
      category: "user_login",
      action: "login",
    });
  }

  /**
   * Log thông tin đăng nhập thất bại
   */
  static logLoginFailure(email, reason, ip, requestId = null) {
    logger.warn(`Login failed: ${email} - ${reason}`, {
      email,
      reason,
      ip,
      requestId,
      category: "user_login_failed",
      action: "login_failed",
    });
  }

  /**
   * Log thông tin thanh toán
   */
  static logPayment(
    paymentType,
    orderId,
    amount,
    status,
    userId,
    ip,
    requestId = null
  ) {
    const logLevel = status === "success" ? "info" : "error";
    logger[logLevel](`Payment ${paymentType} ${status}: ${orderId}`, {
      paymentType,
      orderId,
      amount,
      status,
      userId,
      ip,
      requestId,
      category: "payment",
      action: "payment",
    });
  }

  /**
   * Log thông tin đơn hàng
   */
  static logOrder(orderId, action, userId, ip, details = {}, requestId = null) {
    logger.info(`Order ${action}: ${orderId}`, {
      orderId,
      action,
      userId,
      ip,
      requestId,
      category: "order",
      ...details,
    });
  }

  /**
   * Log lỗi hệ thống
   */
  static logSystemError(error, context = {}, requestId = null) {
    logger.error(`System error: ${error.message}`, {
      message: error.message,
      stack: error.stack,
      requestId,
      category: "system_error",
      action: "system_error",
      ...context,
    });
  }

  /**
   * Log hoạt động bảo mật
   */
  static logSecurityEvent(event, details = {}, requestId = null) {
    logger.warn(`Security event: ${event}`, {
      event,
      requestId,
      category: "security",
      action: "security",
      ...details,
    });
  }

  /**
   * Log hoạt động quản trị
   */
  static logAdminAction(
    adminId,
    action,
    target,
    details = {},
    requestId = null
  ) {
    logger.info(`Admin action: ${action} on ${target}`, {
      adminId,
      action,
      target,
      requestId,
      category: "admin",
      actionType: "admin",
      ...details,
    });
  }

  /**
   * Log performance metrics
   */
  static logPerformance(operation, duration, details = {}, requestId = null) {
    const level = duration > 5000 ? "warn" : duration > 2000 ? "info" : "debug";
    logger[level](`Performance: ${operation} - ${duration}ms`, {
      operation,
      duration,
      requestId,
      category: "performance",
      action: "performance",
      ...details,
    });
  }
}

module.exports = LoggerUtils;
