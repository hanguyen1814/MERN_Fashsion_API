# Hướng dẫn thiết lập Telegram Notifications

## Tổng quan

Hệ thống MERN Fashion đã được tích hợp tính năng phân tích logs và gửi thông báo qua Telegram để giám sát bảo mật và phản ứng nhanh với các sự cố.

## Tính năng chính

### 🔍 **Log Analysis & Monitoring**

- Phân tích logs tự động mỗi 15 phút
- Phát hiện brute force attacks
- Phát hiện hoạt động đáng ngờ
- Phân tích CSP violations
- Theo dõi error patterns
- Phát hiện unauthorized access

### 📱 **Telegram Notifications**

- Cảnh báo bảo mật real-time
- Báo cáo đăng nhập thất bại
- Thông báo hoạt động đáng ngờ
- Báo cáo CSP violations
- Báo cáo hàng ngày/tuần
- Thông báo hệ thống

### ⏰ **Scheduled Jobs**

- Phân tích logs mỗi 15 phút
- Báo cáo hàng ngày lúc 9:00 AM
- Kiểm tra kết nối Telegram mỗi giờ
- Phân tích logs sâu mỗi 6 giờ
- Báo cáo tuần lúc 9:00 AM thứ 2

## Cài đặt

### 1. Tạo Telegram Bot

