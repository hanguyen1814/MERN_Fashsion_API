# Hướng dẫn Test Bảo mật Thủ công

## Chuẩn bị

### 1. Khởi động server

```bash
npm run dev
```

### 2. Cài đặt Postman hoặc sử dụng curl/Thunder Client

- **Postman**: Import collection từ file `test/postman-collection.json`
- **Thunder Client**: Extension cho VS Code
- **curl**: Sử dụng command line

## Test 1: HTTP Security Headers

### Kiểm tra Headers

```bash
curl -I http://localhost:4000/health
```

**Kết quả mong đợi:**

- ❌ Không có `X-Powered-By` header
- ✅ Có `Content-Security-Policy` header
- ✅ Có `X-Frame-Options` header
- ✅ Có `Strict-Transport-Security` header (nếu HTTPS)

### Test CSP (Content Security Policy)

1. Mở Developer Tools (F12)
2. Vào Console tab
3. Thử inject script: `document.createElement('script').src='http://evil.com'`
4. **Kết quả mong đợi**: CSP error trong console

## Test 2: Authentication Flow

### 2.1 Test Đăng ký

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "password": "TestPass123",
    "phone": "0123456789"
  }'
```

**Test cases:**

- ✅ Valid data → 201 Created
- ❌ Invalid email → 400 Bad Request
- ❌ Weak password → 400 Bad Request
- ❌ Duplicate email → 409 Conflict

### 2.2 Test Đăng nhập

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

**Kiểm tra:**

- ✅ Trả về accessToken và refreshToken
- ✅ Set secure cookies (HttpOnly, Secure, SameSite)
- ✅ Token có expires time

### 2.3 Test Refresh Token

```bash
curl -X POST http://localhost:4000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token_here"
  }'
```

**Kết quả mong đợi:**

- ✅ Trả về accessToken mới
- ✅ Cookie được cập nhật

### 2.4 Test Đăng xuất

```bash
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token_here"
  }'
```

**Kiểm tra:**

- ✅ Cookies bị xóa
- ✅ RefreshToken bị invalidate

## Test 3: RBAC (Role-Based Access Control)

### 3.1 Test Unauthorized Access

```bash
# Không có token
curl http://localhost:4000/api/users
```

**Kết quả mong đợi:** 401 Unauthorized

### 3.2 Test Customer Permissions

```bash
# Sử dụng token của customer
curl http://localhost:4000/api/users/profile/me \
  -H "Authorization: Bearer YOUR_CUSTOMER_TOKEN"
```

**Test cases:**

- ✅ `/users/profile/me` → 200 OK
- ❌ `/users` → 403 Forbidden
- ❌ `/users/stats` → 403 Forbidden

### 3.3 Test Admin Permissions

```bash
# Sử dụng token của admin
curl http://localhost:4000/api/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Test cases:**

- ✅ `/users` → 200 OK
- ✅ `/users/stats` → 200 OK
- ✅ `/products` (POST) → 201 Created

### 3.4 Test Ownership

```bash
# Customer A cố gắng truy cập profile của Customer B
curl http://localhost:4000/api/users/CUSTOMER_B_ID \
  -H "Authorization: Bearer CUSTOMER_A_TOKEN"
```

**Kết quả mong đợi:** 403 Forbidden

## Test 4: Input Validation

### 4.1 Test Email Validation

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "invalid-email",
    "password": "TestPass123"
  }'
```

**Kết quả mong đợi:** 400 Bad Request với error details

### 4.2 Test Password Strength

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test2@example.com",
    "password": "weak"
  }'
```

**Kết quả mong đợi:** 400 Bad Request - password phải có ít nhất 8 ký tự, 1 chữ hoa, 1 chữ thường, 1 số

### 4.3 Test Phone Validation

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test3@example.com",
    "password": "TestPass123",
    "phone": "invalid-phone"
  }'
```

**Kết quả mong đợi:** 400 Bad Request - phone không hợp lệ

### 4.4 Test Product Data Validation

```bash
curl -X POST http://localhost:4000/api/products \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "",
    "price": -100,
    "stock": -5
  }'
```

**Kết quả mong đợi:** 400 Bad Request với chi tiết lỗi validation

## Test 5: Data Sanitization

### 5.1 Test XSS Protection

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "<script>alert(\"XSS\")</script>",
    "email": "xss@example.com",
    "password": "TestPass123"
  }'
```

