# Tài liệu API - Product Routes

## Base URL

```
http://localhost:4000/api
```

## Tổng quan

Tài liệu này mô tả chi tiết các endpoint quản lý Product (Sản phẩm) trong hệ thống MERN Fashion Store.

---

## Product Routes (`/products`)

### 1. Lấy danh sách sản phẩm

### `GET /products`

Lấy danh sách sản phẩm với filter và pagination.

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (public endpoint).

**Query Parameters:**

- `page` (tùy chọn): Số trang (mặc định: 1)
- `limit` (tùy chọn): Số item/trang (mặc định: 20)
- `q` (tùy chọn): Text search (tìm kiếm theo tên, description, tags)
- `brand` (tùy chọn): ID hoặc mảng ID thương hiệu
- `category` (tùy chọn): ID hoặc mảng ID danh mục
- `status` (tùy chọn): `active`, `draft`, `archived`, `all` (mặc định: `active`)
- `min` (tùy chọn): Giá tối thiểu
- `max` (tùy chọn): Giá tối đa
- `color` (tùy chọn): Màu sắc (có thể là string comma-separated hoặc mảng)
- `size` (tùy chọn): Kích thước (`S`, `M`, `L`, `XL`, `ONE SIZE`)
- `tags` (tùy chọn): Tags sản phẩm (có thể là string hoặc mảng)
- `minRating` (tùy chọn): Đánh giá tối thiểu (0-5)
- `inStock` (tùy chọn): `true`/`false` - Lọc sản phẩm còn hàng
- `sort` (tùy chọn): `createdAt`, `price`, `rating`, `sales`, `name`, `discount` (mặc định: `createdAt`)
- `order` (tùy chọn): `asc` hoặc `desc` (mặc định: `desc`)

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": [
    {
      "product_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Áo thun nam",
      "price": 250000,
      "origin_price": 300000,
      "discount": 17,
      "stock": 100,
      "image": "https://example.com/product.jpg",
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
        },
        {
          "sku": "ATN-RED-L",
          "color_name": "đỏ",
          "size_name": "L",
          "price": 250000,
          "origin_price": 300000,
          "discount": 17,
          "stock": 50,
          "image": "https://example.com/variant2.jpg"
        }
      ],
      "ratingAvg": 4.5,
      "ratingCount": 120
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Lưu ý:**

- Variants được gộp theo sản phẩm
- Discount được tính theo phần trăm (%)
- Khi sort theo `discount`, sử dụng aggregation pipeline để tính toán chính xác
- Size filter chỉ chấp nhận: `S`, `M`, `L`, `XL`, `ONE SIZE`
- Color filter hỗ trợ comma-separated values (ví dụ: `đỏ,xanh,đen`)

---

### 2. Tìm kiếm đơn giản

### `GET /products/search`

Tìm kiếm sản phẩm đơn giản, nhanh, dễ hiểu.

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (public endpoint).

**Query Parameters:**

Tương tự như `GET /products` nhưng tập trung vào các filter cơ bản:

- `q`: Text search (tìm kiếm theo tên)
- `brand`, `category`: Lọc theo thương hiệu, danh mục
- `min`, `max`: Khoảng giá
- `color`, `size`: Màu sắc, kích thước
- `minRating`: Đánh giá tối thiểu
- `inStock`: Lọc sản phẩm còn hàng
- `sort`: `createdAt`, `price`, `rating`, `name`, `discount`
- `order`: `asc` hoặc `desc`
- `page`, `limit`: Phân trang

**Response Success (200 OK):**

Tương tự như `GET /products`.

**Lưu ý:**

- Event tracking: `search` được ghi lại
- Tìm kiếm theo tên sử dụng regex (case-insensitive)
- Không hỗ trợ full-text search như endpoint `/products/search-advanced`

---

### 3. Tìm kiếm nâng cao với faceted search

### `GET /products/search-advanced`

Tìm kiếm nâng cao với faceted search và text search đầy đủ.

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (public endpoint).

**Query Parameters:**

Tương tự như `GET /products` nhưng có thêm:

