"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_1 = require("../utils/jwt");
class AuthMiddleware {
    static authenticate = async (req, res, next) => {
        const token = req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({ message: "Access denied. No token provided." });
        }
        try {
            const decoded = (0, jwt_1.verifyToken)(token); // ✅ type is CustomJwtPayload
            req.user = decoded; // ✅ now req.user has userId and role
            next();
        }
        catch (error) {
            console.error("Authentication Error:", error);
            return res.status(401).json({ message: "Invalid token." });
        }
    };
}
exports.default = AuthMiddleware;
//# sourceMappingURL=authMiddleware.js.map