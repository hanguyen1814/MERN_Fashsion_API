# Tài liệu API - Order Routes

## Base URL

```
http://localhost:4000/api
```

## Tổng quan

Tài liệu này mô tả chi tiết các endpoint quản lý Order (Đơn hàng) trong hệ thống MERN Fashion Store.

---

## 1. Lấy danh sách đơn hàng của user

### `GET /orders`

Lấy danh sách đơn hàng của user hiện tại với phân trang.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Authentication:**

Yêu cầu: Đã đăng nhập (bất kỳ role nào)

**Query Parameters:**

- `page` (tùy chọn): Số trang (mặc định: 1)
- `limit` (tùy chọn): Số item/trang (mặc định: 20)
- `status` (tùy chọn): Lọc theo trạng thái (`pending`, `paid`, `processing`, `shipped`, `completed`, `cancelled`, `refunded`)
- `sort` (tùy chọn): Trường sắp xếp (mặc định: `createdAt`)
- `order` (tùy chọn): Thứ tự sắp xếp (`asc` hoặc `desc`, mặc định: `desc`)

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "orders": [
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
        "createdAt": "2023-09-01T00:00:00.000Z",
        "updatedAt": "2023-09-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "pages": 2
    }
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

---

## 2. Lấy chi tiết đơn hàng của user

### `GET /orders/:id`

Lấy chi tiết đơn hàng của user hiện tại bằng ID hoặc code.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Authentication:**

Yêu cầu: Đã đăng nhập (bất kỳ role nào)

**Path Parameters:**

- `id` (bắt buộc): ObjectId hoặc order code (ví dụ: `ORD-20230901-001`)

**Response Success (200 OK):**

Tương tự như response của `GET /orders` nhưng chỉ trả về 1 đơn hàng.

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Không tìm thấy đơn hàng"
}
```

**Lưu ý:**

- User chỉ có thể xem đơn hàng của chính họ
- Có thể tìm bằng ObjectId hoặc order code

---

## 3. Tạo đơn hàng từ giỏ hàng

### `POST /orders/checkout`

Tạo đơn hàng mới từ giỏ hàng hiện tại.

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

**Validation Rules:**

- `fullName` (bắt buộc): Tên người nhận
- `phone` (bắt buộc): Số điện thoại (10 số, bắt đầu bằng 0)
- `street` (bắt buộc): Địa chỉ đường (5-200 ký tự)
- `ward` (bắt buộc): Phường/xã (1-100 ký tự)
- `district` (bắt buộc): Quận/huyện (1-100 ký tự)
- `province` (bắt buộc): Tỉnh/thành phố (1-100 ký tự)
- `method` (tùy chọn): Phương thức thanh toán (`cod`, `card`, `bank`, `ewallet`, `qr`, `momo`, mặc định: `cod`)
- `provider` (tùy chọn): Nhà cung cấp thanh toán (ví dụ: `momo`, `vnpay`)

**Response Success (201 Created):**

Tương tự như response của `GET /orders/:id`.

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Giỏ hàng trống"
}
```

**Lưu ý:**

- Giỏ hàng sẽ được xóa sau khi tạo đơn hàng thành công
- Sử dụng transaction để đảm bảo tính nhất quán (trừ kho, tạo đơn, xóa giỏ hàng)
- Giá được lấy từ database (không dùng giá từ cart)
- Phí ship: Miễn phí nếu `subtotal > 500000`, ngược lại là `30000`
- Payment status: `paid` nếu `method = cod`, ngược lại là `pending`
- Email hóa đơn được gửi tự động (không block response nếu lỗi)
- Event tracking: `purchase` được ghi lại
- Inventory log được ghi lại cho mỗi sản phẩm

---

## 4. Tạo đơn hàng trực tiếp (không qua giỏ hàng)

### `POST /orders/checkout-direct`

