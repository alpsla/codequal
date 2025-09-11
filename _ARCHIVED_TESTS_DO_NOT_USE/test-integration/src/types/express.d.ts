import { AuthenticatedUser } from '../../../../apps/api/src/middleware/auth-middleware';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};