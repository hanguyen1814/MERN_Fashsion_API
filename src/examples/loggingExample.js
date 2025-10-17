/**
 * Ví dụ sử dụng Winston logging trong hệ thống
 * File này chỉ để demo, không chạy trong production
 */

const logger = require("../config/logger");
const LoggerUtils = require("../utils/logger");

// Ví dụ log cơ bản
function basicLoggingExample() {
  console.log("=== Basic Logging Examples ===");

  logger.error("This is an error message");
  logger.warn("This is a warning message");
  logger.info("This is an info message");
  logger.http("This is an HTTP message");
  logger.debug("This is a debug message");
}

// Ví dụ log với metadata
function metadataLoggingExample() {
  console.log("=== Metadata Logging Examples ===");

  const userData = {
    userId: "507f1f77bcf86cd799439011",
    email: "user@example.com",
    role: "customer",
  };

  logger.info("User action performed", {
    action: "profile_update",
    ...userData,
    timestamp: new Date().toISOString(),
  });
}

// Ví dụ sử dụng LoggerUtils
function loggerUtilsExample() {
  console.log("=== LoggerUtils Examples ===");

  // Log đăng ký user
  LoggerUtils.logUserRegistration(
    "507f1f77bcf86cd799439011",
    "newuser@example.com",
    "192.168.1.100"
  );

  // Log đăng nhập thành công
  LoggerUtils.logUserLogin(
    "507f1f77bcf86cd799439011",
    "user@example.com",
    "customer",
    "192.168.1.100",
    "Mozilla/5.0..."
  );

  // Log đăng nhập thất bại
  LoggerUtils.logLoginFailure(
    "hacker@example.com",
    "invalid_password",
    "192.168.1.200"
  );

  // Log thanh toán
  LoggerUtils.logPayment(
    "momo",
    "ORD-2024-001",
    500000,
    "success",
    "507f1f77bcf86cd799439011",
    "192.168.1.100"
  );

  // Log lỗi hệ thống
  try {
    throw new Error("Database connection failed");
  } catch (error) {
    LoggerUtils.logSystemError(error, {
      context: "database",
      operation: "connect",
    });
  }

  // Log sự kiện bảo mật
  LoggerUtils.logSecurityEvent("suspicious_login_attempt", {
    ip: "192.168.1.200",
    email: "hacker@example.com",
    attempts: 5,
    blocked: true,
  });

  // Log hoạt động admin
  LoggerUtils.logAdminAction("admin123", "delete_user", "user456", {
    reason: "violation",
    ip: "192.168.1.50",
  });

  // Log performance
  LoggerUtils.logPerformance("database_query", 2500, {
    query: "findUsers",
    resultCount: 150,
  });
}

// Ví dụ log trong Express middleware
function expressMiddlewareExample() {
  console.log("=== Express Middleware Examples ===");

  // Giả lập request object
  const mockReq = {
    method: "POST",
    originalUrl: "/api/auth/login",
    ip: "192.168.1.100",
    body: { email: "user@example.com" },
    get: (header) => (header === "User-Agent" ? "Mozilla/5.0..." : undefined),
  };

  const mockRes = {
    statusCode: 200,
    on: (event, callback) => {
      if (event === "finish") {
        setTimeout(callback, 100); // Giả lập delay
      }
    },
  };

  // Log request
  logger.http(`${mockReq.method} ${mockReq.originalUrl} - IP: ${mockReq.ip}`);

  // Log response
  mockRes.on("finish", () => {
    logger.http(
      `${mockReq.method} ${mockReq.originalUrl} - Status: ${mockRes.statusCode}`
    );
  });
}

// Chạy tất cả ví dụ
function runAllExamples() {
  basicLoggingExample();
  console.log("\n");

  metadataLoggingExample();
  console.log("\n");

  loggerUtilsExample();
  console.log("\n");

  expressMiddlewareExample();
  console.log("\n");

  console.log("=== All logging examples completed ===");
  console.log("Check the logs/ directory for generated log files");
}

// Export để có thể import từ file khác
module.exports = {
  basicLoggingExample,
  metadataLoggingExample,
  loggerUtilsExample,
  expressMiddlewareExample,
  runAllExamples,
};

// Chạy ví dụ nếu file được execute trực tiếp
if (require.main === module) {
  runAllExamples();
}
