# Tài liệu API - MERN Fashion Store

## Base URL

```
http://localhost:4000/api
```

## Tổng quan

Tài liệu này mô tả chi tiết tất cả các endpoint API trong hệ thống MERN Fashion Store. Tài liệu được chia thành các phần riêng biệt cho từng service để dễ tra cứu và quản lý.

---

## Danh sách tài liệu

### 1. [Authentication Routes](./auth.md)

- Đăng ký, đăng nhập, đăng xuất
- Refresh token
- Google OAuth
- Xác nhận email

### 2. [Cart Routes](./cart.md)

- Lấy giỏ hàng
- Thêm/xóa/cập nhật sản phẩm trong giỏ hàng

### 3. [Order Routes](./order.md)

- Tạo đơn hàng
- Quản lý đơn hàng
- Cập nhật trạng thái đơn hàng
- Thống kê đơn hàng

### 4. [Category Routes](./category.md)

- Quản lý danh mục sản phẩm
- CRUD operations

### 5. [Brand Routes](./brand.md)

- Quản lý thương hiệu
- CRUD operations

### 6. [Payment Routes](./payment.md)

- Thanh toán MoMo
- Webhook xử lý thanh toán
- Kiểm tra trạng thái thanh toán

### 7. [Upload Routes](./upload.md)

- Upload ảnh đơn lẻ/nhiều ảnh
- Upload ảnh sản phẩm với transformation
- Upload avatar
- Xóa ảnh
- Transform URL

### 8. [User Routes](./user.md)

- Quản lý profile
- Quản lý địa chỉ
- Đổi mật khẩu
- Quản lý người dùng (Admin)

### 9. [Product Routes](./product.md)

- Lấy danh sách sản phẩm
- Tìm kiếm sản phẩm
- Chi tiết sản phẩm
- Sản phẩm liên quan
- Sản phẩm gợi ý
- Vector search
- Quản lý sản phẩm (Admin)

### 10. [Review Routes](./review.md)

- Lấy danh sách đánh giá
- Tạo/cập nhật/xóa đánh giá
- Trả lời đánh giá
- Quản lý đánh giá (Admin)

### 11. [Wishlist Routes](./wishlist.md)

- Lấy danh sách wishlist
- Thêm/xóa sản phẩm khỏi wishlist

---

## Error Codes

### HTTP Status Codes

- `200`: OK - Thành công
- `201`: Created - Tạo mới thành công
- `400`: Bad Request - Dữ liệu đầu vào không hợp lệ
- `401`: Unauthorized - Chưa đăng nhập hoặc token không hợp lệ
- `403`: Forbidden - Không có quyền truy cập
- `404`: Not Found - Không tìm thấy tài nguyên
- `409`: Conflict - Dữ liệu đã tồn tại
- `429`: Too Many Requests - Vượt quá giới hạn rate limit
- `500`: Internal Server Error - Lỗi server

### Error Response Format

**Format từ controller:**

```json
{
  "status": false,
  "message": "Mô tả lỗi"
}
```

**Format từ validation middleware:**

```json
{
  "status": false,
  "message": "Dữ liệu đầu vào không hợp lệ",
  "details": [
    {
      "field": "tên trường",
      "message": "Thông báo lỗi cụ thể",
      "value": "Giá trị không hợp lệ"
    }
  ]
}
```

**Format từ auth middleware:**

```json
{
  "ok": false,
  "error": {
    "code": 401,
    "message": "Unauthorized"
  }
}
```

---

## Authentication & Authorization

### Headers cho Protected Endpoints

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Lưu ý:** Cho upload ảnh, sử dụng `multipart/form-data`.

### Token Management

- Access token: Hết hạn sau 15 phút (mặc định)
- Refresh token: Hết hạn sau 7 ngày (mặc định)
- Sử dụng endpoint `/auth/refresh` để làm mới access token

---

## Best Practices

1. **Error Handling**: Luôn kiểm tra status code và message trong response
2. **Validation**: Validate dữ liệu đầu vào trước khi gửi request
3. **Rate Limiting**: Tuân thủ rate limit để tránh bị chặn
4. **Token Security**: Bảo mật access token và refresh token
5. **File Upload**: Kiểm tra kích thước và định dạng file trước khi upload

---

## Notes

1. Tất cả các endpoint đều trả về response theo format chuẩn với `status` và `data`/`message`
2. Timestamps sử dụng ISO 8601 format (UTC)
3. ObjectId sử dụng MongoDB ObjectId format
4. Pagination sử dụng `page` và `limit` parameters
5. Date range sử dụng format `YYYY-MM-DD`

---

_Tài liệu này được tạo ngày: 2025-11-13_
