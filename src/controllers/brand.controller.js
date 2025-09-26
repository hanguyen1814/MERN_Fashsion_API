const Brand = require("../models/brand.model");
const asyncHandler = require("../utils/asyncHandler");
const { ok, created, fail } = require("../utils/apiResponse");

class BrandController {
  /**
   * Lấy danh sách tất cả brands
   */
  static list = asyncHandler(async (req, res) => {
    const brands = await Brand.find().sort({ createdAt: -1 });

    return ok(res, brands);
  });

  /**
   * Tạo brand mới
   */
  static create = asyncHandler(async (req, res) => {
    const { name, slug, description, logo, status } = req.body;

    // Validation
    if (!name || !slug) {
      return fail(res, 400, "name & slug là bắt buộc");
    }

    const brand = await Brand.create({
      name,
      slug,
      description,
      logo,
      status,
    });

    return created(res, brand);
  });

  /**
   * Cập nhật brand
   */
  static update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const brand = await Brand.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!brand) {
      return fail(res, 404, "Không tìm thấy brand");
    }

    return ok(res, brand);
  });

  /**
   * Xóa brand
   */
  static remove = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const brand = await Brand.findByIdAndDelete(id);

    if (!brand) {
      return fail(res, 404, "Không tìm thấy brand");
    }

    return ok(res, { deleted: true });
  });
}

module.exports = BrandController;
