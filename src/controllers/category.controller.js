const Category = require("../models/category.model");
const asyncHandler = require("../utils/asyncHandler");
const { ok, created, fail } = require("../utils/apiResponse");

class CategoryController {
  /**
   * Lấy danh sách tất cả categories
   */
  static list = asyncHandler(async (req, res) => {
    const categories = await Category.find().sort({ createdAt: -1 });

    return ok(res, categories);
  });

  /**
   * Tạo category mới
   */
  static create = asyncHandler(async (req, res) => {
    const { name, slug } = req.body;

    // Validation
    if (!name || !slug) {
      return fail(res, 400, "name & slug là bắt buộc");
    }

    const category = await Category.create(req.body);
    return created(res, category);
  });

  /**
   * Cập nhật category
   */
  static update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const category = await Category.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!category) {
      return fail(res, 404, "Không tìm thấy category");
    }

    return ok(res, category);
  });

  /**
   * Xóa category
   */
  static remove = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return fail(res, 404, "Không tìm thấy category");
    }

    return ok(res, { deleted: true });
  });
}

module.exports = CategoryController;
