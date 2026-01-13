"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const encryption_1 = require("../utils/encryption");
const prisma = new client_1.PrismaClient();
// ===== 🔐 Encryption Middleware =====
prisma.$use(async (params, next) => {
    const model = params.model ?? "";
    const action = params.action ?? "";
    if (model === "User" && ["create", "update"].includes(action)) {
        if (params.args?.data?.email) {
            params.args.data.email = (0, encryption_1.encrypt)(params.args.data.email);
        }
        if (params.args?.data?.phone) {
            params.args.data.phone = (0, encryption_1.encrypt)(params.args.data.phone);
        }
    }
    if (model === "Service" && ["create", "update"].includes(action)) {
        if (params.args?.data?.accountNo) {
            params.args.data.accountNo = (0, encryption_1.encrypt)(params.args.data.accountNo);
        }
    }
    const result = await next(params);
    if (model === "User" && ["findUnique", "findFirst", "findMany"].includes(action)) {
        if (Array.isArray(result)) {
            result.forEach(u => {
                if (u.email)
                    u.email = (0, encryption_1.decrypt)(u.email);
                if (u.phone)
                    u.phone = (0, encryption_1.decrypt)(u.phone);
            });
        }
        else if (result) {
            if (result.email)
                result.email = (0, encryption_1.decrypt)(result.email);
            if (result.phone)
                result.phone = (0, encryption_1.decrypt)(result.phone);
        }
    }
    if (model === "Service" && ["findUnique", "findFirst", "findMany"].includes(action)) {
        if (Array.isArray(result)) {
            result.forEach(s => {
                if (s.accountNo)
                    s.accountNo = (0, encryption_1.decrypt)(s.accountNo);
            });
        }
        else if (result) {
            if (result.accountNo)
                result.accountNo = (0, encryption_1.decrypt)(result.accountNo);
        }
    }
    return result;
});
// ===== 📝 Audit Log Middleware =====
prisma.$use(async (params, next) => {
    const model = params.model ?? "";
    const action = params.action ?? "";
    const result = await next(params);
    const userId = params.context?.user?.userId ?? null;
    if (["create", "update", "delete"].includes(action)) {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                model,
                recordId: params.args?.where?.id ?? null,
                details: JSON.stringify(params.args?.data ?? {}),
            },
        });
    }
    return result;
});
// ===== 🔐 RBAC Middleware =====
prisma.$use(async (params, next) => {
    const model = params.model ?? "";
    const action = params.action ?? "";
    const user = params.context?.user;
    if (!user)
        throw new Error("Unauthorized");
    if (model === "User" && action === "delete" && user.role !== "ADMIN") {
        throw new Error("Forbidden: Admins only");
    }
    return next(params);
});
exports.default = prisma;
//# sourceMappingURL=prisma.js.map