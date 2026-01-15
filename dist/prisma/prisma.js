"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ===== 📝 Audit Log Middleware =====
// Note: Encryption/decryption is handled manually in services to avoid conflicts
// Services use encryptDeterministic for emails (for searchability) and encrypt for phones
// Note: RBAC is handled at the route/controller level, not in Prisma middleware
prisma.$use(async (params, next) => {
    const model = params.model ?? "";
    const action = params.action ?? "";
    const result = await next(params);
    // Only create audit logs for write operations
    // Skip if no user context (e.g., during signup/login) - don't fail the operation
    const userId = params.context?.user?.userId ?? null;
    if (["create", "update", "delete"].includes(action)) {
        try {
            await prisma.auditLog.create({
                data: {
                    userId,
                    action,
                    model,
                    recordId: params.args?.where?.id ?? params.args?.data?.id ?? null,
                    details: JSON.stringify(params.args?.data ?? {}),
                },
            });
        }
        catch (error) {
            // Don't fail the main operation if audit log fails
            console.error("Audit log creation failed:", error);
        }
    }
    return result;
});
exports.default = prisma;
//# sourceMappingURL=prisma.js.map