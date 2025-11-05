FAIL src/__tests__/routes/result-orchestrator.test.ts
  ● Result Orchestrator Routes › POST /api/analyze-pr › should accept valid PR analysis request

    expected 200 "OK", got 500 "Internal Server Error"

      108 |         .post('/api/analyze-pr')
      109 |         .send(validRequest)
    > 110 |         .expect(200);
          |          ^
      111 |
      112 |       expect(response.body).toMatchObject({
      113 |         analysisId: expect.stringMatching(/^analysis_\d+_[a-z0-9]+$/),

      at Object.<anonymous> (src/__tests__/routes/result-orchestrator.test.ts:110:10)
      ----
      at Test._assertStatus (../../node_modules/supertest/lib/test.js:252:14)
      at ../../node_modules/supertest/lib/test.js:308:13
      at Test._assertFunction (../../node_modules/supertest/lib/test.js:285:13)
      at Test.assert (../../node_modules/supertest/lib/test.js:164:23)
      at Server.localAssert (../../node_modules/supertest/lib/test.js:120:14)

Error: api#test: command (/home/runner/work/codequal/codequal/apps/api) /opt/hostedtoolcache/node/18.20.8/x64/bin/npm run test exited (1)
  ● Result Orchestrator Routes › POST /api/analyze-pr › should reject invalid request body

    expect(received).toMatchObject(expected)

    - Expected  - 5
    + Received  + 1

      Object {
    -   "details": ArrayContaining [
    -     "repositoryUrl is required",
    -     "prNumber must be a positive integer",
    -   ],
    -   "error": "Invalid request",
    +   "error": "Repository URL is required",
      }

      128 |         .expect(400);
      129 |
    > 130 |       expect(response.body).toMatchObject({
          |                             ^
      131 |         error: 'Invalid request',
      132 |         details: expect.arrayContaining([
      133 |           'repositoryUrl is required',

      at Object.<anonymous> (src/__tests__/routes/result-orchestrator.test.ts:130:29)

  ● Result Orchestrator Routes › POST /api/analyze-pr › should reject request for inaccessible repository

    expected 403 "Forbidden", got 500 "Internal Server Error"

      143 |         .post('/api/analyze-pr')
      144 |         .send(validRequest)
    > 145 |         .expect(403);
          |          ^
      146 |
      147 |       expect(response.body).toMatchObject({
      148 |         error: 'Access denied to repository',

      at Object.<anonymous> (src/__tests__/routes/result-orchestrator.test.ts:145:10)
      ----
      at Test._assertStatus (../../node_modules/supertest/lib/test.js:252:14)
      at ../../node_modules/supertest/lib/test.js:308:13
      at Test._assertFunction (../../node_modules/supertest/lib/test.js:285:13)
      at Test.assert (../../node_modules/supertest/lib/test.js:164:23)
      at Server.localAssert (../../node_modules/supertest/lib/test.js:120:14)

  ● Result Orchestrator Routes › POST /api/analyze-pr › should handle different analysis modes

    expected 200 "OK", got 500 "Internal Server Error"

      158 |           .post('/api/analyze-pr')
      159 |           .send({ ...validRequest, analysisMode: mode })
    > 160 |           .expect(200);
          |            ^
      161 |
      162 |         expect(response.body.estimatedTime).toBeGreaterThan(0);
      163 |       }

      at Object.<anonymous> (src/__tests__/routes/result-orchestrator.test.ts:160:12)
      ----
      at Test._assertStatus (../../node_modules/supertest/lib/test.js:252:14)
      at ../../node_modules/supertest/lib/test.js:308:13
      at Test._assertFunction (../../node_modules/supertest/lib/test.js:285:13)
      at Test.assert (../../node_modules/supertest/lib/test.js:164:23)
      at Server.localAssert (../../node_modules/supertest/lib/test.js:120:14)

  ● Result Orchestrator Routes › POST /api/analyze-pr › should include github token when provided

    expected 200 "OK", got 500 "Internal Server Error"

      173 |         .post('/api/analyze-pr')
      174 |         .send(requestWithToken)
    > 175 |         .expect(200);
          |          ^
      176 |
      177 |       expect(mockResultOrchestrator.analyzePR).toHaveBeenCalledWith(
      178 |         expect.objectContaining({

      at Object.<anonymous> (src/__tests__/routes/result-orchestrator.test.ts:175:10)
      ----
      at Test._assertStatus (../../node_modules/supertest/lib/test.js:252:14)
      at ../../node_modules/supertest/lib/test.js:308:13
      at Test._assertFunction (../../node_modules/supertest/lib/test.js:285:13)
      at Test.assert (../../node_modules/supertest/lib/test.js:164:23)
      at Server.localAssert (../../node_modules/supertest/lib/test.js:120:14)

  ● Result Orchestrator Routes › POST /api/analyze-pr › should handle orchestrator errors gracefully

    expected 200 "OK", got 500 "Internal Server Error"

      191 |         .post('/api/analyze-pr')
      192 |         .send(validRequest)
    > 193 |         .expect(200);
          |          ^
      194 |
      195 |       expect(response.body).toMatchObject({
      196 |         analysisId: expect.any(String),

      at Object.<anonymous> (src/__tests__/routes/result-orchestrator.test.ts:193:10)
      ----
      at Test._assertStatus (../../node_modules/supertest/lib/test.js:252:14)
      at ../../node_modules/supertest/lib/test.js:308:13
      at Test._assertFunction (../../node_modules/supertest/lib/test.js:285:13)
      at Test.assert (../../node_modules/supertest/lib/test.js:164:23)
      at Server.localAssert (../../node_modules/supertest/lib/test.js:120:14)

  ● Result Orchestrator Routes › POST /api/analyze-pr › should track analysis progress internally

    expected 200 "OK", got 500 "Internal Server Error"

      222 |         .post('/api/analyze-pr')
      223 |         .send(validRequest)
    > 224 |         .expect(200);
          |          ^
      225 |
      226 |       const analysisId = response.body.analysisId;
      227 |

      at Object.<anonymous> (src/__tests__/routes/result-orchestrator.test.ts:224:10)
      ----
      at Test._assertStatus (../../node_modules/supertest/lib/test.js:252:14)
      at ../../node_modules/supertest/lib/test.js:308:13
      at Test._assertFunction (../../node_modules/supertest/lib/test.js:285:13)
      at Test.assert (../../node_modules/supertest/lib/test.js:164:23)
      at Server.localAssert (../../node_modules/supertest/lib/test.js:120:14)

  ● Result Orchestrator Routes › GET /api/analysis/:id/progress › should return progress for existing analysis

    expected 200 "OK", got 404 "Not Found"

      254 |       const response = await request(app)
      255 |         .get(`/api/analysis/${analysisId}/progress`)
    > 256 |         .expect(200);
          |          ^
      257 |
      258 |       expect(response.body).toMatchObject({
      259 |         analysisId,

      at Object.<anonymous> (src/__tests__/routes/result-orchestrator.test.ts:256:10)
      ----
      at Test._assertStatus (../../node_modules/supertest/lib/test.js:252:14)
      at ../../node_modules/supertest/lib/test.js:308:13
      at Test._assertFunction (../../node_modules/supertest/lib/test.js:285:13)
      at Test.assert (../../node_modules/supertest/lib/test.js:164:23)
      at Server.localAssert (../../node_modules/supertest/lib/test.js:120:14)

  ● Result Orchestrator Routes › GET /api/analysis/:id/progress › should deny access to other users analysis

    expected 403 "Forbidden", got 404 "Not Found"

      316 |       const response = await request(testApp2)
      317 |         .get(`/api/analysis/${analysisId}/progress`)
    > 318 |         .expect(403);
          |          ^
      319 |
      320 |       expect(response.body).toMatchObject({
      321 |         error: 'Access denied to analysis results',

      at Object.<anonymous> (src/__tests__/routes/result-orchestrator.test.ts:318:10)
      ----
      at Test._assertStatus (../../node_modules/supertest/lib/test.js:252:14)
      at ../../node_modules/supertest/lib/test.js:308:13
      at Test._assertFunction (../../node_modules/supertest/lib/test.js:285:13)
      at Test.assert (../../node_modules/supertest/lib/test.js:164:23)
      at Server.localAssert (../../node_modules/supertest/lib/test.js:120:14)

  ● Result Orchestrator Routes › DELETE /api/analysis/:id › should cancel ongoing analysis

    expected 200 "OK", got 404 "Not Found"

      397 |       const response = await request(app)
      398 |         .delete(`/api/analysis/${analysisId}`)
    > 399 |         .expect(200);
          |          ^
      400 |
      401 |       expect(response.body).toMatchObject({
      402 |         message: 'Analysis cancelled successfully',

      at Object.<anonymous> (src/__tests__/routes/result-orchestrator.test.ts:399:10)
      ----
      at Test._assertStatus (../../node_modules/supertest/lib/test.js:252:14)
      at ../../node_modules/supertest/lib/test.js:308:13
      at Test._assertFunction (../../node_modules/supertest/lib/test.js:285:13)
      at Test.assert (../../node_modules/supertest/lib/test.js:164:23)
      at Server.localAssert (../../node_modules/supertest/lib/test.js:120:14)

  ● Result Orchestrator Routes › DELETE /api/analysis/:id › should deny access to other users analysis

    expected 403 "Forbidden", got 404 "Not Found"

      453 |       const response = await request(testApp2)
      454 |         .delete(`/api/analysis/${analysisId}`)
    > 455 |         .expect(403);
          |          ^
      456 |
      457 |       expect(response.body).toMatchObject({
      458 |         error: 'Access denied to analysis',

      at Object.<anonymous> (src/__tests__/routes/result-orchestrator.test.ts:455:10)
      ----
      at Test._assertStatus (../../node_modules/supertest/lib/test.js:252:14)
      at ../../node_modules/supertest/lib/test.js:308:13
      at Test._assertFunction (../../node_modules/supertest/lib/test.js:285:13)
      at Test.assert (../../node_modules/supertest/lib/test.js:164:23)
      at Server.localAssert (../../node_modules/supertest/lib/test.js:120:14)

  ● Result Orchestrator Routes › Error Handling › should handle malformed JSON requests

    expect(received).toBeGreaterThanOrEqual(expected)

    Matcher error: received value must be a number or bigint

    Received has value: undefined

      377 |
      378 |         if (response2.body.status !== 'complete') {
    > 379 |           expect(response2.body.progress).toBeGreaterThanOrEqual(response1.body.progress);
          |                                           ^
      380 |         }
      381 |       }, 50);
      382 |     });

      at Timeout._onTimeout (src/__tests__/routes/result-orchestrator.test.ts:379:43)

  ● Result Orchestrator Routes › Error Handling › should handle internal server errors gracefully

    expected 200 "OK", got 404 "Not Found"

      347 |         const response = await request(app)
      348 |           .get(`/api/analysis/${analysisId}/progress`)
    > 349 |           .expect(200);
          |            ^
      350 |
      351 |         if (response.body.status === 'complete') {
      352 |           expect(response.body.results).toBeDefined();

      at Timeout._onTimeout (src/__tests__/routes/result-orchestrator.test.ts:349:12)
      ----
      at Test._assertStatus (../../node_modules/supertest/lib/test.js:252:14)
      at ../../node_modules/supertest/lib/test.js:308:13
      at Test._assertFunction (../../node_modules/supertest/lib/test.js:285:13)
      at Test.assert (../../node_modules/supertest/lib/test.js:164:23)
      at Server.localAssert (../../node_modules/supertest/lib/test.js:120:14)

  ● Result Orchestrator Routes › Error Handling › should handle internal server errors gracefully

    expect(received).toMatchObject(expected)

    - Expected  - 2
    + Received  + 1

      Object {
    -   "error": "Internal server error",
    -   "message": Any<String>,
    +   "error": "Failed to check scan permissions",
      }

      529 |         .expect(500);
      530 |
    > 531 |       expect(response.body).toMatchObject({
          |                             ^
      532 |         error: 'Internal server error',
      533 |         message: expect.any(String)
      534 |       });

      at Object.<anonymous> (src/__tests__/routes/result-orchestrator.test.ts:531:29)

  ● Result Orchestrator Routes › Error Handling › should validate analysis mode values

    expected 400 "Bad Request", got 500 "Internal Server Error"

      548 |           analysisMode: 'invalid-mode'
      549 |         })
    > 550 |         .expect(400);
          |          ^
      551 |
      552 |       expect(response.body.details).toContain(
      553 |         'analysisMode must be one of: quick, comprehensive, deep, auto'

      at Object.<anonymous> (src/__tests__/routes/result-orchestrator.test.ts:550:10)
      ----
      at Test._assertStatus (../../node_modules/supertest/lib/test.js:252:14)
      at ../../node_modules/supertest/lib/test.js:308:13
      at Test._assertFunction (../../node_modules/supertest/lib/test.js:285:13)
      at Test.assert (../../node_modules/supertest/lib/test.js:164:23)
      at Server.localAssert (../../node_modules/supertest/lib/test.js:120:14)

  ● Result Orchestrator Routes › Concurrent Requests › should handle multiple concurrent analysis requests

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 500

      571 |
      572 |       responses.forEach(response => {
    > 573 |         expect(response.status).toBe(200);
          |                                 ^
      574 |         expect(response.body.analysisId).toBeDefined();
      575 |       });
      576 |

      at src/__tests__/routes/result-orchestrator.test.ts:573:33
          at Array.forEach (<anonymous>)
      at Object.<anonymous> (src/__tests__/routes/result-orchestrator.test.ts:572:17)

  ● Result Orchestrator Routes › Concurrent Requests › should handle progress checks for multiple analyses

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 404

      604 |
      605 |       progressResponses.forEach((response, index) => {
    > 606 |         expect(response.status).toBe(200);
          |                                 ^
      607 |         expect(response.body.analysisId).toBe(analysisIds[index]);
      608 |       });
      609 |     });

      at src/__tests__/routes/result-orchestrator.test.ts:606:33
          at Array.forEach (<anonymous>)
      at Object.<anonymous> (src/__tests__/routes/result-orchestrator.test.ts:605:25)

PASS src/__tests__/services/analysis-trigger-scenarios.test.ts
FAIL src/__tests__/integration/api-routes.test.ts
  ● Test suite failed to run

    src/__tests__/integration/api-routes.test.ts:47:21 - error TS1005: ';' expected.

    47   deepWikiApiManager: mockDeepWikiManager
                           ~
    src/__tests__/integration/api-routes.test.ts:48:1 - error TS1128: Declaration or statement expected.

    48 }));
       ~
    src/__tests__/integration/api-routes.test.ts:48:2 - error TS1128: Declaration or statement expected.

    48 }));
        ~
    src/__tests__/integration/api-routes.test.ts:48:3 - error TS1128: Declaration or statement expected.

    48 }));
         ~
    src/__tests__/integration/api-routes.test.ts:125:27 - error TS1005: ';' expected.

    125         deepWikiApiManager: mockDeepWikiManager
                                  ~
    src/__tests__/integration/api-routes.test.ts:126:9 - error TS1005: ';' expected.

    126       }));
                ~
    src/__tests__/integration/api-routes.test.ts:150:3 - error TS1128: Declaration or statement expected.

    150   });
          ~
    src/__tests__/integration/api-routes.test.ts:150:4 - error TS1128: Declaration or statement expected.

    150   });
           ~
    src/__tests__/integration/api-routes.test.ts:310:1 - error TS1128: Declaration or statement expected.

    310 });
        ~
    src/__tests__/integration/api-routes.test.ts:310:2 - error TS1128: Declaration or statement expected.

    310 });
         ~

