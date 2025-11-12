require("dotenv").config({ quiet: true });
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
// const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const nosqlSanitize = require("./middlewares/nosqlSanitize");
const normalizeQuery = require("./middlewares/normalizeQuery");
const { cspMiddleware, cspReportHandler } = require("./middlewares/csp");
const connectDB = require("./config/db");
const logger = require("./config/logger");
const httpLogger = require("./middlewares/httpLogger");
const {
  validateConfig: validateCloudinaryConfig,
} = require("./config/cloudinary");
const schedulerService = require("./services/scheduler.service");
const emailService = require("./services/email.service");
// Initialize Passport
require("./config/passport");

const app = express();

// Security middleware với CSP nâng cao
app.use(cspMiddleware);

app.use(
  helmet({
    // Tắt CSP của helmet vì chúng ta dùng CSP middleware riêng
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Hide X-Powered-By header
app.disable("x-powered-by");

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  })
);

// Cookie parser middleware
app.use(cookieParser());

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Data sanitization against NoSQL query injection
app.use(nosqlSanitize());

// Data sanitization against XSS (được xử lý trong nosqlSanitize)

// Prevent parameter pollution
app.use(hpp());
// Chuẩn hoá query: loại bỏ tham số trùng lặp bằng cách giữ giá trị cuối
app.use(normalizeQuery());

// HTTP logging middleware (thay thế morgan)
app.use(httpLogger);

// Vẫn giữ morgan cho development nếu cần
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/health", (_, res) => res.json({ ok: true }));

// CSP violation report endpoint
app.post("/api/csp-report", cspReportHandler);

app.use("/api", require("./routes"));

app.use(require("./middlewares/error"));

connectDB(process.env.MONGO_URI)
  .then(async () => {
    // Validate Cloudinary config
    const cloudinaryStatus = validateCloudinaryConfig()
      ? "✓"
      : "✗ (Upload features may not work)";

    // Validate Email service config
    const emailServiceStatus =
      emailService.transporter && emailService.transporter.sendMail
        ? "✓"
        : "✗ (Email features may not work)";

    // Khởi động scheduler service
    schedulerService.start();

    app.listen(process.env.PORT, () => {
      // Console output khi khởi động server
      console.log("\n" + "=".repeat(50));
      console.log("🚀 Server đã khởi động thành công");
      console.log("=".repeat(50));
      console.log(`📍 URL:        http://localhost:${process.env.PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`💾 MongoDB:    ✓ Connected`);
      console.log(`☁️  Cloudinary: ${cloudinaryStatus}`);
      console.log(
        `📧 Email:      ${emailServiceStatus} (${
          process.env.EMAIL_SERVICE || "smtp"
        })`
      );
      console.log("=".repeat(50) + "\n");
    });
  })
  .catch((err) => {
    logger.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });

// Log uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});

// Log unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  schedulerService.stop();
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  schedulerService.stop();
  process.exit(0);
});
