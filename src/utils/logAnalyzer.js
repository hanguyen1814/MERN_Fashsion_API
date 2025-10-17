const fs = require("fs");
const path = require("path");

/**
 * Utility để phân tích và đọc logs dễ dàng hơn
 */
class LogAnalyzer {
  constructor(logsDir = "logs") {
    this.logsDir = path.join(process.cwd(), logsDir);
  }

  /**
   * Đọc và phân tích log file
   */
  readLogFile(filename, options = {}) {
    const filePath = path.join(this.logsDir, filename);

    if (!fs.existsSync(filePath)) {
      console.log(`File ${filename} không tồn tại`);
      return [];
    }

    const content = fs.readFileSync(filePath, "utf8");
    const lines = content
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    const logs = lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        // Nếu không parse được JSON, trả về raw line
        return { raw: line };
      }
    });

    // Filter theo options
    if (options.level) {
      return logs.filter(
        (log) => log.level && log.level.includes(options.level)
      );
    }

    if (options.category) {
      return logs.filter((log) => log.category === options.category);
    }

    if (options.requestId) {
      return logs.filter((log) => log.requestId === options.requestId);
    }

    return logs;
  }

  /**
   * Lấy danh sách các file log có sẵn
   */
  getLogFiles() {
    if (!fs.existsSync(this.logsDir)) {
      return [];
    }

    return fs
      .readdirSync(this.logsDir)
      .filter((file) => file.endsWith(".log"))
      .sort()
      .reverse(); // Mới nhất trước
  }

  /**
   * Phân tích logs theo category
   */
  analyzeByCategory(filename = null) {
    const files = filename ? [filename] : this.getLogFiles();
    const categories = {};

    files.forEach((file) => {
      const logs = this.readLogFile(file);
      logs.forEach((log) => {
        if (log.category) {
          if (!categories[log.category]) {
            categories[log.category] = 0;
          }
          categories[log.category]++;
        }
      });
    });

    return categories;
  }

  /**
   * Phân tích logs theo level
   */
  analyzeByLevel(filename = null) {
    const files = filename ? [filename] : this.getLogFiles();
    const levels = {};

    files.forEach((file) => {
      const logs = this.readLogFile(file);
      logs.forEach((log) => {
        if (log.level) {
          const cleanLevel = log.level.replace(/\u001b\[[0-9;]*m/g, ""); // Remove color codes
          if (!levels[cleanLevel]) {
            levels[cleanLevel] = 0;
          }
          levels[cleanLevel]++;
        }
      });
    });

    return levels;
  }

  /**
   * Tìm logs của một request cụ thể
   */
  traceRequest(requestId, filename = null) {
    const files = filename ? [filename] : this.getLogFiles();
    const requestLogs = [];

    files.forEach((file) => {
      const logs = this.readLogFile(file, { requestId });
      requestLogs.push(...logs);
    });

    return requestLogs.sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
  }

  /**
   * Tìm errors gần đây
   */
  getRecentErrors(hours = 24) {
    const files = this.getLogFiles();
    const errors = [];
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    files.forEach((file) => {
      const logs = this.readLogFile(file, { level: "error" });
      logs.forEach((log) => {
        if (log.timestamp && new Date(log.timestamp) > cutoffTime) {
          errors.push(log);
        }
      });
    });

    return errors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Thống kê tổng quan
   */
  getSummary() {
    const files = this.getLogFiles();
    const categories = this.analyzeByCategory();
    const levels = this.analyzeByLevel();
    const recentErrors = this.getRecentErrors(24);

    return {
      totalFiles: files.length,
      categories,
      levels,
      recentErrors: recentErrors.length,
      latestErrors: recentErrors.slice(0, 5),
    };
  }

  /**
   * Hiển thị summary đẹp mắt
   */
  displaySummary() {
    const summary = this.getSummary();

    console.log("\n=== LOG ANALYSIS SUMMARY ===");
    console.log(`📁 Total log files: ${summary.totalFiles}`);
    console.log(`⚠️  Recent errors (24h): ${summary.recentErrors}`);

    console.log("\n📊 Categories:");
    Object.entries(summary.categories)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`   ${category}: ${count}`);
      });

    console.log("\n📈 Levels:");
    Object.entries(summary.levels)
      .sort(([, a], [, b]) => b - a)
      .forEach(([level, count]) => {
        console.log(`   ${level}: ${count}`);
      });

    if (summary.latestErrors.length > 0) {
      console.log("\n🚨 Latest Errors:");
      summary.latestErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.message} (${error.timestamp})`);
      });
    }

    console.log("\n================================\n");
  }
}

module.exports = LogAnalyzer;