- `sort`: `relevance` (mặc định), `price`, `rating`, `sales`, `name`, `discount`
- `order`: `asc` hoặc `desc`

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": [
    {
      "product_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Áo thun nam",
      "price": 250000,
      "origin_price": 300000,
      "discount": 17,
      "stock": 100,
      "image": "https://example.com/product.jpg",
      "variants": [...],
      "ratingAvg": 4.5,
      "ratingCount": 120
    }
  ],
  "facets": {
    "brands": ["64f1a2b3c4d5e6f7a8b9c0d1"],
    "categories": ["64f1a2b3c4d5e6f7a8b9c0d2"],
    "colors": ["đỏ", "xanh", "đen"],
    "sizes": ["S", "M", "L", "XL"],
    "tags": ["hot", "new", "sale"],
    "priceRange": {
      "min": 100000,
      "max": 2000000
    },
    "avgRating": 4.2,
    "totalProducts": 150
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Lưu ý:**

- Event tracking: `search` được ghi lại
- Sử dụng MongoDB text search index
- Facets cung cấp thông tin filter có sẵn
- Sort theo `relevance` sử dụng text score khi có query

---

### 4. Tìm kiếm gợi ý (Autocomplete)

### `GET /products/suggest`

Tìm kiếm gợi ý cho autocomplete.

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (public endpoint).

**Query Parameters:**

- `q` (bắt buộc): Text search (tối thiểu 2 ký tự)
- `limit` (tùy chọn): Số lượng kết quả (mặc định: 10)

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Áo thun nam",
      "slug": "ao-thun-nam",
      "image": "https://example.com/product.jpg",
      "brandId": "64f1a2b3c4d5e6f7a8b9c0d2",
      "categoryIds": ["64f1a2b3c4d5e6f7a8b9c0d3"]
    }
  ]
}
```

**Response Error (400 Bad Request):**

Nếu `q` có ít hơn 2 ký tự, trả về mảng rỗng.

**Lưu ý:**

- Chỉ tìm kiếm trong sản phẩm `active`
- Tìm kiếm theo tên và tags (regex, case-insensitive)
- Trả về thông tin tối thiểu để tối ưu performance

---

### 5. Lấy chi tiết sản phẩm theo slug

### `GET /products/:slug`

Lấy chi tiết sản phẩm theo slug.

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (public endpoint).

**Path Parameters:**

- `slug` (bắt buộc): Slug của sản phẩm

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "category": [
      {
        "id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Áo thun",
        "slug": "ao-thun"
      }
    ],
    "product": {
      "product_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Áo thun nam",
      "price": 250000,
      "origin_price": 300000,
      "discount": 17,
      "stock": 100,
      "image": "https://example.com/product.jpg",
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
      "ratingAvg": 4.5,
      "ratingCount": 120
    }
  }
}
```

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Không tìm thấy sản phẩm"
}
```

**Lưu ý:**

- Event tracking: `view` được ghi lại
- Trả về thông tin category của sản phẩm
- Variants được format đầy đủ

---

### 6. Lấy chi tiết sản phẩm theo ID

### `GET /products/id/:id`

Lấy chi tiết sản phẩm theo ObjectId.

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (public endpoint).

**Path Parameters:**

- `id` (bắt buộc): ObjectId của sản phẩm

**Response Success (200 OK):**

Tương tự như `GET /products/:slug`.

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Dữ liệu đầu vào không hợp lệ",
  "details": [
    {
      "field": "id",
      "message": "ID sản phẩm không hợp lệ",
      "value": "invalid-id"
    }
  ]
}
```

**Lưu ý:**

- Event tracking: `view` được ghi lại
- Validation: ID phải là ObjectId hợp lệ

---

### 7. Lấy sản phẩm liên quan

### `GET /products/related`

Lấy sản phẩm liên quan dựa trên category, brand và tags.

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (public endpoint).

**Query Parameters:**

- `slug` (bắt buộc): Slug của sản phẩm hiện tại
- `limit` (tùy chọn): Số lượng sản phẩm liên quan (mặc định: 8)

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": [
    {
      "product_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Áo thun nam khác",
      "price": 250000,
      "origin_price": 300000,
      "discount": 17,
      "stock": 100,
      "image": "https://example.com/product.jpg",
      "variants": [...],
      "ratingAvg": 4.5,
      "ratingCount": 120
    }
  ]
}
```

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Không tìm thấy sản phẩm"
}
```

**Lưu ý:**

- Chỉ lấy sản phẩm `active`
- Sản phẩm liên quan được sắp xếp theo `ratingAvg` và `salesCount`
- Loại trừ sản phẩm hiện tại khỏi kết quả

---

### 8. Lấy sản phẩm gợi ý (Recommendations)

### `GET /products/recommendations`

Lấy sản phẩm gợi ý dựa trên lịch sử hành vi người dùng.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Authentication:**

Yêu cầu: Đã đăng nhập (bất kỳ role nào)

