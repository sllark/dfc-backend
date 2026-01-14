import jwt from "jsonwebtoken";
import { CustomJwtPayload } from "../utils/types"; // adjust the path

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET must be set in environment variables");
}

export const verifyToken = (token: string): CustomJwtPayload => {
  try {
    if (!token) {
        throw new Error("Token is required");
    }
    
    // ✅ cast the decoded token to CustomJwtPayload
    const decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
    
    if (!decoded.userId || !decoded.role) {
        throw new Error("Invalid token payload");
    }
    
    return decoded;
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
        throw new Error("Invalid token");
    } else if (error.name === "TokenExpiredError") {
        throw new Error("Token expired");
    } else {
        throw new Error(error.message || "Invalid token");
    }
  }
};
