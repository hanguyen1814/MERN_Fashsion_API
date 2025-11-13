# PROMPT CẤU TRÚC DATABASE - MERN FASHION E-COMMERCE

## Mô tả tổng quan

Đây là hệ thống e-commerce thời trang sử dụng MongoDB (NoSQL) với các collection chính: User, Product, Order, Cart, Category, Brand, Review, Wishlist, Payment, và các collection hỗ trợ khác.

## CẤU TRÚC DATABASE CHI TIẾT

### 1. COLLECTION: User (users)

**Mô tả**: Quản lý thông tin người dùng, bao gồm customer, admin, staff

**Fields**:

- `_id`: ObjectId (Primary Key)
- `role`: String (enum: "customer", "admin", "staff") - default: "customer"
- `fullName`: String (required, trim)
- `email`: String (required, unique, lowercase, indexed)
- `phone`: String (unique, sparse, indexed)
- `passwordHash`: String (default: "")
- `addresses`: Array of AddressSchema (embedded)
  - `fullName`: String (required)
  - `phone`: String (required)
  - `street`: String (required)
  - `ward`: String (required)
  - `district`: String (required)
  - `province`: String (required)
  - `isDefault`: Boolean (default: false)
- `avatarUrl`: String
- `provider`: String (enum: "local", "google", "facebook") - default: "local"
- `providerId`: String
- `loyaltyPoints`: Number (default: 0)
- `status`: String (enum: "active", "inactive", "banned", "pending") - default: "pending"
- `emailVerified`: Boolean (default: false)
- `emailVerificationToken`: String
- `emailVerificationExpires`: Date
- `lastLogin`: Date
- `refreshToken`: String
- `failedLoginAttempts`: Number (default: 0)
- `lastFailedLogin`: Date
- `isLocked`: Boolean (default: false)
- `lockUntil`: Date
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:

- `email`: unique, index
- `phone`: unique, sparse, index
- `role`: index
- `status`: index
- `createdAt`: -1 (descending)
- `provider + providerId`: compound index

**Relationships**:

- One-to-One với Cart (userId)
- One-to-One với Wishlist (userId)
- One-to-Many với Order (userId)
- One-to-Many với Review (userId)
- One-to-Many với Event (userId)

---

### 2. COLLECTION: Product (products)

**Mô tả**: Quản lý sản phẩm với variants (màu sắc, kích thước)

**Fields**:

- `_id`: ObjectId (Primary Key)
- `name`: String (required)
- `slug`: String (required, unique, lowercase, indexed)
- `description`: String
- `brandId`: ObjectId (ref: "Brand", indexed)
- `categoryIds`: Array of ObjectId (ref: "Category", indexed)
- `tags`: Array of String (indexed)
- `image`: String (URL ảnh chính)
- `images`: Array of String (URL gallery)
- `imageKey`: String (S3 key ảnh chính)
- `imageKeys`: Array of String (S3 keys gallery)
- `thumbnailImage`: String (URL thumbnail)
- `thumbnailImageKey`: String (S3 key thumbnail)
- `variants`: Array of VariantSchema (required, min 1)
  - `sku`: String (required, unique trong product)
  - `color`: String
  - `size`: String
  - `price`: Number (required, min: 0)
  - `compareAtPrice`: Number
  - `discount`: Number (default: 0)
  - `stock`: Number (default: 0, min: 0)
  - `image`: String (URL ảnh variant)
  - `images`: Array of String (URL gallery variant)
  - `imageKey`: String (S3 key ảnh variant)
  - `imageKeys`: Array of String (S3 keys gallery variant)
  - `attrs`: Mixed (material, fit, ...)
- `status`: String (enum: "draft", "active", "archived") - default: "active", indexed
- `ratingAvg`: Number (default: 0, min: 0, max: 5)
- `ratingCount`: Number (default: 0)
- `salesCount`: Number (default: 0)
- `embedding`: Array of Number (vector index, 768 dimensions) - cho AI recommendation
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:

