import { AuthenticatedRequest } from "./types";

export function requireAdmin(req: AuthenticatedRequest) {
    const role = req.user?.role;
    if (!role || role !== "ADMIN") {
        const err = new Error("Unauthorized: ADMIN only");
        (err as any).status = 403;
        throw err;
    }
}

