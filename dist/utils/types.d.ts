import { JwtPayload } from "jsonwebtoken";
import { Request } from "express";
export interface CustomJwtPayload extends JwtPayload {
    userId: number;
    role: string;
}
export interface AuthenticatedRequest extends Request {
    user?: CustomJwtPayload;
    file?: Express.Multer.File | undefined;
}
//# sourceMappingURL=types.d.ts.map