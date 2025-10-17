#!/usr/bin/env node

/**
 * Script để phân tích logs
 * Sử dụng: node scripts/analyze-logs.js [options]
 */

const LogAnalyzer = require("../src/utils/logAnalyzer");

const analyzer = new LogAnalyzer();

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || "summary";

switch (command) {
  case "summary":
    analyzer.displaySummary();
    break;

  case "errors":
    const hours = parseInt(args[1]) || 24;
    console.log(`\n=== ERRORS IN LAST ${hours} HOURS ===\n`);
    const errors = analyzer.getRecentErrors(hours);
    errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.message}`);
      console.log(`   Time: ${error.timestamp}`);
      console.log(`   Category: ${error.category || "N/A"}`);
      if (error.requestId) console.log(`   Request ID: ${error.requestId}`);
      console.log("");
    });
    break;

  case "categories":
    console.log("\n=== LOG CATEGORIES ===\n");
    const categories = analyzer.analyzeByCategory();
    Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`${category}: ${count} logs`);
      });
    console.log("");
    break;

  case "levels":
    console.log("\n=== LOG LEVELS ===\n");
    const levels = analyzer.analyzeByLevel();
    Object.entries(levels)
      .sort(([, a], [, b]) => b - a)
      .forEach(([level, count]) => {
        console.log(`${level}: ${count} logs`);
      });
    console.log("");
    break;

  case "trace":
    const requestId = args[1];
    if (!requestId) {
      console.log("Usage: node scripts/analyze-logs.js trace <requestId>");
      process.exit(1);
    }
    console.log(`\n=== TRACING REQUEST: ${requestId} ===\n`);
    const requestLogs = analyzer.traceRequest(requestId);
    requestLogs.forEach((log, index) => {
      console.log(`${index + 1}. [${log.level}] ${log.message}`);
      console.log(`   Time: ${log.timestamp}`);
      console.log(`   Category: ${log.category || "N/A"}`);
      console.log("");
    });
    break;

  case "files":
    console.log("\n=== LOG FILES ===\n");
    const files = analyzer.getLogFiles();
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });
    console.log("");
    break;

  default:
    console.log(`
📊 Log Analyzer - Công cụ phân tích logs

Usage: node scripts/analyze-logs.js <command> [options]

Commands:
  summary              Hiển thị tổng quan logs
  errors [hours]       Hiển thị errors gần đây (default: 24h)
  categories           Thống kê theo categories
  levels               Thống kê theo levels
  trace <requestId>    Trace một request cụ thể
  files                Liệt kê các file logs

Examples:
  node scripts/analyze-logs.js summary
  node scripts/analyze-logs.js errors 48
  node scripts/analyze-logs.js trace abc123def
  node scripts/analyze-logs.js categories
`);
}
