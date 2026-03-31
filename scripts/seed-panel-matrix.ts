import { PrismaClient } from "../src/generated/prisma";
import { encryptDeterministic } from "../src/utils/encryption";

const prisma = new PrismaClient();

type PanelSeed = {
    slug: string;
    name: string;
    displayOrder: number;
    panelTestCode: string;
    accountNo: string;
    priceCents: number;
};

type TestItemSeed = {
    slug: string;
    name: string;
    displayOrder: number;
    category?: string;
};

async function main() {
    const panels: PanelSeed[] = [
        { slug: "dot", name: "DOT", displayOrder: 1, panelTestCode: "708392", accountNo: "09456155", priceCents: 1240 },
        { slug: "5-panel-thc", name: "5 Panel (THC)", displayOrder: 2, panelTestCode: "793127", accountNo: "09027655", priceCents: 1240 },
        { slug: "5-panel-no-thc", name: "5 Panel (No THC)", displayOrder: 3, panelTestCode: "723641", accountNo: "09027655", priceCents: 1150 },
        { slug: "9-panel", name: "9-Panel Test", displayOrder: 4, panelTestCode: "727353", accountNo: "09027655", priceCents: 1150 },
        { slug: "12-panel", name: "12-Panel Test", displayOrder: 5, panelTestCode: "765245", accountNo: "09027655", priceCents: 1400 },
    ];

    const testItems: TestItemSeed[] = [
        { slug: "marijuana-thc", name: "Marijuana (THC)", displayOrder: 1, category: "DRUG" },
        { slug: "cocaine", name: "Cocaine", displayOrder: 2, category: "DRUG" },
        { slug: "amphetamine", name: "Amphetamine", displayOrder: 3, category: "DRUG" },
        { slug: "methamphetamine", name: "Methamphetamine", displayOrder: 4, category: "DRUG" },
        { slug: "codeine", name: "Codeine", displayOrder: 5, category: "DRUG" },
        { slug: "morphine", name: "Morphine", displayOrder: 6, category: "DRUG" },
        { slug: "heroin-6-am", name: "Heroin (6-AM)", displayOrder: 7, category: "DRUG" },
        { slug: "hydrocodone", name: "Hydrocodone", displayOrder: 8, category: "DRUG" },
        { slug: "hydromorphone", name: "Hydromorphone", displayOrder: 9, category: "DRUG" },
        { slug: "oxycodone", name: "Oxycodone", displayOrder: 10, category: "DRUG" },
        { slug: "oxymorphone", name: "Oxymorphone", displayOrder: 11, category: "DRUG" },
        { slug: "pcp", name: "Phencyclidine (PCP)", displayOrder: 12, category: "DRUG" },
        { slug: "benzodiazepines", name: "Benzodiazepines", displayOrder: 13, category: "DRUG" },
        { slug: "barbiturates", name: "Barbiturates", displayOrder: 14, category: "DRUG" },
        { slug: "methadone", name: "Methadone", displayOrder: 15, category: "DRUG" },
        { slug: "propoxyphene", name: "Propoxyphene", displayOrder: 16, category: "DRUG" },
        { slug: "mdma", name: "MDMA (Ecstasy)", displayOrder: 17, category: "DRUG" },
        { slug: "svt-creatinine", name: "Specimen Validity Testing (Creatinine)", displayOrder: 18, category: "SVT" },
        { slug: "svt-sg-ph-oxidants", name: "Specimen Validity Testing (Sp. Gravity, PH, Oxidants)", displayOrder: 19, category: "SVT" },
    ];

    // Inclusion matrix from your screenshot (✅/—)
    const included: Record<string, Record<string, boolean>> = {
        dot: {
            "marijuana-thc": true,
            cocaine: true,
            amphetamine: true,
            methamphetamine: true,
            codeine: true,
            morphine: true,
            "heroin-6-am": true,
            hydrocodone: true,
            hydromorphone: true,
            oxycodone: true,
            oxymorphone: true,
            pcp: true,
        },
        "5-panel-thc": {
            "marijuana-thc": true,
            cocaine: true,
            amphetamine: true,
            methamphetamine: true,
            codeine: true,
            morphine: true,
            "heroin-6-am": true,
            hydrocodone: true,
            hydromorphone: true,
            oxycodone: true,
            oxymorphone: true,
            pcp: true,
        },
        "5-panel-no-thc": {
            cocaine: true,
            amphetamine: true,
            methamphetamine: true,
            codeine: true,
            morphine: true,
            "heroin-6-am": true,
            hydrocodone: true,
            hydromorphone: true,
            oxycodone: true,
            oxymorphone: true,
            pcp: true,
            "svt-creatinine": true,
            "svt-sg-ph-oxidants": true,
        },
        "9-panel": {
            "marijuana-thc": true,
            cocaine: true,
            amphetamine: true,
            methamphetamine: true,
            codeine: true,
            morphine: true,
            "heroin-6-am": true,
            pcp: true,
            benzodiazepines: true,
            barbiturates: true,
            methadone: true,
            propoxyphene: true,
            "svt-creatinine": true,
            "svt-sg-ph-oxidants": true,
        },
        "12-panel": {
            "marijuana-thc": true,
            cocaine: true,
            amphetamine: true,
            methamphetamine: true,
            codeine: true,
            morphine: true,
            "heroin-6-am": true,
            oxycodone: true,
            oxymorphone: true,
            pcp: true,
            benzodiazepines: true,
            barbiturates: true,
            methadone: true,
            propoxyphene: true,
            mdma: true,
            "svt-creatinine": true,
        },
    };

    // Upsert panels
    for (const p of panels) {
        await prisma.panel.upsert({
            where: { slug: p.slug },
            update: {
                name: p.name,
                displayOrder: p.displayOrder,
                panelTestCode: p.panelTestCode,
                accountNo: encryptDeterministic(p.accountNo),
                priceCents: p.priceCents,
                isActive: true,
            },
            create: {
                name: p.name,
                slug: p.slug,
                displayOrder: p.displayOrder,
                panelTestCode: p.panelTestCode,
                accountNo: encryptDeterministic(p.accountNo),
                priceCents: p.priceCents,
                isActive: true,
            },
        });
    }

    // Upsert test items
    for (const t of testItems) {
        await prisma.testItem.upsert({
            where: { slug: t.slug },
            update: {
                name: t.name,
                displayOrder: t.displayOrder,
                category: t.category ?? null,
                isActive: true,
            },
            create: {
                name: t.name,
                slug: t.slug,
                displayOrder: t.displayOrder,
                category: t.category ?? null,
                isActive: true,
            },
        });
    }

    const panelRows = await prisma.panel.findMany({ where: { slug: { in: panels.map((p) => p.slug) } } });
    const testRows = await prisma.testItem.findMany({ where: { slug: { in: testItems.map((t) => t.slug) } } });

    const panelBySlug = new Map(panelRows.map((p) => [p.slug, p]));
    const testBySlug = new Map(testRows.map((t) => [t.slug, t]));

    // Upsert matrix cells (set included; anything unspecified defaults false)
    for (const p of panels) {
        for (const t of testItems) {
            const panel = panelBySlug.get(p.slug)!;
            const test = testBySlug.get(t.slug)!;
            const isIncluded = included[p.slug]?.[t.slug] ?? false;
            await prisma.panelTestItem.upsert({
                where: { panelId_testItemId: { panelId: panel.id, testItemId: test.id } },
                update: { included: isIncluded },
                create: { panelId: panel.id, testItemId: test.id, included: isIncluded },
            });
        }
    }

    console.log("✅ Seeded panels, test items, and comparison matrix.");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

