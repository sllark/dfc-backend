"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = void 0;
const prisma_1 = require("../generated/prisma");
const prisma = new prisma_1.PrismaClient();
// Audit log helper
async function createAuditLog(userId, action, model, recordId, details) {
    await prisma.auditLog.create({
        data: {
            userId,
            action,
            model,
            recordId,
            details: details ? JSON.stringify(details) : null,
        },
    });
}
exports.paymentService = {
    // CREATE PAYMENT
    async create(data, ip) {
        const payment = await prisma.payment.create({ data });
        await createAuditLog(data.createdBy, "CREATE", "Payment", payment.id, payment);
        return payment;
    },
    // GET ALL PAYMENTS
    async getAll({ page, perPage, status, requestingUserId, role }) {
        const skip = (page - 1) * perPage;
        const where = {
            isDelete: false,
            ...(status ? { status } : {}),
            ...(role !== "ADMIN" ? { userId: requestingUserId } : {}),
        };
        const [data, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                skip,
                take: perPage,
                orderBy: { createdAt: "desc" },
            }),
            prisma.payment.count({ where }),
        ]);
        return { data, total };
    },
    // GET PAYMENT BY ID
    async getById(id, requestingUserId, role) {
        const payment = await prisma.payment.findUnique({ where: { id } });
        if (!payment)
            return null;
        // Only admin or owner can access
        if (role !== "ADMIN" && payment.userId !== requestingUserId)
            return null;
        await createAuditLog(requestingUserId, "READ", "Payment", id);
        return payment;
    },
    // UPDATE PAYMENT STATUS (ADMIN ONLY)
    async updateStatus(id, status, updatedBy, ip, role) {
        if (role !== "ADMIN") {
            throw new Error("Unauthorized");
        }
        const updated = await prisma.payment.update({
            where: { id },
            data: { status, updatedBy },
        });
        await createAuditLog(updatedBy, "UPDATE", "Payment", id, { status });
        return updated;
    },
    // SOFT DELETE PAYMENT (ADMIN ONLY)
    async softDelete(id, updatedBy, ip, role) {
        if (role !== "ADMIN") {
            throw new Error("Unauthorized");
        }
        const deleted = await prisma.payment.update({
            where: { id },
            data: { isDelete: true, updatedBy },
        });
        await createAuditLog(updatedBy, "DELETE", "Payment", id, { isDelete: true });
        return deleted;
    },
};
//# sourceMappingURL=paymentService.js.map