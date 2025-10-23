const AWS = require("aws-sdk");

// Cấu hình AWS S3 cho CloudFly
AWS.config.update({
  accessKeyId: process.env.CLOUDFLY_ACCESS_KEY_ID || "<ACCESS_KEY_ID>",
  secretAccessKey: process.env.CLOUDFLY_SECRET_ACCESS_KEY || "<SECRET_KEY_ID>",
  region: "us-east-1", // Sử dụng region mặc định cho CloudFly
  endpoint: "https://s3.cloudfly.vn",
  apiVersions: {
    s3: "2006-03-01",
  },
  logger: process.stdout,
});

// Tạo S3 instance
const s3 = new AWS.S3();

// Cấu hình bucket
const BUCKET_NAME = process.env.S3_BUCKET_NAME || "mern-fashion-products";

// Cấu hình CORS cho bucket (nếu chưa có)
const corsConfig = {
  Bucket: BUCKET_NAME,
  CORSConfiguration: {
    CORSRules: [
      {
        AllowedMethods: ["GET", "PUT", "POST", "DELETE"],
        AllowedOrigins: ["*"], // Trong production nên chỉ định domain cụ thể
        AllowedHeaders: ["*"],
        ExposeHeaders: ["ETag"],
        MaxAgeSeconds: 3000,
      },
    ],
  },
};

// Khởi tạo bucket và CORS
const initializeBucket = async () => {
  try {
    // Kiểm tra bucket có tồn tại không
    try {
      await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
      console.log(`Bucket ${BUCKET_NAME} đã tồn tại`);
    } catch (error) {
      if (error.statusCode === 404) {
        // Tạo bucket mới với cấu hình đơn giản
        try {
          await s3.createBucket({ Bucket: BUCKET_NAME }).promise();
          console.log(`Đã tạo bucket ${BUCKET_NAME}`);
        } catch (createError) {
          console.log(
            `Không thể tạo bucket ${BUCKET_NAME}:`,
            createError.message
          );
          // Tiếp tục mà không throw error để không làm crash server
        }
      } else {
        throw error;
      }
    }

    // Thiết lập CORS
    try {
      await s3.putBucketCors(corsConfig).promise();
      console.log(`Đã thiết lập CORS cho bucket ${BUCKET_NAME}`);
    } catch (error) {
      console.log("Lỗi khi thiết lập CORS:", error.message);
    }

    // Thiết lập ACL public-read
    try {
      await s3
        .putBucketAcl({
          Bucket: BUCKET_NAME,
          ACL: "public-read",
        })
        .promise();
      console.log(`Đã thiết lập ACL public-read cho bucket ${BUCKET_NAME}`);
    } catch (error) {
      console.log("Lỗi khi thiết lập ACL:", error.message);
    }
  } catch (error) {
    console.error("Lỗi khi khởi tạo bucket:", error);
  }
};

module.exports = {
  s3,
  BUCKET_NAME,
  initializeBucket,
};
