import { PrismaClient, Prisma } from "../generated/prisma";
import { getClientIp } from "../utils/ipUtils";

const prisma = new PrismaClient();

// Audit log helper
async function createAuditLog(
    userId: number | null,
    action: string,
    model: string,
    recordId?: number,
    details?: any
) {
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

interface GetAllParams {
    page: number;
    perPage: number;
    status?: string;
    requestingUserId: number;
    role: "ADMIN" | "USER";
}

export const paymentService = {
    // CREATE PAYMENT
    async create(
        data: Omit<Prisma.PaymentUncheckedCreateInput, "createdBy"> & { createdBy: number },
        ip: string
    ) {
        const payment = await prisma.payment.create({ data });

        await createAuditLog(data.createdBy, "CREATE", "Payment", payment.id, payment);

        return payment;
    },

    // GET ALL PAYMENTS
    async getAll({ page, perPage, status, requestingUserId, role }: GetAllParams) {
        const skip = (page - 1) * perPage;

        const where: Prisma.PaymentWhereInput = {
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
    async getById(id: number, requestingUserId: number, role: "ADMIN" | "USER") {
        const payment = await prisma.payment.findUnique({ where: { id } });

        if (!payment) return null;

        // Only admin or owner can access
        if (role !== "ADMIN" && payment.userId !== requestingUserId) return null;

        await createAuditLog(requestingUserId, "READ", "Payment", id);

        return payment;
    },

    // UPDATE PAYMENT STATUS (ADMIN ONLY)
    async updateStatus(
        id: number,
        status: string,
        updatedBy: number,
        ip: string,
        role: "ADMIN" | "USER"
    ) {
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
    async softDelete(id: number, updatedBy: number, ip: string, role: "ADMIN" | "USER") {
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
