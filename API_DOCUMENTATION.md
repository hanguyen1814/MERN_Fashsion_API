# API Documentation - MERN Fashion Store

## Tổng quan

API REST cho hệ thống thương mại điện tử thời trang với các tính năng: quản lý sản phẩm, đơn hàng, thanh toán, người dùng, giỏ hàng và đánh giá.

## Base URL

```
http://localhost:4000/api
```

## Authentication

Hệ thống sử dụng JWT với 2 loại token:

- **Access Token**: Hết hạn sau 15 phút
- **Refresh Token**: Hết hạn sau 7 ngày

### Headers bắt buộc

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Rate Limiting

- **Auth endpoints**: 20 requests/15 phút
- **Các endpoint khác**: Không giới hạn

---

## 1. Authentication (`/auth`)

### 1.1 Đăng ký tài khoản

```http
POST /auth/register
```

**Body:**

```json
{
  "fullName": "Nguyễn Văn A",
  "email": "user@example.com",
  "password": "Password123",
  "phone": "0123456789"
}
```

**Validation:**

- `fullName`: 2-50 ký tự
- `email`: Email hợp lệ, unique
- `password`: Ít nhất 8 ký tự, có chữ hoa, chữ thường và số
- `phone`: 10 số, bắt đầu bằng 0 (optional)

**Response Success (201):**

```json
{
  "status": true,
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "email": "user@example.com"
  }
}
```

**Response Error (409):**

```json
{
  "status": false,
  "error": {
    "code": 409,
    "message": "Email đã tồn tại"
  }
}
```

### 1.2 Đăng nhập

```http
POST /auth/login
```

**Body:**

```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "fullName": "Nguyễn Văn A",
      "email": "user@example.com",
      "role": "customer"
    }
  }
}
```

**Cookies được set:**

- `accessToken`: HttpOnly, Secure, SameSite=Strict
- `refreshToken`: HttpOnly, Secure, SameSite=Strict

### 1.3 Refresh Token

```http
POST /auth/refresh
```

**Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "fullName": "Nguyễn Văn A",
      "email": "user@example.com",
      "role": "customer"
    }
  }
}
```

### 1.4 Đăng xuất

```http
POST /auth/logout
```

**Body (optional):**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "message": "Đăng xuất thành công"
  }
}
```

---

## 2. Users (`/users`)

### 2.1 Lấy danh sách người dùng (Admin)

```http
GET /users?page=1&limit=10&role=customer&status=active&search=Nguyễn
```

**Headers:** `Authorization: Bearer <admin_token>`

**Query Parameters:**

- `page`: Số trang (default: 1)
- `limit`: Số item/trang (default: 10)
- `role`: customer/admin/staff
- `status`: active/inactive/banned
- `search`: Tìm kiếm theo tên/email

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "users": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "fullName": "Nguyễn Văn A",
        "email": "user@example.com",
        "role": "customer",
        "status": "active",
        "createdAt": "2023-09-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

### 2.2 Lấy thông tin profile hiện tại

```http
GET /users/profile/me
```

**Headers:** `Authorization: Bearer <token>`

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "fullName": "Nguyễn Văn A",
      "email": "user@example.com",
      "phone": "0123456789",
      "role": "customer",
      "status": "active",
      "addresses": [
        {
          "fullName": "Nguyễn Văn A",
          "phone": "0123456789",
          "street": "123 Đường ABC",
          "ward": "Phường XYZ",
          "district": "Quận 1",
          "province": "TP.HCM",
          "isDefault": true
        }
      ],
      "avatarUrl": "https://example.com/avatar.jpg",
      "loyaltyPoints": 100
    }
  }
}
```

### 2.3 Cập nhật profile

```http
PUT /users/profile/me
```

**Headers:** `Authorization: Bearer <token>`

**Body:**

```json
{
  "fullName": "Nguyễn Văn B",
  "phone": "0987654321",
  "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "fullName": "Nguyễn Văn B",
      "email": "user@example.com",
      "phone": "0987654321",
      "avatarUrl": "https://example.com/new-avatar.jpg"
    },
    "message": "Cập nhật thông tin thành công"
  }
}
```

### 2.4 Đổi mật khẩu

```http
PUT /users/password/change
```

**Headers:** `Authorization: Bearer <token>`

**Body:**

```json
{
  "currentPassword": "Password123",
  "newPassword": "NewPassword123"
}
```

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "message": "Đổi mật khẩu thành công"
  }
}
```

### 2.5 Quản lý địa chỉ

```http
POST /users/addresses/manage
```

**Headers:** `Authorization: Bearer <token>`

**Body - Thêm địa chỉ:**

```json
{
  "action": "add",
  "address": {
    "fullName": "Nguyễn Văn A",
    "phone": "0123456789",
    "street": "123 Đường ABC",
    "ward": "Phường XYZ",
    "district": "Quận 1",
    "province": "TP.HCM",
    "isDefault": false
  }
}
```

**Body - Cập nhật địa chỉ:**

```json
{
  "action": "update",
  "addressId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "address": {
    "fullName": "Nguyễn Văn B",
    "phone": "0987654321",
    "street": "456 Đường DEF",
    "ward": "Phường UVW",
    "district": "Quận 2",
    "province": "TP.HCM",
    "isDefault": true
  }
}
```

**Body - Xóa địa chỉ:**

```json
{
  "action": "delete",
  "addressId": "64f1a2b3c4d5e6f7a8b9c0d1"
}
```

