/**
 * Demo cấu trúc logging mới được cải thiện
 * Chạy: node src/examples/improvedLoggingDemo.js
 */

const logger = require("../config/logger");
const LoggerUtils = require("../utils/logger");
const LogAnalyzer = require("../utils/logAnalyzer");

// Demo các tính năng logging mới
function demoImprovedLogging() {
  console.log("🚀 Demo Improved Logging Structure\n");

  // 1. Demo structured logging với categories
  console.log("1. Structured logging với categories:");
  logger.info("User action performed", {
    userId: "507f1f77bcf86cd799439011",
    email: "demo@example.com",
    action: "profile_update",
    category: "user_action",
    requestId: "demo123",
  });

  // 2. Demo HTTP request logging
  console.log("\n2. HTTP request logging:");
  logger.http("POST /api/auth/login", {
    requestId: "demo123",
    method: "POST",
    url: "/api/auth/login",
    ip: "192.168.1.100",
    userAgent: "Mozilla/5.0...",
    category: "http_request",
  });

  // 3. Demo response logging
  console.log("\n3. HTTP response logging:");
  logger.http("POST /api/auth/login - 200 - 150ms", {
    requestId: "demo123",
    method: "POST",
    url: "/api/auth/login",
    statusCode: 200,
    duration: "150ms",
    ip: "192.168.1.100",
    category: "http_response",
  });

  // 4. Demo LoggerUtils với cấu trúc mới
  console.log("\n4. LoggerUtils với cấu trúc mới:");
  LoggerUtils.logUserLogin(
    "507f1f77bcf86cd799439011",
    "demo@example.com",
    "customer",
    "192.168.1.100",
    "Mozilla/5.0...",
    "demo123"
  );

  LoggerUtils.logPayment(
    "momo",
    "ORD-2024-001",
    500000,
    "success",
    "507f1f77bcf86cd799439011",
    "192.168.1.100",
    "demo123"
  );

  // 5. Demo error logging với context
  console.log("\n5. Error logging với context:");
  try {
    throw new Error("Database connection failed");
  } catch (error) {
    LoggerUtils.logSystemError(error, {
      context: "database",
      operation: "connect",
      requestId: "demo123",
    });
  }

  // 6. Demo security logging
  console.log("\n6. Security logging:");
  LoggerUtils.logSecurityEvent("suspicious_login_attempt", {
    ip: "192.168.1.200",
    email: "hacker@example.com",
    attempts: 5,
    blocked: true,
    requestId: "demo123",
  });

  // 7. Demo performance logging
  console.log("\n7. Performance logging:");
  LoggerUtils.logPerformance("database_query", 2500, {
    query: "findUsers",
    resultCount: 150,
    requestId: "demo123",
  });

  console.log(
    "\n✅ Demo completed! Check the logs/ directory for generated files.\n"
  );
}

// Demo log analyzer
function demoLogAnalyzer() {
  console.log("📊 Demo Log Analyzer:\n");

  const analyzer = new LogAnalyzer();

  // Hiển thị summary
  analyzer.displaySummary();

  // Demo trace request
  console.log('🔍 Tracing request "demo123":');
  const requestLogs = analyzer.traceRequest("demo123");
  if (requestLogs.length > 0) {
    requestLogs.forEach((log, index) => {
      console.log(`${index + 1}. [${log.level}] ${log.message}`);
    });
  } else {
    console.log('No logs found for request "demo123"');
  }

  console.log("\n📈 Categories analysis:");
  const categories = analyzer.analyzeByCategory();
  Object.entries(categories)
    .sort(([, a], [, b]) => b - a)
    .forEach(([category, count]) => {
      console.log(`   ${category}: ${count} logs`);
    });
}

// Chạy demo
function runDemo() {
  demoImprovedLogging();

  // Đợi một chút để logs được ghi
  setTimeout(() => {
    demoLogAnalyzer();
  }, 1000);
}

// Export để có thể import từ file khác
module.exports = {
  demoImprovedLogging,
  demoLogAnalyzer,
  runDemo,
};

// Chạy demo nếu file được execute trực tiếp
if (require.main === module) {
  runDemo();
}
