import { Prisma } from "../generated/prisma";
export declare const panelMatrixService: {
    createPanel(data: Prisma.PanelCreateInput): Promise<{
        accountNo: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        slug: string;
        displayOrder: number;
        panelTestCode: string;
        priceCents: number;
    }>;
    updatePanel(id: number, data: Prisma.PanelUpdateInput): Promise<{
        accountNo: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        slug: string;
        displayOrder: number;
        panelTestCode: string;
        priceCents: number;
    }>;
    getPanels(): Promise<{
        accountNo: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        slug: string;
        displayOrder: number;
        panelTestCode: string;
        priceCents: number;
    }[]>;
    getPanelById(id: number): Promise<{
        accountNo: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        slug: string;
        displayOrder: number;
        panelTestCode: string;
        priceCents: number;
    } | null>;
    deactivatePanel(id: number): Promise<{
        accountNo: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        slug: string;
        displayOrder: number;
        panelTestCode: string;
        priceCents: number;
    }>;
    findPanelForOrder(args: {
        panelRefId?: number;
        panelTestCode?: string;
    }): Promise<{
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        slug: string;
        accountNo: string;
        displayOrder: number;
        panelTestCode: string;
        priceCents: number;
    } | null>;
    createTestItem(data: Prisma.TestItemCreateInput): Promise<{
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        slug: string;
        displayOrder: number;
        category: string | null;
    }>;
    updateTestItem(id: number, data: Prisma.TestItemUpdateInput): Promise<{
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        slug: string;
        displayOrder: number;
        category: string | null;
    }>;
    getTestItems(): Promise<{
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        slug: string;
        displayOrder: number;
        category: string | null;
    }[]>;
    getTestItemById(id: number): Promise<{
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        slug: string;
        displayOrder: number;
        category: string | null;
    } | null>;
    deactivateTestItem(id: number): Promise<{
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        slug: string;
        displayOrder: number;
        category: string | null;
    }>;
    setIncluded(panelId: number, testItemId: number, included: boolean): Promise<{
        createdAt: Date;
        updatedAt: Date;
        id: number;
        panelId: number;
        included: boolean;
        testItemId: number;
    }>;
    getComparisonTable(): Promise<{
        panels: {
            id: number;
            name: string;
            slug: string;
            displayOrder: number;
            panelTestCode: string;
            priceCents: number;
        }[];
        testItems: {
            id: number;
            name: string;
            slug: string;
            category: string | null;
            displayOrder: number;
        }[];
        included: (panelId: number, testItemId: number) => boolean;
        grid: {
            panelId: number;
            testItems: {
                testItemId: number;
                included: boolean;
            }[];
        }[];
    }>;
};
//# sourceMappingURL=panelMatrixService.d.ts.map