**Body - Đặt địa chỉ mặc định:**

```json
{
  "action": "set_default",
  "addressId": "64f1a2b3c4d5e6f7a8b9c0d1"
}
```

### 2.6 Lấy thông tin user theo ID (Admin)

```http
GET /users/:id
```

**Headers:** `Authorization: Bearer <admin_token>`

### 2.7 Cập nhật user (Admin)

```http
PUT /users/:id
```

**Headers:** `Authorization: Bearer <admin_token>`

**Body:**

```json
{
  "fullName": "Nguyễn Văn C",
  "email": "newemail@example.com",
  "phone": "0123456789",
  "role": "staff",
  "status": "active",
  "loyaltyPoints": 200
}
```

### 2.8 Xóa user (Admin)

```http
DELETE /users/:id
```

**Headers:** `Authorization: Bearer <admin_token>`

### 2.9 Thay đổi trạng thái user (Admin)

```http
PATCH /users/:id/status
```

**Headers:** `Authorization: Bearer <admin_token>`

**Body:**

```json
{
  "status": "banned"
}
```

### 2.10 Thống kê người dùng (Admin)

```http
GET /users/stats
```

**Headers:** `Authorization: Bearer <admin_token>`

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "stats": {
      "total": 150,
      "active": 140,
      "inactive": 5,
      "banned": 5,
      "roles": {
        "customer": 130,
        "admin": 5,
        "staff": 15
      },
      "newUsersLast30Days": 25
    }
  }
}
```

---

## 3. Products (`/products`)

### 3.1 Lấy danh sách sản phẩm

```http
GET /products?page=1&limit=20&brand=64f1a2b3c4d5e6f7a8b9c0d1&category=64f1a2b3c4d5e6f7a8b9c0d2&min=100000&max=500000&color=đỏ&size=M&sort=price&order=asc&inStock=true&rating=4
```

**Query Parameters:**

- `page`: Số trang (default: 1)
- `limit`: Số item/trang (default: 20)
- `q`: Tìm kiếm text
- `brand`: ID hoặc array ID thương hiệu
- `category`: ID hoặc array ID danh mục
- `min`, `max`: Khoảng giá
- `color`: Màu sắc
- `size`: Kích thước
- `sort`: createdAt/price/rating/sales/name (default: createdAt)
- `order`: asc/desc (default: desc)
- `inStock`: true/false
- `rating`: Đánh giá tối thiểu (1-5)
- `tags`: Tags sản phẩm
- `status`: active/draft/archived (default: active)

**Response Success (200):**

```json
{
  "status": true,
  "data": [
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
          "image": "https://example.com/variant1.jpg"
        },
        {
          "sku": "ATN-BLUE-L",
          "color_name": "xanh",
          "size_name": "L",
          "price": 250000,
          "origin_price": 300000,
          "discount": 50000,
          "stock": 50,
          "image": "https://example.com/variant2.jpg"
        }
      ]
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

### 3.2 Tìm kiếm đơn giản

```http
GET /products/search?q=áo thun&brand=64f1a2b3c4d5e6f7a8b9c0d1&min=100000&max=500000&inStock=true&sort=price&order=asc
```

### 3.3 Tìm kiếm nâng cao với faceted search

```http
GET /products/search-advanced?q=áo thun&brand=64f1a2b3c4d5e6f7a8b9c0d1&category=64f1a2b3c4d5e6f7a8b9c0d2&min=100000&max=500000&color=đỏ&size=M&tags=hot&rating=4&inStock=true&sort=relevance&order=desc
```

**Response Success (200):**

```json
{
  "status": true,
  "data": [...],
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
  "pagination": {...}
}
```

### 3.4 Tìm kiếm gợi ý (Autocomplete)

```http
GET /products/suggest?q=áo&limit=10
```

**Response Success (200):**

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

### 3.5 Lấy chi tiết sản phẩm theo slug

```http
GET /products/:slug
```

**Response Success (200):**

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
      "discount": 50000,
      "stock": 100,
      "image": "https://example.com/product.jpg",
      "variants": [...]
    }
  }
}
```

### 3.6 Lấy chi tiết sản phẩm theo ID

```http
GET /products/id/:id
```

### 3.7 Lấy sản phẩm liên quan

```http
GET /products/related?slug=ao-thun-nam&limit=8
```

### 3.8 Lấy thống kê sản phẩm

```http
GET /products/stats
```

**Response Success (200):**

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
    "recentProducts": [...]
  }
}
```

### 3.9 Lấy sản phẩm theo category slug

```http
GET /products/category/:slug?page=1&limit=20&sort=rating&order=desc
```

### 3.10 Lấy sản phẩm theo brand slug

```http
GET /products/brand/:slug?page=1&limit=20&sort=sales&order=desc
```

### 3.11 Tạo sản phẩm mới (Admin/Staff)

```http
POST /products
```

**Headers:** `Authorization: Bearer <admin_or_staff_token>`

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

**Response Success (201):**

```json
{
  "status": true,
  "product_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "name": "Áo thun nam mới",
  "price": 250000,
  "origin_price": 300000,
  "discount": 50000,
  "stock": 100,
  "image": "https://example.com/product.jpg",
  "variants": [...]
}
```

### 3.12 Cập nhật sản phẩm (Admin/Staff)

```http
PUT /products/:id
```

