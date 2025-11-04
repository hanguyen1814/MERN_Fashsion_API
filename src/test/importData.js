// Script import dữ liệu sản phẩm vào MongoDB từ file JSON lớn
const path = require("path");
const fs = require("fs");
const readline = require("readline");
const slugify = require("slugify");
const mongoose = require("mongoose");

const connectDB = require("../config/db");
const Product = require("../models/product.model");
const Brand = require("../models/brand.model");
const Category = require("../models/category.model");

// ENV: đặt MONGODB_URI trong .env hoặc truyền qua process.env
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://admin:Ahihi123@shoppingmaster.4g4hnjb.mongodb.net/mern_fashion";
const INPUT_PATH = path.resolve(__dirname, "./input.json");

function toSlug(input) {
  return slugify(String(input || "").trim(), { lower: true, strict: true });
}

function toNumberPrice(value) {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  if (Number.isFinite(num)) return num / 100000; // dữ liệu Shopee thường x100000
  // fallback: chuỗi số lớn dạng "12952900000"
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed / 100000 : 0;
}

async function ensureBrand(brandName) {
  const name = String(brandName || "").trim();
  if (!name) return null;
  const slug = toSlug(name);
  const brand = await Brand.findOneAndUpdate(
    { slug },
    { $setOnInsert: { name, slug } },
    { new: true, upsert: true }
  );
  return brand?._id || null;
}

async function findBrandByNameOrSlug(input) {
  if (!input) return null;

  // Kiểm tra nếu là ID (ObjectId - 24 ký tự hex)
  if (typeof input === "string" && /^[0-9a-fA-F]{24}$/.test(input)) {
    const brand = await Brand.findById(input);
    return brand?._id || null;
  }

  // Tìm theo slug hoặc name
  const slug = toSlug(input);
  const brand = await Brand.findOne({
    $or: [{ slug }, { name: { $regex: new RegExp(input, "i") } }],
  });
  return brand?._id || null;
}

async function findCategoryByNameOrSlug(input) {
  if (!input) return null;

  // Kiểm tra nếu là ID (ObjectId - 24 ký tự hex)
  if (typeof input === "string" && /^[0-9a-fA-F]{24}$/.test(input)) {
    const category = await Category.findById(input);
    return category?._id || null;
  }

  // Tìm theo slug hoặc name
  const slug = toSlug(input);
  const category = await Category.findOne({
    $or: [{ slug }, { name: { $regex: new RegExp(input, "i") } }],
  });
  return category?._id || null;
}

// Tạm thời map một catid (từ dữ liệu nguồn) sang Category theo slug cat-<id>
// Nếu chưa tồn tại thì bỏ qua (không bắt buộc)
async function mapCategoryIds(source) {
  const ids = [];
  const catid = source?.batch_item_for_item_card_full?.catid;
  if (!catid) return ids;
  const catSlug = `cat-${catid}`;
  const cat = await Category.findOne({ slug: catSlug });
  if (cat) ids.push(cat._id);
  return ids;
}