Tạo đơn hàng trực tiếp từ danh sách sản phẩm (không cần có trong giỏ hàng).

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
  "items": [
    {
      "productId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "sku": "ATN-RED-M",
      "quantity": 2
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

**Validation Rules:**

- `items` (bắt buộc): Mảng sản phẩm, mỗi item có:
  - `productId` (bắt buộc): ObjectId của Product
  - `sku` (bắt buộc): SKU của variant
  - `quantity` (bắt buộc): Số lượng (phải > 0)
- `fullName`, `phone`, `street`, `ward`, `district`, `province` (bắt buộc): Tương tự như checkout từ giỏ hàng
- `method` (tùy chọn): Phương thức thanh toán (mặc định: `cod`)
- `provider` (tùy chọn): Nhà cung cấp thanh toán

**Response Success (201 Created):**

Tương tự như `POST /orders/checkout`.

**Lưu ý:**

- Không cần có sản phẩm trong giỏ hàng
- Phí ship: `0` (có thể mở rộng sau)
- Không xóa giỏ hàng (vì không sử dụng giỏ hàng)
- Các tính năng khác tương tự như `POST /orders/checkout`
- Event tracking: `purchase` được ghi lại

---

## 5. Hủy đơn hàng

### `POST /orders/:id/cancel`

User hủy đơn hàng của chính họ.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Authentication:**

Yêu cầu: Đã đăng nhập (bất kỳ role nào)

**Path Parameters:**

- `id` (bắt buộc): ObjectId hoặc order code

**Body:**

```json
{
  "reason": "Không còn cần sản phẩm"
}
```

**Validation Rules:**

- `reason` (tùy chọn): Lý do hủy đơn

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "message": "Đơn hàng đã được hủy thành công",
    "order": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "code": "ORD-20230901-001",
      "status": "cancelled",
      "timeline": [...],
      "payment": {
        "method": "cod",
        "status": "refunded"
      }
    }
  }
}
```

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Không thể hủy đơn hàng ở trạng thái \"shipped\". Chỉ có thể hủy đơn hàng ở trạng thái \"pending\" hoặc \"paid\"."
}
```

**Lưu ý:**

- Chỉ có thể hủy đơn hàng ở trạng thái `pending` hoặc `paid`
- Tồn kho sẽ được hoàn trả tự động
- Nếu đã thanh toán, payment status sẽ được set thành `refunded`
- Email thông báo hủy đơn được gửi tự động
- Inventory log được ghi lại
- Sử dụng transaction để đảm bảo tính nhất quán

---

## 6. Cập nhật trạng thái đơn hàng (Staff/Admin)

### `PATCH /orders/:id/status`

Cập nhật trạng thái đơn hàng (chỉ dành cho staff và admin).

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <staff_or_admin_token>
```

**Authentication:**

Yêu cầu: `staff` hoặc `admin`

**Path Parameters:**

- `id` (bắt buộc): ObjectId hoặc order code

**Body:**

```json
{
  "status": "processing",
  "note": "Đã xác nhận thanh toán"
}
```

**Validation Rules:**

- `status` (bắt buộc): Trạng thái mới (`pending`, `paid`, `processing`, `shipped`, `completed`, `cancelled`, `refunded`)
- `note` (tùy chọn): Ghi chú về thay đổi trạng thái

**Valid Status Transitions:**

- `pending` → `paid`, `cancelled`
- `paid` → `processing`, `cancelled`, `refunded`
- `processing` → `shipped`, `cancelled`, `refunded`
- `shipped` → `completed`, `cancelled`, `refunded`
- `completed` → (không thể chuyển)
- `cancelled` → (không thể chuyển)
- `refunded` → (không thể chuyển)

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "code": "ORD-20230901-001",
    "status": "processing",
    "timeline": [...]
  }
}
```

**Lưu ý:**

- Chỉ staff và admin mới có quyền cập nhật trạng thái
- Kiểm tra tính hợp lệ của status transition
- Nếu chuyển sang `cancelled` hoặc `refunded`, tồn kho sẽ được hoàn trả
- Nếu chuyển sang `refunded` và payment status là `paid`, payment status sẽ được set thành `refunded`
- Nếu chuyển sang `completed`, email thông báo hoàn thành đơn hàng sẽ được gửi
- Timeline được cập nhật tự động
- Inventory log được ghi lại khi hoàn trả tồn kho

---

## 7. Lấy danh sách đơn hàng (Admin)

