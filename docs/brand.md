# Tài liệu API - Brand Routes

## Base URL

```
http://localhost:4000/api
```

## Tổng quan

Tài liệu này mô tả chi tiết các endpoint quản lý Brand (Thương hiệu) trong hệ thống MERN Fashion Store.

---

## 1. Lấy danh sách tất cả brands

### `GET /brands`

Lấy danh sách tất cả các thương hiệu, sắp xếp theo thời gian tạo mới nhất.

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (public endpoint).

**Query Parameters:**

Không có.

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Nike",
      "slug": "nike",
      "description": "Just Do It",
      "logo": "https://example.com/nike-logo.png",
      "status": "active",
      "createdAt": "2023-09-01T00:00:00.000Z",
      "updatedAt": "2023-09-01T00:00:00.000Z"
    }
  ]
}
```

**Lưu ý:**

- Danh sách được sắp xếp theo `createdAt` giảm dần (mới nhất trước)
- Trả về tất cả brands, không phân trang
- Mặc định `name` là "HNG" nếu không được cung cấp

---

## 2. Tạo brand mới

### `POST /brands`

Tạo một thương hiệu mới.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_or_staff_token>
```

**Authentication:**

Yêu cầu: `admin` hoặc `staff`

**Body:**

```json
{
  "name": "Nike",
  "slug": "nike",
  "description": "Just Do It",
  "logo": "https://example.com/nike-logo.png",
  "status": "active"
}
```

**Validation Rules:**

- `name` (bắt buộc): 2-50 ký tự, không được để trống sau khi trim, mặc định: "HNG" (nếu không được cung cấp)
- `slug` (bắt buộc): Phải unique trong hệ thống, tự động chuyển thành lowercase
- `description` (tùy chọn): Tối đa 500 ký tự
- `logo` (tùy chọn): URL logo hợp lệ
- `status` (tùy chọn): `active` hoặc `inactive` (mặc định: `active`)

**Response Success (201 Created):**

```json
{
  "status": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Nike",
    "slug": "nike",
    "description": "Just Do It",
    "logo": "https://example.com/nike-logo.png",
    "status": "active",
    "createdAt": "2023-09-01T00:00:00.000Z",
    "updatedAt": "2023-09-01T00:00:00.000Z"
  }
}
```

**Response Error (409 Conflict):**

```json
{
  "status": false,
  "message": "Slug đã tồn tại"
}
```

**Lưu ý:**

- Slug phải unique, nếu trùng sẽ báo lỗi 409
- Slug tự động được chuyển thành lowercase
- Nếu không cung cấp `name`, mặc định sẽ là "HNG"

---

## 3. Cập nhật brand

### `PUT /brands/:id`

Cập nhật thông tin của một thương hiệu.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_or_staff_token>
```

**Authentication:**

Yêu cầu: `admin` hoặc `staff`

**Path Parameters:**

- `id` (bắt buộc): ObjectId của brand cần cập nhật

**Body:**

Tất cả các trường đều tùy chọn (chỉ cập nhật các trường được gửi).

**Response Success (200 OK):**

Tương tự như `POST /brands`.

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Không tìm thấy brand"
}
```

**Lưu ý:**

- Chỉ cập nhật các trường được gửi trong body
- `updatedAt` tự động được cập nhật

---

## 4. Xóa brand

### `DELETE /brands/:id`

Xóa một thương hiệu khỏi hệ thống.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_token>
```

**Authentication:**

Yêu cầu: `admin` (chỉ admin mới được xóa)

**Path Parameters:**

- `id` (bắt buộc): ObjectId của brand cần xóa

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "deleted": true
  }
}
```

**Lưu ý:**

- Chỉ admin mới có quyền xóa brand
- Xóa brand không tự động xóa các sản phẩm liên quan (cần xử lý ở application level)
- Nên kiểm tra xem brand có sản phẩm nào đang sử dụng không trước khi xóa

---

## Error Codes

### HTTP Status Codes

- `200`: OK - Thành công
- `201`: Created - Tạo mới thành công
- `400`: Bad Request - Dữ liệu đầu vào không hợp lệ
- `401`: Unauthorized - Chưa đăng nhập hoặc token không hợp lệ
- `403`: Forbidden - Không có quyền truy cập
- `404`: Not Found - Không tìm thấy tài nguyên
- `409`: Conflict - Dữ liệu đã tồn tại (slug trùng)

---

## Data Models

### Brand Model

```javascript
{
  _id: ObjectId,
  name: String (required, default: "HNG", 2-50 chars),
  slug: String (required, unique, lowercase),
  description: String (optional, max 500 chars),
  logo: String (optional, URL),
  status: String (enum: ['active', 'inactive'], default: 'active'),
  createdAt: Date,
  updatedAt: Date
}
```

---

## Authentication & Authorization

### Public Endpoints (Không cần authentication)

- `GET /brands` - Lấy danh sách brands

### Protected Endpoints

#### Admin & Staff

- `POST /brands` - Tạo brand
- `PUT /brands/:id` - Cập nhật brand

#### Admin Only

- `DELETE /brands/:id` - Xóa brand

### Headers cho Protected Endpoints

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## Best Practices

### 1. Slug Generation

- Slug nên được tạo từ `name` bằng cách:
  - Chuyển thành lowercase
  - Thay thế khoảng trắng bằng dấu gạch ngang
  - Loại bỏ ký tự đặc biệt
  - Đảm bảo unique

**Ví dụ:**

- `name`: "Nike Air Max" → `slug`: "nike-air-max"

### 2. Status Management

- `active`: Brand đang hoạt động, hiển thị trên website
- `inactive`: Brand tạm ngưng, không hiển thị nhưng vẫn tồn tại trong database

---

## Notes

1. **Slug Uniqueness**: Slug phải unique trong toàn bộ hệ thống. Nếu trùng, sẽ báo lỗi 409 Conflict.

2. **Case Sensitivity**: Slug tự động được chuyển thành lowercase, không phân biệt hoa thường.

3. **No Pagination**: Hiện tại endpoint list không có phân trang. Nếu số lượng lớn, nên thêm pagination.

4. **Cascade Delete**: Khi xóa brand, cần xử lý các sản phẩm liên quan ở application level.

5. **Default Name**: Nếu không cung cấp `name`, mặc định sẽ là "HNG".

---

_Tài liệu này được tạo ngày: 2025-11-13_