**Headers:** `Authorization: Bearer <admin_or_staff_token>`

**Body:** Tương tự như tạo sản phẩm

### 3.13 Xóa sản phẩm (Admin/Staff)

```http
DELETE /products/:id
```

**Headers:** `Authorization: Bearer <admin_or_staff_token>`

---

## 4. Categories (`/categories`)

### 4.1 Lấy danh sách categories

```http
GET /categories
```

**Response Success (200):**

```json
{
  "status": true,
  "data": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Áo thun",
      "slug": "ao-thun",
      "description": "Danh mục áo thun",
      "parentId": null,
      "image": "https://example.com/category.jpg",
      "status": "active",
      "createdAt": "2023-09-01T00:00:00.000Z"
    }
  ]
}
```

### 4.2 Tạo category mới (Admin/Staff)

```http
POST /categories
```

**Headers:** `Authorization: Bearer <admin_or_staff_token>`

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

### 4.3 Cập nhật category (Admin/Staff)

```http
PUT /categories/:id
```

**Headers:** `Authorization: Bearer <admin_or_staff_token>`

### 4.4 Xóa category (Admin)

```http
DELETE /categories/:id
```

**Headers:** `Authorization: Bearer <admin_token>`

---

## 5. Brands (`/brands`)

### 5.1 Lấy danh sách brands

```http
GET /brands
```

**Response Success (200):**

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
      "createdAt": "2023-09-01T00:00:00.000Z"
    }
  ]
}
```

### 5.2 Tạo brand mới (Admin/Staff)

```http
POST /brands
```

**Headers:** `Authorization: Bearer <admin_or_staff_token>`

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

### 5.3 Cập nhật brand (Admin/Staff)

```http
PUT /brands/:id
```

**Headers:** `Authorization: Bearer <admin_or_staff_token>`

### 5.4 Xóa brand (Admin)

```http
DELETE /brands/:id
```

**Headers:** `Authorization: Bearer <admin_token>`

---

## 6. Cart (`/cart`)

### 6.1 Lấy giỏ hàng (đã gộp variants theo sản phẩm)

```http
GET /cart
```

**Headers:** `Authorization: Bearer <token>`

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "items": [
      {
        "product_id": "64f1a2b3c4d5e6f7a8b9c0d3",
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
        ]
      }
    ],
    "subtotal": 750000,
    "discount": 0,
    "shippingFee": 30000,
    "total": 780000
  }
}
```

### 6.2 Thêm sản phẩm vào giỏ hàng

```http
POST /cart/items
```

**Headers:** `Authorization: Bearer <token>`

**Body:**

