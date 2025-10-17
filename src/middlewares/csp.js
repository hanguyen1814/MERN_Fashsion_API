const logger = require("../config/logger");
const CSPViolation = require("../models/cspViolation.model");

// CSP nâng cao với report-only mode
const cspMiddleware = (req, res, next) => {
  // Cấu hình CSP nghiêm ngặt - chỉ cho phép nguồn tĩnh tin cậy
  const cspDirectives = {
    // Chỉ cho phép tài nguyên từ cùng origin
    "default-src": ["'self'"],

    // Scripts: cấm hoàn toàn inline scripts, chỉ cho phép từ trusted sources
    "script-src": [
      "'self'", // Chỉ scripts từ cùng domain
      // Có thể thêm CDN tin cậy nếu cần:
      // "'self' 'unsafe-eval'" // Chỉ thêm nếu thực sự cần (không khuyến khích)
    ],

    // Styles: chỉ cho phép từ cùng origin và inline styles cần thiết
    "style-src": [
      "'self'",
      "'unsafe-inline'", // Cần thiết cho một số CSS framework
    ],

    // Images: chỉ từ cùng origin và data URIs
    "img-src": [
      "'self'",
      "data:", // Cho phép data URIs cho images
      "https:", // Cho phép HTTPS images từ external sources
    ],

    // Fonts: chỉ từ cùng origin
    "font-src": [
      "'self'",
      "data:", // Cho phép font data URIs
    ],

    // Connections: chỉ đến cùng origin
    "connect-src": ["'self'"],

    // Media: chỉ từ cùng origin
    "media-src": ["'self'"],

    // Objects: cấm hoàn toàn
    "object-src": ["'none'"],

    // Frames: cấm hoàn toàn (tránh clickjacking)
    "frame-src": ["'none'"],

    // Child frames: cấm hoàn toàn
    "child-src": ["'none'"],

    // Worker scripts: chỉ từ cùng origin
    "worker-src": ["'self'"],

    // Manifest: chỉ từ cùng origin
    "manifest-src": ["'self'"],

    // Form actions: chỉ gửi đến cùng origin
    "form-action": ["'self'"],

    // Base URI: chỉ từ cùng origin
    "base-uri": ["'self'"],

    // Upgrade insecure requests
    "upgrade-insecure-requests": [],

    // Block mixed content
    "block-all-mixed-content": [],

    // Report violations đến endpoint này
    "report-uri": "/api/csp-report",
  };

  // Tạo CSP header string (hỗ trợ cả mảng, string và directive không tham số)
  const cspString = Object.entries(cspDirectives)
    .map(([directive, sources]) => {
      // Nếu là mảng
      if (Array.isArray(sources)) {
        return sources.length === 0
          ? directive
          : `${directive} ${sources.join(" ")}`;
      }
      // Nếu là string (ví dụ: report-uri)
      if (typeof sources === "string" && sources.trim().length > 0) {
        return `${directive} ${sources.trim()}`;
      }
      // Fallback: chỉ dùng directive nếu không có giá trị hợp lệ
      return directive;
    })
    .join("; ");

  // Set CSP header với report-only mode
  res.setHeader("Content-Security-Policy-Report-Only", cspString);

  // Log CSP policy được áp dụng
  logger.debug("CSP Policy Applied", {
    requestId: req.requestId,
    policy: cspString,
    category: "csp_policy",
  });

  next();
};

// Middleware để xử lý CSP violation reports
const cspReportHandler = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed. Only POST requests are accepted.",
    });
  }

  try {
    const report = req.body;
    const cspReport = report["csp-report"];

    if (!cspReport) {
      return res.status(400).json({
        error: "Missing csp-report in request body",
      });
    }

    // Xác định mức độ nghiêm trọng dựa trên directive bị vi phạm
    const getSeverity = (directive) => {
      const criticalDirectives = ["script-src", "object-src", "base-uri"];
      const highDirectives = ["frame-src", "form-action", "connect-src"];

      if (criticalDirectives.includes(directive)) return "critical";
      if (highDirectives.includes(directive)) return "high";
      if (directive.includes("script") || directive.includes("object"))
        return "medium";
      return "low";
    };

    // Tạo violation record
    const violationData = {
      documentUri: cspReport.documentURI || req.get("Referer") || "unknown",
      violatedDirective: cspReport.violatedDirective || "unknown",
      effectiveDirective:
        cspReport.effectiveDirective || cspReport.violatedDirective,
      originalPolicy: cspReport.originalPolicy || "unknown",
      blockedUri: cspReport.blockedURI || null,
      sourceFile: cspReport.sourceFile || null,
      lineNumber: cspReport.lineNumber || null,
      columnNumber: cspReport.columnNumber || null,
      statusCode: cspReport.statusCode || null,
      userAgent: req.get("User-Agent") || null,
      ip: req.ip || null,
      referrer: req.get("Referer") || null,
      severity: getSeverity(cspReport.violatedDirective),
      requestId: req.requestId || null,
    };

    // Lưu vào database
    const violation = new CSPViolation(violationData);
    await violation.save();

    // Log CSP violation với chi tiết
    logger.warn("CSP Violation Detected and Saved", {
      requestId: req.requestId,
      violationId: violation._id,
      violation: {
        documentUri: violationData.documentUri,
        violatedDirective: violationData.violatedDirective,
        blockedUri: violationData.blockedUri,
        severity: violationData.severity,
        userAgent: violationData.userAgent,
        ip: violationData.ip,
        timestamp: new Date().toISOString(),
      },
      category: "csp_violation",
    });

    res.status(204).send(); // No content response
  } catch (error) {
    logger.error("Error processing CSP report", {
      requestId: req.requestId,
      error: error.message,
      stack: error.stack,
      category: "csp_error",
    });

    res.status(400).json({
      error: "Invalid CSP report format",
    });
  }
};

module.exports = {
  cspMiddleware,
  cspReportHandler,
};