function buildVariants(source) {
  const item = source?.batch_item_for_item_card_full;
  if (!item) return [];

  const baseImage = item.image
    ? `https://cf.shopee.vn/file/${item.image}`
    : undefined;
  const baseImages = Array.isArray(item.images)
    ? item.images.map((im) => `https://cf.shopee.vn/file/${im}`)
    : [];

  const price = toNumberPrice(item.price_min ?? item.price ?? 0);
  const priceBefore = toNumberPrice(
    item.price_min_before_discount ?? item.price_before_discount ?? price
  );

  const tiers = Array.isArray(item.tier_variations) ? item.tier_variations : [];

  // Xác định tier màu (ưu tiên tên chứa "màu"/"color"), nếu không có thì lấy tier đầu
  let colorTierIndex = -1;
  for (let i = 0; i < tiers.length; i++) {
    const name = String(tiers[i]?.name || "").toLowerCase();
    if (
      name.includes("màu") ||
      name.includes("mau") ||
      name.includes("color")
    ) {
      colorTierIndex = i;
      break;
    }
  }
  if (colorTierIndex === -1 && tiers.length > 0) colorTierIndex = 0;

  // Xác định tier size là tier còn lại (nếu có)
  let sizeTierIndex = -1;
  for (let i = 0; i < tiers.length; i++) {
    if (i === colorTierIndex) continue;
    const name = String(tiers[i]?.name || "").toLowerCase();
    if (
      name.includes("size") ||
      name.includes("kích thước") ||
      name.includes("kich thuoc")
    ) {
      sizeTierIndex = i;
      break;
    }
  }
  if (sizeTierIndex === -1) {
    // nếu không rõ, lấy tier thứ 2 (nếu tồn tại) khác với colorTier
    for (let i = 0; i < tiers.length; i++) {
      if (i !== colorTierIndex) {
        sizeTierIndex = i;
        break;
      }
    }
  }

  const colorOptions =
    colorTierIndex !== -1 ? tiers[colorTierIndex]?.options || [] : [];
  const colorImageIds =
    colorTierIndex !== -1 ? tiers[colorTierIndex]?.images || [] : [];
  const sizeOptions =
    sizeTierIndex !== -1 ? tiers[sizeTierIndex]?.options || [] : [];

  // Map option màu -> ảnh theo đúng index trong dữ liệu gốc
  const colorToImageUrl = new Map();
  for (let i = 0; i < colorOptions.length; i++) {
    const opt = colorOptions[i];
    const imgId = colorImageIds?.[i];
    if (imgId) {
      colorToImageUrl.set(opt, `https://cf.shopee.vn/file/${imgId}`);
    }
  }

  // Nếu không có biến thể, tạo 1 variant mặc định
  if (colorOptions.length === 0 && sizeOptions.length === 0) {
    const singleImageList = baseImage
      ? [baseImage]
      : baseImages.length
      ? [baseImages[0]]
      : [];
    return [
      {
        sku: `${item.shopid}-${item.itemid}`,
        color: undefined,
        size: undefined,
        price,
        compareAtPrice: priceBefore > price ? priceBefore : undefined,
        discount: Math.max(
          0,
          Math.round(((priceBefore - price) / (priceBefore || 1)) * 100)
        ),
        stock: Number(item.stock || 0),
        image: singleImageList[0],
        images: singleImageList,
        attrs: {},
      },
    ];
  }

  const variants = [];
  const colorList = colorOptions.length ? colorOptions : [undefined];
  const sizeList = sizeOptions.length ? sizeOptions : [undefined];
  for (const c of colorList) {
    // Chọn ảnh theo màu nếu có, fallback baseImage
    const colorImg = c ? colorToImageUrl.get(c) : undefined;
    const variantImage = colorImg || baseImage;
    const variantImages = variantImage
      ? [variantImage]
      : baseImages.length
      ? [baseImages[0]]
      : baseImage
      ? [baseImage]
      : [];

    for (const s of sizeList) {
      const sku = `${item.shopid}-${item.itemid}-${toSlug(c || "na")}-${toSlug(
        s || "na"
      )}`;
      variants.push({
        sku,
        color: c,
        size: s,
        price,
        compareAtPrice: priceBefore > price ? priceBefore : undefined,
        discount: Math.max(
          0,
          Math.round(((priceBefore - price) / (priceBefore || 1)) * 100)
        ),
        stock: Number(item.stock || 0),
        image: variantImages[0],
        images: variantImages,
        attrs: {},
      });
    }
  }
  return variants;
}

function buildProductDoc(source, brandId, categoryIds) {
  const item = source?.batch_item_for_item_card_full;
  const name = item?.name || source?.name || "Unnamed";
  const slug = toSlug(
    `${name}-${item?.itemid || source?.item_id || Date.now()}`
  );
  const description = undefined; // nguồn không có mô tả dài rõ ràng trong mẫu này
  const variants = buildVariants(source);
  // Ưu tiên ảnh đại diện lấy theo ảnh màu đầu tiên nếu có
  const firstVariantImage = variants[0]?.image;
  const image = firstVariantImage
    ? firstVariantImage
    : item?.image
    ? `https://cf.shopee.vn/file/${item.image}`
    : undefined;

  const base = {
    name,
    slug,
    description,
    categoryIds,
    tags: [],
    image,
    variants,
    status: "active",
    ratingAvg: item?.item_rating?.rating_star || 0,
    ratingCount: Array.isArray(item?.item_rating?.rating_count)
      ? item.item_rating.rating_count.reduce((a, b) => a + b, 0)
      : 0,
    salesCount: Number(item?.historical_sold || 0),
  };
  if (brandId) base.brandId = brandId;
  return base;
}