```json
{
  "productId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "sku": "ATN-RED-M",
  "quantity": 2
}
```

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "items": [...],
    "subtotal": 500000,
    "discount": 0,
    "shippingFee": 30000,
    "total": 530000
  }
}
```

### 6.3 Cập nhật item trong giỏ hàng (theo sku hoặc đổi variant)

```http
PUT /cart/items
```

**Headers:** `Authorization: Bearer <token>`

**Body (cập nhật số lượng theo sku hiện tại):**

```json
{
  "sku": "ATN-RED-M",
  "quantity": 3
}
```

**Body (đổi sang variant khác của cùng sản phẩm):**

```json
{
  "productId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "sku": "ATN-RED-M",
  "newSku": "ATN-BLUE-L",
  "quantity": 2
}
```

**Note:** Nếu `quantity` <= 0, sản phẩm sẽ bị xóa khỏi giỏ hàng.

### 6.4 Xóa toàn bộ giỏ hàng

```http
DELETE /cart
```

**Headers:** `Authorization: Bearer <token>`

**Response Success (200):**

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

---

## 7. Orders (`/orders`)

### 7.1 Lấy danh sách đơn hàng của user

```http
GET /orders
```

**Headers:** `Authorization: Bearer <token>`

**Response Success (200):**

```json
{
  "status": true,
  "data": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "code": "ORD-20230901-001",
      "userId": "64f1a2b3c4d5e6f7a8b9c0d2",
      "items": [
        {
          "productId": "64f1a2b3c4d5e6f7a8b9c0d3",
          "sku": "ATN-RED-M",
          "name": "Áo thun nam",
          "price": 250000,
          "quantity": 2,
          "image": "https://example.com/product.jpg"
        }
      ],
      "shippingAddress": {
        "fullName": "Nguyễn Văn A",
        "phone": "0123456789",
        "street": "123 Đường ABC",
        "ward": "Phường XYZ",
        "district": "Quận 1",
        "province": "TP.HCM"
      },
      "shippingMethod": "standard",
      "subtotal": 500000,
      "discount": 0,
      "shippingFee": 30000,
      "total": 530000,
      "status": "pending",
      "timeline": [
        {
          "status": "pending",
          "note": "Đơn mới tạo",
          "at": "2023-09-01T00:00:00.000Z"
        }
      ],
      "payment": {
        "method": "cod",
        "provider": null,
        "status": "paid"
      },
      "createdAt": "2023-09-01T00:00:00.000Z"
    }
  ]
}
```

### 7.2 Tạo đơn hàng từ giỏ hàng

```http
POST /orders/checkout
```

**Headers:** `Authorization: Bearer <token>`

**Body:**

```json
{
  "fullName": "Nguyễn Văn A",
  "phone": "0123456789",
  "street": "123 Đường ABC",
  "ward": "Phường XYZ",
  "district": "Quận 1",
  "province": "TP.HCM",
  "method": "cod",
  "provider": null
}
```

**Payment Methods:**

- `cod`: Thanh toán khi nhận hàng
- `card`: Thẻ tín dụng
- `bank`: Chuyển khoản ngân hàng
- `ewallet`: Ví điện tử
- `qr`: QR Code
- `momo`: MoMo Wallet

**Response Success (201):**

```json
{
  "status": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "code": "ORD-20230901-001",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "items": [...],
    "shippingAddress": {...},
    "subtotal": 500000,
    "discount": 0,
    "shippingFee": 30000,
    "total": 530000,
    "status": "pending",
    "timeline": [...],
    "payment": {
      "method": "cod",
      "status": "paid"
    }
  }
}
```

### 7.3 Tạo đơn hàng trực tiếp (không qua giỏ hàng)

```http
POST /orders/checkout-direct
```

**Headers:** `Authorization: Bearer <token>`

**Body:**

```json
{
  "items": [
    {
      "productId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "sku": "ATN-RED-M",
      "quantity": 2
    },
    {
      "productId": "64f1a2b3c4d5e6f7a8b9c0d2",
      "sku": "QJN-BLUE-L",
      "quantity": 1
    }
  ],
  "fullName": "Nguyễn Văn A",
  "phone": "0123456789",
  "street": "123 Đường ABC",
  "ward": "Phường XYZ",
  "district": "Quận 1",
  "province": "TP.HCM",
  "method": "momo",
  "provider": "momo"
}
```

### 7.4 Cập nhật trạng thái đơn hàng (Staff/Admin)

```http
PATCH /orders/:id/status
```

`id` có thể là `_id` của MongoDB hoặc `code` của đơn.

**Headers:** `Authorization: Bearer <staff_or_admin_token>`

**Body:**

```json
{
  "status": "processing",
  "note": "Đã xác nhận thanh toán"
}
```

**Response Success (200):** trả về object đơn hàng đã cập nhật.

### 7.5 Lấy danh sách đơn hàng (Admin)

```http
GET /orders/admin?page=1&limit=20&status=pending&userId=64f1a2b3c4d5e6f7a8b9c0d1&startDate=2023-09-01&endDate=2023-09-30&sort=createdAt&order=desc
```

**Headers:** `Authorization: Bearer <admin_token>`

**Query Parameters:**

- `page`: Số trang (default: 1)
- `limit`: Số item/trang (default: 20)
- `status`: pending/paid/processing/shipped/completed/cancelled/refunded
- `userId`: Lọc theo user ID
- `startDate`: Ngày bắt đầu (YYYY-MM-DD)
- `endDate`: Ngày kết thúc (YYYY-MM-DD)
- `sort`: createdAt/total/status (default: createdAt)
- `order`: asc/desc (default: desc)
- `search`: Tìm kiếm theo order code hoặc customer name

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "orders": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "code": "ORD-20230901-001",
        "userId": "64f1a2b3c4d5e6f7a8b9c0d2",
        "customer": {
          "fullName": "Nguyễn Văn A",
          "email": "user@example.com",
          "phone": "0123456789"
        },
        "items": [...],
        "shippingAddress": {...},
        "subtotal": 500000,
        "discount": 0,
        "shippingFee": 30000,
        "total": 530000,
        "status": "pending",
        "timeline": [...],
        "payment": {...},
        "createdAt": "2023-09-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### 7.6 Lấy chi tiết đơn hàng (Admin)

```http
GET /orders/admin/:id
```

**Headers:** `Authorization: Bearer <admin_token>`

**Response Success (200):** trả về chi tiết đơn hàng đầy đủ.

### 7.7 Thống kê đơn hàng (Admin)

```http
GET /orders/admin/stats?period=7d&status=all
```

**Headers:** `Authorization: Bearer <admin_token>`

**Query Parameters:**

- `period`: 1d/7d/30d/90d (default: 7d)
- `status`: all/pending/paid/processing/shipped/completed/cancelled/refunded

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "period": "7d",
    "overview": {
      "totalOrders": 150,
      "totalRevenue": 45000000,
      "averageOrderValue": 300000,
      "statusBreakdown": {
        "pending": 25,
        "paid": 30,
        "processing": 20,
        "shipped": 15,
        "completed": 50,
        "cancelled": 8,
        "refunded": 2
      }
    },
    "dailyStats": [
      {
        "date": "2023-09-01",
        "orders": 20,
        "revenue": 6000000
      }
    ],
    "topCustomers": [
      {
        "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
        "fullName": "Nguyễn Văn A",
        "totalOrders": 5,
        "totalSpent": 1500000
      }
    ]
  }
}
```

### 7.8 Xuất danh sách đơn hàng (Admin)

```http
GET /orders/admin/export?format=csv&status=all&startDate=2023-09-01&endDate=2023-09-30
```

**Headers:** `Authorization: Bearer <admin_token>`

**Query Parameters:**

- `format`: csv/xlsx (default: csv)
- `status`: all/pending/paid/processing/shipped/completed/cancelled/refunded
- `startDate`: Ngày bắt đầu (YYYY-MM-DD)
- `endDate`: Ngày kết thúc (YYYY-MM-DD)

**Response Success (200):** trả về file CSV/Excel.

---

## 8. Payments (`/payments`)

### 8.1 Tạo thanh toán MoMo

