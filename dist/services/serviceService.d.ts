import { Prisma } from "../generated/prisma";
interface GetAllParams {
    page: number;
    perPage: number;
    search?: string | null;
    status?: string | null;
    minFee?: number | null;
    maxFee?: number | null;
    sortBy?: "createdAt" | "serviceFee";
    sortOrder?: "asc" | "desc";
}
export declare const serviceService: {
    create(data: Prisma.ServiceUncheckedCreateInput): Promise<{
        name: string;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        serviceFee: number | null;
        status: boolean;
        slug: string;
        accountNo: string | null;
        panelID: string | null;
        bannerImage: string | null;
        isDelete: boolean;
        createdBy: number;
        updatedBy: number | null;
    }>;
    getAll({ page, perPage, search, status, minFee, maxFee, sortBy, sortOrder }: GetAllParams): Promise<{
        data: {
            name: string;
            createdAt: Date;
            updatedAt: Date;
            id: number;
            serviceFee: number | null;
            status: boolean;
            slug: string;
            accountNo: string | null;
            panelID: string | null;
            bannerImage: string | null;
            isDelete: boolean;
            createdBy: number;
            updatedBy: number | null;
        }[];
        total: number;
    }>;
    getById(id: number): Promise<{
        name: string;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        serviceFee: number | null;
        status: boolean;
        slug: string;
        accountNo: string | null;
        panelID: string | null;
        bannerImage: string | null;
        isDelete: boolean;
        createdBy: number;
        updatedBy: number | null;
    } | null>;
    update(id: number, data: Prisma.ServiceUncheckedUpdateInput): Promise<{
        name: string;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        serviceFee: number | null;
        status: boolean;
        slug: string;
        accountNo: string | null;
        panelID: string | null;
        bannerImage: string | null;
        isDelete: boolean;
        createdBy: number;
        updatedBy: number | null;
    }>;
    softDelete(id: number, updatedBy: number): Promise<{
        name: string;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        serviceFee: number | null;
        status: boolean;
        slug: string;
        accountNo: string | null;
        panelID: string | null;
        bannerImage: string | null;
        isDelete: boolean;
        createdBy: number;
        updatedBy: number | null;
    }>;
};
export {};
//# sourceMappingURL=serviceService.d.ts.map