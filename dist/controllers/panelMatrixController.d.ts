import { Response } from "express";
import { AuthenticatedRequest } from "../utils/types";
export declare const panelMatrixController: {
    listPanels(req: AuthenticatedRequest, res: Response): Promise<void>;
    getPanel(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    createPanel(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updatePanel(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deletePanel(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    listTestItems(req: AuthenticatedRequest, res: Response): Promise<void>;
    getTestItem(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    createTestItem(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateTestItem(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteTestItem(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    setIncluded(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    comparison(req: AuthenticatedRequest, res: Response): Promise<void>;
    comparisonHtml(req: AuthenticatedRequest, res: Response): Promise<void>;
};
//# sourceMappingURL=panelMatrixController.d.ts.map