```http
POST /payments/momo/create
```

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

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "message": "Tạo thanh toán MoMo thành công",
    "paymentUrl": "https://payment.momo.vn/...",
    "deeplink": "momo://app/payment/...",
    "qrCodeUrl": "https://payment.momo.vn/qr/...",
    "orderId": "ORD-20230901-001",
    "requestId": "123456789"
  }
}
```

### 8.2 Webhook MoMo (Internal)

```http
POST /payments/momo/webhook
```

**Nhiệm vụ:**

- Xác thực chữ ký MoMo (HMAC SHA256)
- Chống xử lý lặp (idempotent)
- Đối soát số tiền IPN với `order.total` (lệch → `payment.status = review`)
- Cập nhật trạng thái đơn: thành công `paid`, thất bại `failed`, ghi timeline và `transactionId`

### 8.3 Redirect MoMo

```http
GET /payments/momo/redirect?resultCode=0&orderId=ORD-20230901-001&message=Success
```

**Note:** Endpoint này được MoMo redirect về sau khi thanh toán.

### 8.4 Kiểm tra trạng thái thanh toán MoMo

```http
GET /payments/momo/status/:orderId
```

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "orderId": "ORD-20230901-001",
    "status": "paid",
    "paymentStatus": "paid",
    "momoStatus": {
      "resultCode": 0,
      "message": "Success"
    }
  }
}
```

### 8.5 Webhook thanh toán tổng quát (Legacy)

```http
POST /payments/webhook
```

**Body:**

```json
{
  "orderCode": "ORD-20230901-001",
  "success": true,
  "transactionId": "TXN-123456789"
}
```

---

## 9. Reviews (`/reviews`)

### 9.1 Lấy đánh giá theo sản phẩm (có phân trang và sắp xếp)

```http
GET /reviews/product/:productId?page=1&limit=10&sort=-createdAt
```

**Query Parameters:**

- `page`: Trang (default: 1)
- `limit`: Số item/trang (default: 10, max: 100)
- `sort`: `createdAt | -createdAt | rating | -rating | isVerifiedPurchase | -isVerifiedPurchase` (default: `-createdAt`)

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "items": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "userId": "64f1a2b3c4d5e6f7a8b9c0d2",
        "productId": "64f1a2b3c4d5e6f7a8b9c0d3",
        "rating": 5,
        "content": "Sản phẩm rất tốt, chất lượng cao",
        "images": ["https://res.cloudinary.com/..."],
        "isVerifiedPurchase": true,
        "createdAt": "2023-09-01T00:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 35, "totalPages": 4 }
  }
}
```

### 9.2 Lấy tóm tắt rating theo sản phẩm

```http
GET /reviews/product/:productId/summary
```

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "ratingAvg": 4.35,
    "ratingCount": 52,
    "distribution": { "1": 2, "2": 3, "3": 7, "4": 18, "5": 22 }
  }
}
```

### 9.3 Tạo đánh giá (hỗ trợ upload ảnh)

```http
POST /reviews
```

**Headers:** `Authorization: Bearer <token>`

Hỗ trợ 2 cách gửi ảnh:

- Gửi mảng URL trong body JSON: `images: string[]` (tối đa 5)
- Hoặc dùng `multipart/form-data` với field `images` (tối đa 5 file, 10MB/file)

**Body (JSON):**

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

**Form Data (multipart):**

- `images`: File[] (tối đa 5)
- Các trường JSON khác gửi qua body JSON hoặc field text tương đương

**Validation & Sanitization:**

- `productId`: ObjectId hợp lệ
- `rating`: 1-5 (bắt buộc)
- `content`: tối đa 1000 ký tự, được sanitize server-side (loại bỏ HTML/script)
- `images`: tối đa 5 ảnh, chấp nhận URL hợp lệ hoặc file ảnh; ảnh upload sẽ được lưu Cloudinary

**Rate limit:** 20 yêu cầu ghi/15 phút trên mỗi IP cho POST/PUT/DELETE `/reviews`

**Response Success (201):** trả về review đã tạo.

### 9.4 Cập nhật đánh giá

```http
PUT /reviews/:id
```

**Headers:** `Authorization: Bearer <token>`

Hỗ trợ JSON và `multipart/form-data` như phần tạo. Chỉ chủ sở hữu review hoặc staff/admin mới được phép.

### 9.5 Xóa đánh giá

```http
DELETE /reviews/:id
```

Chỉ chủ sở hữu review hoặc staff/admin mới được phép.

### Ghi chú về cập nhật điểm rating sản phẩm

- Mỗi khi tạo/sửa/xóa review, `ratingAvg` và `ratingCount` của sản phẩm được cập nhật bằng MongoDB aggregation để đảm bảo hiệu năng và độ chính xác.

---

## 10. Wishlist (`/wishlist`)

### 10.1 Lấy danh sách wishlist

```http
GET /wishlist
```

**Headers:** `Authorization: Bearer <token>`

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "productIds": ["64f1a2b3c4d5e6f7a8b9c0d3", "64f1a2b3c4d5e6f7a8b9c0d4"],
    "createdAt": "2023-09-01T00:00:00.000Z"
  }
}
```

### 10.2 Thêm/xóa sản phẩm khỏi wishlist

```http
POST /wishlist/toggle
```

**Headers:** `Authorization: Bearer <token>`

**Body:**

```json
{
  "productId": "64f1a2b3c4d5e6f7a8b9c0d1"
}
```

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "productIds": [
      "64f1a2b3c4d5e6f7a8b9c0d3",
      "64f1a2b3c4d5e6f7a8b9c0d4",
      "64f1a2b3c4d5e6f7a8b9c0d1"
    ]
  }
}
```

