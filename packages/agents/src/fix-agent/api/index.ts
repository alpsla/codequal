/**
 * Fix Agent - API Module
 *
 * Exports REST API endpoints for accessing CodeQual analysis reports.
 */

export {
  // Service
  ReportAPIService,
  getReportAPIService,
  // Express handlers
  expressHandlers,
  setupReportRoutes,
  // Types
  type ReportMetadata,
  type OutputInfo,
  type APIResponse,
} from './report-api-endpoints';
