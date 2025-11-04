const {
  cloudinary,
  FOLDERS,
  TRANSFORMATIONS,
} = require("../config/cloudinary");
const { Readable } = require("stream");
const logger = require("../config/logger");

class UploadService {
  /**
   * Convert buffer sang stream cho Cloudinary
   */
  static bufferToStream(buffer) {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
  }

  /**
   * Upload file lên Cloudinary
   * @param {Object} file - File object từ multer
   * @param {string} folder - Thư mục lưu trữ (mặc định: 'products')
   * @param {Object} options - Tùy chọn upload (transformation, public_id, etc.)
   * @returns {Promise<Object>} - Thông tin file đã upload
   */
  static async uploadFile(file, folder = FOLDERS.products, options = {}) {
    try {
      const {
        transformation = {},
        publicId = null,
        tags = [],
        overwrite = false,
      } = options;

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: publicId,
            resource_type: "auto", // Tự động detect image/video
            transformation: transformation,
            tags: ["mern-fashion", ...tags],
            overwrite,
            // Optimize tự động
            fetch_format: "auto", // Tự động chọn format tốt nhất
            quality: "auto",
          },
          (error, result) => {
            if (error) {
              // Log chi tiết lỗi để debug
              logger.error("Cloudinary upload error:", {
                message: error.message,
                http_code: error.http_code,
                name: error.name,
                folder,
                publicId,
                cloudName: process.env.CLOUDINARY_CLOUD_NAME,
              });

              // Xử lý lỗi cụ thể
              if (error.http_code === 401) {
                logger.error(
                  "Lỗi xác thực Cloudinary. Vui lòng kiểm tra lại CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET trong file .env"
                );
              }

              reject(error);
            } else {
              resolve({
                success: true,
                data: {
                  url: result.secure_url,
                  publicId: result.public_id,
                  format: result.format,
                  width: result.width,
                  height: result.height,
                  bytes: result.bytes,
                  createdAt: result.created_at,
                  folder: folder,
                },
              });
            }
          }
        );

        // Upload từ buffer stream
        this.bufferToStream(file.buffer).pipe(uploadStream);
      });
    } catch (error) {
      logger.error("Upload file error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Upload nhiều file cùng lúc
   * @param {Array} files - Mảng file objects từ multer
   * @param {string} folder - Thư mục lưu trữ
   * @param {Object} options - Tùy chọn upload
   * @returns {Promise<Object>} - Kết quả upload
   */
  static async uploadMultipleFiles(
    files,
    folder = FOLDERS.products,
    options = {}
  ) {
    try {
      const uploadPromises = files.map((file) =>
        this.uploadFile(file, folder, options)
      );

      const results = await Promise.allSettled(uploadPromises);

      const successful = [];
      const failed = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.success) {
          successful.push(result.value.data);
        } else {
          const errorMsg =
            result.status === "rejected"
              ? result.reason.message
              : result.value.error || "Unknown error";
          failed.push({
            fileName: files[index].originalname,
            error: errorMsg,
          });
        }
      });

      return {
        success: true,
        data: {
          successful,
          failed,
          total: files.length,
          successCount: successful.length,
          failCount: failed.length,
        },
      };
    } catch (error) {
      logger.error("Upload multiple files error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Upload ảnh sản phẩm với transformation tự động
   * @param {Object} file - File object từ multer
   * @param {string} type - Loại ảnh: 'main', 'gallery', 'thumbnail', 'variant'
   * @param {string} productId - ID sản phẩm (optional)
   * @returns {Promise<Object>} - Kết quả upload
   */
  static async uploadProductImage(file, type = "main", productId = null) {
    try {
      let folder = FOLDERS.products;
      let transformation = TRANSFORMATIONS.product;

      switch (type) {
        case "thumbnail":
          folder = FOLDERS.thumbnails;
          transformation = TRANSFORMATIONS.thumbnail;
          break;
        case "gallery":
          transformation = TRANSFORMATIONS.gallery;
          break;
        case "variant":
          folder = FOLDERS.variants;
          transformation = TRANSFORMATIONS.variant;
          break;
        default:
          transformation = TRANSFORMATIONS.product;
      }

      // Tạo public_id với productId nếu có
      const publicId = productId
        ? `${folder}/${productId}-${Date.now()}`
        : null;

      return await this.uploadFile(file, folder, {
        transformation,
        publicId,
        tags: ["product", type],
      });
    } catch (error) {
      logger.error("Upload product image error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Xóa file từ Cloudinary
   * @param {string} publicId - Public ID của file trong Cloudinary
   * @param {string} resourceType - Loại resource: 'image', 'video', 'raw' (mặc định: 'image')
   * @returns {Promise<Object>} - Kết quả xóa
   */
  static async deleteFile(publicId, resourceType = "image") {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });

      if (result.result === "ok") {
        return {
          success: true,
          message: "File đã được xóa thành công",
        };
      } else if (result.result === "not found") {
        return {
          success: false,
          error: "File không tồn tại",
        };
      } else {
        return {
          success: false,
          error: "Lỗi khi xóa file",
        };
      }
    } catch (error) {
      logger.error("Delete file error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Xóa nhiều file cùng lúc
   * @param {Array} publicIds - Mảng public IDs
   * @param {string} resourceType - Loại resource
   * @returns {Promise<Object>} - Kết quả xóa
   */
  static async deleteMultipleFiles(publicIds, resourceType = "image") {
    try {
      const deletePromises = publicIds.map((publicId) =>
        this.deleteFile(publicId, resourceType)
      );

      const results = await Promise.allSettled(deletePromises);

      const deleted = [];
      const failed = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.success) {
          deleted.push(publicIds[index]);
        } else {
          const errorMsg =
            result.status === "rejected"
              ? result.reason.message
              : result.value.error || "Unknown error";
          failed.push({
            publicId: publicIds[index],
            error: errorMsg,
          });
        }
      });

      return {
        success: true,
        data: {
          deleted,
          failed,
          total: publicIds.length,
          deletedCount: deleted.length,
          failCount: failed.length,
        },
      };
    } catch (error) {
      logger.error("Delete multiple files error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Tạo URL với transformation
   * @param {string} publicId - Public ID của file
   * @param {Object} transformation - Transformation options
   * @returns {string} - URL với transformation
   */
  static getTransformedUrl(publicId, transformation = {}) {
    return cloudinary.url(publicId, {
      ...TRANSFORMATIONS.product,
      ...transformation,
      secure: true,
    });
  }

  /**
   * Tạo presigned upload URL để upload trực tiếp từ client (không cần server)
   * Yêu cầu upload preset được cấu hình trên Cloudinary dashboard
   * @param {string} folder - Thư mục lưu trữ
   * @param {Object} options - Tùy chọn
   * @returns {Object} - Thông tin upload (signature, timestamp, etc.)
   */
  static generateUploadSignature(folder = FOLDERS.products, options = {}) {
    const { transformation = {}, tags = [], resourceType = "image" } = options;

    const params = {
      folder,
      tags: ["mern-fashion", ...tags].join(","),
      transformation: JSON.stringify(transformation),
      resource_type: resourceType,
      timestamp: Math.round(new Date().getTime() / 1000),
    };

    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET
    );

    return {
      signature,
      timestamp: params.timestamp,
      folder: params.folder,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      resourceType: params.resource_type,
    };
  }
}

module.exports = UploadService;