1. Mở Telegram và tìm `@BotFather`
2. Gửi lệnh `/newbot`
3. Đặt tên cho bot (ví dụ: "MERN Fashion Security Bot")
4. Đặt username cho bot (ví dụ: "mern_fashion_security_bot")
5. Lưu lại **Bot Token** (dạng: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Lấy Chat ID

#### Cách 1: Sử dụng Bot

1. Tìm bot vừa tạo và gửi tin nhắn bất kỳ
2. Truy cập: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Tìm `chat.id` trong response

#### Cách 2: Sử dụng @userinfobot

1. Gửi tin nhắn cho `@userinfobot`
2. Bot sẽ trả về Chat ID của bạn

### 3. Cấu hình Environment Variables

Thêm vào file `.env`:

```env
# Telegram Configuration
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789

# Optional: Custom JWT settings
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES=15m
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRES=7d
```

### 4. Cài đặt Dependencies

```bash
npm install node-cron
```

## API Endpoints

### 🔧 **Telegram Management**

#### Test kết nối Telegram

```http
GET /api/telegram/test
Authorization: Bearer <admin_token>
```

#### Gửi tin nhắn test

```http
POST /api/telegram/test-message
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "message": "Test message from MERN Fashion"
}
```

#### Gửi cảnh báo bảo mật test

```http
POST /api/telegram/test-security-alert
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "type": "Test Alert",
  "severity": "high",
  "message": "This is a test security alert",
  "details": "Test details for security alert"
}
```

### 📊 **Log Analysis**

#### Phân tích logs ngay lập tức

```http
POST /api/telegram/analyze-logs
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "hours": 1
}
```

#### Gửi báo cáo hàng ngày

```http
POST /api/telegram/daily-report
Authorization: Bearer <admin_token>
```

### ⏰ **Scheduler Management**

#### Xem trạng thái scheduler

```http
GET /api/telegram/scheduler/status
Authorization: Bearer <admin_token>
```

#### Khởi động scheduler

```http
POST /api/telegram/scheduler/start
Authorization: Bearer <admin_token>
```

#### Dừng scheduler

```http
POST /api/telegram/scheduler/stop
Authorization: Bearer <admin_token>
```

#### Dừng job cụ thể

```http
DELETE /api/telegram/scheduler/jobs/{jobName}
Authorization: Bearer <admin_token>
```

#### Khởi động lại job

```http
POST /api/telegram/scheduler/jobs/{jobName}/restart
Authorization: Bearer <admin_token>
```

## Các loại thông báo

### 🚨 **Security Alerts**

#### Brute Force Attack

```
🚨 Security Alert

Type: Brute Force Attack (IP)
Severity: HIGH
Time: 2024-01-15T10:30:00.000Z

Details:
Multiple failed login attempts detected from IP 192.168.1.100
Attempts: 8
Affected users: user1@example.com, user2@example.com

IP: 192.168.1.100
```

#### Suspicious Activity

```
⚠️ Security Alert

Type: Suspicious Activity
Severity: HIGH
Time: 2024-01-15T10:30:00.000Z

Details:
Multiple users targeted from same IP
Failed logins: 12
Unique users: admin@example.com, user@example.com, test@example.com

IP: 192.168.1.100
```

#### CSP Violation

```
🔶 Security Alert

Type: CSP Violation
Severity: CRITICAL
Time: 2024-01-15T10:30:00.000Z

Details:
Content Security Policy violation detected
Directive: script-src
Blocked URI: http://malicious-site.com/script.js
Document: https://yourapp.com/page

IP: 192.168.1.100
```

### 📊 **Daily Report**

```
📊 Daily Security Report
📅 Date: 2024-01-15

📈 Statistics:
• Total Requests: 1,234
• Failed Logins: 23
• Suspicious Activities: 2
• CSP Violations: 5
• Errors: 12

🔍 Top IPs:
• 192.168.1.100 (156 requests)
• 192.168.1.101 (89 requests)
• 192.168.1.102 (67 requests)
```

### 🚀 **System Alerts**

```
🚀 System Alert

Type: STARTUP
Message: Security monitoring system started

Details: All scheduled jobs are now active

Time: 2024-01-15T10:30:00.000Z
```

## Scheduled Jobs

| Job Name                | Schedule       | Description                       |
| ----------------------- | -------------- | --------------------------------- |
| `log_analysis`          | `*/15 * * * *` | Phân tích logs mỗi 15 phút        |
| `daily_report`          | `0 9 * * *`    | Báo cáo hàng ngày lúc 9:00 AM     |
| `telegram_health_check` | `0 * * * *`    | Kiểm tra kết nối Telegram mỗi giờ |
| `deep_log_analysis`     | `0 */6 * * *`  | Phân tích logs sâu mỗi 6 giờ      |
| `weekly_report`         | `0 9 * * 1`    | Báo cáo tuần lúc 9:00 AM thứ 2    |

## Cấu hình nâng cao

### Tùy chỉnh patterns phát hiện

Chỉnh sửa trong `src/services/logAnalyzer.service.js`:

```javascript
initializePatterns() {
  return {
    bruteForce: {
      keywords: ['login_failed', 'invalid_password'],
      threshold: 5, // Số lần thất bại
      windowMinutes: 15,
      severity: 'high'
    },
    // ... other patterns
  };
}
```

### Tùy chỉnh thời gian phân tích

```javascript
// Phân tích logs trong 2 giờ qua
const results = await logAnalyzerService.analyzeLogs({ hours: 2 });

// Phân tích logs trong 30 phút qua
const results = await logAnalyzerService.analyzeLogs({ hours: 0.5 });
```

## Troubleshooting

### Lỗi kết nối Telegram

1. **Kiểm tra Bot Token**

   ```bash
   curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
   ```

2. **Kiểm tra Chat ID**

   - Đảm bảo đã gửi tin nhắn cho bot
   - Kiểm tra Chat ID có đúng không

3. **Kiểm tra logs**
   ```bash
   tail -f logs/application-$(date +%Y-%m-%d).log | grep telegram
   ```

### Scheduler không hoạt động

1. **Kiểm tra timezone**

   ```javascript
   // Mặc định: 'Asia/Ho_Chi_Minh'
   timezone: "Asia/Ho_Chi_Minh";
   ```

2. **Kiểm tra cron expression**

   - Sử dụng [crontab.guru](https://crontab.guru) để validate

3. **Restart scheduler**
   ```http
   POST /api/telegram/scheduler/stop
   POST /api/telegram/scheduler/start
   ```

### Logs không được phân tích

1. **Kiểm tra thư mục logs**

   ```bash
   ls -la logs/
   ```

2. **Kiểm tra quyền đọc file**

   ```bash
   chmod 644 logs/*.log
   ```

3. **Kiểm tra format logs**
   - Logs phải ở format JSON
   - Có timestamp và category fields

## Bảo mật

### 🔒 **Best Practices**

1. **Bảo vệ Bot Token**

   - Không commit token vào git
   - Sử dụng environment variables
   - Rotate token định kỳ

2. **Giới hạn quyền truy cập**

   - Chỉ admin mới có thể quản lý Telegram
   - Sử dụng RBAC middleware

3. **Monitor logs**
   - Theo dõi logs của chính hệ thống monitoring
   - Alert khi có lỗi trong monitoring system

### 🛡️ **Security Considerations**

1. **Rate Limiting**

   - Telegram có giới hạn 30 messages/second
   - Hệ thống tự động throttle nếu cần

2. **Error Handling**

   - Tất cả lỗi được log và handle gracefully
   - Không crash hệ thống chính

3. **Resource Management**
   - Logs được rotate tự động
   - Cache được quản lý hiệu quả

## Monitoring & Maintenance

### 📈 **Performance Monitoring**

```javascript
// Kiểm tra performance của log analysis
const startTime = Date.now();
const results = await logAnalyzerService.analyzeLogs({ hours: 1 });
const duration = Date.now() - startTime;

console.log(`Analysis completed in ${duration}ms`);
```

### 🔧 **Maintenance Tasks**

1. **Hàng ngày**

   - Kiểm tra logs của monitoring system
   - Review security alerts

2. **Hàng tuần**

   - Review weekly reports
   - Update detection patterns nếu cần

3. **Hàng tháng**
   - Rotate Telegram bot tokens
   - Review và optimize performance

## Kết luận

Hệ thống Telegram notifications cung cấp khả năng giám sát bảo mật real-time và phản ứng nhanh với các sự cố. Với việc phân tích logs tự động và gửi cảnh báo qua Telegram, bạn có thể:

- Phát hiện brute force attacks ngay lập tức
- Theo dõi hoạt động đáng ngờ
- Nhận báo cáo định kỳ về tình trạng bảo mật
- Phản ứng nhanh với các sự cố bảo mật

Hệ thống được thiết kế để hoạt động ổn định và không ảnh hưởng đến performance của ứng dụng chính.
