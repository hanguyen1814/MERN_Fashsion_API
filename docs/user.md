# Tài liệu API - User Routes

## Base URL

```
http://localhost:4000/api
```

## Tổng quan

Tài liệu này mô tả chi tiết các endpoint quản lý User (Người dùng) trong hệ thống MERN Fashion Store.

---

## 1. Lấy thông tin profile hiện tại

### `GET /users/profile/me`

Lấy thông tin profile của user hiện tại.

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
    "user_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "full_name": "Nguyễn Văn A",
    "email": "user@example.com",
    "phone": "0123456789",
    "address": "123 Đường ABC, Phường XYZ, Quận 1, TP.HCM",
    "role": "customer",
    "status": "active",
    "created_at": "2023-09-01T00:00:00.000Z"
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

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Không tìm thấy người dùng"
}
```

**Lưu ý:**

- Address là địa chỉ mặc định (nếu có)
- Password hash và refresh token không được trả về

---

## 2. Cập nhật profile

### `PUT /users/profile/me`

Cập nhật thông tin profile của user hiện tại.

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
  "fullName": "Nguyễn Văn B",
  "phone": "0987654321",
  "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

**Validation Rules:**

- `fullName` (tùy chọn): 2-50 ký tự
- `phone` (tùy chọn): 10 số, bắt đầu bằng 0
- `avatarUrl` (tùy chọn): URL ảnh hợp lệ

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "message": "User updated successfully"
  }
}
```

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Dữ liệu đầu vào không hợp lệ",
  "details": [
    {
      "field": "fullName",
      "message": "Họ tên phải từ 2-50 ký tự",
      "value": "A"
    },
    {
      "field": "phone",
      "message": "Số điện thoại không hợp lệ",
      "value": "123"
    }
  ]
}
```

---

## 3. Đổi mật khẩu

### `PUT /users/password/change`

Đổi mật khẩu của user hiện tại.

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
  "currentPassword": "Password123",
  "newPassword": "NewPassword123"
}
```

**Validation Rules:**

- `currentPassword` (bắt buộc): Mật khẩu hiện tại
- `newPassword` (bắt buộc): Mật khẩu mới (ít nhất 8 ký tự, có chữ hoa, chữ thường và số)

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "message": "Password updated successfully"
  }
}
```

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Thiếu mật khẩu hiện tại hoặc mật khẩu mới"
}
```

hoặc

```json
{
  "status": false,
  "message": "Mật khẩu hiện tại không đúng"
}
```

**Lưu ý:**

- Kiểm tra mật khẩu hiện tại trước khi đổi
- Mật khẩu mới được hash bằng bcrypt

---

## 4. Lấy danh sách địa chỉ

### `GET /users/addresses`

Lấy danh sách địa chỉ của user hiện tại.

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
    "addresses": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "fullName": "Nguyễn Văn A",
        "phone": "0123456789",
        "street": "123 Đường ABC",
        "ward": "Phường XYZ",
        "district": "Quận 1",
        "province": "TP.HCM",
        "isDefault": true
      },
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
        "fullName": "Nguyễn Văn A",
        "phone": "0123456789",
        "street": "456 Đường DEF",
        "ward": "Phường UVW",
        "district": "Quận 2",
        "province": "TP.HCM",
        "isDefault": false
      }
    ]
  }
}
```

**Lưu ý:**

- Địa chỉ mặc định được sắp xếp lên đầu
- Nếu không có địa chỉ, trả về mảng rỗng

---

## 5. Thêm địa chỉ

### `POST /users/addresses`

Thêm địa chỉ mới cho user hiện tại.

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
  "isDefault": false
}
```

**Validation Rules:**

- `fullName` (bắt buộc): 2-50 ký tự
- `phone` (bắt buộc): 10 số, bắt đầu bằng 0
- `street` (bắt buộc): 5-200 ký tự
- `ward` (bắt buộc): 1-100 ký tự
- `district` (bắt buộc): 1-100 ký tự
- `province` (bắt buộc): 1-100 ký tự
- `isDefault` (tùy chọn): `true`/`false` (mặc định: `false`)

**Response Success (201 Created):**

```json
{
  "status": true,
  "data": {
    "address": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "fullName": "Nguyễn Văn A",
      "phone": "0123456789",
      "street": "123 Đường ABC",
      "ward": "Phường XYZ",
      "district": "Quận 1",
      "province": "TP.HCM",
      "isDefault": true
    },
    "message": "Thêm địa chỉ thành công"
  }
}
```

**Lưu ý:**

- Nếu đây là địa chỉ đầu tiên, tự động đặt làm mặc định
- Nếu đặt làm mặc định, các địa chỉ khác sẽ bỏ default

---

## 6. Cập nhật địa chỉ

### `PUT /users/addresses/:id`

