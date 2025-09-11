/**
 * Type definitions for metrics
 */


export interface JsonMetrics {
  timestamp: string;
  token_usage?: Record<string, number>;
}

export interface PrometheusMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}