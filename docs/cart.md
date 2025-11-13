# Tài liệu API - Cart Routes

## Base URL

```
http://localhost:4000/api
```

## Tổng quan

Tài liệu này mô tả chi tiết các endpoint quản lý Cart (Giỏ hàng) trong hệ thống MERN Fashion Store.

---

## 1. Lấy giỏ hàng của user

### `GET /cart`

Lấy giỏ hàng của user hiện tại, các variants được gộp theo sản phẩm.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Authentication:**

Yêu cầu: Đã đăng nhập (bất kỳ role nào)

**Query Parameters:**

Không có.

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "items": [
      {
        "product_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Áo thun nam",
        "price": 250000,
        "origin_price": 300000,
        "discount": 50000,
        "stock": 100,
        "image": "https://example.com/product.jpg",
        "variants": [
          {
            "sku": "ATN-RED-M",
            "color_name": "đỏ",
            "size_name": "M",
            "price": 250000,
            "origin_price": 300000,
            "discount": 50000,
            "stock": 50,
            "image": "https://example.com/variant1.jpg",
            "quantity": 2
          },
          {
            "sku": "ATN-RED-L",
            "color_name": "đỏ",
            "size_name": "L",
            "price": 250000,
            "origin_price": 300000,
            "discount": 50000,
            "stock": 50,
            "image": "https://example.com/variant2.jpg",
            "quantity": 1
          }
        ],
        "ratingAvg": 4.5,
        "ratingCount": 120
      }
    ],
    "subtotal": 750000,
    "discount": 0,
    "shippingFee": 30000,
    "total": 780000
  }
}
```

**Lưu ý:**

- Nếu chưa có giỏ hàng, hệ thống sẽ tạo giỏ hàng mới (rỗng)
- Variants được gộp theo sản phẩm để dễ hiển thị
- Phí ship: Miễn phí nếu `subtotal > 500000`, ngược lại là `30000`
- Giá và thông tin sản phẩm được lấy từ database (real-time)

**Response Error (401 Unauthorized):**

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

## 2. Thêm sản phẩm vào giỏ hàng

### `POST /cart/items`

Thêm sản phẩm vào giỏ hàng. Nếu sản phẩm đã có, sẽ cộng dồn số lượng.

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
  "productId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "sku": "ATN-RED-M",
  "quantity": 2
}
```

**Validation Rules:**

- `productId` (bắt buộc): ObjectId hợp lệ của Product
- `sku` (bắt buộc): SKU của variant
- `quantity` (tùy chọn):
  - Số lượng thêm vào (mặc định: 1)
  - Tối đa: 999 sản phẩm mỗi SKU
  - Phải lớn hơn 0

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "items": [
      {
        "product_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Áo thun nam",
        "price": 250000,
        "origin_price": 300000,
        "discount": 50000,
        "stock": 100,
        "image": "https://example.com/product.jpg",
        "variants": [
          {
            "sku": "ATN-RED-M",
            "color_name": "đỏ",
            "size_name": "M",
            "price": 250000,
            "origin_price": 300000,
            "discount": 50000,
            "stock": 48,
            "image": "https://example.com/variant1.jpg",
            "quantity": 4
          }
        ],
        "ratingAvg": 4.5,
        "ratingCount": 120
      }
    ],
    "subtotal": 1000000,
    "discount": 0,
    "shippingFee": 0,
    "total": 1000000
  }
}
```

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Hết hàng/không đủ tồn"
}
```

hoặc

```json
{
  "status": false,
  "message": "Số lượng tối đa cho mỗi sản phẩm là 999"
}
```

hoặc

```json
{
  "status": false,
  "message": "Không đủ tồn kho cho số lượng này"
}
```

**Response Error (401 Unauthorized):**

```json
{
  "ok": false,
  "error": {
    "code": 401,
    "message": "Unauthorized"
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

hoặc

```json
{
  "status": false,
  "message": "SKU không tồn tại"
}
```

**Lưu ý:**

- Nếu sản phẩm đã có trong giỏ hàng, số lượng sẽ được cộng dồn
- Kiểm tra tồn kho trước khi thêm
- Tối đa 999 sản phẩm mỗi SKU
- Event tracking: `add_to_cart` được ghi lại

---

## 3. Cập nhật item trong giỏ hàng

### `PUT /cart/items`

Cập nhật số lượng sản phẩm trong giỏ hàng hoặc đổi variant của cùng sản phẩm.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Authentication:**

Yêu cầu: Đã đăng nhập (bất kỳ role nào)

**Body (Cập nhật số lượng):**

```json
{
  "productId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "sku": "ATN-RED-M",
  "quantity": 3
}
```

**Body (Đổi variant):**

```json
{
  "productId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "sku": "ATN-RED-M",
  "newSku": "ATN-BLUE-L",
  "quantity": 2
}
```

**Validation Rules:**

- `sku` (bắt buộc): SKU hiện tại trong giỏ hàng
- `productId` (tùy chọn): ObjectId của Product (để tìm item chính xác hơn)
- `newSku` (tùy chọn): SKU mới (nếu muốn đổi variant)
- `quantity` (tùy chọn):
  - Số lượng mới
  - Nếu `quantity <= 0`, sản phẩm sẽ bị xóa khỏi giỏ hàng
  - Tối đa: 999

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "items": [
      {
        "product_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Áo thun nam",
        "price": 250000,
        "origin_price": 300000,
        "discount": 50000,
        "stock": 100,
        "image": "https://example.com/product.jpg",
        "variants": [
          {
            "sku": "ATN-BLUE-L",
            "color_name": "xanh",
            "size_name": "L",
            "price": 250000,
            "origin_price": 300000,
            "discount": 50000,
            "stock": 48,
            "image": "https://example.com/variant2.jpg",
            "quantity": 2
          }
        ],
        "ratingAvg": 4.5,
        "ratingCount": 120
      }
    ],
    "subtotal": 500000,
    "discount": 0,
    "shippingFee": 30000,
    "total": 530000
  }
}
```

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Hết hàng/không đủ tồn"
}
```

hoặc

```json
{
  "status": false,
  "message": "Số lượng tối đa cho mỗi sản phẩm là 999"
}
```

hoặc

```json
{
  "status": false,
  "message": "Hết hàng/không đủ tồn cho SKU mới"
}
```

**Response Error (401 Unauthorized):**

```json
{
  "ok": false,
  "error": {
    "code": 401,
    "message": "Unauthorized"
  }
}
```

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Chưa có giỏ hàng"
}
```

