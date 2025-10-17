const Product = require("../models/product.model");
const Category = require("../models/category.model");
const Brand = require("../models/brand.model");
const asyncHandler = require("../utils/asyncHandler");
const { ok, created, fail } = require("../utils/apiResponse");

// Helpers để chuẩn hóa dữ liệu response theo yêu cầu
const mapVariant = (v) => {
  const price = Number(v?.price || 0);
  const originPrice = Number(v?.compareAtPrice || 0) || undefined;
  const discount =
    originPrice && originPrice > price
      ? originPrice - price
      : Number(v?.discount || 0) || 0;
  return {
    sku: v?.sku || null,
    color_name: v?.color || null,
    size_name: v?.size || null,
    price,
    origin_price: originPrice || undefined,
    discount,
    stock: Number(v?.stock || 0),
    image: v?.image || null,
  };
};

const mapProductSummary = (p) => {
  const variants = Array.isArray(p?.variants) ? p.variants.map(mapVariant) : [];
  const priceList = variants
    .map((v) => v.price)
    .filter((n) => Number.isFinite(n));
  const originList = variants
    .map((v) => v.origin_price)
    .filter((n) => Number.isFinite(Number(n)));
  const stockTotal = variants.reduce((acc, v) => acc + (v.stock || 0), 0);
  const minPrice = priceList.length ? Math.min(...priceList) : 0;
  const minOrigin = originList.length ? Math.min(...originList) : undefined;
  const discount =
    Number.isFinite(minOrigin) && minOrigin > minPrice
      ? minOrigin - minPrice
      : 0;

  return {
    product_id: String(p?._id || ""),
    name: p?.name || "",
    price: minPrice,
    origin_price: minOrigin,
    discount,
    stock: stockTotal,
    image: p?.image || p?.variants?.[0]?.image || null,
    variants,
  };
};

const mapCategory = (c) =>
  c
    ? {
        id: String(c._id),
        name: c.name,
        slug: c.slug,
      }
    : null;

