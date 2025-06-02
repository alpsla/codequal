import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error for debugging
  console.error('API Error:', {
    message: error.message,
    statusCode: error.statusCode,
    code: error.code,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });

  // Determine status code
  const statusCode = error.statusCode || 500;

  // Determine error response
  const response: any = {
    error: error.message || 'Internal server error',
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  };

  // Add error code if available
  if (error.code) {
    response.code = error.code;
  }

  // Add details in development mode
  if (process.env.NODE_ENV === 'development' && error.details) {
    response.details = error.details;
  }

  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};