### `GET /orders/admin`

Lấy danh sách tất cả đơn hàng với phân trang và filter (chỉ dành cho admin).

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_token>
```

**Authentication:**

Yêu cầu: `admin`

**Query Parameters:**

- `page` (tùy chọn): Số trang (mặc định: 1)
- `limit` (tùy chọn): Số item/trang (mặc định: 20)
- `status` (tùy chọn): Lọc theo trạng thái
- `userId` (tùy chọn): Lọc theo user ID
- `startDate` (tùy chọn): Ngày bắt đầu (YYYY-MM-DD)
- `endDate` (tùy chọn): Ngày kết thúc (YYYY-MM-DD)
- `sort` (tùy chọn): Trường sắp xếp (mặc định: `createdAt`)
- `order` (tùy chọn): Thứ tự sắp xếp (`asc` hoặc `desc`, mặc định: `desc`)
- `search` (tùy chọn): Tìm kiếm theo order code hoặc tên khách hàng

**Response Success (200 OK):**

Tương tự như `GET /orders` nhưng bao gồm thông tin customer đầy đủ.

---

## 8. Lấy chi tiết đơn hàng (Admin)

### `GET /orders/admin/:id`

Lấy chi tiết đơn hàng bằng ID hoặc code (chỉ dành cho admin).

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_token>
```

**Authentication:**

Yêu cầu: `admin`

**Path Parameters:**

- `id` (bắt buộc): ObjectId hoặc order code

**Response Success (200 OK):**

Tương tự như `GET /orders/:id` nhưng bao gồm thông tin customer đầy đủ.

---

## 9. Thống kê đơn hàng (Admin)

### `GET /orders/admin/stats`

Lấy thống kê đơn hàng (chỉ dành cho admin).

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_token>
```

**Authentication:**

Yêu cầu: `admin`

**Query Parameters:**

- `period` (tùy chọn): Khoảng thời gian (`1d`, `7d`, `30d`, `90d`, mặc định: `7d`)
- `status` (tùy chọn): Lọc theo trạng thái (mặc định: `all`)

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "period": "7d",
    "startDate": "2023-08-25T00:00:00.000Z",
    "endDate": "2023-09-01T00:00:00.000Z",
    "overview": {
      "totalOrders": 150,
      "totalRevenue": 45000000,
      "averageOrderValue": 300000
    },
    "statusBreakdown": {
      "pending": 25,
      "paid": 30,
      "processing": 20,
      "shipped": 15,
      "completed": 50,
      "cancelled": 8,
      "refunded": 2
    },
    "dailyStats": [...],
    "topCustomers": [...]
  }
}
```

---

## 10. Xuất danh sách đơn hàng (Admin)

### `GET /orders/admin/export`

Xuất danh sách đơn hàng ra file CSV (chỉ dành cho admin).

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_token>
```

**Authentication:**

Yêu cầu: `admin`

**Query Parameters:**

- `format` (tùy chọn): Định dạng file (`csv`, mặc định: `csv`)
- `status` (tùy chọn): Lọc theo trạng thái (mặc định: `all`)
- `startDate` (tùy chọn): Ngày bắt đầu (YYYY-MM-DD)
- `endDate` (tùy chọn): Ngày kết thúc (YYYY-MM-DD)

**Response Success (200 OK):**

File CSV với headers:

- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename=orders.csv`

**Lưu ý:**

- Chỉ hỗ trợ format CSV
- Excel export chưa được hỗ trợ
- File được download trực tiếp

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

## Data Models

### Order Model

