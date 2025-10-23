const axios = require("axios");
const logger = require("../config/logger");

/**
 * Telegram Notification Service
 * Gửi thông báo bảo mật và phân tích logs qua Telegram
 */
class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.enabled = !!(this.botToken && this.chatId);

    if (!this.enabled) {
      logger.warn(
        "Telegram notifications disabled - missing bot token or chat ID"
      );
    }
  }

  /**
   * Gửi thông báo đơn giản
   */
  async sendMessage(message, options = {}) {
    if (!this.enabled) {
      logger.debug("Telegram notification skipped - service disabled");
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

      const payload = {
        chat_id: this.chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...options,
      };

      const response = await axios.post(url, payload, {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.data.ok) {
        logger.info("Telegram notification sent successfully", {
          messageId: response.data.result.message_id,
          category: "telegram_notification",
        });
        return true;
      } else {
        logger.error("Telegram API error", {
          error: response.data,
          category: "telegram_error",
        });
        return false;
      }
    } catch (error) {
      logger.error("Failed to send Telegram notification", {
        error: error.message,
        category: "telegram_error",
      });
      return false;
    }
  }

  /**
   * Gửi thông báo bảo mật
   */
  async sendSecurityAlert(alertData) {
    const {
      type,
      severity,
      message,
      details,
      timestamp,
      ip,
      userId,
      userAgent,
      requestId,
    } = alertData;

    const severityEmoji = {
      critical: "🚨",
      high: "⚠️",
      medium: "🔶",
      low: "ℹ️",
    };

    const alertMessage = `
${severityEmoji[severity] || "⚠️"} <b>Security Alert</b>

<b>Type:</b> ${type}
<b>Severity:</b> ${severity.toUpperCase()}
<b>Time:</b> ${timestamp || new Date().toISOString()}

<b>Details:</b>
${message}

${details ? `<b>Additional Info:</b>\n${details}` : ""}

${ip ? `<b>IP:</b> <code>${ip}</code>` : ""}
${userId ? `<b>User ID:</b> <code>${userId}</code>` : ""}
${requestId ? `<b>Request ID:</b> <code>${requestId}</code>` : ""}
${userAgent ? `<b>User Agent:</b> <code>${userAgent}</code>` : ""}
    `.trim();

    return await this.sendMessage(alertMessage);
  }

  /**
   * Gửi báo cáo đăng nhập thất bại
   */
  async sendLoginFailureAlert(loginData) {
    const { email, ip, userAgent, attemptCount, reason, timestamp, requestId } =
      loginData;

    const severity =
      attemptCount >= 5 ? "critical" : attemptCount >= 3 ? "high" : "medium";

    return await this.sendSecurityAlert({
      type: "Login Failure",
      severity,
      message: `Failed login attempt for ${email}`,
      details: `Attempt #${attemptCount}\nReason: ${reason}`,
      timestamp,
      ip,
      userAgent,
      requestId,
    });
  }

  /**
   * Gửi báo cáo hoạt động đáng ngờ
   */
  async sendSuspiciousActivityAlert(activityData) {
    const { type, description, ip, userAgent, details, timestamp, requestId } =
      activityData;

    return await this.sendSecurityAlert({
      type: "Suspicious Activity",
      severity: "high",
      message: `${type}: ${description}`,
      details,
      timestamp,
      ip,
      userAgent,
      requestId,
    });
  }

  /**
   * Gửi báo cáo CSP violation
   */
  async sendCSPViolationAlert(violationData) {
    const {
      violatedDirective,
      blockedUri,
      documentUri,
      severity,
      ip,
      userAgent,
      timestamp,
      requestId,
    } = violationData;

    return await this.sendSecurityAlert({
      type: "CSP Violation",
      severity: severity || "medium",
      message: `Content Security Policy violation detected`,
      details: `Directive: ${violatedDirective}\nBlocked URI: ${blockedUri}\nDocument: ${documentUri}`,
      timestamp,
      ip,
      userAgent,
      requestId,
    });
  }

  /**
   * Gửi báo cáo tổng hợp hàng ngày
   */
  async sendDailyReport(reportData) {
    const {
      date,
      totalRequests,
      failedLogins,
      suspiciousActivities,
      cspViolations,
      errorCount,
      topIPs,
      topUserAgents,
    } = reportData;

    const reportMessage = `
📊 <b>Daily Security Report</b>
📅 <b>Date:</b> ${date}

<b>📈 Statistics:</b>
• Total Requests: <b>${totalRequests}</b>
• Failed Logins: <b>${failedLogins}</b>
• Suspicious Activities: <b>${suspiciousActivities}</b>
• CSP Violations: <b>${cspViolations}</b>
• Errors: <b>${errorCount}</b>

${
  topIPs.length > 0
    ? `<b>🔍 Top IPs:</b>\n${topIPs
        .map((ip) => `• <code>${ip.ip}</code> (${ip.count} requests)`)
        .join("\n")}`
    : ""
}

${
  topUserAgents.length > 0
    ? `<b>🌐 Top User Agents:</b>\n${topUserAgents
        .slice(0, 3)
        .map((ua) => `• ${ua.agent.substring(0, 50)}...`)
        .join("\n")}`
    : ""
}
    `.trim();

    return await this.sendMessage(reportMessage);
  }

  /**
   * Gửi thông báo hệ thống
   */
  async sendSystemAlert(type, message, details = null) {
    const alertEmojis = {
      startup: "🚀",
      shutdown: "🛑",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    };

    const alertMessage = `
${alertEmojis[type] || "ℹ️"} <b>System Alert</b>

<b>Type:</b> ${type.toUpperCase()}
<b>Message:</b> ${message}

${details ? `<b>Details:</b>\n${details}` : ""}

<b>Time:</b> ${new Date().toISOString()}
    `.trim();

    return await this.sendMessage(alertMessage);
  }

  /**
   * Test kết nối Telegram
   */
  async testConnection() {
    if (!this.enabled) {
      return { success: false, error: "Telegram service disabled" };
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/getMe`;
      const response = await axios.get(url, { timeout: 5000 });

      if (response.data.ok) {
        logger.info("Telegram bot connection test successful", {
          botInfo: response.data.result,
          category: "telegram_test",
        });
        return {
          success: true,
          botInfo: response.data.result,
        };
      } else {
        return { success: false, error: response.data };
      }
    } catch (error) {
      logger.error("Telegram bot connection test failed", {
        error: error.message,
        category: "telegram_test",
      });
      return { success: false, error: error.message };
    }
  }
}

module.exports = new TelegramService();