FAIL src/__tests__/services/scheduled-analysis.test.ts
  ● Scheduled Repository Analysis › Schedule Execution › should trigger main branch analysis on schedule

    ReferenceError: WebhookHandlerService is not defined

      141 |     it('should trigger main branch analysis on schedule', async () => {
      142 |       const repositoryUrl = 'https://github.com/test/repo';
    > 143 |       const mockWebhookHandler = new WebhookHandlerService({} as any, {} as any, mockLogger);
          |                                  ^
      144 |       
      145 |       webhookHandler.handleScheduledScan.mockResolvedValue({
      146 |         jobId: 'scheduled-job-123',

      at Object.<anonymous> (src/__tests__/services/scheduled-analysis.test.ts:143:34)

  ● Scheduled Repository Analysis › Schedule Timing and Execution › should calculate next run time correctly

    expect(received).toEqual(expected) // deep equality

    Expected: 2025-02-01T03:00:00.000Z
    Received: 2025-01-18T03:00:00.000Z

      271 |       // Monthly on 1st at 3 AM UTC
      272 |       const monthlyNext = getNextRunTime('0 3 1 * *', new Date('2025-01-17T10:00:00Z'));
    > 273 |       expect(monthlyNext).toEqual(new Date('2025-02-01T03:00:00Z'));
          |                           ^
      274 |     });
      275 |
      276 |     it('should handle schedule execution errors gracefully', async () => {

      at Object.<anonymous> (src/__tests__/services/scheduled-analysis.test.ts:273:27)

  ● Scheduled Repository Analysis › Schedule Timing and Execution › should handle schedule execution errors gracefully

    expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: undefined

      290 |       // Schedule should remain active despite failure
      291 |       const schedule = await schedulerService.getSchedule(repositoryUrl);
    > 292 |       expect(schedule?.isActive).toBe(true);
          |                                  ^
      293 |     });
      294 |   });
      295 |

      at Object.<anonymous> (src/__tests__/services/scheduled-analysis.test.ts:292:34)

