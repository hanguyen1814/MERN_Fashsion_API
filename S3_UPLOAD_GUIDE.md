# Hướng dẫn cấu hình CloudFly S3 cho tính năng upload ảnh

## 1. Cài đặt package

```bash
npm install aws-sdk@2.x multer
```

## 2. Cấu hình biến môi trường

Thêm các biến sau vào file `.env`:

```env
# CloudFly S3 Configuration
CLOUDFLY_ACCESS_KEY_ID=your_access_key_id_here
CLOUDFLY_SECRET_ACCESS_KEY=your_secret_access_key_here
S3_BUCKET_NAME=mern-fashion-products
```

## 3. Lấy API Key từ CloudFly

1. Đăng nhập vào giao diện quản lý CloudFly
2. Vào phần "API Key Management"
3. Tạo mới API Key hoặc sử dụng key có sẵn
4. Copy `ACCESS_KEY_ID` và `SECRET_KEY_ID`

## 4. Tạo Bucket (nếu cần)

Nếu bucket chưa tồn tại, bạn có thể tạo thủ công qua CloudFly dashboard hoặc để server tự động tạo (có thể gặp lỗi region).

**Lưu ý**: CloudFly S3 có thể có các hạn chế về region. Nếu gặp lỗi `InvalidLocationConstraint`, hãy:

1. Tạo bucket thủ công qua CloudFly dashboard
2. Hoặc liên hệ CloudFly để được hỗ trợ về region phù hợp

## 5. Các API endpoints đã tạo

### Upload Single Image

```
POST /api/upload/single
Content-Type: multipart/form-data
Body: image (file)
```

### Upload Multiple Images

```
POST /api/upload/multiple
Content-Type: multipart/form-data
Body: images (files array)
```

### Upload Product Images

```
POST /api/upload/product
Content-Type: multipart/form-data
Body:
- mainImage (file)
- galleryImages (files array)
- thumbnailImage (file)
```

### Delete Image

```
DELETE /api/upload/:key
```

### Delete Multiple Images

```
DELETE /api/upload/multiple
Body: { "keys": ["key1", "key2"] }
```

### Get Image Info

```
GET /api/upload/info/:key
```

### Generate Presigned Upload URL

```
POST /api/upload/presigned-upload
Body: {
  "fileName": "image.jpg",
  "contentType": "image/jpeg",
  "expiresIn": 300
}
```

### Generate Presigned Download URL

```
POST /api/upload/presigned-download
Body: {
  "key": "products/image-key",
  "expiresIn": 3600
}
```

### List Images

```
GET /api/upload/list?prefix=products&maxKeys=100
```

## 6. Cấu trúc thư mục trong S3

```
mern-fashion-products/
├── products/
│   ├── mainImage/
│   ├── galleryImages/
│   ├── thumbnailImage/
│   └── variants/
│       ├── mainImage/
│       └── galleryImages/
```

## 7. Cập nhật Product Model

Product model đã được cập nhật với các trường:

- `image`: URL ảnh chính
- `images`: Mảng URL ảnh gallery
- `imageKey`: S3 key của ảnh chính
- `imageKeys`: Mảng S3 keys của ảnh gallery
- `thumbnailImage`: URL ảnh thumbnail
- `thumbnailImageKey`: S3 key của ảnh thumbnail

## 8. Ví dụ sử dụng

### Upload ảnh sản phẩm

```javascript
const formData = new FormData();
formData.append("mainImage", fileInput.files[0]);
formData.append("galleryImages", fileInput.files[1]);
formData.append("galleryImages", fileInput.files[2]);

fetch("/api/upload/product", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
})
  .then((response) => response.json())
  .then((data) => {
    console.log("Upload result:", data);
  });
```

### Lưu URL vào database

```javascript
const productData = {
  name: "Áo thun nam",
  image: uploadResult.mainImage[0].url,
  imageKey: uploadResult.mainImage[0].key,
  images: uploadResult.galleryImages.map((img) => img.url),
  imageKeys: uploadResult.galleryImages.map((img) => img.key),
  thumbnailImage: uploadResult.thumbnailImage[0].url,
  thumbnailImageKey: uploadResult.thumbnailImage[0].key,
};
```

## 9. Lưu ý bảo mật

- Tất cả endpoints upload đều yêu cầu authentication
- Chỉ admin và staff mới có quyền upload
- File size giới hạn 10MB
- Chỉ cho phép upload file ảnh (jpeg, png, gif, webp)
- Tối đa 10 file cùng lúc

## 10. Xử lý lỗi

- Lỗi file quá lớn: "File quá lớn! Kích thước tối đa là 10MB."
- Lỗi quá nhiều file: "Quá nhiều file! Tối đa 10 file cùng lúc."
- Lỗi file type: "Chỉ cho phép upload file ảnh!"
- Lỗi không có file: "Không có file được upload!"
