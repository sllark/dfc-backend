"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET must be set in environment variables");
}
const verifyToken = (token) => {
    try {
        if (!token) {
            throw new Error("Token is required");
        }
        // ✅ cast the decoded token to CustomJwtPayload
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (!decoded.userId || !decoded.role) {
            throw new Error("Invalid token payload");
        }
        return decoded;
    }
    catch (error) {
        if (error.name === "JsonWebTokenError") {
            throw new Error("Invalid token");
        }
        else if (error.name === "TokenExpiredError") {
            throw new Error("Token expired");
        }
        else {
            throw new Error(error.message || "Invalid token");
        }
    }
};
exports.verifyToken = verifyToken;
//# sourceMappingURL=jwt.js.map