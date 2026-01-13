import { Response } from "express";
import { AuthenticatedRequest } from "../utils/types";
export declare const paymentController: {
    create(req: AuthenticatedRequest, res: Response): Promise<void>;
    getAll(req: AuthenticatedRequest, res: Response): Promise<void>;
    getById(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateStatus(req: AuthenticatedRequest, res: Response): Promise<void>;
    softDelete(req: AuthenticatedRequest, res: Response): Promise<void>;
};
//# sourceMappingURL=paymentController.d.ts.map