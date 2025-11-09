import fs from "fs";

// === CẤU HÌNH ===
const INPUT_FILE = "C:\\Users\\teamk\\OneDrive\\Máy tính\\mern_fashion.products.json";
const OUTPUT_FILE = "output.json";
const KEYWORDS = ["áo", "quần", "váy", "đầm"];
const ALLOWED_SIZES = ["S", "M", "L", "XL"];
const MAX_COLORS = 3;

// === HÀM TIỆN ÍCH ===
function cleanName(name) {
  return name
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function countKeywordRepeats(text, keywords) {
  const lower = text.toLowerCase();
  let count = 0;
  for (const kw of keywords) {
    const regex = new RegExp(kw, "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }
  return count;
}

function limitVariants(variants) {
  if (!Array.isArray(variants)) return [];
  const uniqueColors = [
    ...new Set(variants.map((v) => v.color).filter(Boolean)),
  ].slice(0, MAX_COLORS);
  const filtered = [];

  for (const color of uniqueColors) {
    const colorVariants = variants.filter((v) => v.color === color);

    for (const size of ALLOWED_SIZES) {
      const matched =
        colorVariants.find(
          (v) =>
            typeof v.size === "string" && v.size.toUpperCase().includes(size)
        ) || colorVariants[0];

      if (matched) {
        filtered.push({
          ...matched,
          size,
        });
      }
    }
  }
  return filtered;
}

// === XỬ LÝ CHÍNH ===
function processProducts(products) {
  const seenNames = new Set();
  const results = [];
  const allColors = new Set();

  for (const p of products) {
    let name = cleanName(p.name);

    // Bỏ trùng tên
    if (seenNames.has(name.toLowerCase())) continue;
    seenNames.add(name.toLowerCase());

    // Loại nếu từ khóa lặp quá 4 lần
    const keywordCount = countKeywordRepeats(name, KEYWORDS);
    if (keywordCount > 4) continue;

    // Giới hạn variants
    p.variants = limitVariants(p.variants || []);

    // Thu thập danh sách màu
    p.variants.forEach((v) => {
      if (v.color) allColors.add(v.color.trim());
    });

    // Làm sạch tên
    p.name = name;
    results.push(p);
  }

  // === In ra danh sách màu không trùng ===
  console.log("\n🎨 Danh sách màu sắc (không trùng):");
  console.log("----------------------------------");
  console.log([...allColors].sort().join("\n"));
  console.log(`\nTổng số màu khác nhau: ${allColors.size}\n`);

  return results;
}

// === CHẠY ===
try {
  const data = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  const cleaned = processProducts(data);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cleaned, null, 2), "utf8");
  console.log(`✅ Đã xử lý ${cleaned.length} sản phẩm. Lưu tại ${OUTPUT_FILE}`);
} catch (err) {
  console.error("❌ Lỗi:", err.message);
}
