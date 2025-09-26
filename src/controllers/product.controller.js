const Product = require("../models/product.model");
const asyncHandler = require("../utils/asyncHandler");
const { ok, created, fail } = require("../utils/apiResponse");

class ProductController {
  /**
   * Lấy danh sách sản phẩm với filter và pagination
   */
  static list = asyncHandler(async (req, res) => {
    const {
      q,
      brand,
      category,
      status,
      min,
      max,
      color,
      size,
      page = 1,
      limit = 20,
    } = req.query;

    // Xây dựng filter
    const filter = {};
    if (status) filter.status = status;
    if (brand) filter.brandId = brand;
    if (category) filter.categoryIds = category;
    if (q) filter.$text = { $search: q };
    if (color) filter["variants.color"] = color;
    if (size) filter["variants.size"] = size;
    if (min || max) filter["variants.price"] = {};
    if (min) filter["variants.price"].$gte = Number(min);
    if (max) filter["variants.price"].$lte = Number(max);

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Thực hiện query song song
    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    return ok(res, items, {
      page: Number(page),
      limit: Number(limit),
      total,
    });
  });

  /**
   * Lấy chi tiết sản phẩm theo slug
   */
  static detail = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const product = await Product.findOne({ slug });

    if (!product) {
      return fail(res, 404, "Không tìm thấy sản phẩm");
    }

    return ok(res, product);
  });

  /**
   * Tạo sản phẩm mới (Admin only)
   */
  static create = asyncHandler(async (req, res) => {
    const { name, slug, variants } = req.body;

    // Validation
    if (!name || !slug || !Array.isArray(variants) || variants.length === 0) {
      return fail(res, 400, "Thiếu name/slug/variants");
    }

    const product = await Product.create(req.body);
    return created(res, product);
  });

  /**
   * Cập nhật sản phẩm (Admin only)
   */
  static update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!product) {
      return fail(res, 404, "Không tìm thấy sản phẩm");
    }

    return ok(res, product);
  });

  /**
   * Xóa sản phẩm (Admin only)
   */
  static remove = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return fail(res, 404, "Không tìm thấy sản phẩm");
    }

    return ok(res, { deleted: true });
  });
}

module.exports = ProductController;
