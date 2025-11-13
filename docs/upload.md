# Tài liệu API - Upload Routes

## Base URL

```
http://localhost:4000/api
```

## Tổng quan

Tài liệu này mô tả chi tiết các endpoint quản lý Upload (Upload file) trong hệ thống MERN Fashion Store.

---

## 1. Upload Single Image

### `POST /upload/single`

Upload một ảnh duy nhất.

**Headers:**

```http
Content-Type: multipart/form-data
```

**Authentication:**

Không cần authentication (có thể được comment trong code).

**Form Data:**

- `image` (bắt buộc): File (image file, max 10MB)

**Response Success (200 OK):**

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

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Không có file được upload!"
}
```

**Response Error (500 Internal Server Error):**

```json
{
  "status": false,
  "message": "Lỗi khi upload file: ..."
}
```

**Lưu ý:**

- File được upload lên Cloudinary
- Folder: `products`
- Tags: `user-upload`, `userId-${userId}` (nếu có)

---

## 2. Upload Multiple Images

### `POST /upload/multiple`

Upload nhiều ảnh cùng lúc.

**Headers:**

```http
Content-Type: multipart/form-data
Authorization: Bearer <admin_or_staff_token>
```

**Authentication:**

Yêu cầu: `admin` hoặc `staff`

**Form Data:**

- `images` (bắt buộc): File[] (multiple image files, max 10 files, 10MB each)

**Response Success (200 OK):**

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

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Không có file nào được upload!"
}
```

**Lưu ý:**

- Tối đa 10 files
- Mỗi file tối đa 10MB
- Folder: `products`
- Tags: `user-upload`, `userId-${userId}`

---

## 3. Upload Product Images (with Auto Transformation)

### `POST /upload/product`

Upload ảnh sản phẩm với transformation tự động.

**Headers:**

```http
Content-Type: multipart/form-data
Authorization: Bearer <admin_or_staff_token>
```

**Authentication:**

Yêu cầu: `admin` hoặc `staff`

**Form Data:**

- `mainImage` (tùy chọn): File (max 1) - Auto resize to 800x800
- `galleryImages` (tùy chọn): File[] (max 9) - Auto resize to 1200x1200
- `thumbnailImage` (tùy chọn): File (max 1) - Auto resize to 300x300, crop fill
- `variantImages` (tùy chọn): File[] (max 10) - Auto resize to 600x600
- `productId` (tùy chọn): String - Product ID for organizing files

**Transformations Applied:**

- `thumbnailImage` → 300x300, crop fill
- `mainImage` → 800x800, limit (keep aspect ratio)
- `galleryImages` → 1200x1200, limit
- `variantImages` → 600x600, limit

**Response Success (200 OK):**

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
    },
    "thumbnailImage": {
      "successful": [...],
      "failed": [],
      "total": 1,
      "successCount": 1,
      "failCount": 0
    },
    "variantImages": {
      "successful": [...],
      "failed": [],
      "total": 2,
      "successCount": 2,
      "failCount": 0
    }
  },
  "meta": {
    "message": "Upload product images thành công!"
  }
}
```

**Lưu ý:**

- Transformation tự động được áp dụng theo loại ảnh
- Files được tổ chức theo productId (nếu có)
- Tags: `product`, `userId-${userId}`, `productId-${productId}`

---

## 4. Delete Image

### `DELETE /upload/:publicId`

Xóa một ảnh từ Cloudinary.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_or_staff_token>
```

**Authentication:**

Yêu cầu: `admin` hoặc `staff`

**Path Parameters:**

- `publicId` (bắt buộc): Public ID của file trong Cloudinary (URL encoded)

**Query Parameters:**

- `resourceType` (tùy chọn): `image`, `video`, `raw` (mặc định: `image`)

**Example:**

```
DELETE /upload/products%2Fabc123?resourceType=image
```

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": null,
  "meta": {
    "message": "Xóa file thành công!"
  }
}
```

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Public ID của file không được để trống!"
}
```

**Response Error (500 Internal Server Error):**

```json
{
  "status": false,
  "message": "Lỗi khi xóa file: ..."
}
```

---

## 5. Delete Multiple Images

### `DELETE /upload/multiple`

Xóa nhiều ảnh từ Cloudinary.

**Headers:**

```http
Content-Type: application/json
Authorization: Bearer <admin_or_staff_token>
```

**Authentication:**

Yêu cầu: `admin` hoặc `staff`

**Query Parameters:**

- `resourceType` (tùy chọn): `image`, `video`, `raw` (mặc định: `image`)

**Body:**

```json
{
  "publicIds": ["products/abc123", "products/def456", "products/ghi789"]
}
```

**Validation Rules:**

- `publicIds` (bắt buộc): Mảng public IDs (ít nhất 1)

**Response Success (200 OK):**

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

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Danh sách public IDs không hợp lệ!"
}
```

---

## 6. Get Transformed URL (Public)

### `GET /upload/transform/:publicId`

Lấy transformed URL (resize, crop, etc.) mà không upload.

**Headers:**

```http
Content-Type: application/json
```

**Authentication:**

Không cần authentication (public endpoint).

**Path Parameters:**

- `publicId` (bắt buộc): Public ID của file (URL encoded)

**Query Parameters:**

- `width` (tùy chọn): Width in pixels
- `height` (tùy chọn): Height in pixels
- `crop` (tùy chọn): Crop mode (`fill`, `limit`, `fit`, `thumb`, `scale`)
- `quality` (tùy chọn): Quality (`auto`, `best`, `good`, `eco`, `low`)
- `format` (tùy chọn): Format (`auto`, `jpg`, `png`, `webp`, `avif`)

**Example:**

```
GET /upload/transform/products%2Fabc123?width=400&height=400&crop=fill
```

**Response Success (200 OK):**

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

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Public ID của file không được để trống!"
}
```

