const multer = require("multer");
const path = require("path");

// Cấu hình multer để xử lý file upload (memory storage cho Cloudinary)
const storage = multer.memoryStorage();

// Filter để chỉ cho phép upload ảnh
const fileFilter = (req, file, cb) => {
  // Kiểm tra file type
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ cho phép upload file ảnh!"), false);
  }
};

// Cấu hình multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Giới hạn 10MB
    files: 10, // Tối đa 10 file cùng lúc
  },
});

// Cấu hình multer cho avatar (giới hạn nghiêm ngặt hơn)
const uploadAvatar = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Chỉ cho phép các định dạng ảnh phổ biến
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Chỉ cho phép upload file ảnh định dạng JPG, PNG hoặc WEBP!"),
        false
      );
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // Giới hạn 5MB cho avatar
    files: 1, // Chỉ 1 file
  },
});

// Middleware upload single file
const uploadSingle = (fieldName = "image") => {
  return upload.single(fieldName);
};

// Middleware upload multiple files
const uploadMultiple = (fieldName = "images", maxCount = 10) => {
  return upload.array(fieldName, maxCount);
};

// Middleware upload fields (nhiều field khác nhau)
const uploadFields = (fields) => {
  return upload.fields(fields);
};

// Middleware xử lý lỗi multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File quá lớn! Kích thước tối đa là 10MB.",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Quá nhiều file! Tối đa 10 file cùng lúc.",
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Field name không đúng!",
      });
    }
  }

  if (error.message === "Chỉ cho phép upload file ảnh!") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next(error);
};

// Utility function để validate file type
const validateImageType = (mimetype) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  return allowedTypes.includes(mimetype);
};

// Utility function để validate file size
const validateFileSize = (size, maxSizeMB = 10) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
};

// Middleware upload single file cho avatar
const uploadSingleAvatar = () => {
  return uploadAvatar.single("avatar");
};

// Utility function để validate file type nghiêm ngặt hơn
const validateStrictImageType = (mimetype) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  return allowedTypes.includes(mimetype);
};

// Utility function để sanitize filename
const sanitizeFilename = (filename) => {
  // Loại bỏ các ký tự đặc biệt, chỉ giữ chữ, số, dấu gạch ngang và dấu chấm
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 100); // Giới hạn độ dài
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  uploadAvatar,
  uploadSingleAvatar,
  handleMulterError,
  validateImageType,
  validateStrictImageType,
  validateFileSize,
  sanitizeFilename,
};
