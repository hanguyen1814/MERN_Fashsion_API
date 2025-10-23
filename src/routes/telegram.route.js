const router = require("express").Router();
const telegramService = require("../services/telegram.service");
const logAnalyzerService = require("../services/logAnalyzer.service");
const schedulerService = require("../services/scheduler.service");
const { requireAdmin } = require("../middlewares/rbac");

/**
 * Telegram Notification Routes
 * Quản lý thông báo và phân tích logs
 */

// Test kết nối Telegram
router.get("/test", requireAdmin, async (req, res) => {
  try {
    const result = await telegramService.testConnection();

    if (result.success) {
      return res.json({
        ok: true,
        message: "Telegram connection successful",
        botInfo: result.botInfo,
      });
    } else {
      return res.status(500).json({
        ok: false,
        error: "Telegram connection failed",
        details: result.error,
      });
    }
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Failed to test Telegram connection",
      details: error.message,
    });
  }
});

// Gửi thông báo test
router.post("/test-message", requireAdmin, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        ok: false,
        error: "Message is required",
      });
    }

    const success = await telegramService.sendMessage(
      `🧪 <b>Test Message</b>\n\n${message}\n\n<i>Sent from MERN Fashion Security System</i>`
    );

    if (success) {
      return res.json({
        ok: true,
        message: "Test message sent successfully",
      });
    } else {
      return res.status(500).json({
        ok: false,
        error: "Failed to send test message",
      });
    }
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Failed to send test message",
      details: error.message,
    });
  }
});

// Gửi cảnh báo bảo mật test
router.post("/test-security-alert", requireAdmin, async (req, res) => {
  try {
    const { type, severity, message, details } = req.body;

    const success = await telegramService.sendSecurityAlert({
      type: type || "Test Security Alert",
      severity: severity || "medium",
      message: message || "This is a test security alert",
      details: details || "Test details for security alert",
      timestamp: new Date().toISOString(),
      ip: req.ip,
      requestId: req.requestId,
    });

    if (success) {
      return res.json({
        ok: true,
        message: "Test security alert sent successfully",
      });
    } else {
      return res.status(500).json({
        ok: false,
        error: "Failed to send test security alert",
      });
    }
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Failed to send test security alert",
      details: error.message,
    });
  }
});

// Chạy phân tích logs ngay lập tức
router.post("/analyze-logs", requireAdmin, async (req, res) => {
  try {
    const { hours = 1 } = req.body;

    const results = await logAnalyzerService.analyzeLogs({ hours });

    return res.json({
      ok: true,
      message: "Log analysis completed",
      results: {
        timeframe: results.timeframe,
        bruteForceAttempts: results.bruteForceAttempts.length,
        suspiciousActivities: results.suspiciousActivities.length,
        cspViolations: results.cspViolations.length,
        errorPatterns: results.errorPatterns.length,
        unauthorizedAccess: results.unauthorizedAccess.length,
        statistics: results.statistics,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Failed to analyze logs",
      details: error.message,
    });
  }
});

// Gửi báo cáo hàng ngày
router.post("/daily-report", requireAdmin, async (req, res) => {
  try {
    await logAnalyzerService.sendDailyReport();

    return res.json({
      ok: true,
      message: "Daily report sent successfully",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Failed to send daily report",
      details: error.message,
    });
  }
});

// Quản lý scheduler
router.get("/scheduler/status", requireAdmin, async (req, res) => {
  try {
    const activeJobs = schedulerService.getActiveJobs();

    return res.json({
      ok: true,
      message: "Scheduler status retrieved",
      isRunning: schedulerService.isRunning,
      activeJobs,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Failed to get scheduler status",
      details: error.message,
    });
  }
});

// Khởi động scheduler
router.post("/scheduler/start", requireAdmin, async (req, res) => {
  try {
    schedulerService.start();

    return res.json({
      ok: true,
      message: "Scheduler started successfully",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Failed to start scheduler",
      details: error.message,
    });
  }
});

// Dừng scheduler
router.post("/scheduler/stop", requireAdmin, async (req, res) => {
  try {
    schedulerService.stop();

    return res.json({
      ok: true,
      message: "Scheduler stopped successfully",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Failed to stop scheduler",
      details: error.message,
    });
  }
});

// Dừng job cụ thể
router.delete("/scheduler/jobs/:jobName", requireAdmin, async (req, res) => {
  try {
    const { jobName } = req.params;

    const success = schedulerService.stopJob(jobName);

    if (success) {
      return res.json({
        ok: true,
        message: `Job ${jobName} stopped successfully`,
      });
    } else {
      return res.status(404).json({
        ok: false,
        error: `Job ${jobName} not found`,
      });
    }
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Failed to stop job",
      details: error.message,
    });
  }
});

// Khởi động lại job cụ thể
router.post(
  "/scheduler/jobs/:jobName/restart",
  requireAdmin,
  async (req, res) => {
    try {
      const { jobName } = req.params;

      const success = schedulerService.restartJob(jobName);

      if (success) {
        return res.json({
          ok: true,
          message: `Job ${jobName} restarted successfully`,
        });
      } else {
        return res.status(404).json({
          ok: false,
          error: `Job ${jobName} not found`,
        });
      }
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: "Failed to restart job",
        details: error.message,
      });
    }
  }
);

// Gửi thông báo hệ thống
router.post("/system-alert", requireAdmin, async (req, res) => {
  try {
    const { type, message, details } = req.body;

    if (!type || !message) {
      return res.status(400).json({
        ok: false,
        error: "Type and message are required",
      });
    }

    const success = await telegramService.sendSystemAlert(
      type,
      message,
      details
    );

    if (success) {
      return res.json({
        ok: true,
        message: "System alert sent successfully",
      });
    } else {
      return res.status(500).json({
        ok: false,
        error: "Failed to send system alert",
      });
    }
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Failed to send system alert",
      details: error.message,
    });
  }
});

module.exports = router;
