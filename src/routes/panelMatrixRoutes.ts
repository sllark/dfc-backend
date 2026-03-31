import { Router } from "express";
import AuthMiddleware from "../middlewares/authMiddleware";
import { panelMatrixController } from "../controllers/panelMatrixController";

const router = Router();

// Public: comparison table for website
router.get("/panel-comparison", panelMatrixController.comparison);
router.get("/panel-comparison/view", panelMatrixController.comparisonHtml);

// Public: list panels + test items (admin UI can also use these)
router.get("/panels", panelMatrixController.listPanels);
router.get("/panels/:id", panelMatrixController.getPanel);
router.get("/test-items", panelMatrixController.listTestItems);
router.get("/test-items/:id", panelMatrixController.getTestItem);

// Admin: panels CRUD
router.post("/panels", AuthMiddleware.authenticate, panelMatrixController.createPanel);
router.put("/panels/:id", AuthMiddleware.authenticate, panelMatrixController.updatePanel);
router.delete("/panels/:id", AuthMiddleware.authenticate, panelMatrixController.deletePanel);

// Admin: test items CRUD
router.post("/test-items", AuthMiddleware.authenticate, panelMatrixController.createTestItem);
router.put("/test-items/:id", AuthMiddleware.authenticate, panelMatrixController.updateTestItem);
router.delete("/test-items/:id", AuthMiddleware.authenticate, panelMatrixController.deleteTestItem);

// Admin: matrix toggle
router.put(
    "/panels/:panelId/test-items/:testItemId",
    AuthMiddleware.authenticate,
    panelMatrixController.setIncluded
);

export default router;