```javascript
{
  _id: ObjectId,
  code: String (required, unique),
  userId: ObjectId (ref: User, index),
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
  shippingMethod: String (enum: ['standard', 'express', 'same_day'], default: 'standard'),
  couponCode: String (optional),
  subtotal: Number,
  discount: Number,
  shippingFee: Number,
  total: Number,
  status: String (enum: ['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'refunded'], default: 'pending', index),
  timeline: [{
    status: String,
    at: Date,
    note: String
  }],
  payment: {
    method: String (enum: ['cod', 'card', 'bank', 'ewallet', 'qr', 'momo']),
    provider: String,
    transactionId: String,
    status: String (enum: ['pending', 'authorized', 'paid', 'failed', 'refunded', 'review'], default: 'pending'),
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

---

## Authentication & Authorization

### Protected Endpoints (Yêu cầu authentication)

#### User (Any role)

- `GET /orders` - Lấy danh sách đơn hàng của user
- `GET /orders/:id` - Lấy chi tiết đơn hàng của user
- `POST /orders/checkout` - Tạo đơn hàng từ giỏ hàng
- `POST /orders/checkout-direct` - Tạo đơn hàng trực tiếp
- `POST /orders/:id/cancel` - Hủy đơn hàng

#### Staff & Admin

- `PATCH /orders/:id/status` - Cập nhật trạng thái đơn hàng

#### Admin Only

- `GET /orders/admin` - Lấy danh sách đơn hàng (admin)
- `GET /orders/admin/:id` - Lấy chi tiết đơn hàng (admin)
- `GET /orders/admin/stats` - Thống kê đơn hàng
- `GET /orders/admin/export` - Xuất danh sách đơn hàng

### Headers cho Protected Endpoints

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## Business Rules

### 1. Order Creation

- Giá được lấy từ database (không dùng giá từ cart)
- Kiểm tra tồn kho trước khi tạo đơn
- Trừ kho ngay khi tạo đơn (transaction)
- Giỏ hàng được xóa sau khi tạo đơn thành công
- Payment status: `paid` nếu `method = cod`, ngược lại là `pending`

### 2. Order Status Flow

```
pending → paid → processing → shipped → completed
   ↓        ↓         ↓          ↓
cancelled cancelled cancelled cancelled
   ↓        ↓
refunded refunded
```

### 3. Order Cancellation

- Chỉ có thể hủy đơn ở trạng thái `pending` hoặc `paid`
- Tồn kho được hoàn trả tự động
- Payment status được set thành `refunded` nếu đã thanh toán
- Email thông báo hủy đơn được gửi tự động

### 4. Inventory Management

- Inventory log được ghi lại cho mỗi thay đổi tồn kho
- Log bao gồm: `productId`, `sku`, `quantity`, `reason`, `refId`
- Reasons: `order`, `order_cancelled`, `order_refunded`

---

## Best Practices

### 1. Order Creation

- Sử dụng transaction để đảm bảo tính nhất quán
- Kiểm tra tồn kho và trạng thái sản phẩm
- Lấy giá từ database (không tin tưởng giá từ cart)
- Ghi inventory log cho mỗi sản phẩm

### 2. Order Status Management

- Validate status transition trước khi cập nhật
- Hoàn trả tồn kho khi hủy/hoàn tiền
- Cập nhật timeline cho mỗi thay đổi
- Gửi email thông báo khi cần thiết

### 3. Error Handling

- Sử dụng transaction để rollback khi có lỗi
- Log lỗi chi tiết để debug
- Trả về thông báo lỗi rõ ràng cho user
- Không block response nếu email gửi thất bại

---

## Notes

1. **Order Code**: Order code được generate tự động theo format `ORD-YYYYMMDD-XXX`.

2. **Shipping Fee**:

   - Checkout từ giỏ hàng: Miễn phí nếu `subtotal > 500000`, ngược lại là `30000`
   - Checkout trực tiếp: `0` (có thể mở rộng sau)

3. **Inventory Log**: Mỗi thay đổi tồn kho đều được ghi log để audit.

4. **Email Notifications**:

   - Invoice email khi tạo đơn
   - Cancellation email khi hủy đơn
   - Completion email khi hoàn thành đơn

5. **Event Tracking**: `purchase` được ghi lại khi tạo đơn hàng.

6. **Transaction Safety**: Tất cả các thao tác quan trọng (tạo đơn, hủy đơn, cập nhật trạng thái) đều sử dụng transaction để đảm bảo tính nhất quán.

7. **Status Transition**: Chỉ cho phép chuyển đổi trạng thái hợp lệ, không cho phép chuyển ngược lại từ `completed`, `cancelled`, `refunded`.

---

_Tài liệu này được tạo ngày: 2025-11-13_
