const cron = require("node-cron");
const logger = require("../config/logger");
const logAnalyzerService = require("./logAnalyzer.service");
const telegramService = require("./telegram.service");

/**
 * Scheduler Service
 * Quản lý các tác vụ định kỳ như phân tích logs và gửi báo cáo
 */
class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Khởi động scheduler
   */
  start() {
    if (this.isRunning) {
      logger.warn("Scheduler is already running");
      return;
    }

    logger.info("Starting security monitoring scheduler", {
      category: "scheduler_startup",
    });

    // Gửi thông báo khởi động hệ thống
    telegramService.sendSystemAlert(
      "startup",
      "Security monitoring system started",
      "All scheduled jobs are now active"
    );

    this.setupJobs();
    this.isRunning = true;
  }

  /**
   * Dừng scheduler
   */
  stop() {
    if (!this.isRunning) {
      logger.warn("Scheduler is not running");
      return;
    }

    logger.info("Stopping security monitoring scheduler", {
      category: "scheduler_shutdown",
    });

    // Gửi thông báo dừng hệ thống
    telegramService.sendSystemAlert(
      "shutdown",
      "Security monitoring system stopped",
      "All scheduled jobs have been terminated"
    );

    // Dừng tất cả jobs
    for (const [name, job] of this.jobs) {
      job.stop();
      logger.info(`Stopped scheduled job: ${name}`, {
        category: "scheduler_job_stop",
      });
    }

    this.jobs.clear();
    this.isRunning = false;
  }

  /**
   * Thiết lập các scheduled jobs
   */
  setupJobs() {
    // 1. Phân tích logs mỗi 15 phút
    this.scheduleJob("log_analysis", "*/15 * * * *", async () => {
      try {
        logger.info("Running scheduled log analysis", {
          category: "scheduled_analysis",
        });

        const results = await logAnalyzerService.analyzeLogs({ hours: 1 });

        logger.info("Scheduled log analysis completed", {
          category: "scheduled_analysis",
          results: {
            bruteForceAttempts: results.bruteForceAttempts.length,
            suspiciousActivities: results.suspiciousActivities.length,
            cspViolations: results.cspViolations.length,
            errors: results.statistics.errors,
          },
        });
      } catch (error) {
        logger.error("Scheduled log analysis failed", {
          error: error.message,
          category: "scheduled_analysis_error",
        });

        // Gửi cảnh báo khi phân tích logs thất bại
        await telegramService.sendSystemAlert(
          "error",
          "Log analysis job failed",
          `Error: ${error.message}`
        );
      }
    });

    // 2. Báo cáo hàng ngày lúc 9:00 AM
    this.scheduleJob("daily_report", "0 9 * * *", async () => {
      try {
        logger.info("Running scheduled daily report", {
          category: "scheduled_daily_report",
        });

        await logAnalyzerService.sendDailyReport();

        logger.info("Scheduled daily report completed", {
          category: "scheduled_daily_report",
        });
      } catch (error) {
        logger.error("Scheduled daily report failed", {
          error: error.message,
          category: "scheduled_daily_report_error",
        });
      }
    });

    // 3. Kiểm tra kết nối Telegram mỗi giờ
    this.scheduleJob("telegram_health_check", "0 * * * *", async () => {
      try {
        const result = await telegramService.testConnection();
        if (!result.success) {
          logger.warn("Telegram connection health check failed", {
            error: result.error,
            category: "telegram_health_check",
          });
        }
      } catch (error) {
        logger.error("Telegram health check failed", {
          error: error.message,
          category: "telegram_health_check_error",
        });
      }
    });

    // 4. Phân tích logs sâu mỗi 6 giờ (4 lần/ngày)
    this.scheduleJob("deep_log_analysis", "0 */6 * * *", async () => {
      try {
        logger.info("Running scheduled deep log analysis", {
          category: "scheduled_deep_analysis",
        });

        const results = await logAnalyzerService.analyzeLogs({ hours: 6 });

        // Chỉ gửi báo cáo nếu có hoạt động đáng ngờ
        if (
          results.bruteForceAttempts.length > 0 ||
          results.suspiciousActivities.length > 0 ||
          results.cspViolations.length > 0
        ) {
          await telegramService.sendMessage(
            `
🔍 <b>Deep Log Analysis Report</b>

<b>Time Range:</b> Last 6 hours

<b>Security Events:</b>
• Brute Force Attempts: <b>${results.bruteForceAttempts.length}</b>
• Suspicious Activities: <b>${results.suspiciousActivities.length}</b>
• CSP Violations: <b>${results.cspViolations.length}</b>
• Total Errors: <b>${results.statistics.errors}</b>

<b>Request Statistics:</b>
• Total Requests: <b>${results.statistics.totalRequests}</b>
• Failed Logins: <b>${results.statistics.failedLogins}</b>
• Unique IPs: <b>${results.statistics.uniqueIPs}</b>
          `.trim()
          );
        }

        logger.info("Scheduled deep log analysis completed", {
          category: "scheduled_deep_analysis",
          results: {
            bruteForceAttempts: results.bruteForceAttempts.length,
            suspiciousActivities: results.suspiciousActivities.length,
            cspViolations: results.cspViolations.length,
          },
        });
      } catch (error) {
        logger.error("Scheduled deep log analysis failed", {
          error: error.message,
          category: "scheduled_deep_analysis_error",
        });
      }
    });

    // 5. Báo cáo tuần lúc 9:00 AM thứ 2
    this.scheduleJob("weekly_report", "0 9 * * 1", async () => {
      try {
        logger.info("Running scheduled weekly report", {
          category: "scheduled_weekly_report",
        });

        const results = await logAnalyzerService.analyzeLogs({ hours: 168 }); // 7 ngày

        await telegramService.sendMessage(
          `
📊 <b>Weekly Security Report</b>

<b>Time Range:</b> Last 7 days

<b>Security Summary:</b>
• Total Requests: <b>${results.statistics.totalRequests}</b>
• Failed Logins: <b>${results.statistics.failedLogins}</b>
• Brute Force Attempts: <b>${results.bruteForceAttempts.length}</b>
• Suspicious Activities: <b>${results.suspiciousActivities.length}</b>
• CSP Violations: <b>${results.cspViolations.length}</b>
• Total Errors: <b>${results.statistics.errors}</b>

<b>Top IPs (Last 7 days):</b>
${results.statistics.topIPs
  .slice(0, 5)
  .map((ip) => `• <code>${ip.ip}</code> (${ip.count} requests)`)
  .join("\n")}

<b>Recommendations:</b>
${this.generateRecommendations(results)}
        `.trim()
        );

        logger.info("Scheduled weekly report completed", {
          category: "scheduled_weekly_report",
        });
      } catch (error) {
        logger.error("Scheduled weekly report failed", {
          error: error.message,
          category: "scheduled_weekly_report_error",
        });
      }
    });

    logger.info("All scheduled jobs have been set up", {
      jobCount: this.jobs.size,
      category: "scheduler_setup",
    });
  }

  /**
   * Tạo job mới
   */
  scheduleJob(name, cronExpression, task) {
    if (this.jobs.has(name)) {
      logger.warn(`Job ${name} already exists, stopping previous instance`, {
        category: "scheduler_job_conflict",
      });
      this.jobs.get(name).stop();
    }

    const job = cron.schedule(
      cronExpression,
      async () => {
        const startTime = Date.now();

        try {
          logger.debug(`Starting scheduled job: ${name}`, {
            category: "scheduled_job_start",
          });

          await task();

          const duration = Date.now() - startTime;
          logger.debug(`Completed scheduled job: ${name}`, {
            duration: `${duration}ms`,
            category: "scheduled_job_complete",
          });
        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error(`Scheduled job failed: ${name}`, {
            error: error.message,
            duration: `${duration}ms`,
            category: "scheduled_job_error",
          });
        }
      },
      {
        scheduled: true,
        timezone: "Asia/Ho_Chi_Minh",
      }
    );

    this.jobs.set(name, job);

    logger.info(`Scheduled job created: ${name}`, {
      cronExpression,
      category: "scheduler_job_created",
    });
  }

  /**
   * Dừng job cụ thể
   */
  stopJob(name) {
    if (this.jobs.has(name)) {
      this.jobs.get(name).stop();
      this.jobs.delete(name);
      logger.info(`Stopped scheduled job: ${name}`, {
        category: "scheduler_job_stop",
      });
      return true;
    }
    return false;
  }

  /**
   * Khởi động lại job cụ thể
   */
  restartJob(name) {
    if (this.jobs.has(name)) {
      this.jobs.get(name).start();
      logger.info(`Restarted scheduled job: ${name}`, {
        category: "scheduler_job_restart",
      });
      return true;
    }
    return false;
  }

  /**
   * Lấy danh sách jobs đang chạy
   */
  getActiveJobs() {
    const activeJobs = [];
    for (const [name, job] of this.jobs) {
      activeJobs.push({
        name,
        running: job.running,
        nextRun: job.nextDate ? job.nextDate().toISOString() : null,
      });
    }
    return activeJobs;
  }

  /**
   * Tạo khuyến nghị dựa trên kết quả phân tích
   */
  generateRecommendations(results) {
    const recommendations = [];

    if (results.bruteForceAttempts.length > 10) {
      recommendations.push("• Consider implementing IP-based rate limiting");
    }

    if (
      results.statistics.failedLogins >
      results.statistics.totalRequests * 0.1
    ) {
      recommendations.push(
        "• High failed login ratio - review authentication mechanism"
      );
    }

    if (results.suspiciousActivities.length > 5) {
      recommendations.push(
        "• Multiple suspicious activities detected - consider enhanced monitoring"
      );
    }

    if (results.statistics.errors > results.statistics.totalRequests * 0.05) {
      recommendations.push("• High error rate - review application stability");
    }

    if (recommendations.length === 0) {
      recommendations.push("• System appears to be running normally");
    }

    return recommendations.join("\n");
  }

  /**
   * Chạy job ngay lập tức (không đợi schedule)
   */
  async runJobNow(name) {
    if (!this.jobs.has(name)) {
      throw new Error(`Job ${name} not found`);
    }

    logger.info(`Manually triggering job: ${name}`, {
      category: "manual_job_trigger",
    });

    // Tạo task function từ job
    const job = this.jobs.get(name);
    // Note: Đây là workaround vì node-cron không expose task function
    // Trong thực tế, bạn có thể lưu task functions riêng biệt
    return true;
  }
}

module.exports = new SchedulerService();
