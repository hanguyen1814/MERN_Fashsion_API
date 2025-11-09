const Product = require("../models/product.model");
const Category = require("../models/category.model");
const Brand = require("../models/brand.model");
const Event = require("../models/event.model");
const asyncHandler = require("../utils/asyncHandler");
const { ok, created, fail } = require("../utils/apiResponse");
const logger = require("../config/logger");

// Helpers để chuẩn hóa dữ liệu response theo yêu cầu
const mapVariant = (v) => {
  const price = Number(v?.price || 0);
  const originPrice = Number(v?.compareAtPrice || 0) || undefined;
  // Tính discount theo phần trăm
  const discount =
    originPrice && originPrice > price
      ? Math.round(((originPrice - price) / originPrice) * 100)
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
  // Tính discount theo phần trăm
  const discount =
    Number.isFinite(minOrigin) && minOrigin > minPrice
      ? Math.round(((minOrigin - minPrice) / minOrigin) * 100)
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

// Map product cho search results - trả về cả thông tin variants
const mapProductSearchResult = (p) => {
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
  // Tính discount theo phần trăm
  const discount =
    Number.isFinite(minOrigin) && minOrigin > minPrice
      ? Math.round(((minOrigin - minPrice) / minOrigin) * 100)
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

    // Variant filters - sử dụng $elemMatch để đảm bảo tất cả điều kiện áp dụng cho cùng một variant
    const variantFilters = {};

    // Xử lý color filter - hỗ trợ cả mảng và string (comma-separated)
    if (color) {
      if (Array.isArray(color)) {
        const colorArray = color.filter((c) => c && c.trim() !== "");
        if (colorArray.length > 0) {
          variantFilters.color = { $in: colorArray };
        }
      } else if (typeof color === "string" && color.trim() !== "") {
        // Hỗ trợ comma-separated values
        const colorArray = color
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c !== "");
        if (colorArray.length > 0) {
          variantFilters.color =
            colorArray.length === 1 ? colorArray[0] : { $in: colorArray };
        }
      }
    }

    // Xử lý size filter - hỗ trợ cả mảng và string (comma-separated)
    if (size) {
      if (Array.isArray(size)) {
        const sizeArray = size.filter((s) => s && s.trim() !== "");
        if (sizeArray.length > 0) {
          variantFilters.size = { $in: sizeArray };
        }
      } else if (typeof size === "string" && size.trim() !== "") {
        // Hỗ trợ comma-separated values
        const sizeArray = size
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s !== "");
        if (sizeArray.length > 0) {
          variantFilters.size =
            sizeArray.length === 1 ? sizeArray[0] : { $in: sizeArray };
        }
      }
    }

    // Xử lý price filter
    if (min !== undefined && min !== null && min !== "") {
      const minPrice = Number(min);
      if (!isNaN(minPrice) && minPrice >= 0) {
        if (!variantFilters.price) variantFilters.price = {};
        variantFilters.price.$gte = minPrice;
      }
    }
    if (max !== undefined && max !== null && max !== "") {
      const maxPrice = Number(max);
      if (!isNaN(maxPrice) && maxPrice >= 0) {
        if (!variantFilters.price) variantFilters.price = {};
        variantFilters.price.$lte = maxPrice;
      }
    }

    // Xử lý stock filter
    if (inStock === "true" || inStock === true) {
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

    const data = items.map(mapProductSearchResult);
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
   * Hỗ trợ: q (tên), brand, category, min/max price, color, size, inStock, sort cơ bản
   */
  static simpleSearch = asyncHandler(async (req, res) => {
    const {
      q,
      brand,
      category,
      min,
      max,
      color,
      size,
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

    // Variant filters - sử dụng $elemMatch để đảm bảo tất cả điều kiện áp dụng cho cùng một variant
    const variantFilters = {};

    // Xử lý color filter - hỗ trợ cả mảng và string (comma-separated)
    if (color) {
      if (Array.isArray(color)) {
        const colorArray = color.filter((c) => c && c.trim() !== "");
        if (colorArray.length > 0) {
          variantFilters.color = { $in: colorArray };
        }
      } else if (typeof color === "string" && color.trim() !== "") {
        // Hỗ trợ comma-separated values
        const colorArray = color
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c !== "");
        if (colorArray.length > 0) {
          variantFilters.color =
            colorArray.length === 1 ? colorArray[0] : { $in: colorArray };
        }
      }
    }

    // Xử lý size filter - hỗ trợ cả mảng và string (comma-separated)
    if (size) {
      if (Array.isArray(size)) {
        const sizeArray = size.filter((s) => s && s.trim() !== "");
        if (sizeArray.length > 0) {
          variantFilters.size = { $in: sizeArray };
        }
      } else if (typeof size === "string" && size.trim() !== "") {
        // Hỗ trợ comma-separated values
        const sizeArray = size
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s !== "");
        if (sizeArray.length > 0) {
          variantFilters.size =
            sizeArray.length === 1 ? sizeArray[0] : { $in: sizeArray };
        }
      }
    }

    // Xử lý price filter
    if (min !== undefined && min !== null && min !== "") {
      const minPrice = Number(min);
      if (!isNaN(minPrice) && minPrice >= 0) {
        if (!variantFilters.price) variantFilters.price = {};
        variantFilters.price.$gte = minPrice;
      }
    }
    if (max !== undefined && max !== null && max !== "") {
      const maxPrice = Number(max);
      if (!isNaN(maxPrice) && maxPrice >= 0) {
        if (!variantFilters.price) variantFilters.price = {};
        variantFilters.price.$lte = maxPrice;
      }
    }

    // Xử lý stock filter
    if (inStock === "true" || inStock === true) {
      variantFilters.stock = { $gt: 0 };
    }

    if (Object.keys(variantFilters).length > 0) {
      filter["variants"] = { $elemMatch: variantFilters };
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

    const data = items.map(mapProductSearchResult);
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

    // Variant filters - sử dụng $elemMatch để đảm bảo tất cả điều kiện áp dụng cho cùng một variant
    const variantFilters = {};

    // Xử lý color filter - hỗ trợ cả mảng và string (comma-separated)
    if (color) {
      if (Array.isArray(color)) {
        const colorArray = color.filter((c) => c && c.trim() !== "");
        if (colorArray.length > 0) {
          variantFilters.color = { $in: colorArray };
        }
      } else if (typeof color === "string" && color.trim() !== "") {
        // Hỗ trợ comma-separated values
        const colorArray = color
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c !== "");
        if (colorArray.length > 0) {
          variantFilters.color =
            colorArray.length === 1 ? colorArray[0] : { $in: colorArray };
        }
      }
    }

    // Xử lý size filter - hỗ trợ cả mảng và string (comma-separated)
    if (size) {
      if (Array.isArray(size)) {
        const sizeArray = size.filter((s) => s && s.trim() !== "");
        if (sizeArray.length > 0) {
          variantFilters.size = { $in: sizeArray };
        }
      } else if (typeof size === "string" && size.trim() !== "") {
        // Hỗ trợ comma-separated values
        const sizeArray = size
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s !== "");
        if (sizeArray.length > 0) {
          variantFilters.size =
            sizeArray.length === 1 ? sizeArray[0] : { $in: sizeArray };
        }
      }
    }

    // Xử lý price filter
    if (min !== undefined && min !== null && min !== "") {
      const minPrice = Number(min);
      if (!isNaN(minPrice) && minPrice >= 0) {
        if (!variantFilters.price) variantFilters.price = {};
        variantFilters.price.$gte = minPrice;
      }
    }
    if (max !== undefined && max !== null && max !== "") {
      const maxPrice = Number(max);
      if (!isNaN(maxPrice) && maxPrice >= 0) {
        if (!variantFilters.price) variantFilters.price = {};
        variantFilters.price.$lte = maxPrice;
      }
    }

    // Xử lý stock filter
    if (inStock === "true" || inStock === true) {
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

    const data = products.map(mapProductSearchResult);
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

    const data = relatedProducts.map(mapProductSearchResult);
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
      min = "min",
      max = "max",
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

    // Hoàn thành lọc theo khoảng giá
    // Nếu chỉ có min hoặc max, cũng lọc đúng (ví dụ min=100000, max="max" sẽ phân dải min, hoặc ngược lại)
    if (min !== "min" || max !== "max") {
      const priceCondition = {};
      if (min !== "min") {
        priceCondition.$gte = Number(min);
      }
      if (max !== "max") {
        priceCondition.$lte = Number(max);
      }
      filter.variants = {
        $elemMatch: {
          price: priceCondition,
        },
      };
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
      products: items.map(mapProductSearchResult),
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
      products: items.map(mapProductSearchResult),
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
   * Đề xuất sản phẩm dựa vào lịch sử hành vi người dùng
   */
  static recommendations = asyncHandler(async (req, res) => {
    const { limit = 12, type = "mixed" } = req.query;
    const userId = req.user._id;

    try {
      // Lấy lịch sử hành vi của người dùng trong 30 ngày gần nhất
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const userEvents = await Event.find({
        userId,
        at: { $gte: thirtyDaysAgo },
        type: { $in: ["view", "add_to_cart", "purchase"] },
      })
        .populate("productId")
        .sort({ at: -1 })
        .limit(100)
        .lean();

      if (userEvents.length === 0) {
        // Nếu không có lịch sử, trả về sản phẩm phổ biến
        const popularProducts = await Product.find({ status: "active" })
          .sort({ salesCount: -1, ratingAvg: -1 })
          .limit(Number(limit))
          .populate("brandId", "name logo")
          .populate("categoryIds", "name slug")
          .lean();

        const data = popularProducts.map(mapProductSearchResult);
        return res.json({
          status: true,
          data,
          message: "Đề xuất dựa trên sản phẩm phổ biến",
          type: "popular",
        });
      }

      // Phân tích hành vi để tìm sở thích
      const userPreferences = analyzeUserBehavior(userEvents);

      let recommendedProducts = [];

      switch (type) {
        case "category":
          recommendedProducts = await getCategoryBasedRecommendations(
            userPreferences,
            userId,
            limit
          );
          break;
        case "brand":
          recommendedProducts = await getBrandBasedRecommendations(
            userPreferences,
            userId,
            limit
          );
          break;
        case "similar":
          recommendedProducts = await getSimilarProductRecommendations(
            userPreferences,
            userId,
            limit
          );
          break;
        default:
          // Mixed recommendations - kết hợp nhiều phương pháp
          recommendedProducts = await getMixedRecommendations(
            userPreferences,
            userId,
            limit
          );
      }

      const data = recommendedProducts.map(mapProductSearchResult);

      return res.json({
        status: true,
        data,
        message: `Đề xuất dựa trên ${
          type === "mixed" ? "hành vi tổng hợp" : type
        }`,
        type,
        preferences: {
          topCategories: userPreferences.topCategories.slice(0, 3),
          topBrands: userPreferences.topBrands.slice(0, 3),
          totalEvents: userEvents.length,
        },
      });
    } catch (error) {
      logger.error("Recommendation error:", error);

      // Fallback: trả về sản phẩm phổ biến
      const fallbackProducts = await Product.find({ status: "active" })
        .sort({ salesCount: -1, ratingAvg: -1 })
        .limit(Number(limit))
        .populate("brandId", "name logo")
        .populate("categoryIds", "name slug")
        .lean();

      const data = fallbackProducts.map(mapProductSearchResult);
      return res.json({
        status: true,
        data,
        message: "Đề xuất dựa trên sản phẩm phổ biến",
        type: "fallback",
      });
    }
  });
}

// Helper functions for recommendation logic
function analyzeUserBehavior(events) {
  const categoryCount = {};
  const brandCount = {};
  const productCount = {};
  const eventWeights = { purchase: 3, add_to_cart: 2, view: 1 };

  events.forEach((event) => {
    if (!event.productId) return;

    const product = event.productId;
    const weight = eventWeights[event.type] || 1;

    // Đếm categories
    if (product.categoryIds) {
      product.categoryIds.forEach((catId) => {
        categoryCount[catId] = (categoryCount[catId] || 0) + weight;
      });
    }

    // Đếm brands
    if (product.brandId) {
      brandCount[product.brandId] = (brandCount[product.brandId] || 0) + weight;
    }

    // Đếm products
    productCount[product._id] = (productCount[product._id] || 0) + weight;
  });

  return {
    topCategories: Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => id),
    topBrands: Object.entries(brandCount)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => id),
    topProducts: Object.entries(productCount)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => id),
  };
}