**Note:** Nếu sản phẩm đã có trong wishlist, nó sẽ bị xóa. Nếu chưa có, nó sẽ được thêm vào.

---

## 11. CSP Violations (`/csp`) - Admin Only

### 11.1 Lấy danh sách CSP violations

```http
GET /csp/violations?page=1&limit=10&status=new&severity=critical&directive=script-src&startDate=2023-09-01&endDate=2023-09-30&sortBy=reportedAt&sortOrder=desc
```

**Headers:** `Authorization: Bearer <admin_token>`

**Query Parameters:**

- `page`: Số trang (default: 1)
- `limit`: Số item/trang (default: 10)
- `status`: new/resolved
- `severity`: critical/high/medium/low
- `directive`: Tên directive CSP
- `startDate`: Ngày bắt đầu (YYYY-MM-DD)
- `endDate`: Ngày kết thúc (YYYY-MM-DD)
- `sortBy`: reportedAt/severity/directive (default: reportedAt)
- `sortOrder`: asc/desc (default: desc)

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "violations": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "documentUri": "https://example.com/page",
        "violatedDirective": "script-src 'self'",
        "blockedUri": "https://malicious-site.com/script.js",
        "originalPolicy": "script-src 'self'; object-src 'none';",
        "sourceFile": "https://example.com/page",
        "lineNumber": 42,
        "columnNumber": 10,
        "disposition": "enforce",
        "severity": "critical",
        "status": "new",
        "reportedAt": "2023-09-01T00:00:00.000Z",
        "resolvedAt": null,
        "notes": ""
      }
    ],
    "pagination": {
      "current": 1,
      "total": 5,
      "count": 45,
      "limit": 10
    }
  }
}
```

### 11.2 Lấy thống kê CSP violations

```http
GET /csp/stats?period=7d
```

**Headers:** `Authorization: Bearer <admin_token>`

**Query Parameters:**

- `period`: 1d/7d/30d/90d (default: 7d)

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "period": "7d",
    "startDate": "2023-08-25T00:00:00.000Z",
    "endDate": "2023-09-01T00:00:00.000Z",
    "overview": {
      "total": 125,
      "critical": 15,
      "high": 35,
      "medium": 45,
      "low": 30,
      "new": 98,
      "resolved": 27
    },
    "directives": [
      {
        "_id": "script-src 'self'",
        "count": 45,
        "criticalCount": 8,
        "highCount": 15,
        "mediumCount": 12,
        "lowCount": 10
      }
    ],
    "hourly": [
      {
        "_id": {
          "hour": 14,
          "day": 1
        },
        "count": 5
      }
    ]
  }
}
```

### 11.3 Lấy chi tiết violation

```http
GET /csp/violations/:id
```

**Headers:** `Authorization: Bearer <admin_token>`

### 11.4 Đánh dấu violation đã xử lý

```http
PUT /csp/violations/:id/resolve
```

**Headers:** `Authorization: Bearer <admin_token>`

**Body:**

```json
{
  "notes": "Đã thêm domain vào whitelist CSP"
}
```

### 11.5 Đánh dấu nhiều violations đã xử lý

```http
PUT /csp/violations/resolve-multiple
```

**Headers:** `Authorization: Bearer <admin_token>`

**Body:**

```json
{
  "ids": [
    "64f1a2b3c4d5e6f7a8b9c0d1",
    "64f1a2b3c4d5e6f7a8b9c0d2",
    "64f1a2b3c4d5e6f7a8b9c0d3"
  ],
  "notes": "Đã cập nhật CSP policy"
}
```

---

## 12. Upload (`/upload`) - Admin/Staff Only

### 12.1 Upload Single Image

```http
POST /upload/single
```

**Headers:** `Authorization: Bearer <admin_or_staff_token>`

**Content-Type:** `multipart/form-data`

**Form Data:**

- `image`: File (image file, max 10MB)

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "url": "https://res.cloudinary.com/cloud_name/image/upload/v1234567890/products/abc123.jpg",
    "publicId": "products/abc123",
    "format": "jpg",
    "width": 1920,
    "height": 1080,
    "bytes": 245678,
    "createdAt": "2023-09-01T10:30:00.000Z",
    "folder": "products"
  },
  "meta": {
    "message": "Upload file thành công!"
  }
}
```

### 12.2 Upload Multiple Images

```http
POST /upload/multiple
```

**Headers:** `Authorization: Bearer <admin_or_staff_token>`

**Content-Type:** `multipart/form-data`

**Form Data:**

- `images`: File[] (multiple image files, max 10 files, 10MB each)

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "successful": [
      {
        "url": "https://res.cloudinary.com/...",
        "publicId": "products/abc123",
        "format": "jpg",
        "width": 1920,
        "height": 1080,
        "bytes": 245678,
        "createdAt": "2023-09-01T10:30:00.000Z",
        "folder": "products"
      }
    ],
    "failed": [],
    "total": 2,
    "successCount": 2,
    "failCount": 0
  },
  "meta": {
    "message": "Upload files thành công!"
  }
}
```

### 12.3 Upload Product Images (with Auto Transformation)

```http
POST /upload/product
```

