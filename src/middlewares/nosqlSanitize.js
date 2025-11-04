/**
 * Custom NoSQL injection sanitization middleware
 * Thay thế cho express-mongo-sanitize để tương thích với Express 5.x
 */

const logger = require("../config/logger");

const sanitize = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    // Loại bỏ ký tự nguy hiểm cho NoSQL injection và strip các thẻ script cơ bản
    const noDollar = obj.replace(/[\$]/g, "");
    // Loại bỏ thẻ <script> ... </script>
    const noScriptTag = noDollar.replace(/<\/?script[^>]*>/gi, "");
    // Encode thô các dấu nhọn để giảm rủi ro XSS trong phản hồi JSON
    return noScriptTag.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  if (typeof obj === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Loại bỏ các keys nguy hiểm
      if (key.startsWith("$") || key.includes("$")) {
        continue;
      }
      sanitized[key] = sanitize(value);
    }
    return sanitized;
  }

  return obj;
};

const nosqlSanitize = () => {
  return (req, res, next) => {
    try {
      // Sanitize request body
      if (req.body) {
        req.body = sanitize(req.body);
      }

      // Sanitize request query
      if (req.query) {
        // Express 5: req.query là getter-only; không gán lại trực tiếp
        const sanitizedQuery = sanitize(req.query);
        Object.keys(req.query).forEach((key) => delete req.query[key]);
        Object.assign(req.query, sanitizedQuery);
      }

      // Sanitize request params
      if (req.params) {
        // Tránh gán lại object hệ thống
        const sanitizedParams = sanitize(req.params);
        Object.keys(req.params).forEach((key) => delete req.params[key]);
        Object.assign(req.params, sanitizedParams);
      }

      next();
    } catch (error) {
      logger.error("NoSQL sanitization error:", error);
      next();
    }
  };
};

module.exports = nosqlSanitize;
