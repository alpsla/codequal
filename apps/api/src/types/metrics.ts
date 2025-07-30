/**
 * Type definitions for metrics
 */

import { TempSpaceMetrics } from './deepwiki';

export interface JsonMetrics {
  timestamp: string;
  deepwiki: Record<string, number>;
  token_usage?: Record<string, number>;
}

export interface PrometheusMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}