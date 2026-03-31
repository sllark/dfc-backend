"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.panelMatrixService = void 0;
const prisma_1 = require("../generated/prisma");
const encryption_1 = require("../utils/encryption");
const prisma = new prisma_1.PrismaClient();
function normalizeSlug(input) {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
}
exports.panelMatrixService = {
    // ================= Panels =================
    async createPanel(data) {
        const slug = data.slug ? normalizeSlug(data.slug) : normalizeSlug(data.name);
        const created = await prisma.panel.create({
            data: {
                ...data,
                slug,
                accountNo: (0, encryption_1.encryptDeterministic)(data.accountNo),
            },
        });
        return { ...created, accountNo: (0, encryption_1.decryptDeterministic)(created.accountNo) };
    },
    async updatePanel(id, data) {
        const updateData = { ...data };
        if (typeof data.name === "string" && !data.slug) {
            updateData.slug = normalizeSlug(data.name);
        }
        if (typeof data.accountNo === "string") {
            updateData.accountNo = (0, encryption_1.encryptDeterministic)(data.accountNo);
        }
        const updated = await prisma.panel.update({ where: { id }, data: updateData });
        return { ...updated, accountNo: (0, encryption_1.decryptDeterministic)(updated.accountNo) };
    },
    async getPanels() {
        const panels = await prisma.panel.findMany({
            where: { isActive: true },
            orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
        });
        return panels.map((p) => ({ ...p, accountNo: (0, encryption_1.decryptDeterministic)(p.accountNo) }));
    },
    async getPanelById(id) {
        const panel = await prisma.panel.findUnique({ where: { id } });
        if (!panel)
            return null;
        return { ...panel, accountNo: (0, encryption_1.decryptDeterministic)(panel.accountNo) };
    },
    async deactivatePanel(id) {
        const panel = await prisma.panel.update({ where: { id }, data: { isActive: false } });
        return { ...panel, accountNo: (0, encryption_1.decryptDeterministic)(panel.accountNo) };
    },
    async findPanelForOrder(args) {
        if (args.panelRefId) {
            const panel = await prisma.panel.findUnique({ where: { id: args.panelRefId } });
            if (!panel || !panel.isActive)
                return null;
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
    async createTestItem(data) {
        const slug = data.slug ? normalizeSlug(data.slug) : normalizeSlug(data.name);
        return prisma.testItem.create({ data: { ...data, slug } });
    },
    async updateTestItem(id, data) {
        const updateData = { ...data };
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
    async getTestItemById(id) {
        return prisma.testItem.findUnique({ where: { id } });
    },
    async deactivateTestItem(id) {
        return prisma.testItem.update({ where: { id }, data: { isActive: false } });
    },
    // ================= Matrix (cells) =================
    async setIncluded(panelId, testItemId, included) {
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
        const includedMap = new Map();
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
            included: (panelId, testItemId) => includedMap.get(`${panelId}:${testItemId}`) ?? false,
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
//# sourceMappingURL=panelMatrixService.js.map