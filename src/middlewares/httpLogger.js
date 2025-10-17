const logger = require("../config/logger");

// Middleware để log HTTP requests
const httpLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);

  // Thêm requestId vào req để có thể track
  req.requestId = requestId;

  // Log request
  const requestLog = {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    category: "http_request",
  };

  logger.http(`${req.method} ${req.originalUrl}`, requestLog);

  // Log request body cho POST/PUT requests (trừ password)
  if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
    const sanitizedBody = { ...req.body };
    // Loại bỏ password và sensitive data
    if (sanitizedBody.password) delete sanitizedBody.password;
    if (sanitizedBody.confirmPassword) delete sanitizedBody.confirmPassword;
    if (sanitizedBody.oldPassword) delete sanitizedBody.oldPassword;
    if (sanitizedBody.newPassword) delete sanitizedBody.newPassword;
    if (sanitizedBody.refreshToken) delete sanitizedBody.refreshToken;

    logger.debug("Request Body", {
      requestId,
      body: sanitizedBody,
      category: "http_request_body",
    });
  }

  // Log query parameters
  if (Object.keys(req.query).length > 0) {
    logger.debug("Query Parameters", {
      requestId,
      query: req.query,
      category: "http_query_params",
    });
  }

  // Log response
  res.on("finish", () => {
    const duration = Date.now() - startTime;

    const responseLog = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      category: "http_response",
    };

    // Log theo status code
    if (res.statusCode >= 400 && res.statusCode < 500) {
      logger.warn(
        `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`,
        responseLog
      );
    } else if (res.statusCode >= 500) {
      logger.error(
        `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`,
        responseLog
      );
    } else {
      logger.http(
        `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`,
        responseLog
      );
    }
  });

  next();
};

module.exports = httpLogger;
