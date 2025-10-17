const axios = require("axios");

// Cấu hình test
const BASE_URL = "http://localhost:4000/api";
const TEST_USER = {
  email: "test@example.com",
  password: "TestPass123",
  fullName: "Test User",
  phone: "0123456789",
};

const ADMIN_USER = {
  email: "admin@example.com",
  password: "AdminPass123",
  fullName: "Admin User",
};

class SecurityTester {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.adminToken = null;
    this.results = [];
  }

  log(test, status, message, details = null) {
    const result = {
      test,
      status,
      message,
      details,
      timestamp: new Date().toISOString(),
    };
    this.results.push(result);
    console.log(`[${status.toUpperCase()}] ${test}: ${message}`);
    if (details) console.log("   Details:", JSON.stringify(details, null, 2));
  }

  async runTests() {
    console.log("🔒 Bắt đầu test bảo mật...\n");

    await this.testSecurityHeaders();
    await this.testAuthentication();
    await this.testRBAC();
    await this.testInputValidation();
    await this.testSanitization();

    this.printSummary();
  }

  // Test 1: HTTP Security Headers
  async testSecurityHeaders() {
    console.log("\n📋 TEST 1: HTTP Security Headers");
    console.log("=".repeat(50));

    try {
      const response = await axios.get("http://localhost:4000/health");
      const headers = response.headers;

      // Test X-Powered-By header bị ẩn
      if (!headers["x-powered-by"]) {
        this.log("X-Powered-By Header", "PASS", "X-Powered-By header đã bị ẩn");
      } else {
        this.log(
          "X-Powered-By Header",
          "FAIL",
          "X-Powered-By header vẫn hiển thị",
          { value: headers["x-powered-by"] }
        );
      }

      // Test Content Security Policy
      if (headers["content-security-policy"]) {
        this.log(
          "CSP Header",
          "PASS",
          "Content Security Policy đã được thiết lập",
          { value: headers["content-security-policy"] }
        );
      } else {
        this.log(
          "CSP Header",
          "FAIL",
          "Content Security Policy không được thiết lập"
        );
      }

      // Test X-Frame-Options
      if (headers["x-frame-options"]) {
        this.log(
          "X-Frame-Options",
          "PASS",
          "X-Frame-Options đã được thiết lập",
          { value: headers["x-frame-options"] }
        );
      } else {
        this.log(
          "X-Frame-Options",
          "FAIL",
          "X-Frame-Options không được thiết lập"
        );
      }
    } catch (error) {
      this.log("Security Headers", "ERROR", "Không thể test security headers", {
        error: error.message,
      });
    }
  }

  // Test 2: Authentication Flow
  async testAuthentication() {
    console.log("\n🔐 TEST 2: Authentication Flow");
    console.log("=".repeat(50));

    try {
      // Test đăng ký
      await this.testRegistration();

      // Test đăng nhập
      await this.testLogin();

      // Test refresh token
      await this.testRefreshToken();

      // Test logout
      await this.testLogout();
    } catch (error) {
      this.log(
        "Authentication",
        "ERROR",
        "Lỗi trong quá trình test authentication",
        { error: error.message }
      );
    }
  }

  async testRegistration() {
    try {
      const response = await axios.post(`${BASE_URL}/auth/register`, TEST_USER);

      if (response.status === 201) {
        this.log("User Registration", "PASS", "Đăng ký thành công");
      } else {
        this.log("User Registration", "FAIL", "Đăng ký thất bại", {
          status: response.status,
        });
      }
    } catch (error) {
      if (error.response?.status === 409) {
        this.log(
          "User Registration",
          "SKIP",
          "User đã tồn tại, bỏ qua test đăng ký"
        );
      } else {
        this.log("User Registration", "FAIL", "Lỗi đăng ký", {
          error: error.response?.data || error.message,
        });
      }
    }
  }

  async testLogin() {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        email: TEST_USER.email,
        password: TEST_USER.password,
      });

      if (response.status === 200 && response.data.data.accessToken) {
        this.accessToken = response.data.data.accessToken;
        this.refreshToken = response.data.data.refreshToken;
        this.log("User Login", "PASS", "Đăng nhập thành công");

        // Test cookie có được set không
        const cookies = response.headers["set-cookie"];
        if (
          cookies &&
          cookies.some((cookie) => cookie.includes("accessToken"))
        ) {
          this.log("Secure Cookies", "PASS", "Secure cookies đã được set", {
            cookies: cookies.length,
          });
        } else {
          this.log("Secure Cookies", "FAIL", "Secure cookies không được set");
        }
      } else {
        this.log("User Login", "FAIL", "Đăng nhập thất bại", {
          response: response.data,
        });
      }
    } catch (error) {
      this.log("User Login", "FAIL", "Lỗi đăng nhập", {
        error: error.response?.data || error.message,
      });
    }
  }

  async testRefreshToken() {
    if (!this.refreshToken) {
      this.log("Refresh Token", "SKIP", "Không có refresh token để test");
      return;
    }

    try {
      const response = await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken: this.refreshToken,
      });

      if (response.status === 200 && response.data.data.accessToken) {
        this.log("Refresh Token", "PASS", "Refresh token thành công");
      } else {
        this.log("Refresh Token", "FAIL", "Refresh token thất bại", {
          response: response.data,
        });
      }
    } catch (error) {
      this.log("Refresh Token", "FAIL", "Lỗi refresh token", {
        error: error.response?.data || error.message,
      });
    }
  }

  async testLogout() {
    if (!this.refreshToken) {
      this.log("Logout", "SKIP", "Không có refresh token để test logout");
      return;
    }

    try {
      const response = await axios.post(`${BASE_URL}/auth/logout`, {
        refreshToken: this.refreshToken,
      });

      if (response.status === 200) {
        this.log("Logout", "PASS", "Đăng xuất thành công");
      } else {
        this.log("Logout", "FAIL", "Đăng xuất thất bại", {
          response: response.data,
        });
      }
    } catch (error) {
      this.log("Logout", "FAIL", "Lỗi đăng xuất", {
        error: error.response?.data || error.message,
      });
    }
  }

  // Test 3: RBAC (Role-Based Access Control)
  async testRBAC() {
    console.log("\n👥 TEST 3: RBAC (Role-Based Access Control)");
    console.log("=".repeat(50));

    // Test access without token
    await this.testUnauthorizedAccess();

    // Test customer permissions
    await this.testCustomerPermissions();

    // Test admin permissions
    await this.testAdminPermissions();
  }

  async testUnauthorizedAccess() {
    try {
      await axios.get(`${BASE_URL}/users`);
      this.log(
        "Unauthorized Access",
        "FAIL",
        "Có thể truy cập API mà không có token"
      );
    } catch (error) {
      if (error.response?.status === 401) {
        this.log("Unauthorized Access", "PASS", "API được bảo vệ, trả về 401");
      } else {
        this.log(
          "Unauthorized Access",
          "FAIL",
          "API không được bảo vệ đúng cách",
          { status: error.response?.status }
        );
      }
    }
  }

  async testCustomerPermissions() {
    if (!this.accessToken) {
      this.log("Customer Permissions", "SKIP", "Không có access token để test");
      return;
    }

    const headers = { Authorization: `Bearer ${this.accessToken}` };

    try {
      // Test truy cập profile của chính mình (should pass)
      const profileResponse = await axios.get(`${BASE_URL}/users/profile/me`, {
        headers,
      });
      if (profileResponse.status === 200) {
        this.log(
          "Customer - Own Profile",
          "PASS",
          "Có thể truy cập profile của chính mình"
        );
      } else {
        this.log(
          "Customer - Own Profile",
          "FAIL",
          "Không thể truy cập profile của chính mình"
        );
      }

      // Test truy cập danh sách tất cả users (should fail)
      try {
        await axios.get(`${BASE_URL}/users`, { headers });
        this.log(
          "Customer - All Users",
          "FAIL",
          "Customer có thể truy cập danh sách tất cả users"
        );
      } catch (error) {
        if (error.response?.status === 403) {
          this.log(
            "Customer - All Users",
            "PASS",
            "Customer bị từ chối truy cập danh sách users (403)"
          );
        } else {
          this.log("Customer - All Users", "FAIL", "Lỗi không mong muốn", {
            status: error.response?.status,
          });
        }
      }
    } catch (error) {
      this.log(
        "Customer Permissions",
        "ERROR",
        "Lỗi test customer permissions",
        { error: error.message }
      );
    }
  }

  async testAdminPermissions() {
    // Tạo admin user để test
    try {
      // Đăng ký admin user
      await axios.post(`${BASE_URL}/auth/register`, ADMIN_USER);

      // Đăng nhập admin
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: ADMIN_USER.email,
        password: ADMIN_USER.password,
      });

      this.adminToken = loginResponse.data.data.accessToken;

      const headers = { Authorization: `Bearer ${this.adminToken}` };

      // Test truy cập danh sách users (should pass)
      const usersResponse = await axios.get(`${BASE_URL}/users`, { headers });
      if (usersResponse.status === 200) {
        this.log(
          "Admin - All Users",
          "PASS",
          "Admin có thể truy cập danh sách users"
        );
      } else {
        this.log(
          "Admin - All Users",
          "FAIL",
          "Admin không thể truy cập danh sách users"
        );
      }

      // Test truy cập stats (should pass)
      try {
        const statsResponse = await axios.get(`${BASE_URL}/users/stats`, {
          headers,
        });
        if (statsResponse.status === 200) {
          this.log("Admin - Stats", "PASS", "Admin có thể truy cập stats");
        } else {
          this.log("Admin - Stats", "FAIL", "Admin không thể truy cập stats");
        }
      } catch (error) {
        this.log("Admin - Stats", "FAIL", "Lỗi truy cập stats", {
          error: error.response?.data,
        });
      }
    } catch (error) {
      if (error.response?.status === 409) {
        // Admin user đã tồn tại, thử đăng nhập
        try {
          const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: ADMIN_USER.email,
            password: ADMIN_USER.password,
          });
          this.adminToken = loginResponse.data.data.accessToken;
          this.log(
            "Admin Login",
            "PASS",
            "Đăng nhập admin thành công (user đã tồn tại)"
          );
        } catch (loginError) {
          this.log("Admin Login", "FAIL", "Không thể đăng nhập admin", {
            error: loginError.response?.data,
          });
        }
      } else {
        this.log("Admin Permissions", "ERROR", "Lỗi test admin permissions", {
          error: error.response?.data || error.message,
        });
      }
    }
  }

  // Test 4: Input Validation
  async testInputValidation() {
    console.log("\n✅ TEST 4: Input Validation");
    console.log("=".repeat(50));

    await this.testInvalidRegistration();
    await this.testInvalidLogin();
    await this.testInvalidProductData();
  }

  async testInvalidRegistration() {
    const invalidData = [
      { email: "invalid-email", password: "123", fullName: "A" },
      { email: "", password: "weak", fullName: "" },
      { email: "test@test.com", password: "NoNumbers", fullName: "Valid Name" },
    ];

    for (const data of invalidData) {
      try {
        await axios.post(`${BASE_URL}/auth/register`, data);
        this.log(
          "Invalid Registration",
          "FAIL",
          "Chấp nhận dữ liệu không hợp lệ",
          { data }
        );
      } catch (error) {
        if (error.response?.status === 400) {
          this.log(
            "Invalid Registration",
            "PASS",
            "Từ chối dữ liệu không hợp lệ",
            {
              data,
              errors: error.response.data.error.details,
            }
          );
        } else {
          this.log("Invalid Registration", "FAIL", "Lỗi không mong muốn", {
            status: error.response?.status,
            error: error.response?.data,
          });
        }
      }
    }
  }

  async testInvalidLogin() {
    const invalidData = [
      { email: "invalid-email", password: "any" },
      { email: "", password: "" },
      { email: "test@test.com", password: "" },
    ];

    for (const data of invalidData) {
      try {
        await axios.post(`${BASE_URL}/auth/login`, data);
        this.log(
          "Invalid Login",
          "FAIL",
          "Chấp nhận dữ liệu đăng nhập không hợp lệ",
          { data }
        );
      } catch (error) {
        if (error.response?.status === 400) {
          this.log(
            "Invalid Login",
            "PASS",
            "Từ chối dữ liệu đăng nhập không hợp lệ",
            {
              data,
              errors: error.response.data.error.details,
            }
          );
        } else {
          this.log("Invalid Login", "FAIL", "Lỗi không mong muốn", {
            status: error.response?.status,
            error: error.response?.data,
          });
        }
      }
    }
  }

  async testInvalidProductData() {
    if (!this.adminToken) {
      this.log("Invalid Product Data", "SKIP", "Không có admin token để test");
      return;
    }

    const headers = { Authorization: `Bearer ${this.adminToken}` };
    const invalidData = [
      { name: "", description: "Valid desc", price: -100, stock: -5 },
      {
        name: "A",
        description: "x".repeat(3000),
        price: "invalid",
        stock: "invalid",
      },
      { categoryId: "invalid-id", brandId: "invalid-id" },
    ];

    for (const data of invalidData) {
      try {
        await axios.post(`${BASE_URL}/products`, data, { headers });
        this.log(
          "Invalid Product Data",
          "FAIL",
          "Chấp nhận dữ liệu sản phẩm không hợp lệ",
          { data }
        );
      } catch (error) {
        if (error.response?.status === 400) {
          this.log(
            "Invalid Product Data",
            "PASS",
            "Từ chối dữ liệu sản phẩm không hợp lệ",
            {
              data,
              errors: error.response.data.error.details,
            }
          );
        } else {
          this.log("Invalid Product Data", "FAIL", "Lỗi không mong muốn", {
            status: error.response?.status,
            error: error.response?.data,
          });
        }
      }
    }
  }

  // Test 5: Data Sanitization
  async testSanitization() {
    console.log("\n🧹 TEST 5: Data Sanitization");
    console.log("=".repeat(50));

    await this.testXSSProtection();
    await this.testNoSQLInjection();
    await this.testParameterPollution();
  }

  async testXSSProtection() {
    const xssPayload = '<script>alert("XSS")</script>';

    try {
      const response = await axios.post(`${BASE_URL}/auth/register`, {
        ...TEST_USER,
        fullName: xssPayload,
        email: `test+xss@example.com`,
      });

      // Kiểm tra response có chứa script tag không
      if (JSON.stringify(response.data).includes("<script>")) {
        this.log("XSS Protection", "FAIL", "XSS payload không được sanitize");
      } else {
        this.log("XSS Protection", "PASS", "XSS payload đã được sanitize");
      }
    } catch (error) {
      // Nếu bị từ chối do validation thì cũng OK
      if (error.response?.status === 400) {
        this.log(
          "XSS Protection",
          "PASS",
          "XSS payload bị từ chối bởi validation"
        );
      } else {
        this.log("XSS Protection", "ERROR", "Lỗi test XSS protection", {
          error: error.message,
        });
      }
    }
  }

  async testNoSQLInjection() {
    const nosqlPayload = { $where: "this.passwordHash.length > 0" };

    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: TEST_USER.email,
        password: nosqlPayload,
      });
      this.log(
        "NoSQL Injection",
        "FAIL",
        "NoSQL injection payload không được sanitize"
      );
    } catch (error) {
      if (error.response?.status === 400) {
        this.log(
          "NoSQL Injection",
          "PASS",
          "NoSQL injection payload đã được sanitize"
        );
      } else {
        this.log("NoSQL Injection", "ERROR", "Lỗi test NoSQL injection", {
          error: error.message,
        });
      }
    }
  }

  async testParameterPollution() {
    try {
      const response = await axios.get(
        `${BASE_URL}/products?page=1&page=2&limit=10&limit=20`
      );

      // Kiểm tra xem có multiple values không
      if (response.config.url.includes("page=1&page=2")) {
        this.log(
          "Parameter Pollution",
          "FAIL",
          "Parameter pollution không được ngăn chặn"
        );
      } else {
        this.log(
          "Parameter Pollution",
          "PASS",
          "Parameter pollution đã được ngăn chặn"
        );
      }
    } catch (error) {
      this.log("Parameter Pollution", "ERROR", "Lỗi test parameter pollution", {
        error: error.message,
      });
    }
  }

  printSummary() {
    console.log("\n📊 TỔNG KẾT KẾT QUẢ TEST");
    console.log("=".repeat(50));

    const summary = {
      total: this.results.length,
      pass: this.results.filter((r) => r.status === "PASS").length,
      fail: this.results.filter((r) => r.status === "FAIL").length,
      skip: this.results.filter((r) => r.status === "SKIP").length,
      error: this.results.filter((r) => r.status === "ERROR").length,
    };

    console.log(`Tổng số test: ${summary.total}`);
    console.log(`✅ PASS: ${summary.pass}`);
    console.log(`❌ FAIL: ${summary.fail}`);
    console.log(`⏭️  SKIP: ${summary.skip}`);
    console.log(`⚠️  ERROR: ${summary.error}`);

    if (summary.fail > 0 || summary.error > 0) {
      console.log("\n🔍 CHI TIẾT CÁC TEST THẤT BẠI:");
      this.results
        .filter((r) => r.status === "FAIL" || r.status === "ERROR")
        .forEach((result) => {
          console.log(`\n${result.status}: ${result.test}`);
          console.log(`   Message: ${result.message}`);
          if (result.details) {
            console.log(`   Details:`, result.details);
          }
        });
    }

    console.log(
      "\n🎯 TỶ LỆ THÀNH CÔNG:",
      `${Math.round((summary.pass / summary.total) * 100)}%`
    );
  }
}

// Chạy test
if (require.main === module) {
  const tester = new SecurityTester();
  tester.runTests().catch(console.error);
}

module.exports = SecurityTester;