async function getCategoryBasedRecommendations(preferences, userId, limit) {
  if (preferences.topCategories.length === 0) return [];

  const excludeProducts = await Event.distinct("productId", {
    userId,
    productId: { $exists: true },
  });

  return Product.find({
    status: "active",
    categoryIds: { $in: preferences.topCategories },
    _id: { $nin: excludeProducts },
  })
    .sort({ ratingAvg: -1, salesCount: -1 })
    .limit(Number(limit))
    .populate("brandId", "name logo")
    .populate("categoryIds", "name slug")
    .lean();
}

async function getBrandBasedRecommendations(preferences, userId, limit) {
  if (preferences.topBrands.length === 0) return [];

  const excludeProducts = await Event.distinct("productId", {
    userId,
    productId: { $exists: true },
  });

  return Product.find({
    status: "active",
    brandId: { $in: preferences.topBrands },
    _id: { $nin: excludeProducts },
  })
    .sort({ ratingAvg: -1, salesCount: -1 })
    .limit(Number(limit))
    .populate("brandId", "name logo")
    .populate("categoryIds", "name slug")
    .lean();
}

async function getSimilarProductRecommendations(preferences, userId, limit) {
  if (preferences.topProducts.length === 0) return [];

  // Lấy thông tin sản phẩm đã tương tác
  const interactedProducts = await Product.find({
    _id: { $in: preferences.topProducts.slice(0, 5) },
    status: "active",
  })
    .populate("categoryIds")
    .populate("brandId")
    .lean();

  if (interactedProducts.length === 0) return [];

  // Tìm sản phẩm tương tự dựa trên categories và brands
  const similarCategories = [
    ...new Set(
      interactedProducts.flatMap((p) => p.categoryIds?.map((c) => c._id) || [])
    ),
  ];
  const similarBrands = [
    ...new Set(interactedProducts.map((p) => p.brandId?._id).filter(Boolean)),
  ];

  const excludeProducts = await Event.distinct("productId", {
    userId,
    productId: { $exists: true },
  });

  return Product.find({
    status: "active",
    _id: { $nin: excludeProducts },
    $or: [
      { categoryIds: { $in: similarCategories } },
      { brandId: { $in: similarBrands } },
    ],
  })
    .sort({ ratingAvg: -1, salesCount: -1 })
    .limit(Number(limit))
    .populate("brandId", "name logo")
    .populate("categoryIds", "name slug")
    .lean();
}

