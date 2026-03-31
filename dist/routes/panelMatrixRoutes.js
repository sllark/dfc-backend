"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../middlewares/authMiddleware"));
const panelMatrixController_1 = require("../controllers/panelMatrixController");
const router = (0, express_1.Router)();
// Public: comparison table for website
router.get("/panel-comparison", panelMatrixController_1.panelMatrixController.comparison);
router.get("/panel-comparison/view", panelMatrixController_1.panelMatrixController.comparisonHtml);
// Public: list panels + test items (admin UI can also use these)
router.get("/panels", panelMatrixController_1.panelMatrixController.listPanels);
router.get("/panels/:id", panelMatrixController_1.panelMatrixController.getPanel);
router.get("/test-items", panelMatrixController_1.panelMatrixController.listTestItems);
router.get("/test-items/:id", panelMatrixController_1.panelMatrixController.getTestItem);
// Admin: panels CRUD
router.post("/panels", authMiddleware_1.default.authenticate, panelMatrixController_1.panelMatrixController.createPanel);
router.put("/panels/:id", authMiddleware_1.default.authenticate, panelMatrixController_1.panelMatrixController.updatePanel);
router.delete("/panels/:id", authMiddleware_1.default.authenticate, panelMatrixController_1.panelMatrixController.deletePanel);
// Admin: test items CRUD
router.post("/test-items", authMiddleware_1.default.authenticate, panelMatrixController_1.panelMatrixController.createTestItem);
router.put("/test-items/:id", authMiddleware_1.default.authenticate, panelMatrixController_1.panelMatrixController.updateTestItem);
router.delete("/test-items/:id", authMiddleware_1.default.authenticate, panelMatrixController_1.panelMatrixController.deleteTestItem);
// Admin: matrix toggle
router.put("/panels/:panelId/test-items/:testItemId", authMiddleware_1.default.authenticate, panelMatrixController_1.panelMatrixController.setIncluded);
exports.default = router;
//# sourceMappingURL=panelMatrixRoutes.js.map