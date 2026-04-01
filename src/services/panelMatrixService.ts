import { PrismaClient, Prisma } from "@prisma/client";
import { decryptDeterministic, encryptDeterministic } from "../utils/encryption";

const prisma = new PrismaClient();

function normalizeSlug(input: string) {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
}

export const panelMatrixService = {
    // ================= Panels =================
    async createPanel(data: Prisma.PanelCreateInput) {
        const slug = data.slug ? normalizeSlug(data.slug) : normalizeSlug(data.name);
        const created = await prisma.panel.create({
            data: {
                ...data,
                slug,
                accountNo: encryptDeterministic(data.accountNo),
            },
        });
        return { ...created, accountNo: decryptDeterministic(created.accountNo) };
    },

    async updatePanel(id: number, data: Prisma.PanelUpdateInput) {
        const updateData: Prisma.PanelUpdateInput = { ...data };
        if (typeof data.name === "string" && !data.slug) {
            updateData.slug = normalizeSlug(data.name);
        }
        if (typeof (data as any).accountNo === "string") {
            (updateData as any).accountNo = encryptDeterministic((data as any).accountNo);
        }

        const updated = await prisma.panel.update({ where: { id }, data: updateData });
        return { ...updated, accountNo: decryptDeterministic(updated.accountNo) };
    },

    async getPanels() {
        const panels = await prisma.panel.findMany({
            where: { isActive: true },
            orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
        });
        return panels.map((p) => ({ ...p, accountNo: decryptDeterministic(p.accountNo) }));
    },

    async getPanelById(id: number) {
        const panel = await prisma.panel.findUnique({ where: { id } });
        if (!panel) return null;
        return { ...panel, accountNo: decryptDeterministic(panel.accountNo) };
    },

    async deactivatePanel(id: number) {
        const panel = await prisma.panel.update({ where: { id }, data: { isActive: false } });
        return { ...panel, accountNo: decryptDeterministic(panel.accountNo) };
    },

    async findPanelForOrder(args: { panelRefId?: number; panelTestCode?: string }) {
        if (args.panelRefId) {
            const panel = await prisma.panel.findUnique({ where: { id: args.panelRefId } });
            if (!panel || !panel.isActive) return null;
            return panel;
        }

        if (args.panelTestCode) {
            const panel = await prisma.panel.findFirst({
                where: { panelTestCode: args.panelTestCode, isActive: true },
                orderBy: { id: "asc" },
            });
            return panel ?? null;
        }

        return null;
    },

    // ================= Test Items =================
    async createTestItem(data: Prisma.TestItemCreateInput) {
        const slug = data.slug ? normalizeSlug(data.slug) : normalizeSlug(data.name);
        return prisma.testItem.create({ data: { ...data, slug } });
    },

    async updateTestItem(id: number, data: Prisma.TestItemUpdateInput) {
        const updateData: Prisma.TestItemUpdateInput = { ...data };
        if (typeof data.name === "string" && !data.slug) {
            updateData.slug = normalizeSlug(data.name);
        }
        return prisma.testItem.update({ where: { id }, data: updateData });
    },

    async getTestItems() {
        return prisma.testItem.findMany({
            where: { isActive: true },
            orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
        });
    },

    async getTestItemById(id: number) {
        return prisma.testItem.findUnique({ where: { id } });
    },

    async deactivateTestItem(id: number) {
        return prisma.testItem.update({ where: { id }, data: { isActive: false } });
    },

    // ================= Matrix (cells) =================
    async setIncluded(panelId: number, testItemId: number, included: boolean) {
        return prisma.panelTestItem.upsert({
            where: { panelId_testItemId: { panelId, testItemId } },
            create: { panelId, testItemId, included },
            update: { included },
        });
    },

    async getComparisonTable() {
        const [panels, testItems, cells] = await Promise.all([
            prisma.panel.findMany({
                where: { isActive: true },
                orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
            }),
            prisma.testItem.findMany({
                where: { isActive: true },
                orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
            }),
            prisma.panelTestItem.findMany({
                where: {
                    panel: { isActive: true },
                    testItem: { isActive: true },
                },
                select: { panelId: true, testItemId: true, included: true },
            }),
        ]);

        const includedMap = new Map<string, boolean>();
        for (const c of cells) {
            includedMap.set(`${c.panelId}:${c.testItemId}`, c.included);
        }

        return {
            panels: panels.map((p) => ({
                id: p.id,
                name: p.name,
                slug: p.slug,
                displayOrder: p.displayOrder,
                panelTestCode: p.panelTestCode,
                priceCents: p.priceCents,
            })),
            testItems: testItems.map((t) => ({
                id: t.id,
                name: t.name,
                slug: t.slug,
                category: t.category,
                displayOrder: t.displayOrder,
            })),
            included: (panelId: number, testItemId: number) =>
                includedMap.get(`${panelId}:${testItemId}`) ?? false,
            // Also return a flattened grid that is easy to render in FE:
            grid: panels.map((p) => ({
                panelId: p.id,
                testItems: testItems.map((t) => ({
                    testItemId: t.id,
                    included: includedMap.get(`${p.id}:${t.id}`) ?? false,
                })),
            })),
        };
    },
};

