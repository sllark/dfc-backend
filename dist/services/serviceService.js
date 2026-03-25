"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceService = void 0;
const prisma_1 = require("../generated/prisma");
const encryption_1 = require("../utils/encryption");
const prisma = new prisma_1.PrismaClient();
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
exports.serviceService = {
    // ✅ Create new service
    async create(data) {
        if (data.accountNo) {
            data.accountNo = (data.accountNo);
        }
        else {
            data.accountNo = null;
        }
        if (data.panelID) {
            data.panelID = (data.panelID);
        }
        else {
            data.panelID = null;
        }
        const service = await prisma.service.create({ data });
        // 🔒 HIPAA: log creation
        await createAuditLog(data.createdBy, "CREATE", "Service", service.id, service);
        return service;
    },
    // ✅ Get all services
    async getAll({ page, perPage, search, status, minFee, maxFee, sortBy, sortOrder }) {
        const skip = (page - 1) * perPage;
        const andConditions = [];
        if (search) {
            andConditions.push({
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { slug: { contains: search, mode: "insensitive" } },
                    { description: { contains: search, mode: "insensitive" } },
                    { accountNo: { contains: (0, encryption_1.encryptDeterministic)(search), mode: "insensitive" } },
                    { panelID: { contains: (0, encryption_1.encryptDeterministic)(search), mode: "insensitive" } },
                ],
            });
        }
        if (status === "true")
            andConditions.push({ status: true });
        else if (status === "false")
            andConditions.push({ status: false });
        // Match if any stored price column falls within range (quote-only rows have all null and won't match numeric filters).
        if (minFee !== null && minFee !== undefined && maxFee !== null && maxFee !== undefined) {
            andConditions.push({
                OR: [
                    { serviceFee: { gte: minFee, lte: maxFee } },
                    { discountedServiceFee: { gte: minFee, lte: maxFee } },
                    { originalServiceFee: { gte: minFee, lte: maxFee } },
                ],
            });
        }
        else if (minFee !== null && minFee !== undefined) {
            andConditions.push({
                OR: [
                    { serviceFee: { gte: minFee } },
                    { discountedServiceFee: { gte: minFee } },
                    { originalServiceFee: { gte: minFee } },
                ],
            });
        }
        else if (maxFee !== null && maxFee !== undefined) {
            andConditions.push({
                OR: [
                    { serviceFee: { lte: maxFee } },
                    { discountedServiceFee: { lte: maxFee } },
                    { originalServiceFee: { lte: maxFee } },
                ],
            });
        }
        const where = {
            isDelete: false,
            ...(andConditions.length ? { AND: andConditions } : {}),
        };
        const orderBy = {
            [sortBy || "createdAt"]: sortOrder || "desc",
        };
        const [data, total] = await Promise.all([
            prisma.service.findMany({
                where,
                orderBy,
                skip,
                take: perPage,
            }),
            prisma.service.count({ where }),
        ]);
        return { data, total };
    },
    // ✅ Get service by ID
    async getById(id) {
        const service = await prisma.service.findUnique({ where: { id } });
        // 🔒 HIPAA: log access (READ)
        if (service) {
            await createAuditLog(service.updatedBy ?? null, "READ", "Service", service.id, null);
        }
        return service;
    },
    // ✅ Update service
    async update(id, data) {
        if (data.accountNo && typeof data.accountNo === "string") {
            data.accountNo = (data.accountNo);
        }
        if (data.panelID && typeof data.panelID === "string") {
            data.panelID = (data.panelID);
        }
        const updated = await prisma.service.update({
            where: { id },
            data,
        });
        // 🔒 HIPAA: log update
        await createAuditLog(data.updatedBy ?? null, "UPDATE", "Service", updated.id, data);
        return updated;
    },
    // ✅ Soft delete
    async softDelete(id, updatedBy) {
        const deleted = await prisma.service.update({
            where: { id },
            data: { isDelete: true, updatedBy },
        });
        // 🔒 HIPAA: log delete
        await createAuditLog(updatedBy, "DELETE", "Service", deleted.id, { isDelete: true });
        return deleted;
    },
};
//# sourceMappingURL=serviceService.js.map