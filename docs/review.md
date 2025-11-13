# Tài liệu API - Review Routes

## Base URL

```
http://localhost:4000/api
```

## Tổng quan

Tài liệu này mô tả chi tiết các endpoint quản lý Review (Đánh giá) trong hệ thống MERN Fashion Store.

---

## Review Routes (`/reviews`)

### 1. Lấy danh sách đánh giá theo sản phẩm

### `GET /reviews/product/:productId`

Lấy danh sách đánh giá theo sản phẩm với phân trang và sắp xếp.

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (public endpoint).

**Path Parameters:**

- `productId` (bắt buộc): ObjectId của sản phẩm

**Query Parameters:**

- `page` (tùy chọn): Số trang (mặc định: 1)
- `limit` (tùy chọn): Số item/trang (mặc định: 10, max: 100)
- `sort` (tùy chọn): `createdAt`, `-createdAt`, `rating`, `-rating`, `isVerifiedPurchase`, `-isVerifiedPurchase` (mặc định: `-createdAt`)

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "items": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "user": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
          "fullName": "Nguyễn Văn A",
          "avatarUrl": "https://example.com/avatar.jpg",
          "role": "customer",
          "email": "user@example.com"
        },
        "productId": "64f1a2b3c4d5e6f7a8b9c0d3",
        "rating": 5,
        "content": "Sản phẩm rất tốt, chất lượng cao",
        "images": ["https://res.cloudinary.com/..."],
        "isVerifiedPurchase": true,
        "replies": [
          {
            "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
            "user": {
              "_id": "64f1a2b3c4d5e6f7a8b9c0d5",
              "fullName": "Admin",
              "avatarUrl": null,
              "role": "admin",
              "email": "admin@example.com"
            },
            "content": "Cảm ơn bạn đã đánh giá sản phẩm!",
            "isAdminReply": true,
            "createdAt": "2023-09-01T10:30:00.000Z"
          }
        ],
        "createdAt": "2023-09-01T00:00:00.000Z",
        "updatedAt": "2023-09-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 35,
      "totalPages": 4
    }
  }
}
```

**Lưu ý:**

- Chỉ lấy reviews gốc (không phải replies)
- Reviews được tổ chức thành cây với replies
- Replies được sắp xếp theo `createdAt` tăng dần

---

### 2. Lấy tóm tắt rating theo sản phẩm

### `GET /reviews/product/:productId/summary`

Lấy tóm tắt rating theo sản phẩm (chỉ tính reviews gốc).

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (public endpoint).

**Path Parameters:**

- `productId` (bắt buộc): ObjectId của sản phẩm

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "ratingAvg": 4.35,
    "ratingCount": 52,
    "distribution": {
      "1": 2,
      "2": 3,
      "3": 7,
      "4": 18,
      "5": 22
    }
  }
}
```

**Lưu ý:**

- Chỉ tính reviews gốc (không tính replies)
- Distribution: Số lượng reviews theo từng mức rating (1-5)

---

### 3. Tạo đánh giá

### `POST /reviews`

Tạo đánh giá mới (hỗ trợ upload ảnh).

**Headers:**

```http
Content-Type: multipart/form-data
Authorization: Bearer <access_token>
```

**Authentication:**

Yêu cầu: Đã đăng nhập (bất kỳ role nào)

**Body (Form Data):**

- `productId` (bắt buộc): ObjectId của sản phẩm
- `rating` (bắt buộc): 1-5
- `content` (tùy chọn): Nội dung đánh giá (tối đa 1000 ký tự)
- `images` (tùy chọn): File[] (tối đa 5 ảnh, 5MB mỗi ảnh)

**Hoặc Body (JSON):**

```json
{
  "productId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "rating": 5,
  "content": "Sản phẩm rất tốt, chất lượng cao.",
  "images": [
    "https://res.cloudinary.com/.../reviews/a.jpg",
    "https://res.cloudinary.com/.../reviews/b.jpg"
  ]
}
```

**Validation Rules:**

- `productId` (bắt buộc): ObjectId hợp lệ
- `rating` (bắt buộc): 1-5
- `content` (tùy chọn): Tối đa 1000 ký tự, được sanitize server-side
- `images` (tùy chọn): Tối đa 5 ảnh, chấp nhận URL hợp lệ hoặc file ảnh

**Response Success (201 Created):**

