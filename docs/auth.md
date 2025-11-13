# Tài liệu API - Authentication Routes

## Base URL

```
http://localhost:4000/api/auth
```

## Tổng quan

Tài liệu này mô tả chi tiết các endpoint xác thực (authentication) trong hệ thống MERN Fashion Store. Tất cả các route đều nằm dưới prefix `/api/auth`.

---

## 1. Đăng ký tài khoản

### `POST /auth/register`

Đăng ký tài khoản người dùng mới. Sau khi đăng ký thành công, hệ thống sẽ gửi email xác nhận đến địa chỉ email đã đăng ký.

**Headers:**

```http
Content-Type: application/json
```

**Body:**

```json
{
  "fullName": "Nguyễn Văn A",
  "email": "user@example.com",
  "password": "Password123",
  "phone": "0123456789"
}
```

**Validation Rules:**

- `fullName` (bắt buộc): 2-50 ký tự
- `email` (bắt buộc): Email hợp lệ, phải unique trong hệ thống
- `password` (bắt buộc):
  - Ít nhất 8 ký tự
  - Phải có ít nhất 1 chữ thường, 1 chữ hoa và 1 số
- `phone` (tùy chọn):
  - 10 số, bắt đầu bằng 0
  - Format: `^0\d{9}$`

**Response Success (201 Created):**

```json
{
  "status": true,
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "email": "user@example.com",
    "message": "Đăng ký thành công. Vui lòng kiểm tra email để xác nhận tài khoản."
  }
}
```

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Dữ liệu đầu vào không hợp lệ",
  "details": [
    {
      "field": "email",
      "message": "Email không hợp lệ",
      "value": "invalid-email"
    },
    {
      "field": "password",
      "message": "Mật khẩu phải có ít nhất 1 chữ thường, 1 chữ hoa và 1 số",
      "value": "password"
    }
  ]
}
```

**Response Error (409 Conflict):**

```json
{
  "status": false,
  "message": "Email đã tồn tại"
}
```

hoặc

```json
{
  "status": false,
  "message": "Số điện thoại đã tồn tại"
}
```

**Lưu ý:**

- Sau khi đăng ký, user sẽ có trạng thái `pending` và `emailVerified: false`
- Email xác nhận sẽ được gửi tự động (có thể thất bại nhưng không làm fail registration)
- Token xác nhận email có thời hạn 24 giờ

---

## 2. Đăng nhập

### `POST /auth/login`

Đăng nhập vào hệ thống bằng email và mật khẩu.

**Headers:**

```http
Content-Type: application/json
```

**Body:**

```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Validation Rules:**

- `email` (bắt buộc): Email hợp lệ
- `password` (bắt buộc): Không được để trống, phải là string

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "fullName": "Nguyễn Văn A",
      "email": "user@example.com",
      "role": "customer"
    }
  }
}
```

**Cookies được set tự động:**

- `accessToken`: HttpOnly, Secure (production), SameSite=Strict, expires sau 15 phút
- `refreshToken`: HttpOnly, Secure (production), SameSite=Strict, expires sau 7 ngày

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Dữ liệu đầu vào không hợp lệ",
  "details": [
    {
      "field": "email",
      "message": "Email không hợp lệ",
      "value": "invalid-email"
    }
  ]
}
```

**Response Error (401 Unauthorized):**

```json
{
  "status": false,
  "message": "Sai email hoặc mật khẩu"
}
```

**Response Error (403 Forbidden):**

```json
{
  "status": false,
  "message": "Vui lòng xác nhận email trước khi đăng nhập. Kiểm tra hộp thư của bạn hoặc yêu cầu gửi lại email xác nhận."
}
```

**Lưu ý:**

- Chỉ cho phép đăng nhập với user có status `active` hoặc `pending`
- User local (không phải OAuth) phải xác nhận email trước khi đăng nhập
- Sau 3 lần đăng nhập thất bại, hệ thống sẽ gửi cảnh báo qua Telegram
- Khi đăng nhập thành công, `failedLoginAttempts` sẽ được reset về 0
- Access token hết hạn sau 15 phút (mặc định), refresh token hết hạn sau 7 ngày (mặc định)

---

## 3. Refresh Access Token

### `POST /auth/refresh`

Làm mới access token bằng refresh token.

**Headers:**

```http
Content-Type: application/json
```

**Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Validation Rules:**

- `refreshToken` (bắt buộc): Không được để trống

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "fullName": "Nguyễn Văn A",
      "email": "user@example.com",
      "role": "customer"
    }
  }
}
```

**Cookie được set tự động:**

- `accessToken`: HttpOnly, Secure (production), SameSite=Strict, expires sau 15 phút

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Refresh token không được cung cấp"
}
```

**Response Error (401 Unauthorized):**

```json
{
  "status": false,
  "message": "Refresh token không hợp lệ"
}
```

hoặc

```json
{
  "status": false,
  "message": "Refresh token không hợp lệ hoặc đã hết hạn"
}
```

**Lưu ý:**

