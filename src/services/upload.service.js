const { s3, BUCKET_NAME } = require('../config/s3');
const path = require('path');
const crypto = require('crypto');

class UploadService {
    /**
     * Upload file lên S3
     * @param {Object} file - File object từ multer
     * @param {string} folder - Thư mục lưu trữ (mặc định: 'products')
     * @param {Object} metadata - Metadata tùy chỉnh
     * @returns {Promise<Object>} - Thông tin file đã upload
     */
    static async uploadFile(file, folder = 'products', metadata = {}) {
        try {
            // Tạo tên file unique
            const fileExtension = path.extname(file.originalname);
            const fileName = `${crypto.randomUUID()}${fileExtension}`;
            const key = `${folder}/${fileName}`;

            // Chuẩn bị parameters cho upload
            const uploadParams = {
                Bucket: BUCKET_NAME,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: 'public-read',
                Metadata: {
                    originalName: file.originalname,
                    uploadedAt: new Date().toISOString(),
                    ...metadata
                }
            };

            // Upload file
            const result = await s3.upload(uploadParams).promise();

            return {
                success: true,
                data: {
                    url: result.Location,
                    key: key,
                    fileName: fileName,
                    originalName: file.originalname,
                    size: file.size,
                    contentType: file.mimetype,
                    bucket: BUCKET_NAME
                }
            };

        } catch (error) {
            console.error('Lỗi khi upload file:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Upload nhiều file cùng lúc
     * @param {Array} files - Mảng file objects từ multer
     * @param {string} folder - Thư mục lưu trữ
     * @param {Object} metadata - Metadata tùy chỉnh
     * @returns {Promise<Object>} - Kết quả upload
     */
    static async uploadMultipleFiles(files, folder = 'products', metadata = {}) {
        try {
            const uploadPromises = files.map(file => 
                this.uploadFile(file, folder, metadata)
            );

            const results = await Promise.all(uploadPromises);
            
            const successful = results.filter(result => result.success);
            const failed = results.filter(result => !result.success);

            return {
                success: true,
                data: {
                    successful: successful.map(result => result.data),
                    failed: failed.map(result => result.error),
                    total: files.length,
                    successCount: successful.length,
                    failCount: failed.length
                }
            };

        } catch (error) {
            console.error('Lỗi khi upload nhiều file:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Xóa file từ S3
     * @param {string} key - Key của file trong S3
     * @returns {Promise<Object>} - Kết quả xóa
     */
    static async deleteFile(key) {
        try {
            const deleteParams = {
                Bucket: BUCKET_NAME,
                Key: key
            };

            await s3.deleteObject(deleteParams).promise();

            return {
                success: true,
                message: 'File đã được xóa thành công'
            };

        } catch (error) {
            console.error('Lỗi khi xóa file:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Xóa nhiều file cùng lúc
     * @param {Array} keys - Mảng keys của files
     * @returns {Promise<Object>} - Kết quả xóa
     */
    static async deleteMultipleFiles(keys) {
        try {
            const deleteParams = {
                Bucket: BUCKET_NAME,
                Delete: {
                    Objects: keys.map(key => ({ Key: key }))
                }
            };

            const result = await s3.deleteObjects(deleteParams).promise();

            return {
                success: true,
                data: {
                    deleted: result.Deleted,
                    errors: result.Errors || [],
                    total: keys.length,
                    deletedCount: result.Deleted.length
                }
            };

        } catch (error) {
            console.error('Lỗi khi xóa nhiều file:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Lấy thông tin file từ S3
     * @param {string} key - Key của file trong S3
     * @returns {Promise<Object>} - Thông tin file
     */
    static async getFileInfo(key) {
        try {
            const params = {
                Bucket: BUCKET_NAME,
                Key: key
            };

            const result = await s3.headObject(params).promise();

            return {
                success: true,
                data: {
                    key: key,
                    contentType: result.ContentType,
                    contentLength: result.ContentLength,
                    lastModified: result.LastModified,
                    metadata: result.Metadata,
                    url: `https://${BUCKET_NAME}.s3.cloudfly.vn/${key}`
                }
            };

        } catch (error) {
            console.error('Lỗi khi lấy thông tin file:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Tạo presigned URL để upload trực tiếp từ client
     * @param {string} key - Key của file
     * @param {string} contentType - Content type của file
     * @param {number} expiresIn - Thời gian hết hạn (giây, mặc định: 300)
     * @returns {Promise<Object>} - Presigned URL
     */
    static async generatePresignedUploadUrl(key, contentType, expiresIn = 300) {
        try {
            const params = {
                Bucket: BUCKET_NAME,
                Key: key,
                Expires: expiresIn,
                ContentType: contentType,
                ACL: 'public-read'
            };

            const presignedUrl = s3.getSignedUrl('putObject', params);

            return {
                success: true,
                data: {
                    presignedUrl: presignedUrl,
                    key: key,
                    expiresIn: expiresIn,
                    contentType: contentType
                }
            };

        } catch (error) {
            console.error('Lỗi khi tạo presigned URL:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Tạo presigned URL để download file
     * @param {string} key - Key của file
     * @param {number} expiresIn - Thời gian hết hạn (giây, mặc định: 3600)
     * @returns {Promise<Object>} - Presigned URL
     */
    static async generatePresignedDownloadUrl(key, expiresIn = 3600) {
        try {
            const params = {
                Bucket: BUCKET_NAME,
                Key: key,
                Expires: expiresIn
            };

            const presignedUrl = s3.getSignedUrl('getObject', params);

            return {
                success: true,
                data: {
                    presignedUrl: presignedUrl,
                    key: key,
                    expiresIn: expiresIn
                }
            };

        } catch (error) {
            console.error('Lỗi khi tạo presigned download URL:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Lấy danh sách file trong folder
     * @param {string} prefix - Prefix của folder
     * @param {number} maxKeys - Số lượng file tối đa (mặc định: 1000)
     * @returns {Promise<Object>} - Danh sách file
     */
    static async listFiles(prefix = '', maxKeys = 1000) {
        try {
            const params = {
                Bucket: BUCKET_NAME,
                Prefix: prefix,
                MaxKeys: maxKeys
            };

            const result = await s3.listObjectsV2(params).promise();

            const files = result.Contents.map(file => ({
                key: file.Key,
                size: file.Size,
                lastModified: file.LastModified,
                url: `https://${BUCKET_NAME}.s3.cloudfly.vn/${file.Key}`
            }));

            return {
                success: true,
                data: {
                    files: files,
                    total: files.length,
                    isTruncated: result.IsTruncated,
                    nextContinuationToken: result.NextContinuationToken
                }
            };

        } catch (error) {
            console.error('Lỗi khi lấy danh sách file:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = UploadService;
