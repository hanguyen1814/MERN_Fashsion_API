const fs = require("fs");
const path = require("path");
const winston = require("winston");
const logger = require("../config/logger");
const telegramService = require("./telegram.service");

/**
 * Log Analyzer Service
 * Phân tích logs để phát hiện các hoạt động đáng ngờ và gửi cảnh báo
 */
class LogAnalyzerService {
  constructor() {
    this.logsDir = path.join(process.cwd(), "logs");
    this.analysisCache = new Map();
    this.patterns = this.initializePatterns();
  }

  /**
   * Khởi tạo các pattern để phát hiện hoạt động đáng ngờ
   */
  initializePatterns() {
    return {
      // Brute force patterns
      bruteForce: {
        keywords: ["login_failed", "invalid_password", "user_not_found"],
        threshold: 5, // Số lần thất bại trong window
        windowMinutes: 15,
        severity: "high",
      },

      // Suspicious IP patterns
      suspiciousIP: {
        keywords: ["multiple_failed_logins", "different_users_same_ip"],
        threshold: 3,
        windowMinutes: 30,
        severity: "medium",
      },

      // CSP violations
      cspViolation: {
        keywords: ["csp_violation"],
        criticalDirectives: ["script-src", "object-src", "base-uri"],
        severity: "high",
      },

      // Error patterns
      errorPatterns: {
        keywords: ["error", "exception", "failed"],
        threshold: 10,
        windowMinutes: 60,
        severity: "medium",
      },

      // Unauthorized access
      unauthorizedAccess: {
        keywords: ["unauthorized", "forbidden", "access_denied"],
        threshold: 3,
        windowMinutes: 15,
        severity: "high",
      },
    };
  }

  /**
   * Phân tích logs trong khoảng thời gian
   */
  async analyzeLogs(timeRange = { hours: 1 }) {
    try {
      const endTime = new Date();
      const startTime = new Date(
        endTime.getTime() - timeRange.hours * 60 * 60 * 1000
      );

      logger.info("Starting log analysis", {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        category: "log_analysis",
      });

      const analysisResults = {
        timeframe: { startTime, endTime },
        bruteForceAttempts: await this.detectBruteForce(startTime, endTime),
        suspiciousActivities: await this.detectSuspiciousActivities(
          startTime,
          endTime
        ),
        cspViolations: await this.detectCSPViolations(startTime, endTime),
        errorPatterns: await this.detectErrorPatterns(startTime, endTime),
        unauthorizedAccess: await this.detectUnauthorizedAccess(
          startTime,
          endTime
        ),
        statistics: await this.generateStatistics(startTime, endTime),
      };

      // Gửi cảnh báo nếu có hoạt động đáng ngờ
      await this.sendAlerts(analysisResults);

      return analysisResults;
    } catch (error) {
      logger.error("Log analysis failed", {
        error: error.message,
        stack: error.stack,
        category: "log_analysis_error",
      });
      throw error;
    }
  }

  /**
   * Phát hiện brute force attacks
   */
  async detectBruteForce(startTime, endTime) {
    const pattern = this.patterns.bruteForce;
    const logs = await this.readLogsInRange(startTime, endTime);

    const bruteForceAttempts = [];
    const ipAttempts = new Map();
    const userAttempts = new Map();

    // Phân tích logs để tìm brute force patterns
    for (const log of logs) {
      if (this.matchesPattern(log, pattern.keywords)) {
        const ip = log.meta?.ip || "unknown";
        const userId = log.meta?.userId || "unknown";
        const email = log.meta?.email || "unknown";

        // Track attempts by IP
        if (!ipAttempts.has(ip)) {
          ipAttempts.set(ip, { count: 0, users: new Set(), timestamps: [] });
        }
        const ipData = ipAttempts.get(ip);
        ipData.count++;
        ipData.users.add(email);
        ipData.timestamps.push(new Date(log.timestamp));

        // Track attempts by user
        if (!userAttempts.has(email)) {
          userAttempts.set(email, { count: 0, ips: new Set(), timestamps: [] });
        }
        const userData = userAttempts.get(email);
        userData.count++;
        userData.ips.add(ip);
        userData.timestamps.push(new Date(log.timestamp));
      }
    }

    // Xác định brute force attempts
    for (const [ip, data] of ipAttempts) {
      if (data.count >= pattern.threshold) {
        bruteForceAttempts.push({
          type: "ip_brute_force",
          ip,
          attempts: data.count,
          affectedUsers: Array.from(data.users),
          severity: pattern.severity,
          timestamps: data.timestamps,
        });
      }
    }

    for (const [email, data] of userAttempts) {
      if (data.count >= pattern.threshold) {
        bruteForceAttempts.push({
          type: "user_brute_force",
          email,
          attempts: data.count,
          affectedIPs: Array.from(data.ips),
          severity: pattern.severity,
          timestamps: data.timestamps,
        });
      }
    }

    return bruteForceAttempts;
  }