Cập nhật địa chỉ của user hiện tại.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Authentication:**

Yêu cầu: Đã đăng nhập (bất kỳ role nào)

**Path Parameters:**

- `id` (bắt buộc): ObjectId của địa chỉ

**Body:**

Tương tự như `POST /users/addresses`, tất cả các trường đều tùy chọn.

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "address": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "fullName": "Nguyễn Văn B",
      "phone": "0987654321",
      "street": "456 Đường DEF",
      "ward": "Phường UVW",
      "district": "Quận 2",
      "province": "TP.HCM",
      "isDefault": true
    },
    "message": "Cập nhật địa chỉ thành công"
  }
}
```

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Không tìm thấy địa chỉ"
}
```

**Lưu ý:**

- Nếu đặt làm mặc định, các địa chỉ khác sẽ bỏ default

---

## 7. Xóa địa chỉ

### `DELETE /users/addresses/:id`

Xóa địa chỉ của user hiện tại.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Authentication:**

Yêu cầu: Đã đăng nhập (bất kỳ role nào)

**Path Parameters:**

- `id` (bắt buộc): ObjectId của địa chỉ

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "message": "Xóa địa chỉ thành công"
  }
}
```

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Không tìm thấy địa chỉ"
}
```

**Lưu ý:**

- Nếu địa chỉ bị xóa là mặc định và còn địa chỉ khác, địa chỉ đầu tiên sẽ được đặt làm mặc định

---

## 8. Đặt địa chỉ mặc định

### `PATCH /users/addresses/:id/default`

Đặt địa chỉ làm mặc định.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Authentication:**

Yêu cầu: Đã đăng nhập (bất kỳ role nào)

**Path Parameters:**

- `id` (bắt buộc): ObjectId của địa chỉ

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "address": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "fullName": "Nguyễn Văn A",
      "phone": "0123456789",
      "street": "123 Đường ABC",
      "ward": "Phường XYZ",
      "district": "Quận 1",
      "province": "TP.HCM",
      "isDefault": true
    },
    "message": "Đặt địa chỉ mặc định thành công"
  }
}
```

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Không tìm thấy địa chỉ"
}
```

**Lưu ý:**

- Tất cả các địa chỉ khác sẽ bỏ default
- Chỉ có 1 địa chỉ mặc định tại một thời điểm

---

## 9. Lấy danh sách người dùng (Admin)

### `GET /users`

Lấy danh sách tất cả người dùng (chỉ admin).

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_token>
```

**Authentication:**

Yêu cầu: `admin`

**Query Parameters:**

- `page` (tùy chọn): Số trang (mặc định: 1)
- `limit` (tùy chọn): Số item/trang (mặc định: 10)
- `role` (tùy chọn): `customer`, `admin`, `staff`
- `status` (tùy chọn): `active`, `inactive`, `banned`, `pending`
- `search` (tùy chọn): Tìm kiếm theo tên/email

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": [
    {
      "user_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "full_name": "Nguyễn Văn A",
      "email": "user@example.com",
      "phone": "0123456789",
      "address": "123 Đường ABC, Phường XYZ, Quận 1, TP.HCM",
      "role": "customer",
      "status": "active",
      "created_at": "2023-09-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

**Lưu ý:**

- Password hash và refresh token không được trả về
- Address là địa chỉ mặc định (nếu có)

---

## 10. Lấy thông tin user theo ID

### `GET /users/:id`

Lấy thông tin user theo ID.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Authentication:**

Yêu cầu: Đã đăng nhập (bất kỳ role nào)

**Path Parameters:**

- `id` (bắt buộc): ObjectId của user

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "user_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "full_name": "Nguyễn Văn A",
    "email": "user@example.com",
    "phone": "0123456789",
    "address": "123 Đường ABC, Phường XYZ, Quận 1, TP.HCM",
    "role": "customer",
    "status": "active",
    "created_at": "2023-09-01T00:00:00.000Z"
  }
}
```

**Response Error (403 Forbidden):**

```json
{
  "status": false,
  "message": "Không có quyền truy cập"
}
```

**Lưu ý:**

- Chỉ admin mới được xem thông tin người khác
- User có thể xem thông tin của chính mình

---

## 11. Cập nhật user (Admin)

### `PUT /users/:id`

Cập nhật thông tin user (chỉ admin).

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_token>
```

**Authentication:**

Yêu cầu: `admin`

**Path Parameters:**

- `id` (bắt buộc): ObjectId của user

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

**Validation Rules:**

- Tất cả các trường đều tùy chọn (chỉ cập nhật các trường được gửi)
- `fullName`: 2-50 ký tự (nếu có)
- `phone`: 10 số, bắt đầu bằng 0 (nếu có)
- `role`: `customer`, `admin`, `staff` (nếu có)
- `status`: `active`, `inactive`, `banned`, `pending` (nếu có)
- `loyaltyPoints`: Number (nếu có)

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "message": "User updated successfully"
  }
}
```

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Không tìm thấy người dùng"
}
```

---

## 12. Xóa user (Admin)

### `DELETE /users/:id`

Xóa user (chỉ admin).

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_token>
```

