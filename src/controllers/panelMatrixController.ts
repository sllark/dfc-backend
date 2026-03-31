import { Response } from "express";
import { AuthenticatedRequest } from "../utils/types";
import { panelMatrixService } from "../services/panelMatrixService";
import { requireAdmin } from "../utils/roles";

export const panelMatrixController = {
    // ================= Panels =================
    async listPanels(req: AuthenticatedRequest, res: Response) {
        const panels = await panelMatrixService.getPanels();
        res.json({ success: true, data: panels });
    },

    async getPanel(req: AuthenticatedRequest, res: Response) {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid panel id" });
        const panel = await panelMatrixService.getPanelById(id);
        if (!panel) return res.status(404).json({ success: false, message: "Panel not found" });
        res.json({ success: true, data: panel });
    },

    async createPanel(req: AuthenticatedRequest, res: Response) {
        requireAdmin(req);
        const { name, slug, displayOrder, accountNo, panelTestCode, priceCents, isActive } = req.body ?? {};
        if (!name || !accountNo || !panelTestCode || priceCents === undefined) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: name, accountNo, panelTestCode, priceCents",
            });
        }
        const created = await panelMatrixService.createPanel({
            name,
            slug,
            displayOrder: Number(displayOrder ?? 0),
            accountNo: String(accountNo),
            panelTestCode: String(panelTestCode),
            priceCents: Number(priceCents),
            isActive: isActive === undefined ? true : Boolean(isActive),
        } as any);
        res.status(201).json({ success: true, data: created });
    },

    async updatePanel(req: AuthenticatedRequest, res: Response) {
        requireAdmin(req);
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid panel id" });
        const updated = await panelMatrixService.updatePanel(id, req.body ?? {});
        res.json({ success: true, data: updated });
    },

    async deletePanel(req: AuthenticatedRequest, res: Response) {
        requireAdmin(req);
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid panel id" });
        const updated = await panelMatrixService.deactivatePanel(id);
        res.json({ success: true, data: updated });
    },

    // ================= Test Items =================
    async listTestItems(req: AuthenticatedRequest, res: Response) {
        const items = await panelMatrixService.getTestItems();
        res.json({ success: true, data: items });
    },

    async getTestItem(req: AuthenticatedRequest, res: Response) {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid test item id" });
        const item = await panelMatrixService.getTestItemById(id);
        if (!item) return res.status(404).json({ success: false, message: "Test item not found" });
        res.json({ success: true, data: item });
    },

    async createTestItem(req: AuthenticatedRequest, res: Response) {
        requireAdmin(req);
        const { name, slug, category, displayOrder, isActive } = req.body ?? {};
        if (!name) {
            return res.status(400).json({ success: false, message: "Missing required field: name" });
        }
        const created = await panelMatrixService.createTestItem({
            name,
            slug,
            category: category ? String(category) : null,
            displayOrder: Number(displayOrder ?? 0),
            isActive: isActive === undefined ? true : Boolean(isActive),
        } as any);
        res.status(201).json({ success: true, data: created });
    },

    async updateTestItem(req: AuthenticatedRequest, res: Response) {
        requireAdmin(req);
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid test item id" });
        const updated = await panelMatrixService.updateTestItem(id, req.body ?? {});
        res.json({ success: true, data: updated });
    },

    async deleteTestItem(req: AuthenticatedRequest, res: Response) {
        requireAdmin(req);
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid test item id" });
        const updated = await panelMatrixService.deactivateTestItem(id);
        res.json({ success: true, data: updated });
    },

    // ================= Matrix =================
    async setIncluded(req: AuthenticatedRequest, res: Response) {
        requireAdmin(req);
        const panelId = Number(req.params.panelId);
        const testItemId = Number(req.params.testItemId);
        if (isNaN(panelId) || isNaN(testItemId)) {
            return res.status(400).json({ success: false, message: "Invalid panelId or testItemId" });
        }
        const { included } = req.body ?? {};
        if (included === undefined) {
            return res.status(400).json({ success: false, message: "Missing required field: included" });
        }
        const updated = await panelMatrixService.setIncluded(panelId, testItemId, Boolean(included));
        res.json({ success: true, data: updated });
    },

    // Public-friendly endpoint for website table
    async comparison(req: AuthenticatedRequest, res: Response) {
        const table = await panelMatrixService.getComparisonTable();
        res.json({ success: true, data: table });
    },

    // HTML preview that looks like the screenshot (server-rendered)
    async comparisonHtml(req: AuthenticatedRequest, res: Response) {
        const table = await panelMatrixService.getComparisonTable();

        const check = `<span class="chk" aria-label="Included">✓</span>`;
        const dash = `<span class="dash" aria-label="Not included">–</span>`;

        const headCells = [
            `<th class="th th-left">Test Name</th>`,
            ...table.panels.map((p) => `<th class="th">${escapeHtml(p.name)}</th>`),
        ].join("");

        const bodyRows = table.testItems
            .map((t) => {
                const cells = table.panels
                    .map((p) => {
                        const inc =
                            table.grid
                                .find((g) => g.panelId === p.id)
                                ?.testItems.find((x) => x.testItemId === t.id)?.included ?? false;
                        return `<td class="td td-center">${inc ? check : dash}</td>`;
                    })
                    .join("");

                return `<tr class="tr">
  <td class="td td-left">${escapeHtml(t.name)}</td>
  ${cells}
</tr>`;
            })
            .join("\n");

        const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pricing Structure for Tests</title>
  <style>
    :root{
      --navy:#0f2345;
      --rowBlue:#2f78b7;
      --grid:#d8dbe2;
      --check:#21b573;
      --bg:#ffffff;
      --text:#0b1220;
    }
    body{ margin:0; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; background:var(--bg); color:var(--text);}
    .wrap{ padding:24px; }
    .title{ text-align:center; font-weight:700; font-size:28px; margin:8px 0 6px; }
    .sub{ text-align:center; color:#6b7280; margin:0 0 18px; font-size:13px; }
    .tableWrap{ overflow:auto; border-radius:10px; box-shadow: 0 8px 24px rgba(15,35,69,.08); border:1px solid #eef0f5;}
    table{ width:100%; border-collapse:separate; border-spacing:0; min-width:900px; }
    .th{ background:var(--navy); color:white; padding:14px 14px; font-size:14px; font-weight:700; border-right:1px solid rgba(255,255,255,.08); }
    .th-left{ width:240px; }
    .tr .td{ border-right:1px solid var(--grid); border-bottom:1px solid var(--grid); background:white; }
    .td{ padding:12px 14px; font-size:13px; }
    .td-left{ background:var(--rowBlue) !important; color:white; font-weight:600; }
    .td-center{ text-align:center; }
    .chk{ display:inline-flex; width:20px; height:20px; align-items:center; justify-content:center; border-radius:999px; background:var(--check); color:white; font-weight:900; font-size:13px; }
    .dash{ color:#111827; font-weight:700; }
    /* rounded corners */
    thead tr th:first-child{ border-top-left-radius:10px; }
    thead tr th:last-child{ border-top-right-radius:10px; border-right:none; }
    tbody tr:last-child td:first-child{ border-bottom-left-radius:10px; }
    tbody tr:last-child td:last-child{ border-bottom-right-radius:10px; border-right:none; }
    tbody tr td:last-child{ border-right:none; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="title">Pricing Structure for Tests</div>
    <p class="sub">A clear overview of what each drug-testing panel includes. Built to help employers choose the right level of screening for their workforce.</p>
    <div class="tableWrap">
      <table>
        <thead><tr>${headCells}</tr></thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

        // Override the global JSON header middleware for this response
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.status(200).send(html);
    },
};

function escapeHtml(input: string) {
    return String(input)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

