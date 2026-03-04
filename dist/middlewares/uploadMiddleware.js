"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
exports.uploadFile = uploadFile;
exports.deleteFile = deleteFile;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cloudinary_1 = require("cloudinary");
// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || "prod";
// Initialize Cloudinary if credentials are provided
const useCloudinary = !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
if (useCloudinary) {
    cloudinary_1.v2.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
    });
    console.log(`✅ Cloudinary configured (folder: ${CLOUDINARY_FOLDER})`);
}
else {
    console.log("📁 Using local file storage (Multer)");
}
// Local storage configuration (fallback when Cloudinary is not configured)
const uploadDir = path_1.default.join(__dirname, "../../uploads");
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Storage: Use memory storage for Cloudinary, disk storage for local
const storage = useCloudinary
    ? multer_1.default.memoryStorage()
    : multer_1.default.diskStorage({
        destination: (_req, _file, cb) => {
            cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
        },
    });
// File filter (accept only images)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    }
    else {
        cb(new Error("Only image files are allowed!"));
    }
};
// Multer instance
const multerUpload = (0, multer_1.default)({ storage, fileFilter });
/**
 * Upload file to Cloudinary or return local path
 * @param file - Multer file object
 * @returns Promise<string> - URL of uploaded file (Cloudinary) or local path
 */
async function uploadFile(file) {
    if (useCloudinary && file.buffer) {
        // Upload to Cloudinary using buffer
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                folder: CLOUDINARY_FOLDER,
                resource_type: "auto",
            }, (error, result) => {
                if (error) {
                    console.error("Cloudinary upload error:", error);
                    reject(new Error(`Cloudinary upload failed: ${error.message}`));
                }
                else if (result) {
                    resolve(result.secure_url);
                }
                else {
                    reject(new Error("Cloudinary upload returned no result"));
                }
            });
            uploadStream.end(file.buffer);
        });
    }
    else if (file.filename) {
        // Local storage - return relative path
        return `/uploads/${file.filename}`;
    }
    else {
        throw new Error("File upload failed: no buffer or filename available");
    }
}
/**
 * Delete file from Cloudinary or local storage
 * @param urlOrPath - Cloudinary URL or local file path
 */
async function deleteFile(urlOrPath) {
    if (useCloudinary && urlOrPath.includes("cloudinary.com")) {
        // Extract public_id from Cloudinary URL
        // Format: https://res.cloudinary.com/{cloud_name}/image/upload/{folder}/{filename}
        try {
            const urlParts = urlOrPath.split("/");
            const uploadIndex = urlParts.findIndex(part => part === "upload");
            if (uploadIndex !== -1 && uploadIndex + 1 < urlParts.length) {
                // Get everything after "upload" and remove file extension
                const pathAfterUpload = urlParts.slice(uploadIndex + 1).join("/");
                const publicId = pathAfterUpload.replace(/\.[^/.]+$/, "");
                await cloudinary_1.v2.uploader.destroy(publicId);
                console.log(`✅ Deleted from Cloudinary: ${publicId}`);
            }
        }
        catch (error) {
            console.error("Cloudinary delete error:", error);
        }
    }
    else if (!useCloudinary && urlOrPath.startsWith("/uploads/")) {
        // Delete local file
        const filePath = path_1.default.join(__dirname, "../..", urlOrPath);
        try {
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
                console.log(`✅ Deleted local file: ${filePath}`);
            }
        }
        catch (error) {
            console.error("Local file delete error:", error);
        }
    }
}
// Export multer middleware (used for handling multipart/form-data)
exports.upload = multerUpload;
//# sourceMappingURL=uploadMiddleware.js.map