---

## 7. Generate Upload Signature (for Client-side Upload)

### `POST /upload/signature`

Tạo upload signature cho client-side upload.

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
  "folder": "products",
  "tags": ["tag1", "tag2"],
  "resourceType": "image"
}
```

**Validation Rules:**

- `folder` (tùy chọn): Folder trong Cloudinary (mặc định: `products`)
- `tags` (tùy chọn): Mảng tags
- `resourceType` (tùy chọn): `image`, `video`, `raw` (mặc định: `image`)

**Response Success (200 OK):**

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

**Lưu ý:**

- Upload signature được sử dụng để upload trực tiếp từ client (không qua server)
- Requires upload preset configured in Cloudinary dashboard
- See `CLOUDINARY_SETUP_GUIDE.md` for setup instructions

---

## 8. Upload Avatar

### `POST /upload/avatar`

Upload avatar cho user (chỉ user upload avatar của chính họ).

**Headers:**

```http
Content-Type: multipart/form-data
Authorization: Bearer <access_token>
```

**Authentication:**

Yêu cầu: Đã đăng nhập (bất kỳ role nào)

**Form Data:**

- `avatar` (bắt buộc): File (image file, max 5MB)

**Validation Rules:**

- File type: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`
- File size: Tối đa 5MB
- Avatar cũ sẽ được xóa tự động (nếu có)

**Response Success (200 OK):**

```json
{
  "status": true,
  "data": {
    "url": "https://res.cloudinary.com/cloud_name/image/upload/v1234567890/avatars/avatar_64f1a2b3c4d5e6f7a8b9c0d1_1693567800.jpg",
    "publicId": "avatars/avatar_64f1a2b3c4d5e6f7a8b9c0d1_1693567800",
    "message": "Upload avatar thành công!"
  }
}
```

**Response Error (400 Bad Request):**

```json
{
  "status": false,
  "message": "Không có file được upload!"
}
```

hoặc

```json
{
  "status": false,
  "message": "Chỉ cho phép upload file ảnh định dạng JPG, PNG hoặc WEBP!"
}
```

hoặc

```json
{
  "status": false,
  "message": "File quá lớn! Kích thước tối đa là 5MB."
}
```

**Response Error (401 Unauthorized):**

```json
{
  "status": false,
  "message": "Chưa đăng nhập"
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

- Chỉ user được phép upload avatar của chính họ
- Avatar sẽ tự động được resize và optimize
- Avatar cũ được xóa tự động (nếu có)
- Folder: `avatars`
- Transformation: 400x400, crop fill
- Tags: `avatar`, `userId-${userId}`
- Avatar URL được cập nhật trong database

---

## Error Codes

### HTTP Status Codes

- `200`: OK - Thành công
- `400`: Bad Request - Dữ liệu đầu vào không hợp lệ
- `401`: Unauthorized - Chưa đăng nhập
- `404`: Not Found - Không tìm thấy tài nguyên
- `500`: Internal Server Error - Lỗi server

---

## Authentication & Authorization

### Public Endpoints (Không cần authentication)

- `POST /upload/single` - Upload một ảnh
- `GET /upload/transform/:publicId` - Lấy transformed URL

### Protected Endpoints (Yêu cầu authentication)

- `POST /upload/multiple` - Upload nhiều ảnh (admin/staff)
- `POST /upload/product` - Upload ảnh sản phẩm (admin/staff)
- `DELETE /upload/:publicId` - Xóa ảnh (admin/staff)
- `DELETE /upload/multiple` - Xóa nhiều ảnh (admin/staff)
- `POST /upload/signature` - Tạo upload signature (admin/staff)
- `POST /upload/avatar` - Upload avatar (đã đăng nhập)

---

## Business Rules

### 1. File Upload

- Single Image: Max 10MB
- Multiple Images: Max 10 files, 10MB each
- Avatar: Max 5MB, formats: JPG, PNG, WEBP
- Product Images: Auto transformation based on image type

### 2. File Organization

- Products: `products/` folder
- Avatars: `avatars/` folder
- Tags: `user-upload`, `userId-${userId}`, `product`, `productId-${productId}`, `avatar`

### 3. File Deletion

- Only admin/staff can delete files
- Avatar cũ được xóa tự động khi upload avatar mới

---

## Best Practices

### 1. Image Upload

- Sử dụng transformation để optimize kích thước file
- Sử dụng tags để organize files
- Xóa files không sử dụng để tiết kiệm storage

### 2. Client-side Upload

- Sử dụng upload signature để upload trực tiếp từ client
- Giảm tải server và tăng tốc độ upload

---

## Notes

1. **Cloudinary Integration**: Tất cả files được upload lên Cloudinary.

2. **Auto Transformation**: Product images được tự động transform theo kích thước phù hợp.

3. **Avatar Management**: Avatar cũ được xóa tự động khi upload avatar mới.

4. **File Organization**: Files được tổ chức theo folder và tags để dễ quản lý.

---

_Tài liệu này được tạo ngày: 2025-11-13_
