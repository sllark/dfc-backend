"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
function requireAdmin(req) {
    const role = req.user?.role;
    if (!role || role !== "ADMIN") {
        const err = new Error("Unauthorized: ADMIN only");
        err.status = 403;
        throw err;
    }
}
//# sourceMappingURL=roles.js.map