// ============================================
// CẤU HÌNH IMPORT
// ============================================
// Đặt brand/category tùy chỉnh ở đây
// Có thể dùng: ID (24 ký tự hex), name, hoặc slug
// Để null hoặc "" nếu muốn tự động tìm/tạo từ dữ liệu
const CUSTOM_BRAND = "68e3ed49c6629b49f95dc9a7"; // VD: "507f1f77bcf86cd799439011" (ID) hoặc "Nike" (name) hoặc "nike" (slug)
const CUSTOM_CATEGORY = "68dbaa4ed3d896c8ed09807c"; // VD: "507f1f77bcf86cd799439011" (ID) hoặc "Áo thun" (name) hoặc "ao-thun" (slug)
// ============================================

async function run() {
  await connectDB(MONGODB_URI);

  // Hiển thị thông tin cấu hình
  console.log("📋 Cấu hình import:");
  console.log(`  - Input file: ${INPUT_PATH}`);
  if (CUSTOM_BRAND) {
    console.log(`  - Brand tùy chỉnh: ${CUSTOM_BRAND}`);
  } else {
    console.log(`  - Brand: Tự động tìm/tạo từ dữ liệu`);
  }
  if (CUSTOM_CATEGORY) {
    console.log(`  - Category tùy chỉnh: ${CUSTOM_CATEGORY}`);
  } else {
    console.log(`  - Category: Tự động map từ catid`);
  }
  console.log("");

  const fileStat = fs.statSync(INPUT_PATH);
  if (fileStat.size > 200 * 1024 * 1024) {
    console.log(
      "⚠️ File rất lớn, đang đọc theo stream (line-delimited JSON hoặc JSON array)"
    );
  }

  const raw = fs.readFileSync(INPUT_PATH, "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error("Không parse được JSON. Đảm bảo input.json là JSON hợp lệ.");
    throw e;
  }

  if (!Array.isArray(data)) {
    console.error("input.json phải là mảng đối tượng sản phẩm");
    process.exit(1);
  }

  const BATCH_SIZE = 500;
  let processed = 0;
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const chunk = data.slice(i, i + BATCH_SIZE);

    // Chuẩn bị các thao tác upsert song song
    const ops = await Promise.all(
      chunk.map(async (source) => {
        // Nếu có brand tùy chỉnh, dùng nó; nếu không thì tự động tìm/tạo
        let brandId = null;
        if (CUSTOM_BRAND) {
          brandId = await findBrandByNameOrSlug(CUSTOM_BRAND);
          if (!brandId) {
            console.warn(
              `⚠️ Không tìm thấy brand "${CUSTOM_BRAND}", bỏ qua brand cho sản phẩm này`
            );
          }
        } else {
          const brandName =
            source?.batch_item_for_item_card_full?.brand || source?.brand || "";
          brandId = await ensureBrand(brandName);
        }

        // Nếu có category tùy chỉnh, dùng nó; nếu không thì tự động map
        let categoryIds = [];
        if (CUSTOM_CATEGORY) {
          const categoryId = await findCategoryByNameOrSlug(CUSTOM_CATEGORY);
          if (categoryId) {
            categoryIds = [categoryId];
          } else {
            console.warn(
              `⚠️ Không tìm thấy category "${CUSTOM_CATEGORY}", bỏ qua category cho sản phẩm này`
            );
          }
        } else {
          categoryIds = await mapCategoryIds(source);
        }

        const doc = buildProductDoc(source, brandId, categoryIds);

        return {
          updateOne: {
            filter: { slug: doc.slug },
            update: { $set: doc },
            upsert: true,
          },
        };
      })
    );

    if (ops.length) {
      await Product.bulkWrite(ops, { ordered: false });
    }

    processed += ops.length;
    console.log(`Đã xử lý: ${processed}/${data.length}`);
  }

  await mongoose.connection.close();
  console.log("✅ Hoàn tất import và đóng kết nối");
}

run().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});