  /**
   * Phát hiện hoạt động đáng ngờ
   */
  async detectSuspiciousActivities(startTime, endTime) {
    const logs = await this.readLogsInRange(startTime, endTime);
    const suspiciousActivities = [];

    // Phát hiện multiple failed logins từ cùng IP
    const ipActivity = new Map();

    for (const log of logs) {
      if (log.meta?.ip && this.matchesPattern(log, ["login_failed"])) {
        const ip = log.meta.ip;
        if (!ipActivity.has(ip)) {
          ipActivity.set(ip, { failedLogins: 0, uniqueUsers: new Set() });
        }
        const activity = ipActivity.get(ip);
        activity.failedLogins++;
        if (log.meta.email) activity.uniqueUsers.add(log.meta.email);
      }
    }

    for (const [ip, activity] of ipActivity) {
      if (activity.failedLogins >= 5 && activity.uniqueUsers.size >= 3) {
        suspiciousActivities.push({
          type: "multiple_users_same_ip",
          ip,
          failedLogins: activity.failedLogins,
          uniqueUsers: Array.from(activity.uniqueUsers),
          severity: "high",
        });
      }
    }

    return suspiciousActivities;
  }

  /**
   * Phát hiện CSP violations
   */
  async detectCSPViolations(startTime, endTime) {
    const logs = await this.readLogsInRange(startTime, endTime);
    const violations = [];

    for (const log of logs) {
      if (this.matchesPattern(log, ["csp_violation"])) {
        const violation = {
          type: "csp_violation",
          directive: log.meta?.violatedDirective || "unknown",
          blockedUri: log.meta?.blockedUri || "unknown",
          ip: log.meta?.ip || "unknown",
          userAgent: log.meta?.userAgent || "unknown",
          severity: this.patterns.cspViolation.criticalDirectives.includes(
            log.meta?.violatedDirective
          )
            ? "critical"
            : "medium",
          timestamp: log.timestamp,
        };
        violations.push(violation);
      }
    }

    return violations;
  }

  /**
   * Phát hiện error patterns
   */
  async detectErrorPatterns(startTime, endTime) {
    const logs = await this.readLogsInRange(startTime, endTime);
    const errorCounts = new Map();

    for (const log of logs) {
      if (log.level === "error") {
        const errorType = log.message || "unknown_error";
        errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
      }
    }

    const criticalErrors = [];
    for (const [errorType, count] of errorCounts) {
      if (count >= this.patterns.errorPatterns.threshold) {
        criticalErrors.push({
          type: "repeated_errors",
          errorType,
          count,
          severity: "medium",
        });
      }
    }

    return criticalErrors;
  }

  /**
   * Phát hiện unauthorized access
   */
  async detectUnauthorizedAccess(startTime, endTime) {
    const logs = await this.readLogsInRange(startTime, endTime);
    const unauthorizedAttempts = [];

    for (const log of logs) {
      if (this.matchesPattern(log, this.patterns.unauthorizedAccess.keywords)) {
        unauthorizedAttempts.push({
          type: "unauthorized_access",
          ip: log.meta?.ip || "unknown",
          endpoint: log.meta?.url || "unknown",
          userAgent: log.meta?.userAgent || "unknown",
          severity: this.patterns.unauthorizedAccess.severity,
          timestamp: log.timestamp,
        });
      }
    }

    return unauthorizedAttempts;
  }

  /**
   * Tạo thống kê tổng quan
   */
  async generateStatistics(startTime, endTime) {
    const logs = await this.readLogsInRange(startTime, endTime);

    const stats = {
      totalRequests: 0,
      failedLogins: 0,
      errors: 0,
      uniqueIPs: new Set(),
      topIPs: new Map(),
      topUserAgents: new Map(),
    };

    for (const log of logs) {
      // Count total requests
      if (log.category === "http_request") {
        stats.totalRequests++;

        // Track IPs
        if (log.meta?.ip) {
          stats.uniqueIPs.add(log.meta.ip);
          stats.topIPs.set(
            log.meta.ip,
            (stats.topIPs.get(log.meta.ip) || 0) + 1
          );
        }

        // Track User Agents
        if (log.meta?.userAgent) {
          stats.topUserAgents.set(
            log.meta.userAgent,
            (stats.topUserAgents.get(log.meta.userAgent) || 0) + 1
          );
        }
      }

      // Count failed logins
      if (log.category === "user_login_failed") {
        stats.failedLogins++;
      }

      // Count errors
      if (log.level === "error") {
        stats.errors++;
      }
    }

    return {
      totalRequests: stats.totalRequests,
      failedLogins: stats.failedLogins,
      errors: stats.errors,
      uniqueIPs: stats.uniqueIPs.size,
      topIPs: Array.from(stats.topIPs.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([ip, count]) => ({ ip, count })),
      topUserAgents: Array.from(stats.topUserAgents.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([agent, count]) => ({ agent, count })),
    };
  }

