import { Request, Response, NextFunction } from 'express';
import { ErrorLogger, ErrorCodes } from '../utils/error-logger';
import { AuthenticatedRequest } from './auth-middleware';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  userMessage?: string;
}

export const errorHandler = async (
  error: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  // Get user ID if available
  const userId = (req as AuthenticatedRequest).user?.id;

  // Determine status code
  const statusCode = error.statusCode || 500;

  // Log error to database and get error code
  const errorCode = await ErrorLogger.log({
    code: error.code || ErrorCodes.INTERNAL_ERROR,
    message: error.message || 'Internal server error',
    details: error.details || {},
    stack: error.stack,
    userId,
    endpoint: req.path,
    method: req.method,
    statusCode
  });

  // Determine error response
  const response: any = {
    error: error.userMessage || error.message || 'Internal server error',
    code: errorCode,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  };

  // Add details if available
  if (error.details) {
    response.details = error.details;
  }

  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};

// Async error wrapper to catch errors in async route handlers
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Custom error class for application errors
export class AppError extends Error implements ApiError {
  statusCode: number;
  code: string;
  userMessage: string;
  details?: any;

  constructor(
    message: string,
    statusCode = 500,
    code: string = ErrorCodes.INTERNAL_ERROR,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.userMessage = message;
    this.details = details;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}