**Query Parameters:**

- `limit` (tùy chọn): Số lượng sản phẩm gợi ý (mặc định: 12)
- `type` (tùy chọn): Loại gợi ý (`mixed`, `category`, `brand`, `similar`, mặc định: `mixed`)

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": [
    {
      "product_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Áo thun nam",
      "price": 250000,
      "origin_price": 300000,
      "discount": 17,
      "stock": 100,
      "image": "https://example.com/product.jpg",
      "variants": [...],
      "ratingAvg": 4.5,
      "ratingCount": 120
    }
  ],
  "message": "Đề xuất dựa trên hành vi tổng hợp",
  "type": "mixed",
  "preferences": {
    "topCategories": ["64f1a2b3c4d5e6f7a8b9c0d1"],
    "topBrands": ["64f1a2b3c4d5e6f7a8b9c0d2"],
    "totalEvents": 50
  }
}
```

**Lưu ý:**

- Dựa trên lịch sử hành vi trong 30 ngày gần nhất
- Event weights: `purchase` (3), `add_to_cart` (2), `view` (1)
- Nếu không có lịch sử, trả về sản phẩm phổ biến
- Loại trừ sản phẩm đã tương tác
- Types:
  - `mixed`: Kết hợp nhiều phương pháp
  - `category`: Dựa trên category
  - `brand`: Dựa trên brand
  - `similar`: Dựa trên sản phẩm tương tự

---

### 9. Lấy thống kê sản phẩm

### `GET /products/stats`

Lấy thống kê sản phẩm.

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (public endpoint).

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "totalProducts": 500,
    "activeProducts": 450,
    "statusBreakdown": [
      {
        "_id": "active",
        "count": 450,
        "avgRating": 4.2,
        "totalSales": 1250
      },
      {
        "_id": "draft",
        "count": 30,
        "avgRating": 0,
        "totalSales": 0
      },
      {
        "_id": "archived",
        "count": 20,
        "avgRating": 3.8,
        "totalSales": 300
      }
    ],
    "recentProducts": [
      {
        "product_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Áo thun nam mới",
        "price": 250000,
        "origin_price": 300000,
        "discount": 17,
        "stock": 100,
        "image": "https://example.com/product.jpg",
        "variants": [...],
        "ratingAvg": 0,
        "ratingCount": 0
      }
    ]
  }
}
```

**Lưu ý:**

- Thống kê theo status
- Recent products: 5 sản phẩm mới nhất (active)

---

### 10. Lấy sản phẩm theo category slug

### `GET /products/category/:slug`

Lấy danh sách sản phẩm theo category slug.

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (public endpoint).

**Path Parameters:**

- `slug` (bắt buộc): Slug của category

**Query Parameters:**