- `slug`: unique, index
- `status`: index
- `brandId`: index
- `categoryIds`: index
- `tags`: index
- Text search: `name`, `description`, `tags`
- Compound: `status + createdAt`, `brandId + status`, `categoryIds + status`
- Compound: `variants.price + status`, `variants.color + status`, `variants.size + status`
- Compound: `ratingAvg + status`, `salesCount + status`
- `createdAt`: -1, `updatedAt`: -1
- Vector index: `embedding` (768 dimensions)

**Relationships**:

- Many-to-One với Brand (brandId)
- Many-to-Many với Category (categoryIds)
- One-to-Many với Review (productId)
- One-to-Many với Cart.items (productId)
- One-to-Many với Order.items (productId)
- One-to-Many với Wishlist.productIds
- One-to-Many với Event (productId)
- One-to-Many với InventoryLog (productId)

---

### 3. COLLECTION: Order (orders)

**Mô tả**: Quản lý đơn hàng với timeline và payment info

**Fields**:

- `_id`: ObjectId (Primary Key)
- `code`: String (required, unique) - mã đơn hàng
- `userId`: ObjectId (ref: "User", indexed)
- `items`: Array of OrderItemSchema
  - `productId`: ObjectId
  - `sku`: String
  - `name`: String
  - `price`: Number
  - `quantity`: Number
  - `image`: String
- `shippingAddress`: AddressSnapshotSchema (embedded)
  - `fullName`: String
  - `phone`: String
  - `street`: String
  - `ward`: String
  - `district`: String
  - `province`: String
- `shippingMethod`: String (enum: "standard", "express", "same_day") - default: "standard"
- `couponCode`: String
- `subtotal`: Number
- `discount`: Number
- `shippingFee`: Number
- `total`: Number
- `status`: String (enum: "pending", "paid", "processing", "shipped", "completed", "cancelled", "refunded") - default: "pending", indexed
- `timeline`: Array of TimelineSchema
  - `status`: String (enum: "pending", "paid", "processing", "shipped", "completed", "cancelled", "refunded")
  - `at`: Date (default: Date.now)
  - `note`: String
- `payment`: PaymentInfoSchema (embedded)
  - `method`: String (enum: "cod", "card", "bank", "ewallet", "qr", "momo")
  - `provider`: String
  - `transactionId`: String
  - `status`: String (enum: "pending", "authorized", "paid", "failed", "refunded", "review") - default: "pending"
  - `raw`: Mixed
  - `momoRequestId`: String
  - `momoOrderId`: String
  - `paymentUrl`: String
  - `deeplink`: String
  - `qrCodeUrl`: String
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:

- `code`: unique
- `userId`: index
- `status`: index

**Relationships**:

- Many-to-One với User (userId)
- One-to-One với Payment (orderId) - optional, có thể dùng embedded payment

---

### 4. COLLECTION: Cart (carts)

**Mô tả**: Giỏ hàng của người dùng

**Fields**:

- `_id`: ObjectId (Primary Key)
- `userId`: ObjectId (ref: "User", unique, indexed)
- `items`: Array of CartItemSchema
  - `productId`: ObjectId (ref: "Product", required)
  - `sku`: String (required)
  - `name`: String (snapshot)
  - `price`: Number (snapshot)
  - `quantity`: Number (default: 1, min: 1)
  - `image`: String
- `couponCode`: String
- `subtotal`: Number (default: 0)
- `discount`: Number (default: 0)
- `shippingFee`: Number (default: 0)
- `total`: Number (default: 0)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:

- `userId`: unique, index

**Relationships**:

- One-to-One với User (userId)
- Many-to-Many với Product qua items (productId)

---

### 5. COLLECTION: Category (categories)

**Mô tả**: Danh mục sản phẩm với cấu trúc cây (parent-child)

**Fields**:

- `_id`: ObjectId (Primary Key)
- `name`: String (required)
- `slug`: String (required, unique, lowercase)
- `description`: String
- `parentId`: ObjectId (ref: "Category") - null nếu là category gốc
- `image`: String
- `status`: String (enum: "active", "inactive") - default: "active"
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:

- `slug`: unique

**Relationships**:

- Self-referencing: Many-to-One với Category (parentId)
- One-to-Many với Product (categoryIds)

---

### 6. COLLECTION: Brand (brands)

**Mô tả**: Thương hiệu sản phẩm

**Fields**:

