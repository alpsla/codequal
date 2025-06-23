import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
}
export interface AuthenticatedUser {
    id: string;
    email: string;
    organizationId?: string;
    permissions: string[];
    role: string;
    status: string;
    session: {
        token: string;
        expiresAt: Date;
    };
}
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const checkRepositoryAccess: (user: AuthenticatedUser, repositoryUrl: string) => Promise<boolean>;
//# sourceMappingURL=auth-middleware.d.ts.map