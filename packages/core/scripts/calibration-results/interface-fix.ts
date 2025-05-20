/**
 * Extended model test results with content size
 */
export interface ExtendedModelTestResults {
  avgResponseTime: number;    // Average response time in seconds
  avgResponseSize?: number;   // Average response size in bytes (may not be present in older data)
  avgContentSize: number;     // Average content size in bytes
  qualityScore?: number;      // Optional subjective quality score (1-10)
  testCount: number;          // Number of tests conducted
  lastTested: string;         // ISO date string of last test
  status: string | TestingStatus; // Current testing status
}