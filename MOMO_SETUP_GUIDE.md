# Hướng dẫn cấu hình MoMo Payment

## 1. Đăng ký tài khoản MoMo Merchant

1. Truy cập [MoMo Developer Portal](https://developers.momo.vn/)
2. Đăng ký tài khoản merchant
3. Lấy thông tin:
   - Partner Code
   - Access Key
   - Secret Key

## 2. Environment Variables cần thiết

Thêm các biến môi trường sau vào file `.env`:

```env
# MoMo Payment Configuration
MOMO_PARTNER_CODE=your_partner_code_here
MOMO_ACCESS_KEY=your_access_key_here
MOMO_SECRET_KEY=your_secret_key_here
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_IPN_URL=http://localhost:4000/api/payment/momo/webhook
MOMO_REDIRECT_URL=http://localhost:4000/api/payment/momo/redirect
MOMO_STORE_ID=MOMO_STORE
MOMO_STORE_NAME=Fashion Store

# Base URLs
BASE_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3001
```

## 3. URLs cho Production

Khi deploy lên production, thay đổi các URLs sau:

```env
# Production URLs
MOMO_ENDPOINT=https://payment.momo.vn/v2/gateway/api/create
MOMO_IPN_URL=https://yourdomain.com/api/payment/momo/webhook
MOMO_REDIRECT_URL=https://yourdomain.com/api/payment/momo/redirect
BASE_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

## 4. API Endpoints

### Tạo thanh toán MoMo

```
POST /api/payment/momo/create
Content-Type: application/json

{
  "orderId": "ORDER_123",
  "userInfo": {
    "name": "Nguyen Van A",
    "phone": "0123456789",
    "email": "user@example.com"
  }
}
```

### Webhook IPN (MoMo sẽ gọi)

```
POST /api/payment/momo/webhook
```

### Redirect sau thanh toán

```
GET /api/payment/momo/redirect?resultCode=0&orderId=ORDER_123&message=success
```

### Kiểm tra trạng thái thanh toán

```
GET /api/payment/momo/status/:orderId
```

## 5. Test với MoMo Test App

1. Tải MoMo Test App từ App Store/Google Play
2. Đăng nhập với tài khoản test
3. Sử dụng QR code hoặc deeplink để thanh toán

## 6. Xử lý lỗi thường gặp

### Lỗi signature không hợp lệ

- Kiểm tra Secret Key
- Kiểm tra thứ tự các trường trong signature string

### Lỗi timeout

- MoMo yêu cầu timeout tối thiểu 30 giây
- Kiểm tra kết nối mạng

### Lỗi amount range

- Số tiền phải từ 1,000 - 50,000,000 VND
- Đơn vị là VND (không có decimal)

## 7. Security Notes

- Không bao giờ expose Secret Key
- Luôn verify signature trong webhook
- Sử dụng HTTPS trong production
- Log tất cả giao dịch để audit