- `_id`: ObjectId (Primary Key)
- `name`: String (required, default: "HNG")
- `slug`: String (required, unique, lowercase)
- `description`: String
- `logo`: String
- `status`: String (enum: "active", "inactive") - default: "active"
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:

- `slug`: unique

**Relationships**:

- One-to-Many với Product (brandId)

---

### 7. COLLECTION: Review (reviews)

**Mô tả**: Đánh giá sản phẩm với hỗ trợ reply (nested comments)

**Fields**:

- `_id`: ObjectId (Primary Key)
- `userId`: ObjectId (ref: "User", indexed)
- `productId`: ObjectId (ref: "Product", indexed)
- `parentId`: ObjectId (ref: "Review", indexed, default: null) - null nếu là review gốc, có giá trị nếu là reply
- `rating`: Number (min: 1, max: 5, required nếu không phải reply)
- `content`: String
- `images`: Array of String (max 5 items)
- `isVerifiedPurchase`: Boolean (default: false)
- `isAdminReply`: Boolean (default: false)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:

- `userId + productId`: unique (partial: chỉ khi parentId = null)
- `parentId + createdAt`: compound index
- `userId`: index
- `productId`: index

**Relationships**:

- Many-to-One với User (userId)
- Many-to-One với Product (productId)
- Self-referencing: Many-to-One với Review (parentId) - cho reply

---

### 8. COLLECTION: Wishlist (wishlists)

**Mô tả**: Danh sách yêu thích của người dùng

**Fields**:

- `_id`: ObjectId (Primary Key)
- `userId`: ObjectId (ref: "User", unique, indexed)
- `productIds`: Array of ObjectId (ref: "Product")
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:

- `userId`: unique, index

**Relationships**:

- One-to-One với User (userId)
- Many-to-Many với Product (productIds)

---

### 9. COLLECTION: Payment (payments)

**Mô tả**: Giao dịch thanh toán (có thể tách riêng hoặc embedded trong Order)

**Fields**:

- `_id`: ObjectId (Primary Key)
- `orderId`: ObjectId (ref: "Order", indexed)
- `amount`: Number (required)
- `currency`: String (default: "VND")
- `method`: String (enum: "cod", "card", "bank", "ewallet", "qr") - required
- `provider`: String
- `providerTxnId`: String
- `status`: String (enum: "pending", "authorized", "paid", "failed", "refunded") - default: "pending", indexed
- `extra`: Mixed
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:

- `orderId`: index
- `status`: index

**Relationships**:

- Many-to-One với Order (orderId)

---

### 10. COLLECTION: InventoryLog (inventory_logs)

**Mô tả**: Nhật ký nhập/xuất kho

**Fields**:

- `_id`: ObjectId (Primary Key)
- `productId`: ObjectId (ref: "Product", required, indexed)
- `sku`: String (required, indexed)
- `quantity`: Number (required) - dương = nhập, âm = xuất
- `reason`: String (enum: "purchase", "order", "return", "adjustment") - required
- `refId`: String - orderId/purchaseId...
- `note`: String
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:

- `productId`: index
- `sku`: index

**Relationships**:

- Many-to-One với Product (productId)

---

### 11. COLLECTION: Event (events)

**Mô tả**: Sự kiện người dùng cho hệ thống AI recommendation

**Fields**:

- `_id`: ObjectId (Primary Key)
- `userId`: ObjectId (ref: "User", indexed)
- `sessionId`: String
- `type`: String (enum: "view", "add_to_cart", "remove_from_cart", "purchase", "search", "click") - indexed
- `productId`: ObjectId (ref: "Product")
- `keyword`: String
- `metadata`: Mixed
- `at`: Date (default: Date.now, indexed)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:

- `userId`: index
- `type`: index
- `at`: index
- `userId + at`: compound index (-1)

**Relationships**:

- Many-to-One với User (userId)
- Many-to-One với Product (productId)

---

### 12. COLLECTION: WebhookLog (webhook_logs)

**Mô tả**: Log webhook từ payment gateway và shipping service

**Fields**:

- `_id`: ObjectId (Primary Key)
- `source`: String (enum: "payment", "shipping") - required
- `event`: String (required)
- `payload`: Mixed
- `processed`: Boolean (default: false)
- `error`: String
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**: Không có index đặc biệt

