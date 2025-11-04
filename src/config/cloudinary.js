const cloudinary = require("cloudinary").v2;
const logger = require("./logger");

// Kiểm tra và validate cloud_name format
const validateCloudName = (cloudName) => {
  if (!cloudName) return false;
  // Cloudinary cloud_name chỉ chứa chữ cái, số, dấu gạch ngang và dấu gạch dưới
  // Không có khoảng trắng và ký tự đặc biệt khác
  const cloudNameRegex = /^[a-z0-9_-]+$/i;
  return cloudNameRegex.test(cloudName.trim());
};

// Kiểm tra cấu hình
const validateConfig = () => {
  const required = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];

  const missing = required.filter(
    (key) => !process.env[key] || process.env[key].trim() === ""
  );

  if (missing.length > 0) {
    logger.warn(
      `Cloudinary config thiếu các biến môi trường: ${missing.join(", ")}`
    );
    return false;
  }

  // Validate cloud_name format
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME.trim();
  if (!validateCloudName(cloudName)) {
    logger.error(
      `Cloudinary cloud_name không hợp lệ: "${cloudName}". Cloud name chỉ được chứa chữ cái, số, dấu gạch ngang (-) và dấu gạch dưới (_), không có khoảng trắng.`
    );
    return false;
  }

  return true;
};

// Lấy và trim các giá trị từ env
const getCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() || "";
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() || "";

  return {
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  };
};

// Cấu hình Cloudinary (chỉ config khi có đủ thông tin)
// Log sẽ được hiển thị trong server startup summary
const config = getCloudinaryConfig();
if (config.cloud_name && config.api_key && config.api_secret) {
  cloudinary.config(config);
} else {
  // Log warning sẽ được hiển thị trong server startup summary
}

// Cấu hình preset upload mặc định
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "mern-fashion";

// Folder organization
const FOLDERS = {
  products: "products",
  variants: "products/variants",
  thumbnails: "products/thumbnails",
  reviews: "reviews",
  users: "users",
};

// Transformations mặc định cho các loại ảnh
const TRANSFORMATIONS = {
  thumbnail: {
    width: 300,
    height: 300,
    crop: "fill",
    quality: "auto",
    format: "auto",
  },
  product: {
    width: 800,
    height: 800,
    crop: "limit",
    quality: "auto",
    format: "auto",
  },
  gallery: {
    width: 1200,
    height: 1200,
    crop: "limit",
    quality: "auto",
    format: "auto",
  },
  variant: {
    width: 600,
    height: 600,
    crop: "limit",
    quality: "auto",
    format: "auto",
  },
};

module.exports = {
  cloudinary,
  validateConfig,
  UPLOAD_PRESET,
  FOLDERS,
  TRANSFORMATIONS,
};
