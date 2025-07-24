import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@codequal/core/utils/logger';

const logger = createLogger('request-logger');

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Log request
  logger.info(`${req.method} ${req.url} - ${req.ip}`);
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = ((...args: Parameters<typeof originalEnd>) => {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    
    // Call original end with arguments spread
    return originalEnd.apply(res, args);
  }) as typeof originalEnd;
  
  next();
};