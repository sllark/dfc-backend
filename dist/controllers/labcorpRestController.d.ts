import { Request, Response } from "express";
import { AuthenticatedRequest } from "../utils/types";
export declare const labcorpRestController: {
    health(req: Request, res: Response): Promise<void>;
    getLocations(req: AuthenticatedRequest, res: Response): Promise<void>;
    searchLocations(req: AuthenticatedRequest, res: Response): Promise<void>;
    getLocationById(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getInactiveLocations(req: AuthenticatedRequest, res: Response): Promise<void>;
    getAppointmentTimes(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    bookAppointment(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getAppointmentByConfirmationNumber(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateAppointment(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    cancelAppointment(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getAppointmentTracking(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    createSubscription(req: AuthenticatedRequest, res: Response): Promise<void>;
    deleteSubscription(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=labcorpRestController.d.ts.map