hoặc

```json
{
  "status": false,
  "message": "Item không tồn tại trong giỏ hàng"
}
```

hoặc

```json
{
  "status": false,
  "message": "Sản phẩm không tồn tại"
}
```

hoặc

```json
{
  "status": false,
  "message": "SKU mới không tồn tại"
}
```

**Lưu ý:**

- Nếu `quantity <= 0`, sản phẩm sẽ bị xóa khỏi giỏ hàng
- Có thể đổi variant (màu, size) bằng cách dùng `newSku`
- Khi đổi variant, giá và ảnh sẽ được cập nhật theo variant mới
- Kiểm tra tồn kho trước khi cập nhật

---

## 4. Xóa toàn bộ giỏ hàng

### `DELETE /cart`

Xóa toàn bộ sản phẩm khỏi giỏ hàng.

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
    "items": [],
    "subtotal": 0,
    "discount": 0,
    "shippingFee": 0,
    "total": 0
  }
}
```

**Response Error (401 Unauthorized):**

```json
{
  "ok": false,
  "error": {
    "code": 401,
    "message": "Unauthorized"
  }
}
```

**Lưu ý:**

- Xóa tất cả items trong giỏ hàng
- Tổng tiền được reset về 0
- Giỏ hàng vẫn tồn tại (không bị xóa)

---

## Error Codes

### HTTP Status Codes

- `200`: OK - Thành công
- `400`: Bad Request - Dữ liệu đầu vào không hợp lệ
- `401`: Unauthorized - Chưa đăng nhập hoặc token không hợp lệ
- `404`: Not Found - Không tìm thấy tài nguyên

### Error Response Format

**Format từ controller:**

```json
{
  "status": false,
  "message": "Mô tả lỗi"
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

## Data Models

### Cart Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, unique, index),
  items: [{
    productId: ObjectId (ref: Product),
    sku: String,
    name: String, // snapshot
    price: Number, // snapshot
    quantity: Number (min: 1),
    image: String
  }],
  couponCode: String (optional),
  subtotal: Number (default: 0),
  discount: Number (default: 0),
  shippingFee: Number (default: 0),
  total: Number (default: 0),
  createdAt: Date,
  updatedAt: Date
}
```

---

## Authentication & Authorization

### Protected Endpoints (Yêu cầu authentication)

#### User (Any role)

- `GET /cart` - Lấy giỏ hàng
- `POST /cart/items` - Thêm sản phẩm vào giỏ hàng
- `PUT /cart/items` - Cập nhật item trong giỏ hàng
- `DELETE /cart` - Xóa toàn bộ giỏ hàng

### Headers cho Protected Endpoints

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## Business Rules

### 1. Cart Management

- Mỗi user chỉ có 1 giỏ hàng
- Giỏ hàng được tạo tự động khi user thêm sản phẩm đầu tiên
- Variants được gộp theo sản phẩm trong response
- Số lượng tối đa: 999 sản phẩm mỗi SKU
- Phí ship: Miễn phí nếu `subtotal > 500000`, ngược lại là `30000`

---

## Best Practices

### 1. Cart Operations

- Luôn kiểm tra tồn kho trước khi thêm/cập nhật
- Validate số lượng (tối đa 999)
- Tính toán lại tổng tiền sau mỗi thao tác
- Sử dụng snapshot để lưu giá và tên sản phẩm

---

## Notes

1. **Cart Aggregation**: Variants được gộp theo sản phẩm để dễ hiển thị trên frontend.

2. **Shipping Fee**: Miễn phí nếu `subtotal > 500000`, ngược lại là `30000`.

3. **Event Tracking**: `add_to_cart` được ghi lại khi thêm sản phẩm vào giỏ hàng.

4. **Real-time Pricing**: Giá và thông tin sản phẩm được lấy từ database (real-time) để đảm bảo tính chính xác.

---

_Tài liệu này được tạo ngày: 2025-11-13_
