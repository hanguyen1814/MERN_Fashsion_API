// import mongoose from "mongoose";
// import fs from "fs";
// import fetch from "node-fetch";
// import { EJSON } from "bson";
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import Product from "../models/product.model.js";

// // ======== CONFIG ========
// const GOOGLE_API_KEY = "AIzaSyAqgvv4OXYbgpEaSque3OTfUP6e4U3Amrg";
// const MONGO_URI =
//   "mongodb+srv://admin:Ahihi123@shoppingmaster.4g4hnjb.mongodb.net/mern_fashion";

// const PRODUCTS_PATH =
//   "C:\\Users\\teamk\\Downloads\\amern_fashion.products.json";

// // ======== INIT ========
// const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
// const descriptionModel = genAI.getGenerativeModel({
//   model: "gemini-2.5-flash-lite",
// });
// const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// // ======== CATEGORY & BRAND MAP ========
// const categoryMap = {
//   "68ebdf2c5aaf6bb445f2d70f": "test123",
//   "68eb19f723bb0af99c8a45bd": "test",
//   "68dbaa4ed3d896c8ed09807f": "Áo khoác nữ",
//   "68dbaa4ed3d896c8ed09807e": "Quần nữ",
//   "68dbaa4ed3d896c8ed09807d": "Áo kiểu nữ",
//   "68dbaa4ed3d896c8ed09807c": "Váy / Đầm",
//   "68dbaa4ed3d896c8ed09807b": "Thời trang Nữ",
//   "68dbaa4ed3d896c8ed09807a": "Quần short nam",
//   "68dbaa4ed3d896c8ed098079": "Quần jeans nam",
//   "68dbaa4ed3d896c8ed098078": "Áo sơ mi nam",
//   "68dbaa4ed3d896c8ed098077": "Áo thun nam",
//   "68dbaa4ed3d896c8ed098076": "Thời trang Nam",
// };

// const brandMap = {
//   "68eb18e923bb0af99c8a45b3": "Test",
//   "68e3ed49c6629b49f95dc9a7": "Tingoan",
//   "68e3ed3ac6629b49f95dc9a5": "Coolmate",
//   "68dbb65dcc770e37a74c89e7": "No Brand",
// };

// // ======== HELPER: Generate AI Description ========
// async function generateDescription({ name, imageUrl }) {
//   try {
//     const parts = [
//       {
//         text: `Viết mô tả ngắn (2-3 câu) cho sản phẩm thời trang có tên: "${name}". 
//         Mô tả bằng tiếng Việt, nêu rõ phong cách, chất liệu, mùa phù hợp (ví dụ: mùa hè, mùa đông), 
//         và dịp sử dụng (đi chơi, đi làm, dự tiệc...). (!chỉ trả về mô tả, không có câu khác)`,
//       },
//     ];

//     if (imageUrl) {
//       const res = await fetch(imageUrl);
//       let contentType = res.headers.get("content-type") || "image/jpeg";
//       // Loại bỏ phần charset nếu có
//       if (contentType.includes(";")) {
//         contentType = contentType.split(";")[0].trim();
//       }

//       const buffer = await res.arrayBuffer();
//       parts.push({
//         inlineData: {
//           data: Buffer.from(buffer).toString("base64"),
//           mimeType: contentType,
//         },
//       });
//     }

//     const result = await descriptionModel.generateContent({
//       contents: [{ role: "user", parts }],
//     });
//     console.log(result.response.text().trim());
//     return result.response.text().trim();
//   } catch (err) {
//     console.error("❌ Error generating description:", err.message);
//     return "";
//   }
// }

// // ======== HELPER: Generate Embedding ========
// async function generateEmbedding(text) {
//   const embedding = await embedModel.embedContent(text);
//   return embedding.embedding.values;
// }

// // ======== MAIN LOGIC ========
// async function main() {
//   await mongoose.connect(MONGO_URI);
//   console.log("✅ Connected to MongoDB");

//   const data = EJSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf-8"));

//   for (const p of data) {
//     const brandName = brandMap[p.brandId] || "Không rõ thương hiệu";
//     const categoryNames = (p.categoryIds || []).map(
//       (cid) => categoryMap[cid] || "Khác"
//     );

//     // Nếu chưa có mô tả → tạo
//     const description =
//       p.description ||
//       (await generateDescription({ name: p.name, imageUrl: p.image }));

//     // Sinh text để embedding
//     const text = `
//       Tên sản phẩm: ${p.name}.
//       Mô tả: ${description}.
//       Thương hiệu: ${brandName}.
//       Danh mục: ${categoryNames.join(", ")}.
//     `;

//     const embedding = await generateEmbedding(text);

//     const newProduct = {
//       ...p,
//       description,
//       embedding,
//       brandName,
//       categoryNames,
//     };

//     await Product.create(newProduct);
//     console.log("✅ Inserted:", p.name);
//   }

//   await mongoose.disconnect();
//   console.log("🎉 Done!");
// }

// main().catch(console.error);
