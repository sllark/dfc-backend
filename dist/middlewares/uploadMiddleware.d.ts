import multer from "multer";
/**
 * Upload file to Cloudinary or return local path
 * @param file - Multer file object
 * @returns Promise<string> - URL of uploaded file (Cloudinary) or local path
 */
export declare function uploadFile(file: Express.Multer.File): Promise<string>;
/**
 * Delete file from Cloudinary or local storage
 * @param urlOrPath - Cloudinary URL or local file path
 */
export declare function deleteFile(urlOrPath: string): Promise<void>;
export declare const upload: multer.Multer;
//# sourceMappingURL=uploadMiddleware.d.ts.map