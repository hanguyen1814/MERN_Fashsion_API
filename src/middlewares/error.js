const logger = require("../config/logger");

module.exports = (err, req, res, next) => {
  const status = err.statusCode || 500;

  // Log error với thông tin chi tiết
  const errorInfo = {
    message: err.message,
    status,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  };

  // Log theo mức độ nghiêm trọng
  if (status >= 500) {
    logger.error("Server Error:", errorInfo);
  } else if (status >= 400) {
    logger.warn("Client Error:", errorInfo);
  } else {
    logger.info("Error:", errorInfo);
  }

  // Không trả về stack trace trong production
  const isDevelopment = process.env.NODE_ENV === "development";

  res.status(status).json({
    ok: false,
    error: {
      code: status,
      message: err.message || "Internal Server Error",
      ...(isDevelopment && { stack: err.stack }),
    },
  });
};
