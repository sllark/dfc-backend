import { Request } from "express";
/**
 * Get the client IP address from a request.
 * Checks for X-Forwarded-For header (if behind a proxy) or falls back to connection info.
 */
export declare function getClientIp(req: Request): string;
//# sourceMappingURL=ipUtils.d.ts.map