**Headers:** `Authorization: Bearer <admin_or_staff_token>`

**Content-Type:** `multipart/form-data`

**Form Data:**

- `mainImage`: File (max 1) - Auto resize to 800x800
- `galleryImages`: File[] (max 9) - Auto resize to 1200x1200
- `thumbnailImage`: File (max 1) - Auto resize to 300x300, crop fill
- `variantImages`: File[] (max 10) - Auto resize to 600x600
- `productId`: String (optional) - Product ID for organizing files

**Transformations Applied:**

- `thumbnailImage` → 300x300, crop fill
- `mainImage` → 800x800, limit (keep aspect ratio)
- `galleryImages` → 1200x1200, limit
- `variantImages` → 600x600, limit

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "mainImage": {
      "successful": [
        {
          "url": "https://res.cloudinary.com/...",
          "publicId": "products/product123-1234567890",
          "format": "jpg",
          "width": 800,
          "height": 800,
          "bytes": 150000,
          "createdAt": "2023-09-01T10:30:00.000Z",
          "folder": "products"
        }
      ],
      "failed": [],
      "total": 1,
      "successCount": 1,
      "failCount": 0
    },
    "galleryImages": {
      "successful": [...],
      "failed": [],
      "total": 3,
      "successCount": 3,
      "failCount": 0
    }
  },
  "meta": {
    "message": "Upload product images thành công!"
  }
}
```

### 12.4 Delete Image

```http
DELETE /upload/:publicId?resourceType=image
```

**Headers:** `Authorization: Bearer <admin_or_staff_token>`

**Path Parameters:**

- `publicId`: Public ID của file trong Cloudinary (URL encoded)

**Query Parameters:**

- `resourceType`: image/video/raw (default: image)

**Example:**

```
DELETE /upload/products%2Fabc123?resourceType=image
```

**Response Success (200):**

```json
{
  "status": true,
  "data": null,
  "meta": {
    "message": "Xóa file thành công!"
  }
}
```

### 12.5 Delete Multiple Images

```http
DELETE /upload/multiple?resourceType=image
```

**Headers:** `Authorization: Bearer <admin_or_staff_token>`

**Body:**

```json
{
  "publicIds": ["products/abc123", "products/def456", "products/ghi789"]
}
```

**Query Parameters:**

- `resourceType`: image/video/raw (default: image)

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "deleted": ["products/abc123", "products/def456"],
    "failed": [
      {
        "publicId": "products/ghi789",
        "error": "File không tồn tại"
      }
    ],
    "total": 3,
    "deletedCount": 2,
    "failCount": 1
  },
  "meta": {
    "message": "Xóa files thành công!"
  }
}
```

### 12.6 Get Transformed URL (Public)

```http
GET /upload/transform/:publicId?width=400&height=400&crop=fill&quality=auto&format=auto
```

**Path Parameters:**

- `publicId`: Public ID của file (URL encoded)

**Query Parameters:**

- `width`: Width in pixels
- `height`: Height in pixels
- `crop`: Crop mode (fill, limit, fit, thumb, scale)
- `quality`: Quality (auto, best, good, eco, low)
- `format`: Format (auto, jpg, png, webp, avif)

**Example:**

