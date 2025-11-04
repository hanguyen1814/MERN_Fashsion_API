# PROMPT: Logging và Error Handling Best Practices

## Mục tiêu

Thiết lập hệ thống logging và xử lý lỗi an toàn, không lộ stack trace trong production, nhưng vẫn cung cấp đầy đủ thông tin để debug.

---

## 1. CẤU HÌNH LOGGER (Winston với Daily Rotate)

### Yêu cầu

- Sử dụng `winston` và `winston-daily-rotate-file`
- Tách log thành các file riêng: application, error, http, access
- Log format khác nhau cho console (dễ đọc) và file (JSON)
- Rotation tự động theo ngày, giới hạn kích thước và thời gian lưu trữ

### Cấu trúc Logger

```javascript
// src/config/logger.js
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");

// Định nghĩa log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Định nghĩa màu sắc cho console
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};
winston.addColors(colors);

// Console format (dễ đọc cho dev)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.colorize(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level}] ${message}${metaStr}`;
  })
);

// File format (JSON cho dễ parse)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }), // Capture stack traces
  winston.format.json()
);

// Transports
const transports = [
  // Console
  new winston.transports.Console({
    format: consoleFormat,
  }),

  // Application logs (tất cả)
  new DailyRotateFile({
    filename: path.join("logs", "application-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    maxSize: "20m",
    maxFiles: "14d",
    format: fileFormat,
  }),

  // Error logs (chỉ errors)
  new DailyRotateFile({
    filename: path.join("logs", "error-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    level: "error",
    maxSize: "20m",
    maxFiles: "30d", // Lưu errors lâu hơn
    format: fileFormat,
  }),

  // HTTP logs
  new DailyRotateFile({
    filename: path.join("logs", "http-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    level: "http",
    maxSize: "20m",
    maxFiles: "7d",
    format: fileFormat,
  }),

  // Access logs (human-readable)
  new DailyRotateFile({
    filename: path.join("logs", "access-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    maxSize: "20m",
    maxFiles: "7d",
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
      winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;
        return `${timestamp} [${level.toUpperCase()}] ${message}`;
      })
    ),
  }),
];

// Tạo logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "warn",
  levels,
  transports,
  exitOnError: false,
});

module.exports = logger;
```

---

## 2. ERROR MIDDLEWARE (Quan trọng nhất - Không lộ stack)

### Nguyên tắc

- **KHÔNG BAO GIỜ** trả về stack trace trong response cho client
- Chỉ log stack trace vào file logs (server-side)
- Phân biệt development vs production environment
- Log đầy đủ context: URL, method, IP, user-agent, timestamp

### Error Middleware

```javascript
// src/middlewares/error.js
const logger = require("../config/logger");

