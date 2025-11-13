# Tài liệu API - Payment Routes

## Base URL

```
http://localhost:4000/api
```

## Tổng quan

Tài liệu này mô tả chi tiết các endpoint quản lý Payment (Thanh toán) trong hệ thống MERN Fashion Store.

---

## 1. Tạo thanh toán MoMo

### `POST /payments/momo/create`

Tạo thanh toán MoMo cho đơn hàng.

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (có thể được gọi từ frontend hoặc backend).

**Body:**

```json
{
  "orderId": "ORD-20230901-001",
  "userInfo": {
    "fullName": "Nguyễn Văn A",
    "email": "user@example.com",
    "phone": "0123456789"
  },
  "items": [
    {
      "productId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Áo thun nam",
      "price": 250000,
      "quantity": 2
    }
  ]
}
```

**Validation Rules:**

- `orderId` (bắt buộc): Order code của đơn hàng
- `userInfo` (tùy chọn): Thông tin user (nếu cần)
- `items` (tùy chọn): Danh sách sản phẩm (nếu cần, ưu tiên items từ payload)

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "message": "Tạo thanh toán MoMo thành công",
    "paymentUrl": "https://payment.momo.vn/...",
    "deeplink": "momo://app/payment/...",
    "qrCodeUrl": "https://payment.momo.vn/qr/...",
    "orderId": "ORD-20230901-001"
  }
}
```

**Response Success (200 OK) - Link đã tồn tại:**

```json
{
  "status": true,
  "data": {
    "message": "Link thanh toán đã tồn tại",
    "paymentUrl": "https://payment.momo.vn/...",
    "deeplink": "momo://app/payment/...",
    "qrCodeUrl": "https://payment.momo.vn/qr/...",
    "orderId": "ORD-20230901-001",
    "existing": true
  }
}
```

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Đơn hàng đã được xử lý"
}
```

hoặc

```json
{
  "status": false,
  "message": "Phương thức thanh toán của đơn hàng không hợp lệ"
}
```

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Đơn hàng không tồn tại"
}
```

**Lưu ý:**

- Kiểm tra đơn hàng có phương thức thanh toán là `momo`
- Kiểm tra trạng thái đơn hàng là `pending`
- Nếu đơn hàng đã có link thanh toán hợp lệ, trả về link hiện có
- Payment URL, deeplink và QR code URL được lưu vào database
- Request ID và Order ID được lưu vào database

---

## 2. Webhook MoMo (Internal)

### `POST /payments/momo/webhook`

Xử lý webhook từ MoMo (IPN - Instant Payment Notification).

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (được gọi từ MoMo).

**Body:**

MoMo gửi IPN với các thông tin thanh toán.

**Response Success (200 OK):**

```json
{
  "message": "OK"
}
```

**Response Success (200 OK) - Amount mismatch:**

```json
{
  "message": "AMOUNT_MISMATCH"
}
```

**Lưu ý:**

- Xác thực chữ ký MoMo (HMAC SHA256)
- Chống xử lý lặp (idempotent)
- Đối soát số tiền IPN với `order.total` (lệch → `payment.status = review`)
- Cập nhật trạng thái đơn hàng: thành công `paid`, thất bại `failed`
- Ghi timeline và `transactionId`
- Webhook log được ghi lại
- Email xác nhận thanh toán được gửi tự động (nếu thành công)

---

## 3. Redirect MoMo

### `GET /payments/momo/redirect`

Xử lý redirect từ MoMo sau khi thanh toán.

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (được redirect từ MoMo).

**Query Parameters:**

- `resultCode` (bắt buộc): Mã kết quả từ MoMo (`0` = thành công)
- `orderId` (bắt buộc): Order code
- `message` (tùy chọn): Thông báo từ MoMo

**Response:**

Redirect về frontend:

- Thành công: `${FRONTEND_URL}/payment/success?orderId=${orderId}`
- Thất bại: `${FRONTEND_URL}/payment/failed?orderId=${orderId}&message=${message}`
- Lỗi: `${FRONTEND_URL}/payment/error`

**Lưu ý:**

- Endpoint này được MoMo redirect về sau khi thanh toán
- Frontend URL được lấy từ biến môi trường `FRONTEND_URL`

---

## 4. Kiểm tra trạng thái thanh toán MoMo

### `GET /payments/momo/status/:orderId`

Kiểm tra trạng thái thanh toán MoMo.

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (public endpoint).

**Path Parameters:**

- `orderId` (bắt buộc): Order code

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "orderId": "ORD-20230901-001",
    "status": "paid",
    "paymentStatus": "paid",
    "momoStatus": {
      "partnerCode": "MOMO",
      "orderId": "ORD-20230901-001",
      "requestId": "123456789",
      "amount": 530000,
      "transId": "987654321",
      "payType": "webApp",
      "resultCode": 0,
      "message": "Success",
      "responseTime": 1693567800000,
      "lastUpdated": 1693567800000
    },
    "autoUpdated": true
  }
}
```

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Đơn hàng không tồn tại"
}
```

**Lưu ý:**

- Query trạng thái thanh toán từ MoMo
- Tự động cập nhật đơn hàng nếu thanh toán thành công
- Kiểm tra số tiền khớp (lệch → `payment.status = review`)
- Email xác nhận thanh toán được gửi tự động (nếu vừa mới chuyển sang paid)

---

## 5. Webhook thanh toán tổng quát (Legacy)

### `POST /payments/webhook`

Xử lý webhook từ payment gateway (VNPay/MoMo/ZaloPay...) - Legacy method.

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (được gọi từ payment gateway).

**Body:**

```json
{
  "orderCode": "ORD-20230901-001",
  "success": true,
  "transactionId": "TXN-123456789"
}
```

**Validation Rules:**

- `orderCode` (bắt buộc): Order code
- `success` (bắt buộc): `true`/`false`
- `transactionId` (tùy chọn): Transaction ID

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "received": true
  }
}
```