- `status` (tùy chọn): `active`, `draft`, `archived`, `all` (mặc định: `active`)
- `sort` (tùy chọn): `createdAt`, `price`, `rating`, `sales`, `name`, `discount` (mặc định: `createdAt`)
- `order` (tùy chọn): `asc` hoặc `desc` (mặc định: `desc`)
- `min_price` (tùy chọn): Giá tối thiểu (mặc định: `min_price` - không filter)
- `max_price` (tùy chọn): Giá tối đa (mặc định: `max_price` - không filter)
- `minRating` (tùy chọn): Đánh giá tối thiểu (0-5)
- `page` (tùy chọn): Số trang (mặc định: 1)
- `limit` (tùy chọn): Số item/trang (mặc định: 20)

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "category": [
      {
        "id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Áo thun",
        "slug": "ao-thun"
      }
    ],
    "products": [
      {
        "product_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Áo thun nam",
        "price": 250000,
        "origin_price": 300000,
        "discount": 17,
        "stock": 100,
        "image": "https://example.com/product.jpg",
        "variants": [...],
        "ratingAvg": 4.5,
        "ratingCount": 120
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Không tìm thấy danh mục"
}
```

---

### 11. Lấy sản phẩm theo brand slug

### `GET /products/brand/:slug`

Lấy danh sách sản phẩm theo brand slug.

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (public endpoint).

**Path Parameters:**

- `slug` (bắt buộc): Slug của brand

**Query Parameters:**

- `status` (tùy chọn): `active`, `draft`, `archived`, `all` (mặc định: `active`)
- `sort` (tùy chọn): `createdAt`, `price`, `rating`, `sales`, `name`, `discount` (mặc định: `createdAt`)
- `order` (tùy chọn): `asc` hoặc `desc` (mặc định: `desc`)
- `minRating` (tùy chọn): Đánh giá tối thiểu (0-5)
- `page` (tùy chọn): Số trang (mặc định: 1)
- `limit` (tùy chọn): Số item/trang (mặc định: 20)

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "brand": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Nike",
      "slug": "nike",
      "logo": "https://example.com/nike-logo.png"
    },
    "products": [
      {
        "product_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Áo thun nam",
        "price": 250000,
        "origin_price": 300000,
        "discount": 17,
        "stock": 100,
        "image": "https://example.com/product.jpg",
        "variants": [...],
        "ratingAvg": 4.5,
        "ratingCount": 120
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Không tìm thấy thương hiệu"
}
```

---

### 12. Vector Search

### `POST /products/vector-search`

Tìm kiếm sản phẩm sử dụng vector search (AI-powered).

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (public endpoint).

**Body:**

```json
{
  "query": "áo thun nam màu đỏ"
}
```

**Validation Rules:**

- `query` (bắt buộc): Text query để tìm kiếm

**Response Success (200 OK):**

```json
[
  {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Áo thun nam màu đỏ",
    "slug": "ao-thun-nam-mau-do",
    "price": 250000,
    "image": "https://example.com/product.jpg"
  }
]
```

**Response Error (500 Internal Server Error):**

```json
{
  "error": "Error message"
}
```

**Lưu ý:**

- Sử dụng Google AI để tạo embedding
- Vector search sử dụng MongoDB Atlas Vector Search
- Index: `vector_index_1`
- Similarity: `cosine`
- Num candidates: 200
- Limit: 50

---

### 13. Tạo sản phẩm mới (Admin/Staff)

### `POST /products`

Tạo sản phẩm mới.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_or_staff_token>
```

**Authentication:**

Yêu cầu: `admin` hoặc `staff` (RBAC: `product:write:all`)

**Body:**

```json
{
  "name": "Áo thun nam mới",
  "slug": "ao-thun-nam-moi",
  "description": "Áo thun nam chất liệu cotton cao cấp",
  "brandId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "categoryIds": ["64f1a2b3c4d5e6f7a8b9c0d2"],
  "tags": ["hot", "new"],
  "image": "https://example.com/product.jpg",
  "variants": [
    {
      "sku": "ATN-RED-M",
      "color": "đỏ",
      "size": "M",
      "price": 250000,
      "compareAtPrice": 300000,
      "stock": 50,
      "image": "https://example.com/variant1.jpg"
    },
    {
      "sku": "ATN-BLUE-L",
      "color": "xanh",
      "size": "L",
      "price": 250000,
      "compareAtPrice": 300000,
      "stock": 50,
      "image": "https://example.com/variant2.jpg"
    }
  ],
  "status": "active"
}
```

**Validation Rules:**

- `name` (bắt buộc): 2-100 ký tự
- `slug` (bắt buộc): Phải unique
- `variants` (bắt buộc): Mảng ít nhất 1 variant
- `brandId` (bắt buộc): ObjectId hợp lệ
- `categoryIds` (bắt buộc): Mảng ObjectId hợp lệ
- `description` (tùy chọn): Tối đa 2000 ký tự
- `tags` (tùy chọn): Mảng strings
- `status` (tùy chọn): `draft`, `active`, `archived` (mặc định: `active`)

**Response Success (201 Created):**

```json
{
  "status": true,
  "product_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "name": "Áo thun nam mới",
  "price": 250000,
  "origin_price": 300000,
  "discount": 17,
  "stock": 100,
  "image": "https://example.com/product.jpg",
  "variants": [...]
}
```

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Thiếu name/slug/variants"
}
```

hoặc

```json
{
  "status": false,
  "message": "Dữ liệu đầu vào không hợp lệ",
  "details": [
    {
      "field": "name",
      "message": "Tên sản phẩm phải từ 2-100 ký tự",
      "value": "A"
    }
  ]
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

**Response Error (403 Forbidden):**

```json
{
  "ok": false,
  "error": {
    "code": 403,
    "message": "Forbidden"
  }
}
```

---

### 14. Cập nhật sản phẩm (Admin/Staff)

### `PUT /products/:id`

Cập nhật thông tin sản phẩm.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_or_staff_token>
```

**Authentication:**

Yêu cầu: `admin` hoặc `staff` (RBAC: `product:write:all`)

**Path Parameters:**

- `id` (bắt buộc): ObjectId của sản phẩm

**Body:**

Tương tự như `POST /products`, tất cả các trường đều tùy chọn (chỉ cập nhật các trường được gửi).

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "product_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Áo thun nam đã cập nhật",
    "price": 250000,
    "origin_price": 300000,
    "discount": 17,
    "stock": 100,
    "image": "https://example.com/product.jpg",
    "variants": [...]
  }
}
```

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Không tìm thấy sản phẩm"
}
```

