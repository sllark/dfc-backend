import { Response, NextFunction, RequestHandler } from "express";
import { verifyToken } from "../utils/jwt";
import { AuthenticatedRequest, CustomJwtPayload } from "../utils/types";

class AuthMiddleware {
  static authenticate: RequestHandler = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
      const decoded: CustomJwtPayload = verifyToken(token); // ✅ type is CustomJwtPayload

      req.user = decoded; // ✅ now req.user has userId and role
      next();
    } catch (error) {
      console.error("Authentication Error:", error);
      return res.status(401).json({ message: "Invalid token." });
    }
  };
}

export default AuthMiddleware;
