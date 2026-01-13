"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
const verifyToken = (token) => {
    try {
        // ✅ cast the decoded token to CustomJwtPayload
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return decoded;
    }
    catch (error) {
        throw new Error("Invalid token");
    }
};
exports.verifyToken = verifyToken;
//# sourceMappingURL=jwt.js.map