**Kiểm tra:**

- Response không chứa `<script>` tag
- Database không lưu script tag

### 5.2 Test NoSQL Injection

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": {"$ne": null},
    "password": {"$ne": null}
  }'
```

**Kết quả mong đợi:** 400 Bad Request hoặc login thất bại

### 5.3 Test Parameter Pollution

```bash
curl "http://localhost:4000/api/products?page=1&page=2&limit=10&limit=20"
```

**Kiểm tra:**

- Chỉ có 1 giá trị cho mỗi parameter
- Không bị duplicate parameters

## Test 6: Cookie Security

### 6.1 Kiểm tra Cookie Attributes

1. Đăng nhập thành công
2. Mở Developer Tools → Application/Storage → Cookies
3. Kiểm tra cookies có các attributes:
   - ✅ `HttpOnly`
   - ✅ `Secure` (trong production)
   - ✅ `SameSite=Strict`
   - ✅ `Path=/api/auth`

### 6.2 Test Cookie Theft Protection

```javascript
// Trong browser console
document.cookie; // Không thể đọc được HttpOnly cookies
```

**Kết quả mong đợi:** Không hiển thị accessToken và refreshToken

## Test 7: JWT Security

### 7.1 Test Token Expiration

1. Đăng nhập và lấy token
2. Đợi 15 phút (hoặc thay đổi JWT_EXPIRES thành vài giây để test nhanh)
3. Thử sử dụng token đã hết hạn

**Kết quả mong đợi:** 401 Unauthorized - Token expired

### 7.2 Test Token Manipulation

```bash
# Thay đổi một ký tự trong token
curl http://localhost:4000/api/users/profile/me \
  -H "Authorization: Bearer INVALID_TOKEN"
```

**Kết quả mong đợi:** 401 Unauthorized - Invalid token

## Test 8: Rate Limiting (nếu có)

### 8.1 Test Login Rate Limiting

```bash
# Thử đăng nhập nhiều lần với password sai
for i in {1..10}; do
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrong"}' &
done
```

**Kết quả mong đợi:** Sau một số lần thử, trả về 429 Too Many Requests

## Checklist Tổng Kết

### ✅ Security Headers

- [ ] X-Powered-By bị ẩn
- [ ] CSP được thiết lập
- [ ] X-Frame-Options được thiết lập
- [ ] HSTS được thiết lập (HTTPS)

### ✅ Authentication

- [ ] Password được hash với bcrypt
- [ ] JWT có expires time
- [ ] Refresh token mechanism hoạt động
- [ ] Secure cookies được set
- [ ] Logout invalidate tokens

### ✅ Authorization (RBAC)

- [ ] Unauthorized access bị từ chối (401)
- [ ] Customer chỉ truy cập được resources của mình
- [ ] Admin có thể truy cập tất cả resources
- [ ] Staff có quyền hạn phù hợp
- [ ] Ownership checking hoạt động

### ✅ Input Validation

- [ ] Email validation
- [ ] Password strength validation
- [ ] Phone validation
- [ ] Product data validation
- [ ] Error messages chi tiết

### ✅ Data Sanitization

- [ ] XSS protection
- [ ] NoSQL injection protection
- [ ] Parameter pollution protection
- [ ] Input trimming và normalization

### ✅ Session Security

- [ ] HttpOnly cookies
- [ ] Secure flag (production)
- [ ] SameSite protection
- [ ] Path restriction
- [ ] Token expiration

## Ghi chú

1. **Test trong môi trường development**: Một số security features chỉ hoạt động trong production
2. **Database**: Đảm bảo có dữ liệu test phù hợp
3. **Logs**: Kiểm tra server logs để debug các vấn đề
4. **Performance**: Test với nhiều requests đồng thời để kiểm tra performance

## Troubleshooting

### Lỗi thường gặp:

1. **401 Unauthorized**: Kiểm tra token có hợp lệ không
2. **403 Forbidden**: Kiểm tra role và permissions
3. **400 Bad Request**: Kiểm tra validation rules
4. **CORS errors**: Kiểm tra CORS configuration

### Debug tips:

1. Sử dụng `console.log` trong middleware để debug
2. Kiểm tra request headers và body
3. Verify database connections và queries
4. Test từng component riêng biệt
