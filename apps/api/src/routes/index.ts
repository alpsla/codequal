import { Router } from 'express';
import healthRouter from './health';
import analysisRouter from './analysis';
import apiKeysRouter from './api-keys';
import reportsRouter from './reports';
import webhooksRouter from './webhooks';
import { repositoryRoutes as repositoryRouter } from './repository';
import researcherRouter from './researcher';
import { resultOrchestratorRoutes as resultOrchestratorRouter } from './result-orchestrator';
import schedulesRouter from './schedules';
// import languagesRouter from './languages';
import monitoringRouter from './monitoring';
import openapiDocsRouter from './openapi-docs';
import generateReportRouter from './generate-report'; // Add new report generation route
import usersRouter from './users';
import organizationsRouter from './organizations';
import testProfileRouter from './test-profile';
import billingRouter from './billing';
import stripeWebhooksRouter from './stripe-webhooks';
import testMonitoringNoAuthRouter from './test-monitoring-no-auth';

const router = Router();

// Health check endpoints
router.use('/health', healthRouter);

// API routes
router.use('/api', analysisRouter);
router.use('/api/keys', apiKeysRouter);
router.use('/api/reports', reportsRouter);
router.use('/api/webhooks', webhooksRouter);
router.use('/api/repository', repositoryRouter);
router.use('/api/researcher', researcherRouter);
router.use('/api/result-orchestrator', resultOrchestratorRouter);
router.use('/api/schedules', schedulesRouter);
// router.use('/api/languages', languagesRouter);
router.use('/api/monitoring', monitoringRouter);
router.use('/api/generate-report', generateReportRouter); // Add new endpoint
router.use('/api/users', usersRouter);
router.use('/api/organizations', organizationsRouter);
router.use('/api/test', testProfileRouter); // Test endpoints
router.use('/api/test-monitoring', testMonitoringNoAuthRouter); // Test monitoring without auth
router.use('/api/billing', billingRouter);
router.use('/api/stripe', stripeWebhooksRouter);

// OpenAPI documentation
router.use('/api-docs', openapiDocsRouter);

export default router;