---

### 13. COLLECTION: CSPViolation (csp_violations)

**Mô tả**: Log vi phạm Content Security Policy

**Fields**:

- `_id`: ObjectId (Primary Key)
- `documentUri`: String (required, trim)
- `violatedDirective`: String (required, trim, indexed)
- `effectiveDirective`: String (trim)
- `originalPolicy`: String (required)
- `blockedUri`: String (trim)
- `sourceFile`: String (trim)
- `lineNumber`: Number
- `columnNumber`: Number
- `statusCode`: Number
- `userAgent`: String (trim)
- `ip`: String (trim, indexed)
- `referrer`: String (trim)
- `severity`: String (enum: "low", "medium", "high", "critical") - default: "medium", indexed
- `status`: String (enum: "new", "investigating", "resolved", "false_positive") - default: "new", indexed
- `reportedAt`: Date (default: Date.now, indexed)
- `resolvedAt`: Date
- `notes`: String (trim)
- `requestId`: String (trim)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:

- `documentUri`: index
- `violatedDirective`: index
- `reportedAt`: -1 (descending)
- `status`: index
- `severity`: index
- `ip`: index

---

## SƠ ĐỒ QUAN HỆ (RELATIONSHIP DIAGRAM)

### Quan hệ chính:

1. **User** (1) ──< (N) **Order**: Một user có nhiều đơn hàng
2. **User** (1) ── (1) **Cart**: Một user có một giỏ hàng
3. **User** (1) ── (1) **Wishlist**: Một user có một wishlist
4. **User** (1) ──< (N) **Review**: Một user có nhiều đánh giá
5. **User** (1) ──< (N) **Event**: Một user có nhiều events

6. **Product** (N) ──< (1) **Brand**: Nhiều sản phẩm thuộc một brand
7. **Product** (N) ──< (M) **Category**: Nhiều sản phẩm thuộc nhiều category (many-to-many)
8. **Product** (1) ──< (N) **Review**: Một sản phẩm có nhiều đánh giá
9. **Product** (1) ──< (N) **InventoryLog**: Một sản phẩm có nhiều log kho
10. **Product** (1) ──< (N) **Event**: Một sản phẩm có nhiều events

11. **Order** (1) ──< (1) **Payment**: Một đơn hàng có một payment (optional)
12. **Order** (1) ──< (N) **OrderItem**: Một đơn hàng có nhiều items (embedded)

13. **Review** (1) ──< (N) **Review**: Một review có thể có nhiều reply (self-referencing)

14. **Category** (1) ──< (N) **Category**: Category có cấu trúc cây (self-referencing)

---

## GHI CHÚ QUAN TRỌNG

1. **MongoDB NoSQL**: Tất cả collections sử dụng MongoDB, không phải SQL relational database
2. **Embedded Documents**: Một số schema được embed (Address, Variant, OrderItem, Timeline, PaymentInfo)
3. **References**: Sử dụng ObjectId references thay vì foreign keys
4. **Indexes**: Nhiều compound indexes để tối ưu query performance
5. **Vector Search**: Product có embedding field với vector index (768 dimensions) cho AI recommendation
6. **Partial Index**: Review có unique index với partial filter (chỉ áp dụng cho reviews gốc, không phải reply)
7. **Text Search**: Product có text index cho full-text search
8. **Timestamps**: Tất cả collections đều có `createdAt` và `updatedAt` tự động

---

## PROMPT CHO CÔNG CỤ TẠO BIỂU ĐỒ

Bạn có thể sử dụng prompt này với các công cụ như:

- **dbdiagram.io**: Sử dụng DBML syntax
- **draw.io / diagrams.net**: Vẽ ERD thủ công
- **Lucidchart**: Tạo database diagram
- **AI tools** (Claude, ChatGPT): Yêu cầu tạo ERD từ mô tả này

**Ví dụ prompt cho AI:**
"Tạo sơ đồ ERD (Entity Relationship Diagram) cho hệ thống e-commerce MongoDB với các collection: User, Product, Order, Cart, Category, Brand, Review, Wishlist, Payment, InventoryLog, Event, WebhookLog, CSPViolation. Bao gồm tất cả các fields, relationships, và indexes như mô tả trong file này."