```json
{
  "status": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "fullName": "Nguyễn Văn A",
      "avatarUrl": null,
      "role": "customer",
      "email": "user@example.com"
    },
    "productId": "64f1a2b3c4d5e6f7a8b9c0d3",
    "rating": 5,
    "content": "Sản phẩm rất tốt, chất lượng cao.",
    "images": ["https://res.cloudinary.com/..."],
    "isVerifiedPurchase": true,
    "replies": [],
    "createdAt": "2023-09-01T00:00:00.000Z",
    "updatedAt": "2023-09-01T00:00:00.000Z"
  }
}
```

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Thiếu productId/rating"
}
```

hoặc

```json
{
  "status": false,
  "message": "Dữ liệu đầu vào không hợp lệ",
  "details": [
    {
      "field": "rating",
      "message": "Đánh giá phải từ 1-5 sao",
      "value": 6
    },
    {
      "field": "content",
      "message": "Nội dung không được quá 1000 ký tự",
      "value": "..."
    }
  ]
}
```

**Response Error (409 Conflict):**

```json
{
  "status": false,
  "message": "Mỗi sản phẩm chỉ được đánh giá 1 lần"
}
```

**Lưu ý:**

- Rate limit: 20 requests/15 phút trên mỗi IP
- Mỗi user chỉ được đánh giá 1 lần/sản phẩm
- `isVerifiedPurchase`: Tự động kiểm tra user đã mua sản phẩm chưa
- Ảnh upload được lưu vào Cloudinary (folder: `reviews`)
- Content được sanitize để loại bỏ HTML/script
- Rating của sản phẩm được cập nhật tự động

---

### 4. Cập nhật đánh giá

### `PUT /reviews/:id`

Cập nhật đánh giá (chỉ chủ sở hữu hoặc staff/admin).

**Headers:**

```http
Content-Type: multipart/form-data
Authorization: Bearer <access_token>
```

**Authentication:**

Yêu cầu: Đã đăng nhập (bất kỳ role nào)

**Path Parameters:**

- `id` (bắt buộc): ObjectId của review

**Body:**

Tương tự như `POST /reviews`, tất cả các trường đều tùy chọn.

**Response Success (200 OK):**

Tương tự như `POST /reviews`, bao gồm replies nếu là review gốc.

**Response Error (403 Forbidden):**

```json
{
  "status": false,
  "message": "Không có quyền cập nhật đánh giá này"
}
```

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Đánh giá không tồn tại"
}
```

**Lưu ý:**

- Chỉ chủ sở hữu review hoặc staff/admin mới được cập nhật
- Chỉ review gốc mới được cập nhật rating
- Rating của sản phẩm được cập nhật tự động
- Rate limit: 20 requests/15 phút trên mỗi IP

---

### 5. Xóa đánh giá

### `DELETE /reviews/:id`

Xóa đánh giá (chỉ chủ sở hữu hoặc staff/admin).

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Authentication:**

Yêu cầu: Đã đăng nhập (bất kỳ role nào)

**Path Parameters:**

- `id` (bắt buộc): ObjectId của review

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "productId": "64f1a2b3c4d5e6f7a8b9c0d3",
    "rating": 5,
    "content": "Sản phẩm rất tốt",
    "images": [],
    "isVerifiedPurchase": true,
    "createdAt": "2023-09-01T00:00:00.000Z",
    "updatedAt": "2023-09-01T00:00:00.000Z"
  }
}
```

**Lưu ý:**

- Nếu xóa review gốc, tất cả replies sẽ bị xóa tự động
- Rating của sản phẩm được cập nhật tự động
- Rate limit: 20 requests/15 phút trên mỗi IP

---

### 6. Trả lời đánh giá

### `POST /reviews/:id/reply`

Trả lời một review (admin hoặc user thường).

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Authentication:**

Yêu cầu: Đã đăng nhập (bất kỳ role nào)

**Path Parameters:**

- `id` (bắt buộc): ObjectId của review cha

**Body:**

```json
{
  "content": "Cảm ơn bạn đã đánh giá sản phẩm!"
}
```

**Validation Rules:**

- `content` (bắt buộc): Không được để trống, tối đa 1000 ký tự

**Response Success (201 Created):**

```json
{
  "status": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d5",
      "fullName": "Admin",
      "avatarUrl": null,
      "role": "admin",
      "email": "admin@example.com"
    },
    "productId": "64f1a2b3c4d5e6f7a8b9c0d3",
    "parentId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "content": "Cảm ơn bạn đã đánh giá sản phẩm!",
    "isAdminReply": true,
    "createdAt": "2023-09-01T10:30:00.000Z",
    "updatedAt": "2023-09-01T10:30:00.000Z"
  }
}
```

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Nội dung reply không được để trống"
}
```

hoặc

```json
{
  "status": false,
  "message": "Chỉ được phép reply vào review gốc, không được reply vào reply"
}
```

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Review không tồn tại"
}
```

**Lưu ý:**

- Chỉ được reply vào review gốc (không được reply vào reply)
- Admin/staff reply sẽ có `isAdminReply: true`
- Content được sanitize để loại bỏ HTML/script
- Rate limit: 20 requests/15 phút trên mỗi IP

---

### 7. Lấy danh sách đánh giá (Admin)

### `GET /reviews/admin`

Lấy danh sách tất cả reviews để quản lý (chỉ dành cho admin).

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_token>
```

**Authentication:**

Yêu cầu: `admin`

**Query Parameters:**

