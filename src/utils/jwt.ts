import jwt from "jsonwebtoken";
import { CustomJwtPayload } from "../utils/types"; // adjust the path

const JWT_SECRET = process.env.JWT_SECRET;

export const verifyToken = (token: string): CustomJwtPayload => {
  try {
    // ✅ cast the decoded token to CustomJwtPayload
    const decoded = jwt.verify(token, JWT_SECRET!) as CustomJwtPayload;
    return decoded;
  } catch (error) {
    throw new Error("Invalid token");
  }
};