```
GET /upload/transform/products%2Fabc123?width=400&height=400&crop=fill
```

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "url": "https://res.cloudinary.com/cloud_name/image/upload/c_fill,h_400,w_400/products/abc123.jpg",
    "transformation": {
      "width": 400,
      "height": 400,
      "crop": "fill"
    }
  },
  "meta": {
    "message": "Tạo transformed URL thành công!"
  }
}
```

### 12.7 Generate Upload Signature (for Client-side Upload)

```http
POST /upload/signature
```

**Headers:** `Authorization: Bearer <admin_or_staff_token>`

**Body:**

```json
{
  "folder": "products",
  "tags": ["tag1", "tag2"],
  "resourceType": "image"
}
```

**Response Success (200):**

```json
{
  "status": true,
  "data": {
    "signature": "abc123...",
    "timestamp": 1693567800,
    "folder": "products",
    "apiKey": "your_api_key",
    "cloudName": "your_cloud_name",
    "resourceType": "image"
  },
  "meta": {
    "message": "Tạo upload signature thành công!"
  }
}
```

**Notes:**

- Upload signature được sử dụng để upload trực tiếp từ client (không qua server)
- Requires upload preset configured in Cloudinary dashboard
- See `CLOUDINARY_SETUP_GUIDE.md` for setup instructions

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

```json
{
  "status": false,
  "error": {
    "code": 400,
    "message": "Dữ liệu đầu vào không hợp lệ",
    "details": [
      {
        "field": "email",
        "message": "Email không hợp lệ",
        "value": "invalid-email"
      }
    ]
  }
}
```

---

## Data Models

### User Model

```javascript
{
  _id: ObjectId,
  role: "customer" | "admin" | "staff",
  fullName: String,
  email: String (unique),
  phone: String (unique, sparse),
  passwordHash: String,
  addresses: [{
    fullName: String,
    phone: String,
    street: String,
    ward: String,
    district: String,
    province: String,
    isDefault: Boolean
  }],
  avatarUrl: String,
  provider: "local" | "google" | "facebook",
  providerId: String,
  loyaltyPoints: Number,
  status: "active" | "inactive" | "banned",
  lastLogin: Date,
  refreshToken: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Product Model

```javascript
{
  _id: ObjectId,
  name: String,
  slug: String (unique),
  description: String,
  brandId: ObjectId (ref: Brand),
  categoryIds: [ObjectId] (ref: Category),
  tags: [String],
  image: String,
  variants: [{
    sku: String (unique),
    color: String,
    size: String,
    price: Number,
    compareAtPrice: Number,
    discount: Number,
    stock: Number,
    image: String,
    images: [String],
    attrs: Mixed
  }],
  status: "draft" | "active" | "archived",
  ratingAvg: Number (0-5),
  ratingCount: Number,
  salesCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Order Model

```javascript
{
  _id: ObjectId,
  code: String (unique),
  userId: ObjectId (ref: User),
  items: [{
    productId: ObjectId,
    sku: String,
    name: String,
    price: Number,
    quantity: Number,
    image: String
  }],
  shippingAddress: {
    fullName: String,
    phone: String,
    street: String,
    ward: String,
    district: String,
    province: String
  },
  shippingMethod: "standard" | "express" | "same_day",
  couponCode: String,
  subtotal: Number,
  discount: Number,
  shippingFee: Number,
  total: Number,
  status: "pending" | "paid" | "processing" | "shipped" | "completed" | "cancelled" | "refunded",
  timeline: [{
    status: String,
    at: Date,
    note: String
  }],
  payment: {
    method: "cod" | "card" | "bank" | "ewallet" | "qr" | "momo",
    provider: String,
    transactionId: String,
    status: "pending" | "authorized" | "paid" | "failed" | "refunded",
    raw: Mixed,
    momoRequestId: String,
    momoOrderId: String,
    paymentUrl: String,
    deeplink: String,
    qrCodeUrl: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Cart Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, unique),
  items: [{
    productId: ObjectId (ref: Product),
    sku: String,
    name: String,
    price: Number,
    quantity: Number,
    image: String
  }],
  couponCode: String,
  subtotal: Number,
  discount: Number,
  shippingFee: Number,
  total: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Category Model

```javascript
{
  _id: ObjectId,
  name: String,
  slug: String (unique),
  description: String,
  parentId: ObjectId (ref: Category),
  image: String,
  status: "active" | "inactive",
  createdAt: Date,
  updatedAt: Date
}
```

### Brand Model

```javascript
{
  _id: ObjectId,
  name: String,
  slug: String (unique),
  description: String,
  logo: String,
  status: "active" | "inactive",
  createdAt: Date,
  updatedAt: Date
}
```

### Review Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  productId: ObjectId (ref: Product),
  rating: Number (1-5),
  content: String,
  images: [String], // tối đa 5 URL ảnh
  isVerifiedPurchase: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Wishlist Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, unique),
  productIds: [ObjectId] (ref: Product),
  createdAt: Date,
  updatedAt: Date
}
```

---

## Security Features

### 1. Authentication & Authorization

- JWT-based authentication với access token và refresh token
- Role-based access control (RBAC)
- Secure cookie handling với HttpOnly, Secure, SameSite flags

### 2. Rate Limiting

- Auth endpoints: 20 requests/15 phút
- Review write endpoints (POST/PUT/DELETE /reviews): 20 requests/15 phút/IP
- Các endpoint khác: không giới hạn theo mặc định

### 3. Input Validation

- Comprehensive validation cho tất cả input
- Sanitization để ngăn chặn injection attacks
- Mongoose schema validation

### 4. Content Security Policy (CSP)

- CSP violation monitoring và reporting
- Admin dashboard để quản lý violations
- Automatic severity classification

### 5. Logging & Monitoring

- Comprehensive logging với Winston
- Request/response logging
- Error tracking và monitoring
- Performance metrics

### 6. Data Protection

- Password hashing với bcrypt
- Sensitive data exclusion từ responses
- Input sanitization

---

## Best Practices

### 1. API Design

- RESTful API design
- Consistent response format
- Proper HTTP status codes
- Comprehensive error handling

### 2. Performance

- Database indexing cho các query thường dùng
- Pagination cho danh sách dài
- Efficient aggregation pipelines
- Connection pooling

### 3. Scalability

- Stateless design
- Horizontal scaling support
- Caching strategies
- Database optimization

### 4. Maintainability

- Modular code structure
- Comprehensive documentation
- Error handling và logging
- Testing coverage

---

## Development Notes

### Environment Variables

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/fashion-store
JWT_SECRET=your-secret-key
JWT_EXPIRES=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES=7d
FRONTEND_URL=http://localhost:3001
```

### Database Indexes

- Text search index cho products (name, description, tags)
- Compound indexes cho filtering và sorting
- Unique indexes cho email, phone, slug
- Sparse indexes cho optional fields

### Error Handling

- Global error handler middleware
- Async error wrapper
- Validation error formatting
- Logging tất cả errors

### Testing

- Manual testing guide available
- Postman collection for API testing
- Security testing scripts
- Log analysis tools

---

_Tài liệu này được cập nhật lần cuối: 2025-11-04_

**Thay đổi gần đây:**

- Reviews: phân trang/sort nâng cao, endpoint summary, hỗ trợ upload ảnh (multipart/URL), giới hạn 5 ảnh, sanitization server-side, rate-limit write 20/15m, cập nhật `ratingAvg/ratingCount` bằng aggregation.
- Upload: giữ nguyên các endpoint; bổ sung lưu ý Cloudinary trong phần reviews.
