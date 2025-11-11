const Wishlist = require("../models/wishlist.model");
const Product = require("../models/product.model");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");

// Helper để format variant
const mapVariant = (v) => {
  const price = Number(v?.price || 0);
  const originPrice = Number(v?.compareAtPrice || 0) || undefined;
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

// Helper để format product với đầy đủ thông tin
const mapProductFull = (p) => {
  if (!p) return null;

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
      ? Math.round(((minOrigin - minPrice) / minOrigin) * 100)
      : 0;

  return {
    product_id: String(p?._id || ""),
    name: p?.name || "",
    slug: p?.slug || "",
    description: p?.description || "",
    price: minPrice,
    origin_price: minOrigin,
    discount,
    stock: stockTotal,
    image: p?.image || p?.variants?.[0]?.image || null,
    images: p?.images || [],
    thumbnailImage: p?.thumbnailImage || null,
    variants,
    brand: p?.brandId
      ? {
          id: String(p.brandId._id),
          name: p.brandId.name,
          logo: p.brandId.logo || null,
        }
      : null,
    categories: Array.isArray(p?.categoryIds)
      ? p.categoryIds.map((c) => ({
          id: String(c._id),
          name: c.name,
          slug: c.slug,
        }))
      : [],
    tags: p?.tags || [],
    status: p?.status || "active",
    ratingAvg: Number(p?.ratingAvg || 0),
    ratingCount: Number(p?.ratingCount || 0),
    salesCount: Number(p?.salesCount || 0),
    createdAt: p?.createdAt || null,
    updatedAt: p?.updatedAt || null,
  };
};

class WishlistController {
  /**
   * Lấy danh sách wishlist của user hiện tại
   */
  static getMine = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Tìm hoặc tạo wishlist mới
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({
        userId,
        productIds: [],
      });
    }

    // Populate products với đầy đủ thông tin
    await wishlist.populate({
      path: "productIds",
      select: "-__v",
      populate: [
        { path: "brandId", select: "name logo" },
        { path: "categoryIds", select: "name slug" },
      ],
    });

    // Format products
    const products = Array.isArray(wishlist.productIds)
      ? wishlist.productIds
          .filter((p) => p !== null) // Loại bỏ products đã bị xóa
          .map(mapProductFull)
      : [];

    return ok(res, {
      userId: wishlist.userId,
      products,
      createdAt: wishlist.createdAt,
      updatedAt: wishlist.updatedAt,
    });
  });

  /**
   * Thêm/xóa sản phẩm khỏi wishlist
   */
  static toggle = asyncHandler(async (req, res) => {
    const { productId } = req.body;
    const userId = req.user.id;

    // Kiểm tra product có tồn tại không
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: false,
        message: "Sản phẩm không tồn tại",
      });
    }

    // Tìm hoặc tạo wishlist mới
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({
        userId,
        productIds: [],
      });
    }

    // Kiểm tra sản phẩm đã có trong wishlist chưa
    const existingIndex = wishlist.productIds.findIndex(
      (id) => id.toString() === productId
    );

    let isAdded = false;
    if (existingIndex >= 0) {
      // Xóa sản phẩm khỏi wishlist
      wishlist.productIds.splice(existingIndex, 1);
      isAdded = false;
    } else {
      // Thêm sản phẩm vào wishlist
      wishlist.productIds.push(productId);
      isAdded = true;
    }

    await wishlist.save();

    // Populate products với đầy đủ thông tin
    await wishlist.populate({
      path: "productIds",
      select: "-__v",
      populate: [
        { path: "brandId", select: "name logo" },
        { path: "categoryIds", select: "name slug" },
      ],
    });

    // Format products
    const products = Array.isArray(wishlist.productIds)
      ? wishlist.productIds
          .filter((p) => p !== null) // Loại bỏ products đã bị xóa
          .map(mapProductFull)
      : [];

    return ok(res, {
      userId: wishlist.userId,
      products,
      isAdded,
      createdAt: wishlist.createdAt,
      updatedAt: wishlist.updatedAt,
    });
  });

  /**
   * Xóa sản phẩm khỏi wishlist
   */
  static remove = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const userId = req.user.id;

    if (!productId) {
      return res.status(400).json({
        status: false,
        message: "Thiếu productId",
      });
    }

    // Tìm wishlist của user
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return ok(res, {
        userId,
        products: [],
        removed: false,
      });
    }

    const initialLength = wishlist.productIds.length;
    wishlist.productIds = wishlist.productIds.filter(
      (id) => id.toString() !== productId
    );

    const removed = wishlist.productIds.length < initialLength;

    if (removed) {
      await wishlist.save();
    }

    await wishlist.populate({
      path: "productIds",
      select: "-__v",
      populate: [
        { path: "brandId", select: "name logo" },
        { path: "categoryIds", select: "name slug" },
      ],
    });

    const products = Array.isArray(wishlist.productIds)
      ? wishlist.productIds.filter((p) => p !== null).map(mapProductFull)
      : [];

    return ok(res, {
      userId: wishlist.userId,
      products,
      removed,
      createdAt: wishlist.createdAt,
      updatedAt: wishlist.updatedAt,
    });
  });
}

module.exports = WishlistController;