class ProductController {
  /**
   * Lấy danh sách sản phẩm với filter và pagination
   */
  static list = asyncHandler(async (req, res) => {
    const {
      q,
      brand,
      category,
      status = "active",
      min,
      max,
      color,
      size,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 20,
      tags,
      rating,
      inStock = false,
    } = req.query;

    // Xây dựng filter
    const filter = {};
    if (status !== "all") {
      filter.status = status;
    }

    // Text search
    if (q) {
      filter.$text = { $search: q };
    }

    // Brand filter
    if (brand) {
      filter.brandId = Array.isArray(brand) ? { $in: brand } : brand;
    }

    // Category filter
    if (category) {
      filter.categoryIds = Array.isArray(category)
        ? { $in: category }
        : category;
    }

    // Tags filter
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      filter.tags = { $in: tagArray };
    }

    // Rating filter
    if (rating) {
      filter.ratingAvg = { $gte: Number(rating) };
    }

    // Variant filters
    const variantFilters = {};
    if (color) {
      variantFilters.color = Array.isArray(color) ? { $in: color } : color;
    }
    if (size) {
      variantFilters.size = Array.isArray(size) ? { $in: size } : size;
    }
    if (min || max) {
      variantFilters.price = {};
      if (min) variantFilters.price.$gte = Number(min);
      if (max) variantFilters.price.$lte = Number(max);
    }
    if (inStock === "true") {
      variantFilters.stock = { $gt: 0 };
    }

    if (Object.keys(variantFilters).length > 0) {
      filter["variants"] = { $elemMatch: variantFilters };
    }

    // Sort options - luôn ưu tiên createdAt desc làm thứ tự chính
    const sortOptions = {};
    switch (sort) {
      case "price":
        sortOptions["variants.price"] = order === "asc" ? 1 : -1;
        sortOptions.createdAt = -1; // Thêm sắp xếp phụ theo thời gian tạo
        break;
      case "rating":
        sortOptions.ratingAvg = order === "asc" ? 1 : -1;
        sortOptions.createdAt = -1; // Thêm sắp xếp phụ theo thời gian tạo
        break;
      case "sales":
        sortOptions.salesCount = order === "asc" ? 1 : -1;
        sortOptions.createdAt = -1; // Thêm sắp xếp phụ theo thời gian tạo
        break;
      case "name":
        sortOptions.name = order === "asc" ? 1 : -1;
        sortOptions.createdAt = -1; // Thêm sắp xếp phụ theo thời gian tạo
        break;
      default:
        // Mặc định luôn sắp xếp theo thời gian tạo mới nhất
        sortOptions.createdAt = -1;
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Thực hiện query song song
    const [items, total] = await Promise.all([
      Product.find(filter)
        .populate("brandId", "name logo")
        .populate("categoryIds", "name slug")
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(filter),
    ]);

    const data = items.map(mapProductSummary);
    return res.json({
      status: true,
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  });

  /**
   * Tìm kiếm đơn giản: nhanh, dễ hiểu
   * Hỗ trợ: q (tên), brand, category, min/max price, inStock, sort cơ bản
   */
  static simpleSearch = asyncHandler(async (req, res) => {
    const {
      q,
      brand,
      category,
      min,
      max,
      inStock = false,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 20,
      status = "active",
    } = req.query;

    const filter = {};
    if (status !== "all") {
      filter.status = status || "active";
    }

    if (q) {
      filter.name = { $regex: q, $options: "i" };
    }

    if (brand) {
      filter.brandId = Array.isArray(brand) ? { $in: brand } : brand;
    }

    if (category) {
      filter.categoryIds = Array.isArray(category)
        ? { $in: category }
        : category;
    }

    if (min || max) {
      filter["variants.price"] = {};
      if (min) filter["variants.price"].$gte = Number(min);
      if (max) filter["variants.price"].$lte = Number(max);
    }

    if (inStock === "true") {
      filter["variants.stock"] = { $gt: 0 };
    }

    const sortOptions = {};
    if (sort === "price") {
      sortOptions["variants.price"] = order === "asc" ? 1 : -1;
      sortOptions.createdAt = -1; // Thêm sắp xếp phụ theo thời gian tạo
    } else if (sort === "rating") {
      sortOptions.ratingAvg = order === "asc" ? 1 : -1;
      sortOptions.createdAt = -1; // Thêm sắp xếp phụ theo thời gian tạo
    } else if (sort === "name") {
      sortOptions.name = order === "asc" ? 1 : -1;
      sortOptions.createdAt = -1; // Thêm sắp xếp phụ theo thời gian tạo
    } else {
      // Mặc định luôn sắp xếp theo thời gian tạo mới nhất
      sortOptions.createdAt = -1;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Product.find(filter)
        .select(
          "name slug image brandId categoryIds variants ratingAvg salesCount createdAt"
        )
        .populate("brandId", "name logo")
        .populate("categoryIds", "name slug")
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(filter),
    ]);

    const data = items.map(mapProductSummary);
    return res.json({
      status: true,
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
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

    const categories = await Category.find({
      _id: { $in: product.categoryIds },
    })
      .select("name slug")
      .lean();

    const data = {
      category: categories.map(mapCategory).filter(Boolean),
      product: mapProductSummary(product),
    };

    return res.json({ status: true, data });
  });

  static info = asyncHandler(async (req, res) => {
    console.log(req.params);
    const { id } = req.params;
    const product = await Product.findOne({ _id: id });

    if (!product) {
      return fail(res, 404, "Không tìm thấy sản phẩm");
    }

    const categories = await Category.find({
      _id: { $in: product.categoryIds },
    })
      .select("name slug")
      .lean();

    const data = {
      category: categories.map(mapCategory).filter(Boolean),
      product: mapProductSummary(product),
    };

    return res.json({ status: true, data });
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
    const mapped = mapProductSummary(product);
    return res.status(201).json({ status: true, ...mapped });
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

    const data = mapProductSummary(product);
    return res.json({ status: true, data });
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

    return res.json({ status: true, message: "Product deleted successfully" });
  });

  /**
   * Tìm kiếm nâng cao với faceted search
   */
  static search = asyncHandler(async (req, res) => {
    const {
      q,
      brand,
      category,
      min,
      max,
      color,
      size,
      tags,
      rating,
      inStock = false,
      page = 1,
      limit = 20,
      sort = "relevance",
      order = "desc",
      status = "active",
    } = req.query;

    // Build aggregation pipeline
    const pipeline = [];

    // Match stage
    const matchStage = {};
    if (status !== "all") {
      matchStage.status = status;
    }

    if (q) {
      matchStage.$text = { $search: q };
    }

    if (brand) {
      matchStage.brandId = Array.isArray(brand) ? { $in: brand } : brand;
    }

    if (category) {
      matchStage.categoryIds = Array.isArray(category)
        ? { $in: category }
        : category;
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      matchStage.tags = { $in: tagArray };
    }

    if (rating) {
      matchStage.ratingAvg = { $gte: Number(rating) };
    }

    // Variant filters
    const variantFilters = {};
    if (color) {
      variantFilters.color = Array.isArray(color) ? { $in: color } : color;
    }
    if (size) {
      variantFilters.size = Array.isArray(size) ? { $in: size } : size;
    }
    if (min || max) {
      variantFilters.price = {};
      if (min) variantFilters.price.$gte = Number(min);
      if (max) variantFilters.price.$lte = Number(max);
    }
    if (inStock === "true") {
      variantFilters.stock = { $gt: 0 };
    }

    if (Object.keys(variantFilters).length > 0) {
      matchStage["variants"] = { $elemMatch: variantFilters };
    }

    pipeline.push({ $match: matchStage });

    // Add text score for relevance sorting
    if (q) {
      pipeline.push({ $addFields: { score: { $meta: "textScore" } } });
    }

    // Sort stage - luôn ưu tiên createdAt desc làm thứ tự chính
    const sortStage = {};
    switch (sort) {
      case "relevance":
        if (q) {
          sortStage.score = { $meta: "textScore" };
          sortStage.createdAt = -1; // Thêm sắp xếp phụ theo thời gian tạo
        } else {
          sortStage.createdAt = -1;
        }
        break;
      case "price":
        sortStage["variants.price"] = order === "asc" ? 1 : -1;
        sortStage.createdAt = -1; // Thêm sắp xếp phụ theo thời gian tạo
        break;
      case "rating":
        sortStage.ratingAvg = order === "asc" ? 1 : -1;
        sortStage.createdAt = -1; // Thêm sắp xếp phụ theo thời gian tạo
        break;
      case "sales":
        sortStage.salesCount = order === "asc" ? 1 : -1;
        sortStage.createdAt = -1; // Thêm sắp xếp phụ theo thời gian tạo
        break;
      case "name":
        sortStage.name = order === "asc" ? 1 : -1;
        sortStage.createdAt = -1; // Thêm sắp xếp phụ theo thời gian tạo
        break;
      default:
        // Mặc định luôn sắp xếp theo thời gian tạo mới nhất
        sortStage.createdAt = -1;
    }
    pipeline.push({ $sort: sortStage });

    // Facet stage for filters
    pipeline.push({
      $facet: {
        products: [
          { $skip: (Number(page) - 1) * Number(limit) },
          { $limit: Number(limit) },
          {
            $lookup: {
              from: "brands",
              localField: "brandId",
              foreignField: "_id",
              as: "brand",
              pipeline: [{ $project: { name: 1, logo: 1 } }],
            },
          },
          {
            $lookup: {
              from: "categories",
              localField: "categoryIds",
              foreignField: "_id",
              as: "categories",
              pipeline: [{ $project: { name: 1, slug: 1 } }],
            },
          },
        ],
        facets: [
          {
            $group: {
              _id: null,
              brands: { $addToSet: "$brandId" },
              categories: { $addToSet: "$categoryIds" },
              colors: { $addToSet: "$variants.color" },
              sizes: { $addToSet: "$variants.size" },
              tags: { $addToSet: "$tags" },
              minPrice: { $min: "$variants.price" },
              maxPrice: { $max: "$variants.price" },
              avgRating: { $avg: "$ratingAvg" },
              totalProducts: { $sum: 1 },
            },
          },
        ],
      },
    });

    const result = await Product.aggregate(pipeline);
    const products = result[0]?.products || [];
    const facets = result[0]?.facets[0] || {};

    const data = products.map(mapProductSummary);
    return res.json({
      status: true,
      data,
      facets: {
        brands: facets.brands || [],
        categories: facets.categories || [],
        colors: facets.colors?.flat() || [],
        sizes: facets.sizes?.flat() || [],
        tags: facets.tags?.flat() || [],
        priceRange: {
          min: facets.minPrice || 0,
          max: facets.maxPrice || 0,
        },
        avgRating: facets.avgRating || 0,
        totalProducts: facets.totalProducts || 0,
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: facets.totalProducts || 0,
        totalPages: Math.ceil((facets.totalProducts || 0) / Number(limit)),
      },
    });
  });

  /**
   * Tìm kiếm gợi ý (autocomplete)
   */
  static suggest = asyncHandler(async (req, res) => {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return ok(res, []);
    }

    const suggestions = await Product.aggregate([
      {
        $match: {
          status: "active",
          $or: [
            { name: { $regex: q, $options: "i" } },
            { tags: { $regex: q, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          name: 1,
          slug: 1,
          image: 1,
          brandId: 1,
          categoryIds: 1,
        },
      },
      { $limit: Number(limit) },
    ]);

    return res.json({ status: true, data: suggestions });
  });

  /**
   * Lấy sản phẩm liên quan
   */
  static related = asyncHandler(async (req, res) => {
    const { slug, limit = 8 } = req.query;

    const product = await Product.findOne({ slug, status: "active" });
    if (!product) {
      return fail(res, 404, "Không tìm thấy sản phẩm");
    }

    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      status: "active",
      $or: [
        { categoryIds: { $in: product.categoryIds } },
        { brandId: product.brandId },
        { tags: { $in: product.tags } },
      ],
    })
      .populate("brandId", "name logo")
      .populate("categoryIds", "name slug")
      .sort({ ratingAvg: -1, salesCount: -1 })
      .limit(Number(limit))
      .lean();

    const data = relatedProducts.map(mapProductSummary);
    return res.json({ status: true, data });
  });

  /**
   * Lấy thống kê sản phẩm
   */
  static stats = asyncHandler(async (req, res) => {
    const stats = await Product.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          avgRating: { $avg: "$ratingAvg" },
          totalSales: { $sum: "$salesCount" },
        },
      },
    ]);

    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ status: "active" });

    const recentProducts = await Product.find({ status: "active" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name slug image createdAt")
      .lean();

    const data = {
      totalProducts,
      activeProducts,
      statusBreakdown: stats,
      recentProducts: recentProducts.map(mapProductSummary),
    };

    return res.json({ status: true, data });
  });

  /**
   * Lấy danh sách sản phẩm theo category slug
   */
  static getByCategorySlug = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const {
      status = "active",
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    // Tìm category theo slug
    const category = await Category.findOne({ slug, status: "active" });
    if (!category) {
      return fail(res, 404, "Không tìm thấy danh mục");
    }

    // Xây dựng filter
    const filter = {
      categoryIds: category._id,
    };

    if (status !== "all") {
      filter.status = status;
    }

    // Sort options
    const sortOptions = {};
    switch (sort) {
      case "rating":
        sortOptions.ratingAvg = order === "asc" ? 1 : -1;
        sortOptions.createdAt = -1;
        break;
      case "sales":
        sortOptions.salesCount = order === "asc" ? 1 : -1;
        sortOptions.createdAt = -1;
        break;
      case "name":
        sortOptions.name = order === "asc" ? 1 : -1;
        sortOptions.createdAt = -1;
        break;
      default:
        sortOptions.createdAt = -1;
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Thực hiện query song song
    const [items, total] = await Promise.all([
      Product.find(filter)
        .populate("brandId", "name logo slug")
        .populate("categoryIds", "name slug")
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(filter),
    ]);

    const data = {
      category: [mapCategory(category)].filter(Boolean),
      products: items.map(mapProductSummary),
    };

    return res.json({
      status: true,
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  });

  /**
   * Lấy danh sách sản phẩm theo brand slug
   */
  static getByBrandSlug = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const {
      status = "active",
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    // Tìm brand theo slug
    const brand = await Brand.findOne({ slug, status: "active" });
    if (!brand) {
      return fail(res, 404, "Không tìm thấy thương hiệu");
    }

    // Xây dựng filter
    const filter = {
      brandId: brand._id,
    };

    if (status !== "all") {
      filter.status = status;
    }

    // Sort options
    const sortOptions = {};
    switch (sort) {
      case "rating":
        sortOptions.ratingAvg = order === "asc" ? 1 : -1;
        sortOptions.createdAt = -1;
        break;
      case "sales":
        sortOptions.salesCount = order === "asc" ? 1 : -1;
        sortOptions.createdAt = -1;
        break;
      case "name":
        sortOptions.name = order === "asc" ? 1 : -1;
        sortOptions.createdAt = -1;
        break;
      default:
        sortOptions.createdAt = -1;
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Thực hiện query song song
    const [items, total] = await Promise.all([
      Product.find(filter)
        .populate("brandId", "name logo slug")
        .populate("categoryIds", "name slug")
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(filter),
    ]);

    const data = {
      brand: {
        id: String(brand._id),
        name: brand.name,
        slug: brand.slug,
        logo: brand.logo,
      },
      products: items.map(mapProductSummary),
    };

    return res.json({
      status: true,
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  });
}

module.exports = ProductController;
