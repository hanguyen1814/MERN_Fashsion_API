# Tài liệu API - Category Routes

## Base URL

```
http://localhost:4000/api
```

## Tổng quan

Tài liệu này mô tả chi tiết các endpoint quản lý Category (Danh mục) trong hệ thống MERN Fashion Store.

---

## 1. Lấy danh sách tất cả categories

### `GET /categories`

Lấy danh sách tất cả các danh mục sản phẩm, sắp xếp theo thời gian tạo mới nhất.

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
      "name": "Áo thun",
      "slug": "ao-thun",
      "description": "Danh mục áo thun nam nữ",
      "parentId": null,
      "image": "https://example.com/category.jpg",
      "status": "active",
      "createdAt": "2023-09-01T00:00:00.000Z",
      "updatedAt": "2023-09-01T00:00:00.000Z"
    }
  ]
}
```

**Lưu ý:**

- Danh sách được sắp xếp theo `createdAt` giảm dần (mới nhất trước)
- Trả về tất cả categories, không phân trang
- `parentId` có thể là `null` (danh mục gốc) hoặc ObjectId của category cha

---

## 2. Tạo category mới

### `POST /categories`

Tạo một danh mục sản phẩm mới.

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
  "name": "Áo thun",
  "slug": "ao-thun",
  "description": "Danh mục áo thun nam nữ",
  "parentId": null,
  "image": "https://example.com/category.jpg",
  "status": "active"
}
```

**Validation Rules:**

- `name` (bắt buộc): 2-50 ký tự, không được để trống sau khi trim
- `slug` (bắt buộc): Phải unique trong hệ thống, tự động chuyển thành lowercase
- `description` (tùy chọn): Tối đa 500 ký tự
- `parentId` (tùy chọn): ObjectId hợp lệ của Category hoặc `null`
- `image` (tùy chọn): URL ảnh hợp lệ
- `status` (tùy chọn): `active` hoặc `inactive` (mặc định: `active`)

**Response Success (201 Created):**

```json
{
  "status": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Áo thun",
    "slug": "ao-thun",
    "description": "Danh mục áo thun nam nữ",
    "parentId": null,
    "image": "https://example.com/category.jpg",
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
- `parentId` phải là ObjectId hợp lệ hoặc `null`

---

## 3. Cập nhật category

### `PUT /categories/:id`

Cập nhật thông tin của một danh mục sản phẩm.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_or_staff_token>
```

**Authentication:**

Yêu cầu: `admin` hoặc `staff`

**Path Parameters:**

- `id` (bắt buộc): ObjectId của category cần cập nhật

**Body:**

Tất cả các trường đều tùy chọn (chỉ cập nhật các trường được gửi).

**Response Success (200 OK):**

Tương tự như `POST /categories`.

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Không tìm thấy category"
}
```

**Lưu ý:**

- Chỉ cập nhật các trường được gửi trong body
- `updatedAt` tự động được cập nhật

---

## 4. Xóa category

### `DELETE /categories/:id`

Xóa một danh mục sản phẩm khỏi hệ thống.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_token>
```

**Authentication:**

Yêu cầu: `admin` (chỉ admin mới được xóa)

**Path Parameters:**

- `id` (bắt buộc): ObjectId của category cần xóa

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

- Chỉ admin mới có quyền xóa category
- Xóa category không tự động xóa các sản phẩm liên quan (cần xử lý ở application level)
- Xóa category có `parentId` không ảnh hưởng đến category cha

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

### Category Model

```javascript
{
  _id: ObjectId,
  name: String (required, 2-50 chars),
  slug: String (required, unique, lowercase),
  description: String (optional, max 500 chars),
  parentId: ObjectId (optional, ref: Category),
  image: String (optional, URL),
  status: String (enum: ['active', 'inactive'], default: 'active'),
  createdAt: Date,
  updatedAt: Date
}
```

---

## Authentication & Authorization

### Public Endpoints (Không cần authentication)

- `GET /categories` - Lấy danh sách categories

### Protected Endpoints

#### Admin & Staff

- `POST /categories` - Tạo category
- `PUT /categories/:id` - Cập nhật category

#### Admin Only

- `DELETE /categories/:id` - Xóa category

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

- `name`: "Áo Thun Nam" → `slug`: "ao-thun-nam"

### 2. Parent-Child Categories

- Category có thể có parent category (hierarchical structure)
- `parentId` = `null` nghĩa là category gốc
- Nên validate `parentId` tồn tại trước khi tạo/cập nhật
- Không nên tạo circular reference (category không thể là parent của chính nó)

### 3. Status Management

- `active`: Category đang hoạt động, hiển thị trên website
- `inactive`: Category tạm ngưng, không hiển thị nhưng vẫn tồn tại trong database

---

## Notes

1. **Slug Uniqueness**: Slug phải unique trong toàn bộ hệ thống. Nếu trùng, sẽ báo lỗi 409 Conflict.

2. **Case Sensitivity**: Slug tự động được chuyển thành lowercase, không phân biệt hoa thường.

3. **No Pagination**: Hiện tại endpoint list không có phân trang. Nếu số lượng lớn, nên thêm pagination.

4. **Cascade Delete**: Khi xóa category, cần xử lý các sản phẩm liên quan ở application level.

---

_Tài liệu này được tạo ngày: 2025-11-13_