FAIL src/__tests__/services/analysis-mode-selection.test.ts
  ● Test suite failed to run

    Configuration error:

    Could not locate module @codequal/agents/multi-agent/enhanced-executor mapped as:
    /home/runner/work/codequal/codequal/packages/agents/src/$1.

    Please check your configuration for these entries:
    {
      "moduleNameMapper": {
        "/@codequal\/agents\/(.*)/": "/home/runner/work/codequal/codequal/packages/agents/src/$1"
      },
      "resolver": undefined
    }

       5 | // Mock the dependencies
       6 | jest.mock('@codequal/core/utils');
    >  7 | jest.mock('@codequal/agents/multi-agent/enhanced-executor');
         |      ^
       8 | jest.mock('../../services/pr-context-service');
       9 |
      10 | describe('Analysis Mode Selection Logic', () => {

      at createNoMappedModuleFoundError (../../node_modules/jest-resolve/build/resolver.js:759:17)
      at Object.<anonymous> (src/__tests__/services/analysis-mode-selection.test.ts:7:6)

FAIL src/__tests__/payment-flow.test.ts
  ● Test suite failed to run

    Cannot find module './services/model-selection/RepositoryCalibrationService' from '../../packages/core/dist/index.js'

    Require stack:
      /home/runner/work/codequal/codequal/packages/core/dist/index.js
      src/services/result-orchestrator.ts
      src/routes/result-orchestrator.ts
      src/index.ts
      src/__tests__/payment-flow.test.ts

      57 | // Export model selection services
      58 | __exportStar(require("./services/model-selection/RepositoryModelSelectionService"), exports);
    > 59 | __exportStar(require("./services/model-selection/RepositoryCalibrationService"), exports);
         |              ^
      60 | __exportStar(require("./services/model-selection/ModelConfigStore"), exports);
      61 | // Export agent registry types (single export to avoid duplicates)
      62 | var agent_registry_1 = require("./config/agent-registry");

      at Resolver._throwModNotFoundError (../../node_modules/jest-resolve/build/resolver.js:427:11)
      at Object.<anonymous> (../../packages/core/dist/index.js:59:14)
      at Object.<anonymous> (src/services/result-orchestrator.ts:116:1)
      at Object.<anonymous> (src/routes/result-orchestrator.ts:3:1)
      at Object.<anonymous> (src/index.ts:13:1)
      at Object.<anonymous> (src/__tests__/payment-flow.test.ts:3:1)

PASS src/__tests__/integration/scheduling-integration.test.ts
FAIL src/__tests__/monitoring-endpoints.test.ts
  ● Monitoring API Endpoints › GET /metrics › should return Prometheus metrics without authentication

    TypeError: Router.use() requires a middleware function but got a Object

      208 |     
      209 |     // Authenticated monitoring routes
    > 210 |     app.use('/api/monitoring', authMiddleware, monitoringRoutes);
          |         ^
      211 |   });
      212 |
      213 |   describe('GET /metrics', () => {

      at Function.use (../../node_modules/express/lib/router/index.js:469:13)
      at Function.<anonymous> (../../node_modules/express/lib/application.js:227:21)
          at Array.forEach (<anonymous>)
      at Function.use (../../node_modules/express/lib/application.js:224:7)
      at Object.<anonymous> (src/__tests__/monitoring-endpoints.test.ts:210:9)

  ● Monitoring API Endpoints › GET /api/monitoring/alerts › should return alert status

    TypeError: Router.use() requires a middleware function but got a Object

      208 |     
      209 |     // Authenticated monitoring routes
    > 210 |     app.use('/api/monitoring', authMiddleware, monitoringRoutes);
          |         ^
      211 |   });
      212 |
      213 |   describe('GET /metrics', () => {

      at Function.use (../../node_modules/express/lib/router/index.js:469:13)
      at Function.<anonymous> (../../node_modules/express/lib/application.js:227:21)
          at Array.forEach (<anonymous>)
      at Function.use (../../node_modules/express/lib/application.js:224:7)
      at Object.<anonymous> (src/__tests__/monitoring-endpoints.test.ts:210:9)

  ● Monitoring API Endpoints › GET /api/monitoring/health › should return health status

    TypeError: Router.use() requires a middleware function but got a Object

      208 |     
      209 |     // Authenticated monitoring routes
    > 210 |     app.use('/api/monitoring', authMiddleware, monitoringRoutes);
          |         ^
      211 |   });
      212 |
      213 |   describe('GET /metrics', () => {

      at Function.use (../../node_modules/express/lib/router/index.js:469:13)
      at Function.<anonymous> (../../node_modules/express/lib/application.js:227:21)
          at Array.forEach (<anonymous>)
      at Function.use (../../node_modules/express/lib/application.js:224:7)
      at Object.<anonymous> (src/__tests__/monitoring-endpoints.test.ts:210:9)

  ● Monitoring API Endpoints › Error handling › should handle monitoring service errors gracefully

    TypeError: Router.use() requires a middleware function but got a Object

      208 |     
      209 |     // Authenticated monitoring routes
    > 210 |     app.use('/api/monitoring', authMiddleware, monitoringRoutes);
          |         ^
      211 |   });
      212 |
      213 |   describe('GET /metrics', () => {

      at Function.use (../../node_modules/express/lib/router/index.js:469:13)
      at Function.<anonymous> (../../node_modules/express/lib/application.js:227:21)
          at Array.forEach (<anonymous>)
      at Function.use (../../node_modules/express/lib/application.js:224:7)
      at Object.<anonymous> (src/__tests__/monitoring-endpoints.test.ts:210:9)

FAIL src/__tests__/repository-monitoring.test.ts
  ● Repository Storage Monitoring Endpoints › GET /api/monitoring/health › should return health status

    expected 200 "OK", got 500 "Internal Server Error"

      48 |       const response = await request(app)
      49 |         .get('/api/monitoring/health')
    > 50 |         .expect(200);
         |          ^
      51 |
      52 |       expect(response.body).toHaveProperty('status');
      53 |       expect(response.body).toHaveProperty('timestamp');

      at Object.<anonymous> (src/__tests__/repository-monitoring.test.ts:50:10)
      ----
      at Test._assertStatus (../../node_modules/supertest/lib/test.js:252:14)
      at ../../node_modules/supertest/lib/test.js:308:13
      at Test._assertFunction (../../node_modules/supertest/lib/test.js:285:13)
      at Test.assert (../../node_modules/supertest/lib/test.js:164:23)
      at Server.localAssert (../../node_modules/supertest/lib/test.js:120:14)

  ● Repository Storage Monitoring Endpoints › GET /api/monitoring/repository/metrics › should return Prometheus metrics

    expected 200 "OK", got 404 "Not Found"

      61 |       const response = await request(app)
      62 |         .get('/api/monitoring/repository/metrics')
    > 63 |         .expect(200);
         |          ^
      64 |
      65 |       expect(response.headers['content-type']).toMatch(/text\/plain/);
      66 |       expect(response.text).toContain('# HELP');

      at Object.<anonymous> (src/__tests__/repository-monitoring.test.ts:63:10)
      ----
      at Test._assertStatus (../../node_modules/supertest/lib/test.js:252:14)
      at ../../node_modules/supertest/lib/test.js:308:13
      at Test._assertFunction (../../node_modules/supertest/lib/test.js:285:13)
      at Test.assert (../../node_modules/supertest/lib/test.js:164:23)
      at Server.localAssert (../../node_modules/supertest/lib/test.js:120:14)

  ● Repository Storage Monitoring Endpoints › GET /api/monitoring/repository/health › should return repository storage health status

    expected 200 "OK", got 404 "Not Found"

      73 |       const response = await request(app)
      74 |         .get('/api/monitoring/repository/health')
    > 75 |         .expect(200);
         |          ^
      76 |
      77 |       expect(response.body).toHaveProperty('status');
      78 |       expect(response.body.status).toBe('healthy');

      at Object.<anonymous> (src/__tests__/repository-monitoring.test.ts:75:10)
      ----
      at Test._assertStatus (../../node_modules/supertest/lib/test.js:252:14)
      at ../../node_modules/supertest/lib/test.js:308:13
      at Test._assertFunction (../../node_modules/supertest/lib/test.js:285:13)
      at Test.assert (../../node_modules/supertest/lib/test.js:164:23)
      at Server.localAssert (../../node_modules/supertest/lib/test.js:120:14)

  ● Repository Storage Monitoring Endpoints › GET /api/monitoring/repository/metrics.json › should return JSON metrics

    expected 200 "OK", got 404 "Not Found"

      86 |       const response = await request(app)
      87 |         .get('/api/monitoring/repository/metrics.json')
    > 88 |         .expect(200);
         |          ^
      89 |
      90 |       expect(response.body).toHaveProperty('timestamp');
      91 |       expect(response.body).toHaveProperty('disk');

      at Object.<anonymous> (src/__tests__/repository-monitoring.test.ts:88:10)
      ----
      at Test._assertStatus (../../node_modules/supertest/lib/test.js:252:14)
      at ../../node_modules/supertest/lib/test.js:308:13
      at Test._assertFunction (../../node_modules/supertest/lib/test.js:285:13)
      at Test.assert (../../node_modules/supertest/lib/test.js:164:23)
      at Server.localAssert (../../node_modules/supertest/lib/test.js:120:14)

FAIL src/__tests__/payment-flow-simple.test.ts
  ● Test suite failed to run

    Cannot find module './services/model-selection/RepositoryCalibrationService' from '../../packages/core/dist/index.js'

    Require stack:
      /home/runner/work/codequal/codequal/packages/core/dist/index.js
      src/services/result-orchestrator.ts
      src/routes/result-orchestrator.ts
      src/index.ts
      src/__tests__/payment-flow-simple.test.ts

      57 | // Export model selection services
      58 | __exportStar(require("./services/model-selection/RepositoryModelSelectionService"), exports);
    > 59 | __exportStar(require("./services/model-selection/RepositoryCalibrationService"), exports);
         |              ^
      60 | __exportStar(require("./services/model-selection/ModelConfigStore"), exports);
      61 | // Export agent registry types (single export to avoid duplicates)
      62 | var agent_registry_1 = require("./config/agent-registry");

      at Resolver._throwModNotFoundError (../../node_modules/jest-resolve/build/resolver.js:427:11)
      at Object.<anonymous> (../../packages/core/dist/index.js:59:14)
      at Object.<anonymous> (src/services/result-orchestrator.ts:116:1)
      at Object.<anonymous> (src/routes/result-orchestrator.ts:3:1)
      at Object.<anonymous> (src/index.ts:13:1)
      at Object.<anonymous> (src/__tests__/payment-flow-simple.test.ts:2:1)

Test Suites: 8 failed, 7 passed, 15 total
Tests:       27 failed, 1 skipped, 161 passed, 189 total
Snapshots:   0 total
Time:        3.891 s
Ran all test suites.
npm error Lifecycle script `test` failed with error:
npm error code 1
npm error path /home/runner/work/codequal/codequal/apps/api
npm error workspace api@1.0.0
npm error location /home/runner/work/codequal/codequal/apps/api
npm error command failed
npm error command sh -c jest
Error:  command finished with error: command (/home/runner/work/codequal/codequal/apps/api) /opt/hostedtoolcache/node/18.20.8/x64/bin/npm run test exited (1)
 ERROR  run failed: command  exited (1)

 Tasks:    3 successful, 4 total
Cached:    3 cached, 4 total
  Time:    4.878s 
Failed:    api#test

Error: Process completed with exit code 1.