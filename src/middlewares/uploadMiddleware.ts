import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Storage configuration
const storage = multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        cb(null, uploadDir);
    },
    filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

// Optional: File filter (accept only images)
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed!"));
    }
};

// Export the configured multer instance
export const upload = multer({ storage, fileFilter });