- `page` (tùy chọn): Số trang (mặc định: 1)
- `limit` (tùy chọn): Số item/trang (mặc định: 20, max: 100)
- `sort` (tùy chọn): `createdAt`, `-createdAt`, `rating`, `-rating` (mặc định: `-createdAt`)
- `productId` (tùy chọn): Lọc theo product ID
- `userId` (tùy chọn): Lọc theo user ID
- `isAdminReply` (tùy chọn): `true`/`false` - Lọc theo admin reply
- `hasReplies` (tùy chọn): `true`/`false` - Lọc theo reviews có/không có replies

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "items": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "user": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
          "fullName": "Nguyễn Văn A",
          "avatarUrl": null,
          "role": "customer",
          "email": "user@example.com"
        },
        "product": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
          "name": "Áo thun nam",
          "slug": "ao-thun-nam"
        },
        "rating": 5,
        "content": "Sản phẩm rất tốt",
        "images": [],
        "isVerifiedPurchase": true,
        "parent": null,
        "createdAt": "2023-09-01T00:00:00.000Z",
        "updatedAt": "2023-09-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

**Lưu ý:**

- Bao gồm cả reviews gốc và replies
- Populate thông tin user và product
- Nếu là reply, có thông tin `parent`

---

### 8. Xóa đánh giá (Admin)

### `DELETE /reviews/admin/:id`

Xóa đánh giá (admin có thể xóa bất kỳ review nào).

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_token>
```

**Authentication:**

Yêu cầu: `admin`

**Path Parameters:**

- `id` (bắt buộc): ObjectId của review

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "productId": "64f1a2b3c4d5e6f7a8b9c0d3",
    "rating": 5,
    "content": "Sản phẩm rất tốt",
    "images": [],
    "isVerifiedPurchase": true,
    "createdAt": "2023-09-01T00:00:00.000Z",
    "updatedAt": "2023-09-01T00:00:00.000Z"
  }
}
```

**Lưu ý:**

- Nếu xóa review gốc, tất cả replies sẽ bị xóa tự động
- Rating của sản phẩm được cập nhật tự động

---

## Error Codes

### HTTP Status Codes

- `200`: OK - Thành công
- `201`: Created - Tạo mới thành công
- `400`: Bad Request - Dữ liệu đầu vào không hợp lệ
- `401`: Unauthorized - Chưa đăng nhập hoặc token không hợp lệ
- `403`: Forbidden - Không có quyền truy cập
- `404`: Not Found - Không tìm thấy tài nguyên
- `409`: Conflict - Dữ liệu đã tồn tại (review đã tồn tại)
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

---

## Data Models

### Review Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, index),
  productId: ObjectId (ref: Product, index),
  parentId: ObjectId (ref: Review, index, default: null),
  rating: Number (min: 1, max: 5, required if !parentId),
  content: String,
  images: [String] (max: 5),
  isVerifiedPurchase: Boolean (default: false),
  isAdminReply: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

---

## Authentication & Authorization

### Public Endpoints (Không cần authentication)

- `GET /reviews/product/:productId` - Lấy danh sách đánh giá
- `GET /reviews/product/:productId/summary` - Lấy tóm tắt rating

### Protected Endpoints (Yêu cầu authentication)

#### User (Any role)

- `POST /reviews` - Tạo đánh giá
- `PUT /reviews/:id` - Cập nhật đánh giá
- `DELETE /reviews/:id` - Xóa đánh giá
- `POST /reviews/:id/reply` - Trả lời đánh giá

#### Admin Only

- `GET /reviews/admin` - Lấy danh sách đánh giá (admin)
- `DELETE /reviews/admin/:id` - Xóa đánh giá (admin)

### Headers cho Protected Endpoints

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Lưu ý:** Cho upload ảnh, sử dụng `multipart/form-data`.

---

## Business Rules

### Review Management

- Mỗi user chỉ được đánh giá 1 lần/sản phẩm (chỉ reviews gốc)
- Reviews được tổ chức thành cây với replies
- Chỉ được reply vào review gốc (không được reply vào reply)
- Rating chỉ áp dụng cho reviews gốc (replies không có rating)
- Rating của sản phẩm được cập nhật tự động khi tạo/cập nhật/xóa review
- Chỉ tính reviews gốc khi tính rating trung bình
- Rate limit: 20 requests/15 phút trên mỗi IP cho write actions

---

## Best Practices

### Review Management

- Sanitize content để loại bỏ HTML/script
- Validate file type và size trước khi upload
- Rate limit write actions để tránh spam
- Auto-update product rating khi có thay đổi

---

## Notes

1. **Review Tree Structure**: Reviews được tổ chức thành cây với replies, dễ hiển thị trên frontend.

2. **Rating Update**: Rating của sản phẩm được cập nhật tự động bằng MongoDB aggregation.

3. **Rate Limiting**: Review write actions có rate limit 20 requests/15 phút trên mỗi IP.

4. **Image Upload**: Ảnh được upload lên Cloudinary với transformation tự động.

---

_Tài liệu này được tạo ngày: 2025-11-13_
