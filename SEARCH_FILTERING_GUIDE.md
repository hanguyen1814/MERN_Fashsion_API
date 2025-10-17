# Hướng dẫn Tìm kiếm và Lọc Sản phẩm

## Tổng quan

Hệ thống đã được nâng cấp với các tính năng tìm kiếm và lọc nâng cao, bao gồm:

- **Text Search**: Tìm kiếm theo tên, mô tả và tags
- **Faceted Search**: Lọc theo nhiều tiêu chí cùng lúc
- **Advanced Filtering**: Lọc theo giá, màu sắc, kích thước, thương hiệu, danh mục
- **Sorting**: Sắp xếp theo nhiều tiêu chí
- **Autocomplete**: Gợi ý tìm kiếm
- **Related Products**: Sản phẩm liên quan
- **Statistics**: Thống kê sản phẩm

## Database Indexes

### Text Search Index

```javascript
ProductSchema.index({ name: "text", description: "text", tags: "text" });
```

### Compound Indexes (Tối ưu hiệu suất)

```javascript
ProductSchema.index({ status: 1, createdAt: -1 });
ProductSchema.index({ brandId: 1, status: 1 });
ProductSchema.index({ categoryIds: 1, status: 1 });
ProductSchema.index({ "variants.price": 1, status: 1 });
ProductSchema.index({ "variants.color": 1, status: 1 });
ProductSchema.index({ "variants.size": 1, status: 1 });
ProductSchema.index({ ratingAvg: -1, status: 1 });
ProductSchema.index({ salesCount: -1, status: 1 });
```

### Single Field Indexes

```javascript
ProductSchema.index({ slug: 1 });
ProductSchema.index({ brandId: 1 });
ProductSchema.index({ categoryIds: 1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ updatedAt: -1 });
```

## API Endpoints

### 1. Danh sách sản phẩm với lọc cơ bản

```
GET /api/products
```

**Query Parameters:**

- `q` - Từ khóa tìm kiếm
- `brand` - ID thương hiệu (có thể là array)
- `category` - ID danh mục (có thể là array)
- `status` - Trạng thái sản phẩm (default: 'active')
- `min` - Giá tối thiểu
- `max` - Giá tối đa
- `color` - Màu sắc (có thể là array)
- `size` - Kích thước (có thể là array)
- `tags` - Tags (có thể là array)
- `rating` - Đánh giá tối thiểu
- `inStock` - Chỉ sản phẩm còn hàng (true/false)
- `sort` - Sắp xếp theo (createdAt, price, rating, sales, name)
- `order` - Thứ tự (asc, desc)
- `page` - Trang (default: 1)
- `limit` - Số lượng mỗi trang (default: 20)

**Ví dụ:**

```
GET /api/products?q=áo&brand=60f1b2b3c4d5e6f7a8b9c0d1&min=100000&max=500000&color=đỏ&size=M&sort=price&order=asc&page=1&limit=20
```

### 2. Tìm kiếm nâng cao với faceted search

```
GET /api/products/search
```

**Query Parameters:** (Tương tự như trên)

**Response:**

```json
{
  "success": true,
  "data": {
    "products": [...],
    "facets": {
      "brands": [...],
      "categories": [...],
      "colors": [...],
      "sizes": [...],
      "tags": [...],
      "priceRange": {
        "min": 100000,
        "max": 2000000
      },
      "avgRating": 4.5,
      "totalProducts": 150
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### 3. Gợi ý tìm kiếm (Autocomplete)

```
GET /api/products/suggest
```

**Query Parameters:**

- `q` - Từ khóa tìm kiếm (tối thiểu 2 ký tự)
- `limit` - Số lượng gợi ý (default: 10)

**Ví dụ:**

```
GET /api/products/suggest?q=áo&limit=5
```

### 4. Sản phẩm liên quan

```
GET /api/products/related
```

**Query Parameters:**

- `slug` - Slug sản phẩm
- `limit` - Số lượng sản phẩm liên quan (default: 8)

**Ví dụ:**

```
GET /api/products/related?slug=ao-thun-nam&limit=6
```

### 5. Thống kê sản phẩm

```
GET /api/products/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalProducts": 1000,
    "activeProducts": 850,
    "statusBreakdown": [
      {
        "_id": "active",
        "count": 850,
        "avgRating": 4.2,
        "totalSales": 15000
      },
      {
        "_id": "draft",
        "count": 100,
        "avgRating": 0,
        "totalSales": 0
      }
    ],
    "recentProducts": [...]
  }
}
```

## Tính năng nổi bật

### 1. Text Search với MongoDB

- Sử dụng MongoDB Text Index để tìm kiếm nhanh
- Hỗ trợ tìm kiếm theo tên, mô tả và tags
- Có thể sắp xếp theo độ liên quan (relevance)

### 2. Faceted Search

- Trả về các facet (nhãn lọc) để hiển thị trên UI
- Bao gồm: brands, categories, colors, sizes, tags, priceRange
- Giúp người dùng hiểu được phạm vi lọc

### 3. Advanced Filtering

- Hỗ trợ lọc theo nhiều tiêu chí cùng lúc
- Sử dụng `$elemMatch` cho variant filters
- Hỗ trợ array values cho multi-select filters

### 4. Performance Optimization

- Sử dụng compound indexes cho các query phổ biến
- Aggregation pipeline tối ưu
- Lean queries để giảm memory usage
- Parallel queries với Promise.all

### 5. Flexible Sorting

- Sắp xếp theo nhiều tiêu chí: createdAt, price, rating, sales, name
- Hỗ trợ cả ascending và descending
- Relevance sorting cho text search

## Cách sử dụng trong Frontend

### 1. Basic Product List

```javascript
const fetchProducts = async (filters) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/products?${params}`);
  return response.json();
};
```

### 2. Advanced Search với Facets

```javascript
const searchProducts = async (searchParams) => {
  const params = new URLSearchParams(searchParams);
  const response = await fetch(`/api/products/search?${params}`);
  return response.json();
};
```

### 3. Autocomplete

```javascript
const getSuggestions = async (query) => {
  if (query.length < 2) return [];
  const response = await fetch(`/api/products/suggest?q=${query}`);
  return response.json();
};
```

### 4. Related Products

```javascript
const getRelatedProducts = async (slug) => {
  const response = await fetch(`/api/products/related?slug=${slug}`);
  return response.json();
};
```

## Lưu ý quan trọng

1. **Index Performance**: Các index đã được tối ưu cho các query phổ biến
2. **Memory Usage**: Sử dụng `.lean()` để giảm memory usage
3. **Query Optimization**: Sử dụng aggregation pipeline cho complex queries
4. **Error Handling**: Tất cả endpoints đều có error handling
5. **Validation**: Input validation cho tất cả parameters
6. **Security**: Admin routes được bảo vệ bằng authentication middleware

## Monitoring và Debugging

### 1. Query Performance

```javascript
// Enable query logging trong development
mongoose.set("debug", true);
```

### 2. Index Usage

```javascript
// Kiểm tra index usage
db.products.explain("executionStats").find({ status: "active" });
```

### 3. Aggregation Pipeline Debug

```javascript
// Log aggregation pipeline
console.log("Aggregation Pipeline:", JSON.stringify(pipeline, null, 2));
```

Hệ thống tìm kiếm và lọc này được thiết kế để xử lý hàng nghìn sản phẩm một cách hiệu quả với response time tối ưu.


