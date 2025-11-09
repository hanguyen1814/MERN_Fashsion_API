const { body, param, query, validationResult } = require("express-validator");
const { fail } = require("../utils/apiResponse");

// Middleware để xử lý kết quả validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }));
    return fail(res, 400, "Dữ liệu đầu vào không hợp lệ", errorMessages);
  }
  next();
};

// Validation rules cho Authentication
const authValidation = {
  register: [
    body("fullName")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Họ tên phải từ 2-50 ký tự"),
    body("email").isEmail().normalizeEmail().withMessage("Email không hợp lệ"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Mật khẩu phải ít nhất 8 ký tự")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage("Mật khẩu phải có ít nhất 1 chữ thường, 1 chữ hoa và 1 số"),
    body("phone")
      .optional()
      .matches(/^0\d{9}$/)
      .withMessage("Số điện thoại không hợp lệ"),
    handleValidationErrors,
  ],

  login: [
    body("email").isEmail().normalizeEmail().withMessage("Email không hợp lệ"),
    body("password")
      .exists()
      .withMessage("Mật khẩu không được để trống")
      .bail()
      .isString()
      .withMessage("Mật khẩu không hợp lệ"),
    handleValidationErrors,
  ],

  refreshToken: [
    body("refreshToken")
      .notEmpty()
      .withMessage("Refresh token không được để trống"),
    handleValidationErrors,
  ],
};

// Validation rules cho User
const userValidation = {
  updateProfile: [
    body("fullName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Họ tên phải từ 2-50 ký tự"),
    body("phone")
      .optional()
      .matches(/^0\d{9}$/)
      .withMessage("Số điện thoại không hợp lệ"),
    handleValidationErrors,
  ],

  changeStatus: [
    body("status")
      .isIn(["active", "inactive", "banned"])
      .withMessage("Trạng thái không hợp lệ"),
    handleValidationErrors,
  ],

  userId: [
    param("id").isMongoId().withMessage("ID người dùng không hợp lệ"),
    handleValidationErrors,
  ],
};

// Validation rules cho Product
const productValidation = {
  create: [
    body("name")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Tên sản phẩm phải từ 2-100 ký tự"),
    body("description")
      .trim()
      .isLength({ max: 2000 })
      .withMessage("Mô tả không được quá 2000 ký tự"),
    body("price").isFloat({ min: 0 }).withMessage("Giá phải là số dương"),
    body("stock")
      .isInt({ min: 0 })
      .withMessage("Số lượng tồn kho phải là số nguyên dương"),
    body("categoryId").isMongoId().withMessage("ID danh mục không hợp lệ"),
    body("brandId").isMongoId().withMessage("ID thương hiệu không hợp lệ"),
    handleValidationErrors,
  ],

  update: [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Tên sản phẩm phải từ 2-100 ký tự"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage("Mô tả không được quá 2000 ký tự"),
    body("price")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Giá phải là số dương"),
    body("stock")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Số lượng tồn kho phải là số nguyên dương"),
    handleValidationErrors,
  ],

  productId: [
    param("id").isMongoId().withMessage("ID sản phẩm không hợp lệ"),
    handleValidationErrors,
  ],
};

// Validation rules cho Category
const categoryValidation = {
  create: [
    body("name")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Tên danh mục phải từ 2-50 ký tự"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Mô tả không được quá 500 ký tự"),
    handleValidationErrors,
  ],

  categoryId: [
    param("id").isMongoId().withMessage("ID danh mục không hợp lệ"),
    handleValidationErrors,
  ],
};

// Validation rules cho Brand
const brandValidation = {
  create: [
    body("name")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Tên thương hiệu phải từ 2-50 ký tự"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Mô tả không được quá 500 ký tự"),
    handleValidationErrors,
  ],

  brandId: [
    param("id").isMongoId().withMessage("ID thương hiệu không hợp lệ"),
    handleValidationErrors,
  ],
};

// Validation rules cho Order
const orderValidation = {
  create: [
    body("items")
      .isArray({ min: 1 })
      .withMessage("Đơn hàng phải có ít nhất 1 sản phẩm"),
    body("items.*.productId")
      .isMongoId()
      .withMessage("ID sản phẩm không hợp lệ"),
    body("items.*.quantity")
      .isInt({ min: 1 })
      .withMessage("Số lượng phải là số nguyên dương"),
    body("shippingAddress")
      .isObject()
      .withMessage("Địa chỉ giao hàng không hợp lệ"),
    body("shippingAddress.fullName")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Tên người nhận phải từ 2-50 ký tự"),
    body("shippingAddress.phone")
      .matches(/^0\d{9}$/)
      .withMessage("Số điện thoại không hợp lệ"),
    body("shippingAddress.street")
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage("Địa chỉ đường phải từ 5-200 ký tự"),
    handleValidationErrors,
  ],

  orderId: [
    param("id").isMongoId().withMessage("ID đơn hàng không hợp lệ"),
    handleValidationErrors,
  ],
};

// Validation rules cho Review
const reviewValidation = {
  productIdParam: [
    param("productId").isMongoId().withMessage("ID sản phẩm không hợp lệ"),
    handleValidationErrors,
  ],
  reviewIdParam: [
    param("id").isMongoId().withMessage("ID đánh giá không hợp lệ"),
    handleValidationErrors,
  ],
  create: [
    body("productId").isMongoId().withMessage("ID sản phẩm không hợp lệ"),
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Đánh giá phải từ 1-5 sao"),
    body("content")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Nội dung không được quá 1000 ký tự"),
    body("images").optional().isArray({ max: 5 }).withMessage("Tối đa 5 ảnh"),
    body("images.*")
      .optional()
      .isURL()
      .withMessage("Đường dẫn ảnh không hợp lệ"),
    handleValidationErrors,
  ],
  update: [
    body("rating")
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage("Đánh giá phải từ 1-5 sao"),
    body("content")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Nội dung không được quá 1000 ký tự"),
    body("images").optional().isArray({ max: 5 }).withMessage("Tối đa 5 ảnh"),
    body("images.*")
      .optional()
      .isURL()
      .withMessage("Đường dẫn ảnh không hợp lệ"),
    handleValidationErrors,
  ],
};

// Validation rules cho pagination và search
const paginationValidation = {
  query: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Trang phải là số nguyên dương"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Giới hạn phải từ 1-100"),
    query("sort")
      .optional()
      .isIn([
        "createdAt",
        "-createdAt",
        "rating",
        "-rating",
        "isVerifiedPurchase",
        "-isVerifiedPurchase",
        "discount",
      ])
      .withMessage("Sắp xếp không hợp lệ"),
    handleValidationErrors,
  ],
};

module.exports = {
  authValidation,
  userValidation,
  productValidation,
  categoryValidation,
  brandValidation,
  orderValidation,
  reviewValidation,
  paginationValidation,
};