- Refresh token phải tồn tại trong database và user phải có status `active`
- Chỉ tạo access token mới, không tạo refresh token mới
- Access token mới được set vào cookie tự động

---

## 4. Đăng xuất

### `POST /auth/logout`

Đăng xuất khỏi hệ thống và xóa refresh token.

**Headers:**

```http
Content-Type: application/json
```

**Body (tùy chọn):**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Lưu ý:** Nếu không gửi `refreshToken` trong body, hệ thống sẽ lấy từ cookie `refreshToken`.

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "message": "Đăng xuất thành công"
  }
}
```

**Cookies được xóa:**

- `accessToken`: Được clear
- `refreshToken`: Được clear

**Lưu ý:**

- Refresh token sẽ bị xóa khỏi database
- Tất cả cookies liên quan đến authentication sẽ bị xóa
- Không cần authentication để gọi endpoint này

---

## 5. Google OAuth - Khởi tạo

### `GET /auth/google`

Khởi tạo quá trình đăng nhập bằng Google OAuth.

**Headers:**

Không cần headers đặc biệt.

**Query Parameters:**

Không có.

**Response:**

Redirect đến Google OAuth consent screen.

**Flow:**

1. User truy cập `/auth/google`
2. Hệ thống redirect đến Google để xác thực
3. User đồng ý cấp quyền
4. Google redirect về `/auth/google/callback` với authorization code
5. Hệ thống xử lý và redirect về frontend với tokens

**Lưu ý:**

- Scope được yêu cầu: `profile`, `email`
- Endpoint này sử dụng Passport.js với Google OAuth 2.0 strategy
- Không trả về JSON, chỉ redirect

---

## 6. Google OAuth - Callback

### `GET /auth/google/callback`

Endpoint callback được Google redirect về sau khi user xác thực thành công.

**Headers:**

Không cần headers đặc biệt (được Google redirect).

**Query Parameters:**

Được Google tự động thêm vào URL:

- `code`: Authorization code
- `state`: State parameter (nếu có)

**Response:**

Redirect về frontend với tokens trong query parameters:

```
http://localhost:3000/auth/callback?accessToken=...&refreshToken=...&userId=...&email=...&fullName=...&role=...
```

**Response Error (401 Unauthorized):**

Nếu xác thực thất bại, redirect về frontend với error:

```
http://localhost:3000/auth/callback?error=authentication_failed
```

**Response Error (403 Forbidden):**

Nếu tài khoản chưa được kích hoạt:

```
http://localhost:3000/auth/callback?error=account_not_active
```

**Response Error (500 Internal Server Error):**

Nếu có lỗi xử lý:

```json
{
  "status": false,
  "message": "Lỗi xác thực Google"
}
```

hoặc

```json
{
  "status": false,
  "message": "Xác thực Google thất bại"
}
```

hoặc

```json
{
  "status": false,
  "message": "Lỗi xử lý đăng nhập Google"
}
```

**Lưu ý:**

- Endpoint này không được gọi trực tiếp bởi client
- Frontend URL được lấy từ biến môi trường `FRONTEND_URL` (mặc định: `http://localhost:3000`)
- Sau khi đăng nhập thành công, tokens được set vào cookies và gửi trong query params
- User được tạo tự động nếu chưa tồn tại (với provider `google`)
- User OAuth không cần xác nhận email

---

## 7. Xác nhận email

### `GET /auth/verify-email/:token`

Xác nhận email đăng ký bằng token được gửi qua email.

**Headers:**

Không cần headers đặc biệt.

**Path Parameters:**

- `token` (bắt buộc): Token xác nhận email (32 bytes hex string)

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "message": "Email đã được xác nhận thành công. Bạn có thể đăng nhập ngay bây giờ.",
    "user": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "email": "user@example.com",
      "fullName": "Nguyễn Văn A"
    }
  }
}
```

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Token xác nhận không hợp lệ"
}
```

hoặc

```json
{
  "status": false,
  "message": "Token xác nhận không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại email xác nhận."
}
```

**Lưu ý:**

- Token có thời hạn 24 giờ kể từ khi đăng ký
- Sau khi xác nhận thành công:
  - `emailVerified` được set thành `true`
  - `status` được set thành `active`
  - Token xác nhận được xóa khỏi database
- Token chỉ có thể sử dụng một lần

---

## 8. Gửi lại email xác nhận

### `POST /auth/resend-verification`

Gửi lại email xác nhận cho user chưa xác nhận email.

**Headers:**

```http
Content-Type: application/json
```

**Body:**

```json
{
  "email": "user@example.com"
}
```

**Validation Rules:**

- `email` (bắt buộc): Không được để trống

**Response Success (200 OK):**

Nếu email tồn tại và chưa được xác nhận:

```json
{
  "status": true,
  "data": {
    "message": "Email xác nhận đã được gửi lại. Vui lòng kiểm tra hộp thư của bạn."
  }
}
```

Nếu email không tồn tại hoặc đã được xác nhận (để bảo mật, không tiết lộ thông tin):

