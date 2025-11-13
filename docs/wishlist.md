# Tài liệu API - Wishlist Routes

## Base URL

```
http://localhost:4000/api
```

## Tổng quan

Tài liệu này mô tả chi tiết các endpoint quản lý Wishlist (Danh sách yêu thích) trong hệ thống MERN Fashion Store.

---

## Wishlist Routes (`/wishlist`)

### 1. Lấy danh sách wishlist

### `GET /wishlist`

Lấy danh sách wishlist của user hiện tại.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Authentication:**

Yêu cầu: Đã đăng nhập (bất kỳ role nào)

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "products": [
      {
        "product_id": "64f1a2b3c4d5e6f7a8b9c0d2",
        "name": "Áo thun nam",
        "slug": "ao-thun-nam",
        "description": "Áo thun nam chất liệu cotton",
        "price": 250000,
        "origin_price": 300000,
        "discount": 17,
        "stock": 100,
        "image": "https://example.com/product.jpg",
        "images": [],
        "thumbnailImage": null,
        "variants": [
          {
            "sku": "ATN-RED-M",
            "color_name": "đỏ",
            "size_name": "M",
            "price": 250000,
            "origin_price": 300000,
            "discount": 17,
            "stock": 50,
            "image": "https://example.com/variant1.jpg"
          }
        ],
        "brand": {
          "id": "64f1a2b3c4d5e6f7a8b9c0d3",
          "name": "Nike",
          "logo": "https://example.com/nike-logo.png"
        },
        "categories": [
          {
            "id": "64f1a2b3c4d5e6f7a8b9c0d4",
            "name": "Áo thun",
            "slug": "ao-thun"
          }
        ],
        "tags": ["hot", "new"],
        "status": "active",
        "ratingAvg": 4.5,
        "ratingCount": 120,
        "salesCount": 500,
        "createdAt": "2023-09-01T00:00:00.000Z",
        "updatedAt": "2023-09-01T00:00:00.000Z"
      }
    ],
    "createdAt": "2023-09-01T00:00:00.000Z",
    "updatedAt": "2023-09-01T00:00:00.000Z"
  }
}
```

**Lưu ý:**

- Nếu chưa có wishlist, hệ thống sẽ tạo wishlist mới (rỗng)
- Products được populate với đầy đủ thông tin
- Loại bỏ products đã bị xóa (null)

---

### 2. Thêm/xóa sản phẩm khỏi wishlist

### `POST /wishlist/toggle`

Thêm hoặc xóa sản phẩm khỏi wishlist (toggle).

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Authentication:**

Yêu cầu: Đã đăng nhập (bất kỳ role nào)

**Body:**

```json
{
  "productId": "64f1a2b3c4d5e6f7a8b9c0d1"
}
```

**Validation Rules:**

- `productId` (bắt buộc): ObjectId hợp lệ của Product

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "products": [
      {
        "product_id": "64f1a2b3c4d5e6f7a8b9c0d2",
        "name": "Áo thun nam",
        "slug": "ao-thun-nam",
        "price": 250000,
        "image": "https://example.com/product.jpg",
        "variants": [...],
        "brand": {...},
        "categories": [...],
        "ratingAvg": 4.5,
        "ratingCount": 120
      },
      {
        "product_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Áo thun nam mới",
        "slug": "ao-thun-nam-moi",
        "price": 250000,
        "image": "https://example.com/product2.jpg",
        "variants": [...],
        "brand": {...},
        "categories": [...],
        "ratingAvg": 4.5,
        "ratingCount": 120
      }
    ],
    "isAdded": true,
    "createdAt": "2023-09-01T00:00:00.000Z",
    "updatedAt": "2023-09-01T10:30:00.000Z"
  }
}
```

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Sản phẩm không tồn tại"
}
```

**Lưu ý:**

- Nếu sản phẩm đã có trong wishlist, nó sẽ bị xóa
- Nếu sản phẩm chưa có trong wishlist, nó sẽ được thêm vào
- `isAdded`: `true` nếu đã thêm, `false` nếu đã xóa

---

### 3. Xóa sản phẩm khỏi wishlist

### `DELETE /wishlist/:productId`

Xóa sản phẩm khỏi wishlist.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Authentication:**

Yêu cầu: Đã đăng nhập (bất kỳ role nào)

**Path Parameters:**

- `productId` (bắt buộc): ObjectId của sản phẩm cần xóa

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "products": [
      {
        "product_id": "64f1a2b3c4d5e6f7a8b9c0d2",
        "name": "Áo thun nam",
        "slug": "ao-thun-nam",
        "price": 250000,
        "image": "https://example.com/product.jpg",
        "variants": [...],
        "brand": {...},
        "categories": [...],
        "ratingAvg": 4.5,
        "ratingCount": 120
      }
    ],
    "removed": true,
    "createdAt": "2023-09-01T00:00:00.000Z",
    "updatedAt": "2023-09-01T10:30:00.000Z"
  }
}
```

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Thiếu productId"
}
```

**Lưu ý:**

- `removed`: `true` nếu đã xóa, `false` nếu không tìm thấy
- Nếu wishlist không tồn tại, trả về mảng products rỗng

---

## Error Codes

### HTTP Status Codes

- `200`: OK - Thành công
- `400`: Bad Request - Dữ liệu đầu vào không hợp lệ
- `401`: Unauthorized - Chưa đăng nhập hoặc token không hợp lệ
- `404`: Not Found - Không tìm thấy tài nguyên
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

### Wishlist Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, unique, index),
  productIds: [ObjectId] (ref: Product),
  createdAt: Date,
  updatedAt: Date
}
```

---

## Authentication & Authorization

### Protected Endpoints (Yêu cầu authentication)

#### User (Any role)

- `GET /wishlist` - Lấy danh sách wishlist
- `POST /wishlist/toggle` - Thêm/xóa sản phẩm khỏi wishlist
- `DELETE /wishlist/:productId` - Xóa sản phẩm khỏi wishlist

### Headers cho Protected Endpoints

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## Business Rules

### Wishlist Management

- Mỗi user chỉ có 1 wishlist
- Wishlist được tạo tự động khi user thêm sản phẩm đầu tiên
- Products đã bị xóa sẽ được loại bỏ khỏi wishlist (null)

---

## Best Practices

### Wishlist Management

- Populate products với đầy đủ thông tin
- Loại bỏ products đã bị xóa tự động
- Format products theo chuẩn response

---

## Notes

1. **Wishlist Auto-Creation**: Wishlist được tạo tự động khi user thêm sản phẩm đầu tiên.

2. **Product Cleanup**: Products đã bị xóa sẽ được loại bỏ khỏi wishlist tự động.

3. **Toggle Functionality**: Endpoint `/wishlist/toggle` cho phép thêm hoặc xóa sản phẩm trong một request.

---

_Tài liệu này được tạo ngày: 2025-11-13_