module.exports = (err, req, res, next) => {
  const status = err.statusCode || 500;

  // Log error với thông tin chi tiết (SERVER-SIDE ONLY)
  const errorInfo = {
    message: err.message,
    status,
    stack: err.stack, // ✅ Stack chỉ trong logs, không trong response
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

  // Response cho client - KHÔNG có stack trace
  const isDevelopment = process.env.NODE_ENV === "development";

  res.status(status).json({
    ok: false,
    error: {
      code: status,
      message: err.message || "Internal Server Error",
      // ❌ KHÔNG BAO GIỜ: stack: err.stack trong production
      // ✅ CHỈ trong development để debug
      ...(isDevelopment && { stack: err.stack }),
    },
  });
};
```

### Response Format Chuẩn

```javascript
// src/utils/apiResponse.js
// Success responses
exports.ok = (res, data = {}, meta = {}) =>
  res.json({
    status: true,
    data,
    ...(Object.keys(meta).length ? { meta } : {}),
  });

exports.created = (res, data = {}) =>
  res.status(201).json({ status: true, data });

// Error responses
exports.fail = (res, code = 400, message = "Bad request", details = null) =>
  res.status(code).json({
    status: false,
    message,
    ...(details ? { details } : {}),
  });
```

---

## 3. ASYNC HANDLER (Bắt lỗi async tự động)

### Mục đích

Bọc các async controller để tự động catch errors và pass vào error middleware

### Async Handler Utility

```javascript
// src/utils/asyncHandler.js
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

### Cách sử dụng trong Controller

```javascript
const asyncHandler = require("../utils/asyncHandler");
const { ok, fail } = require("../utils/apiResponse");

class ProductController {
  // ✅ Wrap bằng asyncHandler để tự động catch errors
  static list = asyncHandler(async (req, res) => {
    const products = await Product.find();
    return ok(res, products);
  });

  static create = asyncHandler(async (req, res) => {
    const { name } = req.body;

    if (!name) {
      return fail(res, 400, "name là bắt buộc");
    }

    // Nếu có lỗi, asyncHandler sẽ tự động catch và pass vào error middleware
    const product = await Product.create(req.body);
    return created(res, product);
  });
}
```

---

## 4. HTTP REQUEST LOGGING MIDDLEWARE

### Mục đích

Log tất cả HTTP requests với metadata: method, URL, status, duration, IP, user-agent

### HTTP Logger Middleware

```javascript
// src/middlewares/httpLogger.js
const logger = require("../config/logger");

const httpLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  req.requestId = requestId; // Dùng để track request trong logs

  // Log request
  logger.http(`${req.method} ${req.originalUrl}`, {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    category: "http_request",
  });

  // Log request body (sanitize sensitive data)
  if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
    const sanitizedBody = { ...req.body };
    // ❌ Loại bỏ passwords và sensitive data
    if (sanitizedBody.password) delete sanitizedBody.password;
    if (sanitizedBody.confirmPassword) delete sanitizedBody.confirmPassword;
    if (sanitizedBody.refreshToken) delete sanitizedBody.refreshToken;

    logger.debug("Request Body", {
      requestId,
      body: sanitizedBody,
      category: "http_request_body",
    });
  }

  // Log response khi finish
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
    if (res.statusCode >= 500) {
      logger.error(
        `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`,
        responseLog
      );
    } else if (res.statusCode >= 400) {
      logger.warn(
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
```

---

## 5. LOGGER UTILITIES (Tùy chọn - Log có cấu trúc)

### Mục đích

Cung cấp các helper functions để log các events quan trọng với format nhất quán

### Logger Utils

```javascript
// src/utils/logger.js
const logger = require("../config/logger");

class LoggerUtils {
  static logSystemError(error, context = {}, requestId = null) {
    logger.error(`System error: ${error.message}`, {
      message: error.message,
      stack: error.stack, // ✅ Stack chỉ trong logs
      requestId,
      category: "system_error",
      ...context,
    });
  }

  static logSecurityEvent(event, details = {}, requestId = null) {
    logger.warn(`Security event: ${event}`, {
      event,
      requestId,
      category: "security",
      ...details,
    });
  }

  static logPerformance(operation, duration, details = {}, requestId = null) {
    const level = duration > 5000 ? "warn" : duration > 2000 ? "info" : "debug";
    logger[level](`Performance: ${operation} - ${duration}ms`, {
      operation,
      duration,
      requestId,
      category: "performance",
      ...details,
    });
  }
}

module.exports = LoggerUtils;
```

---

## 6. SETUP TRONG SERVER

### App.js hoặc server.js

```javascript
const express = require("express");
const httpLogger = require("./middlewares/httpLogger");
const errorHandler = require("./middlewares/error");

const app = express();

// ✅ HTTP logging phải ở đầu middleware chain
app.use(httpLogger);

// ... other middlewares và routes ...

// ✅ Error handler phải ở CUỐI CÙNG (sau tất cả routes)
app.use(errorHandler);
```

---

## 7. BEST PRACTICES TỔNG KẾT

### ✅ NÊN LÀM

1. **Log stack trace CHỈ trong file logs**, không bao giờ trong response
2. **Phân biệt development vs production**: chỉ show stack trong dev
3. **Log đầy đủ context**: URL, method, IP, user-agent, timestamp, requestId
4. **Sanitize sensitive data**: không log passwords, tokens, credit cards
5. **Sử dụng asyncHandler**: bọc tất cả async controllers
6. **Log levels phù hợp**: error, warn, info, http, debug
7. **Rotation logs**: tự động xoay và giới hạn kích thước
8. **Structured logging**: dùng JSON format trong files để dễ parse

### ❌ KHÔNG BAO GIỜ

1. **KHÔNG trả về stack trace trong response** (trừ development)
2. **KHÔNG log passwords, tokens, sensitive data**
3. **KHÔNG để lỗi unhandled**: luôn dùng asyncHandler hoặc try-catch
4. **KHÔNG log quá nhiều**: chỉ log thông tin cần thiết
5. **KHÔNG hardcode thông tin debug trong production**

### 📋 Checklist

- [ ] Logger được cấu hình với winston và daily-rotate-file
- [ ] Error middleware KHÔNG trả về stack trace trong production
- [ ] Tất cả async controllers được wrap bằng asyncHandler
- [ ] HTTP logger middleware log requests/responses
- [ ] Sensitive data được sanitize trước khi log
- [ ] Log files được rotate tự động
- [ ] Response format nhất quán (ok/fail/created)
- [ ] Environment variable NODE_ENV được set đúng (development/production)

---

## 8. VÍ DỤ SỬ DỤNG HOÀN CHỈNH

### Controller Example

```javascript
const Product = require("../models/product.model");
const asyncHandler = require("../utils/asyncHandler");
const { ok, created, fail } = require("../utils/apiResponse");
const logger = require("../config/logger");

class ProductController {
  static list = asyncHandler(async (req, res) => {
    // Nếu có lỗi ở đây, asyncHandler sẽ tự động catch
    const products = await Product.find();
    return ok(res, products);
  });

  static create = asyncHandler(async (req, res) => {
    const { name, price } = req.body;

    // Validation - trả về client error
    if (!name || !price) {
      return fail(res, 400, "name và price là bắt buộc");
    }

    try {
      const product = await Product.create(req.body);
      return created(res, product);
    } catch (error) {
      // Xử lý specific errors (ví dụ: duplicate key)
      if (error.code === 11000) {
        return fail(res, 409, "Sản phẩm đã tồn tại");
      }
      // Throw lại để error middleware xử lý
      throw error;
    }
  });

  static getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return fail(res, 404, "Không tìm thấy sản phẩm");
    }

    return ok(res, product);
  });
}

module.exports = ProductController;
```

### Route Example

```javascript
const express = require("express");
const ProductController = require("../controllers/product.controller");

const router = express.Router();

router.get("/", ProductController.list);
router.post("/", ProductController.create);
router.get("/:id", ProductController.getById);

module.exports = router;
```

---

## KẾT LUẬN

Hệ thống này đảm bảo:

- ✅ **An toàn**: Không lộ stack trace, không lộ sensitive data
- ✅ **Debug được**: Log đầy đủ thông tin trong files
- ✅ **Dễ maintain**: Format nhất quán, structured logging
- ✅ **Production-ready**: Rotation, size limits, retention policies
- ✅ **Developer-friendly**: Dễ debug trong development, an toàn trong production