async function getMixedRecommendations(preferences, userId, limit) {
  const limitPerType = Math.ceil(Number(limit) / 3);
  const excludeProducts = await Event.distinct("productId", {
    userId,
    productId: { $exists: true },
  });

  const [categoryBased, brandBased, similarBased] = await Promise.all([
    preferences.topCategories.length > 0
      ? Product.find({
          status: "active",
          categoryIds: { $in: preferences.topCategories },
          _id: { $nin: excludeProducts },
        })
          .sort({ ratingAvg: -1, salesCount: -1 })
          .limit(limitPerType)
          .populate("brandId", "name logo")
          .populate("categoryIds", "name slug")
          .lean()
      : [],

    preferences.topBrands.length > 0
      ? Product.find({
          status: "active",
          brandId: { $in: preferences.topBrands },
          _id: { $nin: excludeProducts },
        })
          .sort({ ratingAvg: -1, salesCount: -1 })
          .limit(limitPerType)
          .populate("brandId", "name logo")
          .populate("categoryIds", "name slug")
          .lean()
      : [],

    getSimilarProductRecommendations(preferences, userId, limitPerType),
  ]);

  // Kết hợp và loại bỏ trùng lặp
  const allProducts = [...categoryBased, ...brandBased, ...similarBased];
  const uniqueProducts = allProducts.filter(
    (product, index, self) =>
      index ===
      self.findIndex((p) => p._id.toString() === product._id.toString())
  );

  return uniqueProducts.slice(0, Number(limit));
}

module.exports = ProductController;