```json
{
  "status": true,
  "data": {
    "message": "Nếu email tồn tại và chưa được xác nhận, chúng tôi đã gửi lại email xác nhận."
  }
}
```

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Email không được để trống"
}
```

**Response Error (429 Too Many Requests):**

```json
{
  "status": false,
  "message": "Vui lòng đợi 5 phút trước khi yêu cầu gửi lại email."
}
```

**Response Error (500 Internal Server Error):**

```json
{
  "status": false,
  "message": "Không thể gửi email. Vui lòng thử lại sau."
}
```

**Lưu ý:**

- Rate limit: Không được gửi lại email trong vòng 5 phút
- Chỉ áp dụng cho user local (provider = "local")
- Token mới sẽ được tạo và có thời hạn 24 giờ
- Để bảo mật, response luôn thành công ngay cả khi email không tồn tại

---

## Error Codes

### HTTP Status Codes

- `200`: OK - Thành công
- `201`: Created - Tạo mới thành công
- `400`: Bad Request - Dữ liệu đầu vào không hợp lệ
- `401`: Unauthorized - Chưa đăng nhập hoặc token không hợp lệ
- `403`: Forbidden - Không có quyền truy cập (email chưa xác nhận, tài khoản chưa kích hoạt)
- `409`: Conflict - Dữ liệu đã tồn tại (email/phone đã được sử dụng)
- `429`: Too Many Requests - Vượt quá giới hạn rate limit
- `500`: Internal Server Error - Lỗi server

### Error Response Format

```json
{
  "status": false,
  "message": "Mô tả lỗi",
  "details": [
    {
      "field": "tên trường",
      "message": "Thông báo lỗi cụ thể",
      "value": "Giá trị không hợp lệ"
    }
  ]
}
```

---

## Authentication Flow

### 1. Đăng ký và xác nhận email

```
1. POST /auth/register
   → 201 Created
   → Email xác nhận được gửi

2. User click link trong email
   → GET /auth/verify-email/:token
   → 200 OK
   → Email đã được xác nhận

3. POST /auth/login
   → 200 OK
   → Nhận accessToken và refreshToken
```

### 2. Đăng nhập và refresh token

```
1. POST /auth/login
   → 200 OK
   → Nhận accessToken (15 phút) và refreshToken (7 ngày)

2. Khi accessToken hết hạn:
   → POST /auth/refresh
   → 200 OK
   → Nhận accessToken mới

3. Khi muốn đăng xuất:
   → POST /auth/logout
   → 200 OK
   → Tokens bị xóa
```

### 3. Google OAuth Flow

```
1. User click "Đăng nhập bằng Google"
   → GET /auth/google
   → Redirect đến Google

2. User đồng ý cấp quyền
   → Google redirect về GET /auth/google/callback
   → Hệ thống xử lý và redirect về frontend với tokens
```

---

## Security Features

### 1. Password Security

- Password được hash bằng bcrypt với salt rounds = 10
- Password phải đáp ứng yêu cầu: ít nhất 8 ký tự, có chữ hoa, chữ thường và số

### 2. Token Security

- Access token: JWT với secret key, hết hạn sau 15 phút (mặc định)
- Refresh token: JWT với refresh secret key, hết hạn sau 7 ngày (mặc định)
- Tokens được lưu trong cookies với flags:
  - `httpOnly`: true (không thể truy cập từ JavaScript)
  - `secure`: true (chỉ gửi qua HTTPS trong production)
  - `sameSite`: strict (chống CSRF)

### 3. Email Verification

- Token xác nhận email: 32 bytes random hex string
- Thời hạn: 24 giờ
- Chỉ sử dụng được một lần

### 4. Rate Limiting

- Auth endpoints: 20 requests/15 phút (theo IP)
- Resend verification: 1 request/5 phút (theo user)

### 5. Failed Login Protection

- Theo dõi số lần đăng nhập thất bại
- Gửi cảnh báo Telegram sau 3 lần thất bại
- Reset counter khi đăng nhập thành công

---

## Environment Variables

Các biến môi trường liên quan:

```env
# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES=15m
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES=7d

# Frontend URL (cho OAuth redirect)
FRONTEND_URL=http://localhost:3000

# Google OAuth (nếu sử dụng)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
```

---

## Notes

1. **Cookies vs Body**: Hệ thống hỗ trợ cả cookies và body cho tokens. Ưu tiên cookies để tăng bảo mật.

2. **Email Verification**: Chỉ user local (không phải OAuth) cần xác nhận email. User OAuth được tự động verified.

3. **Token Expiration**: Thời gian hết hạn có thể được cấu hình qua environment variables.

4. **OAuth Redirect**: Frontend cần xử lý redirect từ `/auth/google/callback` để lấy tokens từ query parameters.

5. **Error Messages**: Tất cả error messages đều bằng tiếng Việt để dễ hiểu cho người dùng.

---

_Tài liệu này được tạo ngày: 2025-11-13_
