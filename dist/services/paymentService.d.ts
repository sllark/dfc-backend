import { Prisma } from "../generated/prisma";
interface GetAllParams {
    page: number;
    perPage: number;
    status?: string;
    requestingUserId: number;
    role: "ADMIN" | "USER";
}
export declare const paymentService: {
    create(data: Omit<Prisma.PaymentUncheckedCreateInput, "createdBy"> & {
        createdBy: number;
    }, ip: string): Promise<{
        userId: number;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        status: string;
        isDelete: boolean;
        createdBy: number;
        updatedBy: number | null;
        donorRegistrationId: number;
        amount: number;
        currency: string;
        paymentMethod: string;
        transactionId: string;
    }>;
    getAll({ page, perPage, status, requestingUserId, role }: GetAllParams): Promise<{
        data: {
            userId: number;
            createdAt: Date;
            updatedAt: Date;
            id: number;
            status: string;
            isDelete: boolean;
            createdBy: number;
            updatedBy: number | null;
            donorRegistrationId: number;
            amount: number;
            currency: string;
            paymentMethod: string;
            transactionId: string;
        }[];
        total: number;
    }>;
    getById(id: number, requestingUserId: number, role: "ADMIN" | "USER"): Promise<{
        userId: number;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        status: string;
        isDelete: boolean;
        createdBy: number;
        updatedBy: number | null;
        donorRegistrationId: number;
        amount: number;
        currency: string;
        paymentMethod: string;
        transactionId: string;
    } | null>;
    updateStatus(id: number, status: string, updatedBy: number, ip: string, role: "ADMIN" | "USER"): Promise<{
        userId: number;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        status: string;
        isDelete: boolean;
        createdBy: number;
        updatedBy: number | null;
        donorRegistrationId: number;
        amount: number;
        currency: string;
        paymentMethod: string;
        transactionId: string;
    }>;
    softDelete(id: number, updatedBy: number, ip: string, role: "ADMIN" | "USER"): Promise<{
        userId: number;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        status: string;
        isDelete: boolean;
        createdBy: number;
        updatedBy: number | null;
        donorRegistrationId: number;
        amount: number;
        currency: string;
        paymentMethod: string;
        transactionId: string;
    }>;
};
export {};
//# sourceMappingURL=paymentService.d.ts.map