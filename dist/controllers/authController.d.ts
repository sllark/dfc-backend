import type { Request, Response } from 'express';
import { AuthenticatedRequest } from '../utils/types';
declare class AuthController {
    static signup: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    static login: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    static getUserById: (req: AuthenticatedRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
    static getAllUsers: (req: AuthenticatedRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
    static updateUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    static logout: (req: AuthenticatedRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
    static forgotPassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    static verifyOTP: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    static resetPassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
}
export default AuthController;
//# sourceMappingURL=authController.d.ts.map