# Hướng dẫn sử dụng hệ thống đề xuất sản phẩm

## Tổng quan

Hệ thống đề xuất sản phẩm dựa vào thói quen người dùng đã được tích hợp vào ứng dụng. Hệ thống này phân tích hành vi người dùng và đưa ra các gợi ý sản phẩm cá nhân hóa.

## Tính năng đã được bổ sung

### 1. Tracking hành vi người dùng

Hệ thống tự động ghi lại các hành vi sau:

- **Xem sản phẩm** (`view`): Khi người dùng xem chi tiết sản phẩm
- **Tìm kiếm** (`search`): Khi người dùng tìm kiếm sản phẩm
- **Thêm vào giỏ hàng** (`add_to_cart`): Khi người dùng thêm sản phẩm vào giỏ
- **Mua hàng** (`purchase`): Khi người dùng hoàn thành đơn hàng

### 2. API đề xuất sản phẩm

#### Endpoint chính

```http
GET /products/recommendations
```

#### Tham số

- `limit` (optional): Số lượng sản phẩm đề xuất (mặc định: 12)
- `type` (optional): Loại đề xuất (mặc định: "mixed")
  - `mixed`: Kết hợp nhiều phương pháp
  - `category`: Dựa trên danh mục yêu thích
  - `brand`: Dựa trên thương hiệu yêu thích
  - `similar`: Dựa trên sản phẩm tương tự

#### Ví dụ sử dụng

```bash
# Đề xuất cơ bản
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:3000/api/products/recommendations"

# Đề xuất theo danh mục
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:3000/api/products/recommendations?type=category&limit=8"

# Đề xuất theo thương hiệu
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:3000/api/products/recommendations?type=brand&limit=6"
```

#### Response format

```json
{
  "status": true,
  "data": [
    {
      "product_id": "64a1b2c3d4e5f6789012345",
      "name": "Áo thun nam cao cấp",
      "price": 299000,
      "origin_price": 399000,
      "discount": 100000,
      "stock": 50,
      "image": "https://example.com/image.jpg",
      "variants": [...]
    }
  ],
  "message": "Đề xuất dựa trên hành vi tổng hợp",
  "type": "mixed",
  "preferences": {
    "topCategories": ["64a1b2c3d4e5f6789012345"],
    "topBrands": ["64a1b2c3d4e5f6789012346"],
    "totalEvents": 25
  }
}
```

## Thuật toán đề xuất

### 1. Phân tích hành vi người dùng

Hệ thống phân tích lịch sử 30 ngày gần nhất với trọng số:

- **Mua hàng**: Trọng số 3
- **Thêm vào giỏ**: Trọng số 2
- **Xem sản phẩm**: Trọng số 1

### 2. Các phương pháp đề xuất

#### Category-based (Dựa trên danh mục)

- Phân tích danh mục sản phẩm người dùng quan tâm
- Đề xuất sản phẩm từ các danh mục đó
- Loại trừ sản phẩm đã tương tác

#### Brand-based (Dựa trên thương hiệu)

- Phân tích thương hiệu người dùng yêu thích
- Đề xuất sản phẩm từ các thương hiệu đó
- Loại trừ sản phẩm đã tương tác

#### Similar products (Sản phẩm tương tự)

- Phân tích sản phẩm đã tương tác
- Tìm sản phẩm có danh mục/thương hiệu tương tự
- Đề xuất sản phẩm chưa tương tác

#### Mixed (Kết hợp)

- Kết hợp cả 3 phương pháp trên
- Chia đều số lượng sản phẩm cho mỗi phương pháp
- Loại bỏ trùng lặp

### 3. Fallback mechanism

Khi không có đủ dữ liệu hành vi:

- Đề xuất sản phẩm phổ biến (bán chạy nhất)
- Sắp xếp theo rating và số lượng bán

## Tích hợp vào Frontend

### 1. Trang chủ - Đề xuất cá nhân hóa

```javascript
// Lấy đề xuất cho trang chủ
const getPersonalizedRecommendations = async () => {
  try {
    const response = await fetch("/api/products/recommendations?limit=12", {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return [];
  }
};
```

### 2. Trang sản phẩm - Sản phẩm liên quan

```javascript
// Đề xuất sản phẩm tương tự
const getSimilarProducts = async () => {
  try {
    const response = await fetch(
      "/api/products/recommendations?type=similar&limit=8",
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      }
    );
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching similar products:", error);
    return [];
  }
};
```

### 3. Trang danh mục - Đề xuất theo sở thích

```javascript
// Đề xuất theo danh mục yêu thích
const getCategoryRecommendations = async () => {
  try {
    const response = await fetch(
      "/api/products/recommendations?type=category&limit=6",
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      }
    );
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching category recommendations:", error);
    return [];
  }
};
```

## Monitoring và Analytics

### 1. Theo dõi hiệu suất

```javascript
// Log hiệu suất đề xuất
const logRecommendationPerformance = (recommendations, userPreferences) => {
  console.log("Recommendation Performance:", {
    totalRecommendations: recommendations.length,
    userPreferences: userPreferences,
    timestamp: new Date().toISOString(),
  });
};
```

### 2. A/B Testing

```javascript
// Test các loại đề xuất khác nhau
const testRecommendationTypes = async () => {
  const types = ["mixed", "category", "brand", "similar"];
  const results = {};

  for (const type of types) {
    const response = await fetch(
      `/api/products/recommendations?type=${type}&limit=6`
    );
    const data = await response.json();
    results[type] = data.data.length;
  }

  return results;
};
```

## Cấu hình và tối ưu

### 1. Điều chỉnh thời gian phân tích

Mặc định hệ thống phân tích 30 ngày gần nhất. Có thể điều chỉnh trong code:

```javascript
// Trong ProductController.recommendations
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); // Thay đổi số ngày
```

### 2. Điều chỉnh trọng số hành vi

```javascript
// Trong analyzeUserBehavior function
const eventWeights = {
  purchase: 3, // Mua hàng
  add_to_cart: 2, // Thêm vào giỏ
  view: 1, // Xem sản phẩm
};
```

### 3. Cache recommendations

```javascript
// Cache đề xuất để tăng hiệu suất
const cacheRecommendations = async (userId, recommendations) => {
  // Implement caching logic (Redis, Memory cache, etc.)
  const cacheKey = `recommendations:${userId}`;
  await cache.set(cacheKey, recommendations, 3600); // Cache 1 giờ
};
```

## Troubleshooting

### 1. Không có đề xuất

- Kiểm tra người dùng đã đăng nhập
- Kiểm tra có dữ liệu hành vi trong Event model
- Kiểm tra có sản phẩm active trong hệ thống

### 2. Đề xuất không chính xác

- Kiểm tra dữ liệu Event có đầy đủ không
- Điều chỉnh trọng số hành vi
- Kiểm tra logic phân tích sở thích

### 3. Hiệu suất chậm

- Thêm index cho Event model
- Implement caching
- Giới hạn số lượng Event phân tích

## Kết luận

Hệ thống đề xuất sản phẩm đã được tích hợp hoàn chỉnh với các tính năng:

✅ **Tracking hành vi tự động**  
✅ **API đề xuất linh hoạt**  
✅ **Thuật toán thông minh**  
✅ **Fallback mechanism**  
✅ **Tích hợp dễ dàng**

Hệ thống sẽ cải thiện trải nghiệm người dùng và tăng tỷ lệ chuyển đổi thông qua việc đề xuất sản phẩm phù hợp với sở thích cá nhân.
