import { Request } from "express";

/**
 * Get the client IP address from a request.
 * Checks for X-Forwarded-For header (if behind a proxy) or falls back to connection info.
 */
export function getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
        // x-forwarded-for can be a comma-separated list of IPs. Take the first one.
        const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
        return ip?.trim() ?? "unknown";
    }

    // fallback to connection remote address
    return req.socket.remoteAddress ?? "unknown";
}
