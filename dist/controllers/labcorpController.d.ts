import { Response } from 'express';
import { AuthenticatedRequest } from '../utils/types';
export declare const labcorpController: {
    /**
     * Locate collection sites by zip code
     * POST /api/labcorp/locate-sites
     */
    locateSites(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Handle selected location for order placement
     * POST /api/labcorp/select-location
     */
    selectLocation(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=labcorpController.d.ts.map