  /**
   * Gửi cảnh báo dựa trên kết quả phân tích
   */
  async sendAlerts(analysisResults) {
    const alerts = [];

    // Brute force alerts
    for (const attempt of analysisResults.bruteForceAttempts) {
      if (attempt.type === "ip_brute_force") {
        await telegramService.sendSecurityAlert({
          type: "Brute Force Attack (IP)",
          severity: attempt.severity,
          message: `Multiple failed login attempts detected from IP ${attempt.ip}`,
          details: `Attempts: ${
            attempt.attempts
          }\nAffected users: ${attempt.affectedUsers.join(", ")}`,
          ip: attempt.ip,
          timestamp: new Date().toISOString(),
        });
      } else if (attempt.type === "user_brute_force") {
        await telegramService.sendSecurityAlert({
          type: "Brute Force Attack (User)",
          severity: attempt.severity,
          message: `Multiple failed login attempts for user ${attempt.email}`,
          details: `Attempts: ${
            attempt.attempts
          }\nFrom IPs: ${attempt.affectedIPs.join(", ")}`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Suspicious activities alerts
    for (const activity of analysisResults.suspiciousActivities) {
      await telegramService.sendSuspiciousActivityAlert({
        type: "Suspicious Activity",
        description: `Multiple users targeted from same IP`,
        ip: activity.ip,
        details: `Failed logins: ${
          activity.failedLogins
        }\nUnique users: ${activity.uniqueUsers.join(", ")}`,
        timestamp: new Date().toISOString(),
      });
    }

    // CSP violations alerts
    for (const violation of analysisResults.cspViolations) {
      if (violation.severity === "critical") {
        await telegramService.sendCSPViolationAlert(violation);
      }
    }

    // Unauthorized access alerts
    for (const access of analysisResults.unauthorizedAccess) {
      await telegramService.sendSecurityAlert({
        type: "Unauthorized Access",
        severity: access.severity,
        message: `Unauthorized access attempt detected`,
        details: `Endpoint: ${access.endpoint}\nIP: ${access.ip}`,
        ip: access.ip,
        userAgent: access.userAgent,
        timestamp: access.timestamp,
      });
    }
  }

  /**
   * Đọc logs trong khoảng thời gian
   */
  async readLogsInRange(startTime, endTime) {
    const logs = [];

    try {
      const files = fs.readdirSync(this.logsDir);
      const logFiles = files.filter(
        (file) => file.endsWith(".log") && !file.includes("error") // Tránh đọc error logs riêng biệt
      );

      for (const file of logFiles) {
        try {
          const filePath = path.join(this.logsDir, file);
          const fileContent = fs.readFileSync(filePath, "utf8");
          const lines = fileContent.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            try {
              const logEntry = JSON.parse(line);
              const logTime = new Date(logEntry.timestamp);

              if (logTime >= startTime && logTime <= endTime) {
                logs.push(logEntry);
              }
            } catch (parseError) {
              // Skip invalid JSON lines
              continue;
            }
          }
        } catch (fileError) {
          logger.warn(`Failed to read log file: ${file}`, {
            error: fileError.message,
            category: "log_analysis",
          });
        }
      }
    } catch (error) {
      logger.error("Failed to read log directory", {
        error: error.message,
        category: "log_analysis",
      });
    }

    return logs;
  }

  /**
   * Kiểm tra log có khớp với pattern không
   */
  matchesPattern(log, keywords) {
    const searchText = [log.message, log.category, log.level]
      .join(" ")
      .toLowerCase();

    return keywords.some((keyword) =>
      searchText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Gửi báo cáo hàng ngày
   */
  async sendDailyReport() {
    try {
      const reportData = await this.analyzeLogs({ hours: 24 });

      await telegramService.sendDailyReport({
        date: new Date().toISOString().split("T")[0],
        totalRequests: reportData.statistics.totalRequests,
        failedLogins: reportData.statistics.failedLogins,
        suspiciousActivities: reportData.suspiciousActivities.length,
        cspViolations: reportData.cspViolations.length,
        errorCount: reportData.statistics.errors,
        topIPs: reportData.statistics.topIPs,
        topUserAgents: reportData.statistics.topUserAgents,
      });

      logger.info("Daily security report sent", {
        category: "daily_report",
      });
    } catch (error) {
      logger.error("Failed to send daily report", {
        error: error.message,
        category: "daily_report_error",
      });
    }
  }
}

module.exports = new LogAnalyzerService();
