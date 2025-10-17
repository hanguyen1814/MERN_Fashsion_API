#!/usr/bin/env node

const SecurityTester = require("./security-test");

console.log("🚀 Khởi động Security Test Suite...\n");

// Kiểm tra server có đang chạy không
const axios = require("axios");

async function checkServer() {
  try {
    await axios.get("http://localhost:4000/health");
    console.log("✅ Server đang chạy tại http://localhost:4000\n");
    return true;
  } catch (error) {
    console.log("❌ Server không chạy. Vui lòng khởi động server trước:");
    console.log("   npm run dev\n");
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();

  if (!serverRunning) {
    process.exit(1);
  }

  const tester = new SecurityTester();

  try {
    await tester.runTests();
  } catch (error) {
    console.error("❌ Lỗi khi chạy tests:", error);
    process.exit(1);
  }
}

main();