**Lưu ý:**

- Webhook log được ghi lại
- Cập nhật trạng thái đơn hàng và payment status
- Ghi timeline

---

## Error Codes

### HTTP Status Codes

- `200`: OK - Thành công
- `400`: Bad Request - Dữ liệu đầu vào không hợp lệ
- `404`: Not Found - Không tìm thấy tài nguyên
- `500`: Internal Server Error - Lỗi server

---

## Authentication & Authorization

### Public Endpoints (Không cần authentication)

- `POST /payments/momo/create` - Tạo thanh toán MoMo
- `POST /payments/momo/webhook` - Webhook MoMo
- `GET /payments/momo/redirect` - Redirect MoMo
- `GET /payments/momo/status/:orderId` - Kiểm tra trạng thái thanh toán
- `POST /payments/webhook` - Webhook thanh toán tổng quát

---

## Business Rules

### 1. Payment Management

- MoMo Payment:
  - Kiểm tra đơn hàng có phương thức thanh toán là `momo`
  - Kiểm tra trạng thái đơn hàng là `pending`
  - Xác thực chữ ký MoMo (HMAC SHA256)
  - Chống xử lý lặp (idempotent)
  - Đối soát số tiền IPN với `order.total` (lệch → `payment.status = review`)
  - Cập nhật trạng thái đơn hàng: thành công `paid`, thất bại `failed`
  - Ghi timeline và `transactionId`
  - Email xác nhận thanh toán được gửi tự động (nếu thành công)

---

## Best Practices

### 1. Payment Processing

- Sử dụng webhook để xử lý thanh toán bất đồng bộ
- Xác thực chữ ký để đảm bảo tính toàn vẹn
- Chống xử lý lặp để tránh duplicate processing
- Đối soát số tiền để đảm bảo tính chính xác
- Ghi log để audit và debug

---

## Notes

1. **Payment Webhook**: Webhook được gọi từ payment gateway, không cần authentication nhưng cần xác thực chữ ký.

2. **Email Notifications**: Email xác nhận thanh toán được gửi tự động khi thanh toán thành công.

3. **Webhook Logging**: Webhook được ghi log để audit và debug.

4. **Amount Mismatch**: Nếu số tiền IPN lệch với `order.total`, `payment.status` sẽ được set thành `review` để admin xem xét.

---

_Tài liệu này được tạo ngày: 2025-11-13_
