# Hướng dẫn cấu hình Cloudinary Upload

## Tổng quan

Cloudinary là giải pháp upload và quản lý ảnh cloud hiệu quả với các tính năng:

- ✅ CDN toàn cầu tự động
- ✅ Tự động optimize và resize ảnh
- ✅ Transform ảnh on-the-fly (thay đổi kích thước, crop, format mà không cần re-upload)
- ✅ Free tier: 25GB storage, 25GB bandwidth/tháng
- ✅ Tự động chọn format tốt nhất (WebP, AVIF)
- ✅ Upload trực tiếp từ client (giảm tải server)

## Bước 1: Tạo tài khoản Cloudinary

1. Truy cập: https://cloudinary.com/users/register/free
2. Đăng ký tài khoản miễn phí
3. Xác thực email

## Bước 2: Lấy thông tin API

1. Đăng nhập vào Cloudinary Dashboard
2. Vào **Settings** → **Security** để xem:
   - `Cloud Name`
   - `API Key`
   - `API Secret`

## Bước 3: Cấu hình biến môi trường

Thêm vào file `.env`:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Optional: Upload Preset (nếu muốn upload trực tiếp từ client)
CLOUDINARY_UPLOAD_PRESET=mern-fashion
```

**⚠️ Lưu ý quan trọng:**

- `CLOUDINARY_CLOUD_NAME` chỉ được chứa chữ cái, số, dấu gạch ngang (-) và dấu gạch dưới (\_)
- **KHÔNG** có khoảng trắng hoặc ký tự đặc biệt
- Giá trị sẽ được tự động trim() để loại bỏ khoảng trắng đầu/cuối

**Ví dụ:**

- ✅ Đúng: `CLOUDINARY_CLOUD_NAME=my-shop-123`
- ✅ Đúng: `CLOUDINARY_CLOUD_NAME=my_shop`
- ❌ Sai: `CLOUDINARY_CLOUD_NAME=my shop` (có khoảng trắng)
- ❌ Sai: `CLOUDINARY_CLOUD_NAME=my-shop@123` (có ký tự @)

Nếu gặp lỗi "Invalid cloud_name", hãy kiểm tra:

1. Cloud name trong file .env có khoảng trắng không?
2. Cloud name có khớp với Cloudinary Dashboard không?
3. API Key và API Secret có khớp với cloud name không?

## Bước 4: Cài đặt package

```bash
npm install cloudinary
```

## Bước 5: Cấu hình Upload Preset (Tùy chọn - cho client-side upload)

Nếu muốn cho phép upload trực tiếp từ client (không qua server):

1. Vào **Settings** → **Upload**
2. Click **Add upload preset**
3. Tên preset: `mern-fashion`
4. Signing mode: **Unsigned** (hoặc **Signed** nếu muốn bảo mật hơn)
5. Folder: `products` (hoặc để trống)
6. Save

## API Endpoints

### 1. Upload Single Image

```http
POST /api/upload/single
Content-Type: multipart/form-data
Authorization: Bearer <token>

Field: image
```

**Response:**

```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/...",
    "publicId": "products/abc123",
    "format": "jpg",
    "width": 1920,
    "height": 1080,
    "bytes": 245678,
    "createdAt": "2025-01-15T10:30:00Z",
    "folder": "products"
  },
  "message": "Upload file thành công!"
}
```

### 2. Upload Multiple Images

```http
POST /api/upload/multiple
Content-Type: multipart/form-data
Authorization: Bearer <token>

Field: images (multiple files)
```

### 3. Upload Product Images (với auto transformation)

```http
POST /api/upload/product
Content-Type: multipart/form-data
Authorization: Bearer <token>

Fields:
- mainImage: File (max 1)
- galleryImages: File[] (max 9)
- thumbnailImage: File (max 1)
- variantImages: File[] (max 10)

Body:
- productId: string (optional)
```

**Tự động áp dụng transformation:**

- `thumbnailImage` → 300x300, crop fill
- `mainImage` → 800x800, limit
- `galleryImages` → 1200x1200, limit
- `variantImages` → 600x600, limit

### 4. Delete Image

```http
DELETE /api/upload/:publicId?resourceType=image
Authorization: Bearer <token>
```

### 5. Get Transformed URL (không upload, chỉ tạo URL)

```http
GET /api/upload/transform/:publicId?width=400&height=400&crop=fill
```

**Ví dụ:**

```
GET /api/upload/transform/products/abc123?width=400&height=400&crop=fill
```

**Response:**

```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/.../c_fill,h_400,w_400/...",
    "transformation": {
      "width": 400,
      "height": 400,
      "crop": "fill"
    }
  }
}
```

### 6. Generate Upload Signature (cho client-side upload)

```http
POST /api/upload/signature
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "folder": "products",
  "tags": ["tag1", "tag2"],
  "resourceType": "image"
}
```

## Sử dụng trong code

### Upload ảnh sản phẩm với transformation tự động:

```javascript
const UploadService = require("./services/upload.service");

// Upload ảnh chính
const mainImage = await UploadService.uploadProductImage(
  file,
  "main",
  productId
);

// Upload thumbnail
const thumbnail = await UploadService.uploadProductImage(
  file,
  "thumbnail",
  productId
);
```

### Tạo URL với transformation:

```javascript
// Lấy URL ảnh với kích thước tùy chỉnh
const thumbnailUrl = UploadService.getTransformedUrl("products/abc123", {
  width: 300,
  height: 300,
  crop: "fill",
});
```

## Transformation Examples

### Resize với giữ nguyên tỷ lệ:

```
URL: https://res.cloudinary.com/cloud_name/image/upload/w_800,c_limit/products/image.jpg
```

### Crop và fill:

```
URL: https://res.cloudinary.com/cloud_name/image/upload/w_300,h_300,c_fill/products/image.jpg
```

### Auto format và quality:

```
URL: https://res.cloudinary.com/cloud_name/image/upload/q_auto,f_auto/products/image.jpg
```

## Ưu điểm so với S3

| Tính năng                 | S3                 | Cloudinary                    |
| ------------------------- | ------------------ | ----------------------------- |
| CDN                       | Cần cấu hình riêng | Tích hợp sẵn                  |
| Image Optimization        | Không có           | Tự động                       |
| On-the-fly Transformation | Không              | Có                            |
| Auto Format (WebP/AVIF)   | Không              | Có                            |
| Free Tier                 | 5GB storage        | 25GB storage + 25GB bandwidth |
| Dễ sử dụng                | Phức tạp           | Đơn giản                      |

## Chi phí

### Free Tier:

- ✅ 25GB storage
- ✅ 25GB bandwidth/tháng
- ✅ 25,000 transformation credits/tháng
- ✅ Tất cả tính năng cơ bản

### Paid Plans:

- Starter: $99/tháng (50GB storage, 50GB bandwidth)
- Advanced: Tùy chỉnh

## Lưu ý

1. **Public IDs**: Lưu `publicId` trong database, không lưu full URL để có thể transform sau
2. **Folders**: Tổ chức theo folder (`products/`, `reviews/`, etc.)
3. **Tags**: Sử dụng tags để quản lý và tìm kiếm ảnh
4. **Format**: Để `auto` để Cloudinary tự chọn format tốt nhất (WebP cho browser hỗ trợ)
5. **Quality**: Để `auto` để tự động optimize theo chất lượng

## Migration từ S3

Nếu đã có ảnh trên S3:

1. Download ảnh từ S3
2. Upload lại lên Cloudinary bằng script migration
3. Cập nhật database: thay `imageKey` bằng `publicId`

Script migration mẫu có thể được tạo theo yêu cầu.
