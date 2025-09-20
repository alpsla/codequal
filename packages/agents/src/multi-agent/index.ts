/**
 * Multi-agent module exports for backward compatibility
 */

import { VectorContextService } from './vector-context-service';

export { VectorContextService } from './vector-context-service';
export { EducationalAgent, EducationalResult } from './educational-agent';

// Re-export types
export * from './types/auth';

// Create compatibility function
export function createVectorContextService(config?: any) {
  return new VectorContextService(config);
}