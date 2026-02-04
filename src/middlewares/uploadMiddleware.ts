import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { v2 as cloudinary } from "cloudinary";

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || "prod";

// Initialize Cloudinary if credentials are provided
const useCloudinary = !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

if (useCloudinary) {
    cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
    });
    console.log(`✅ Cloudinary configured (folder: ${CLOUDINARY_FOLDER})`);
} else {
    console.log("📁 Using local file storage (Multer)");
}

// Local storage configuration (fallback when Cloudinary is not configured)
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage: Use memory storage for Cloudinary, disk storage for local
const storage = useCloudinary
    ? multer.memoryStorage()
    : multer.diskStorage({
          destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
              cb(null, uploadDir);
          },
          filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
              const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
              cb(null, uniqueSuffix + path.extname(file.originalname));
          },
      });

// File filter (accept only images)
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed!"));
    }
};

// Multer instance
const multerUpload = multer({ storage, fileFilter });

/**
 * Upload file to Cloudinary or return local path
 * @param file - Multer file object
 * @returns Promise<string> - URL of uploaded file (Cloudinary) or local path
 */
export async function uploadFile(file: Express.Multer.File): Promise<string> {
    if (useCloudinary && file.buffer) {
        // Upload to Cloudinary using buffer
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: CLOUDINARY_FOLDER,
                    resource_type: "auto",
                },
                (error, result) => {
                    if (error) {
                        console.error("Cloudinary upload error:", error);
                        reject(new Error(`Cloudinary upload failed: ${error.message}`));
                    } else if (result) {
                        resolve(result.secure_url);
                    } else {
                        reject(new Error("Cloudinary upload returned no result"));
                    }
                }
            );

            uploadStream.end(file.buffer);
        });
    } else if (file.filename) {
        // Local storage - return relative path
        return `/uploads/${file.filename}`;
    } else {
        throw new Error("File upload failed: no buffer or filename available");
    }
}

/**
 * Delete file from Cloudinary or local storage
 * @param urlOrPath - Cloudinary URL or local file path
 */
export async function deleteFile(urlOrPath: string): Promise<void> {
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
                await cloudinary.uploader.destroy(publicId);
                console.log(`✅ Deleted from Cloudinary: ${publicId}`);
            }
        } catch (error: any) {
            console.error("Cloudinary delete error:", error);
        }
    } else if (!useCloudinary && urlOrPath.startsWith("/uploads/")) {
        // Delete local file
        const filePath = path.join(__dirname, "../..", urlOrPath);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`✅ Deleted local file: ${filePath}`);
            }
        } catch (error: any) {
            console.error("Local file delete error:", error);
        }
    }
}

// Export multer middleware (used for handling multipart/form-data)
export const upload = multerUpload;
