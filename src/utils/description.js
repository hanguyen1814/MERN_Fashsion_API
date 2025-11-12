// import { GoogleGenerativeAI } from "@google/generative-ai";
// import fetch from "node-fetch";

// const genAI = new GoogleGenerativeAI("AIzaSyAOJaMYe5vx5eAloM2zuCPAKy1Z9opdgo4");

// async function generateDescription({ name, imageUrl }) {
//   try {
//     const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

//     const parts = [
//       {
//         text: `Viết mô tả ngắn (2-3 câu) cho sản phẩm thời trang có tên: "${name}". 
//         Mô tả bằng tiếng Việt, nêu rõ phong cách, chất liệu, mùa phù hợp (ví dụ: mùa hè, mùa đông), 
//         và dịp sử dụng (đi chơi, đi làm, dự tiệc...).`,
//       },
//     ];

//     // Nếu có link ảnh, fetch và gửi cho model
//     if (imageUrl) {
//       const res = await fetch(imageUrl);
//       const contentType = res.headers.get("content-type") || "image/jpeg";
//       const imageBuffer = await res.arrayBuffer();

//       parts.push({
//         inlineData: {
//           data: Buffer.from(imageBuffer).toString("base64"),
//           mimeType: contentType,
//         },
//       });
//     }

//     const result = await model.generateContent({
//       contents: [{ role: "user", parts }],
//     });
//     return result.response.text().trim();
//   } catch (err) {
//     console.error("❌ Error generating description:", err.message);
//     return "";
//   }
// }

// const desc = await generateDescription({
//   name: "Áo len xù cổ bẻ cổ sen phối dây nơ chiết eo đen viền trắng BEI BEI TOP/BL",
//   imageUrl: "https://cf.shopee.vn/file/vn-11134207-7ras8-m5zl107idzknb8",
// });
// console.log(desc);

