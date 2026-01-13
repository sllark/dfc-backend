import { Response } from "express";
import { AuthenticatedRequest } from "../utils/types";
export declare const donorRegistrationController: {
    create(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getAll(req: AuthenticatedRequest, res: Response): Promise<void>;
    getById(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    update(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    softDelete(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    confirmDirect(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    reject(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=donorRegistrationController.d.ts.map