---

### 15. Xóa sản phẩm (Admin/Staff)

### `DELETE /products/:id`

Xóa sản phẩm.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_or_staff_token>
```

**Authentication:**

Yêu cầu: `admin` hoặc `staff` (RBAC: `product:delete:all`)

**Path Parameters:**

- `id` (bắt buộc): ObjectId của sản phẩm

**Response Success (200 OK):**

```json
{
  "status": true,
  "message": "Product deleted successfully"
}
```

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Dữ liệu đầu vào không hợp lệ",
  "details": [
    {
      "field": "id",
      "message": "ID sản phẩm không hợp lệ",
      "value": "invalid-id"
    }
  ]
}
```

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Không tìm thấy sản phẩm"
}
```

---

## Error Codes

### HTTP Status Codes

- `200`: OK - Thành công
- `201`: Created - Tạo mới thành công
- `400`: Bad Request - Dữ liệu đầu vào không hợp lệ
- `401`: Unauthorized - Chưa đăng nhập hoặc token không hợp lệ
- `403`: Forbidden - Không có quyền truy cập
- `404`: Not Found - Không tìm thấy tài nguyên
- `500`: Internal Server Error - Lỗi server

---

## Authentication & Authorization

### Public Endpoints (Không cần authentication)

- `GET /products` - Lấy danh sách sản phẩm
- `GET /products/search` - Tìm kiếm đơn giản
- `GET /products/search-advanced` - Tìm kiếm nâng cao
- `GET /products/suggest` - Tìm kiếm gợi ý
- `GET /products/related` - Lấy sản phẩm liên quan
- `GET /products/stats` - Lấy thống kê sản phẩm
- `GET /products/category/:slug` - Lấy sản phẩm theo category
- `GET /products/brand/:slug` - Lấy sản phẩm theo brand
- `GET /products/:slug` - Lấy chi tiết sản phẩm theo slug
- `GET /products/id/:id` - Lấy chi tiết sản phẩm theo ID
- `POST /products/vector-search` - Vector search

### Protected Endpoints (Yêu cầu authentication)

#### User (Any role)

- `GET /products/recommendations` - Lấy sản phẩm gợi ý

#### Admin/Staff

- `POST /products` - Tạo sản phẩm mới
- `PUT /products/:id` - Cập nhật sản phẩm
- `DELETE /products/:id` - Xóa sản phẩm

### Headers cho Protected Endpoints

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## Business Rules

### Product Management

- Mỗi sản phẩm phải có ít nhất 1 variant
- SKU phải unique trong từng sản phẩm (không unique toàn collection)
- Slug phải unique toàn collection
- Discount được tính theo phần trăm: `((compareAtPrice - price) / compareAtPrice) * 100`
- Size filter chỉ chấp nhận: `S`, `M`, `L`, `XL`, `ONE SIZE`

### Event Tracking

- `search`: Khi tìm kiếm sản phẩm
- `view`: Khi xem chi tiết sản phẩm
- `add_to_cart`: Khi thêm sản phẩm vào giỏ hàng
- `purchase`: Khi tạo đơn hàng

---

## Best Practices

### Product Search

- Sử dụng text search index cho tìm kiếm nhanh
- Sử dụng aggregation pipeline cho sort theo discount
- Sử dụng faceted search để cung cấp filter options
- Vector search cho tìm kiếm semantic (AI-powered)

### Performance

- Sử dụng pagination cho danh sách dài
- Sử dụng indexes để tối ưu query
- Sử dụng aggregation pipeline cho tính toán phức tạp
- Cache facets và statistics nếu cần

---

## Notes

1. **Product Variants**: Variants được gộp theo sản phẩm trong response để dễ hiển thị trên frontend.

2. **Discount Calculation**: Discount được tính theo phần trăm, không phải số tiền.

3. **Vector Search**: Sử dụng Google AI để tạo embedding và MongoDB Atlas Vector Search.

4. **Event Tracking**: Events được ghi lại để phân tích hành vi người dùng và recommendation.

---

_Tài liệu này được tạo ngày: 2025-11-13_