**Authentication:**

Yêu cầu: `admin`

**Path Parameters:**

- `id` (bắt buộc): ObjectId của user

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "message": "User deleted successfully"
  }
}
```

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Không thể xóa tài khoản của chính mình"
}
```

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Không tìm thấy người dùng"
}
```

**Lưu ý:**

- Không cho phép xóa tài khoản của chính mình

---

## 13. Thay đổi trạng thái user (Admin)

### `PATCH /users/:id/status`

Thay đổi trạng thái user (chỉ admin).

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_token>
```

**Authentication:**

Yêu cầu: `admin`

**Path Parameters:**

- `id` (bắt buộc): ObjectId của user

**Body:**

```json
{
  "status": "banned"
}
```

**Validation Rules:**

- `status` (bắt buộc): `active`, `inactive`, `banned`

**Response Success (200 OK):**

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
      "status": "banned",
      "createdAt": "2023-09-01T00:00:00.000Z",
      "updatedAt": "2023-09-01T10:30:00.000Z"
    },
    "message": "Thay đổi trạng thái thành công"
  }
}
```

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Trạng thái không hợp lệ"
}
```

hoặc

```json
{
  "status": false,
  "message": "Không thể thay đổi trạng thái của chính mình"
}
```

**Response Error (404 Not Found):**

```json
{
  "status": false,
  "message": "Không tìm thấy người dùng"
}
```

**Lưu ý:**

- Không cho phép thay đổi trạng thái của chính mình

---

## 14. Thống kê người dùng (Admin)

### `GET /users/stats`

Lấy thống kê người dùng (chỉ admin).

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_token>
```

**Authentication:**

Yêu cầu: `admin`

**Response Success (200 OK):**

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

**Lưu ý:**

- Thống kê theo status và role
- New users: Người dùng mới trong 30 ngày qua

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

### Protected Endpoints (Yêu cầu authentication)

#### User (Any role)

- `GET /users/profile/me` - Lấy thông tin profile
- `PUT /users/profile/me` - Cập nhật profile
- `PUT /users/password/change` - Đổi mật khẩu
- `GET /users/addresses` - Lấy danh sách địa chỉ
- `POST /users/addresses` - Thêm địa chỉ
- `PUT /users/addresses/:id` - Cập nhật địa chỉ
- `DELETE /users/addresses/:id` - Xóa địa chỉ
- `PATCH /users/addresses/:id/default` - Đặt địa chỉ mặc định
- `GET /users/:id` - Lấy thông tin user theo ID

#### Admin Only

- `GET /users` - Lấy danh sách người dùng
- `PUT /users/:id` - Cập nhật user
- `DELETE /users/:id` - Xóa user
- `PATCH /users/:id/status` - Thay đổi trạng thái user
- `GET /users/stats` - Thống kê người dùng

### Headers cho Protected Endpoints

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## Business Rules

### 1. User Management

- Profile Management:

  - User có thể xem và cập nhật thông tin của chính mình
  - Chỉ admin mới được xem thông tin người khác
  - Password được hash bằng bcrypt

- Address Management:

  - User có thể quản lý nhiều địa chỉ
  - Chỉ có 1 địa chỉ mặc định tại một thời điểm
  - Địa chỉ đầu tiên tự động đặt làm mặc định
  - Nếu địa chỉ mặc định bị xóa, địa chỉ đầu tiên sẽ được đặt làm mặc định

- Admin Management:
  - Chỉ admin mới được quản lý user
  - Không cho phép xóa hoặc thay đổi trạng thái của chính mình

---

## Best Practices

### 1. User Profile

- Luôn validate dữ liệu đầu vào
- Không trả về password hash và refresh token
- Sử dụng địa chỉ mặc định khi hiển thị

### 2. Address Management

- Sắp xếp địa chỉ mặc định lên đầu
- Tự động đặt địa chỉ đầu tiên làm mặc định nếu không có

---

## Notes

1. **Password Security**: Mật khẩu được hash bằng bcrypt trước khi lưu vào database.

2. **Address Default**: Chỉ có 1 địa chỉ mặc định tại một thời điểm, được tự động quản lý.

3. **Admin Protection**: Admin không thể xóa hoặc thay đổi trạng thái của chính mình.

4. **User Stats**: Thống kê người dùng được tính theo status, role và thời gian.

---

_Tài liệu này được tạo ngày: 2025-11-13_
