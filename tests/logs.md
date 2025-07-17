Our previous session ended after below prompts:
Update Todos
  ⎿  ☒ Fix hydration errors in the application                              
     ☒ Fix GitLab OAuth authentication
     ☒ Fix billing status not refreshing after payment method added
     ☒ Make HTML report endpoint accessible with API key authentication
     ☒ Run full E2E test with authentication and billing
     ☒ Update HTML report to use enhanced template
     ☒ Fix circular reference error
     ☒ Fix agents returning 0 findings by enabling repository-wide analysis
     ☒ Test the complete flow with real PR after fixing analysis scope
     ☒ Replace mock services with real OpenRouter-based implementations
     ☒ Implement proper model configuration flow from Vector DB
     ☒ Update orchestrator to pull models from Vector DB
     ☒ Implement Researcher agent request when config not found
     ☒ Clean up hardcoded agent implementations
     ☒ Remove OpenRouter-specific code from agents
     ☒ Implement proper fallback model storage in Vector DB
     ☒ Fix TypeScript build errors in result-orchestrator.ts
     ☒ Run comprehensive E2E test with report UI validation
     ☒ Create missing database tables (vector_chunks, repository_schedules)
     ☒ Fix agent name mismatch (dependency vs dependencies)
     ☒ Add orchestrator role configuration
     ☒ Fix subscription profile progress bar and navigation
     ☐ Fix vector_embeddings schema (add user_id column)
     ☐ Rebuild API and test again
     ☐ Review API pricing after collecting usage data from monitoring system

⏺ Summary of Fixes:

  1. Database Schema - Created SQL script at /scripts/fix-database-schema.sql

  - Creates vector_chunks table
  - Adds user_id column to vector_embeddings
  - Creates repository_schedules table

  2. Agent Name Mismatch - Fixed in mcp-context-manager.ts

  - Changed all references from 'dependency' to 'dependencies'

  3. Orchestrator Role - Added to vector-context-service.ts

  - Added configuration for orchestrator role searches

  Next Steps:

  1. Run the database fixes:
  # Go to Supabase SQL Editor and run:
  /Users/alpinro/Code Prjects/codequal/scripts/fix-database-schema.sql
  2. Rebuild the API:
  cd apps/api
  npm run build
  npm run dev
  3. Refresh browser and test again

  The main issues were:
  - Missing database tables
  - Agent name mismatch (dependency vs dependencies)
  - Missing orchestrator role configuration

  After applying these fixes and rebuilding, the agents should execute properly and return actual findings instead of 0.

> 0%
  Confidence
  [6:58:27 AM] 🚀 Starting E2E Test Suite...
  [6:58:27 AM] 🔐 Testing API authentication...
  [6:58:27 AM] ✅ API authentication successful
  [6:58:27 AM] 🔍 Starting PR analysis...
  [6:58:27 AM] Analyzing: https://github.com/facebook/react PR #25000
  [6:58:27 AM] ✅ Analysis started: analysis_1752404307292_058n0pj89
  [6:58:27 AM] ⏳ Polling analysis progress...
  [6:58:27 AM] Progress: 0% - Extracting PR context
  [6:58:32 AM] Progress: 3% - Extracting PR context
  [6:58:37 AM] Progress: 6% - Extracting PR context
  [6:58:42 AM] Progress: 8% - Extracting PR context
  [6:58:47 AM] Progress: 100% - Analysis complete
  [6:58:47 AM] ✅ Analysis completed
  [6:58:47 AM] 📊 Processing analysis results...
  [6:58:47 AM] ✅ Results fetched - Report ID: report_1752404326529_o7gu1lc1k
  [6:58:47 AM] Total findings: 0
  [6:58:47 AM] Agents used: 
  [6:58:47 AM] 📄 Generating HTML report...
  [6:58:47 AM] ✅ HTML report generated successfully about:srcdoc:1 Refused to apply style from 'http://localhost:8080/reports/enhanced-styles.css' because its MIME type 
  ('text/html') is not a supported stylesheet MIME type, and strict MIME checking is enabled.  '/Users/alpinro/Code Prjects/codequal/tests/logs.md'

⏺ Great progress! The test is now completing successfully, but there are still a few issues:

  Current Status:

  ✅ API authentication working✅ Analysis completes✅ HTML report generates⚠️ Still 0 findings⚠️ Database schema issues remain

  Issues Found in Logs:

  1. Still getting orchestrator error (line 220):
    - The fix didn't take effect because the code wasn't rebuilt
  2. Agent 'dependency' still failing (line 379):
    - The MCP fix didn't take effect
  3. New database columns missing (lines 738, 744):
    - repository_schedules.is_active
    - repository_schedules.can_be_disabled
  4. CSS loading error in report:
    - The report is trying to load enhanced-styles.css

  Let me fix the remaining database issues:

⏺ Write(scripts/fix-additional-columns.sql)
  ⎿  Wrote 17 lines to scripts/fix-additional-columns.sql          
     -- Fix additional missing columns found in E2E test
     -- Add missing columns to repository_schedules table
     ALTER TABLE public.repository_schedules
     ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
     ADD COLUMN IF NOT EXISTS can_be_disabled BOOLEAN DEFAULT true;
     -- Create index on is_active for performance
     CREATE INDEX IF NOT EXISTS idx_repository_schedules_is_active
     ON public.repository_schedules(is_active);
     … +7 lines (ctrl+r to expand)

⏺ Action Required:

  1. Run Additional Database Fixes:

  -- In Supabase SQL Editor, run:
  -- /Users/alpinro/Code Prjects/codequal/scripts/fix-additional-columns.sql

  2. Rebuild the Packages (to apply the code fixes):

  cd /Users/alpinro/Code\ Prjects/codequal
  npm run build

  3. Restart the API:

  cd apps/api
  npm run dev

  4. Test Again

  The key issue is that the code changes (orchestrator config and dependency→dependencies) haven't been rebuilt into the dist folder. After rebuilding, the agents should
  work properly.

  Why Still 0 Findings?

  The agents are executing but returning 0 results because:
  1. The orchestrator role error prevents proper context retrieval
  2. The 'dependency' agent fails to execute
  3. All vector searches return 0 results (expected for a new repository)

  Once the rebuild is done, the agents should analyze the PR and return actual findings.

> [8:20:10 AM] 🚀 Starting E2E Test Suite...
  [8:20:10 AM] 🔐 Testing API authentication...
  [8:20:10 AM] ✅ API authentication successful
  [8:20:10 AM] 🔍 Starting PR analysis...
  [8:20:10 AM] Analyzing: https://github.com/facebook/react PR #25000
  [8:20:10 AM] ✅ Analysis started: analysis_1752409210792_p5c5vbvkv
  [8:20:10 AM] ⏳ Polling analysis progress...
  [8:20:10 AM] Progress: 0% - Extracting PR context
  [8:20:15 AM] Progress: 3% - Extracting PR context
  [8:20:20 AM] Progress: 6% - Extracting PR context
  [8:20:25 AM] Progress: 8% - Extracting PR context
  [8:20:30 AM] Progress: 100% - Analysis complete
  [8:20:30 AM] ✅ Analysis completed
  [8:20:30 AM] 📊 Processing analysis results...
  [8:20:30 AM] ✅ Results fetched - Report ID: report_1752409229735_y07xorlnv
  [8:20:30 AM] Total findings: 0
  [8:20:30 AM] Agents used: 
  [8:20:30 AM] 📄 Generating HTML report...
  [8:20:30 AM] ❌ Test failed: Failed to generate report'/Users/alpinro/Code Prjects/codequal/tests/logs.md'

⏺ I can see the issue - the HTML report endpoint is returning 404. Looking at line 465, it's trying to access /v1/analysis-reports/report_1752409229735_y07xorlnv/html
  which doesn't exist. Earlier we fixed it to use /v1/analysis/{reportId}/report?format=html but it seems the change didn't persist.

  Also, there are still issues:
  1. Orchestrator error persists - the rebuild didn't include the vector-context-service changes
  2. Missing database column: cron_expression (line 439)
  3. Wrong HTML endpoint being used

  Let me check the test file:

⏺ Read(apps/api/test-e2e-complete.html)
  ⎿  Read 30 lines (ctrl+r to expand)

⏺ The test file looks correct. The issue might be that you're using a cached version of the HTML file. Let me also add the missing database column:

⏺ Write(scripts/fix-cron-column.sql)
  ⎿  Wrote 15 lines to scripts/fix-cron-column.sql                              
     -- Add missing cron_expression column to repository_schedules
     ALTER TABLE public.repository_schedules
     ADD COLUMN IF NOT EXISTS cron_expression VARCHAR(100);
     -- Update existing records with default cron expressions based on frequency
     UPDATE public.repository_schedules
     SET cron_expression =
       CASE frequency
         WHEN 'daily' THEN '0 9 * * *'      -- Daily at 9 AM
     … +5 lines (ctrl+r to expand)

⏺ Troubleshooting Steps:

  1. Clear Browser Cache

  - Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
  - Or open in an incognito/private window

  2. Check if packages were rebuilt

  # Check if the vector-context-service was rebuilt with orchestrator config
  cat /Users/alpinro/Code\ Prjects/codequal/packages/agents/dist/multi-agent/vector-context-service.js | grep -A5 "ORCHESTRATOR"

  3. Run the missing column fix

  -- In Supabase SQL Editor:
  -- /Users/alpinro/Code Prjects/codequal/scripts/fix-cron-column.sql

  4. If rebuild didn't work, try clean build

  cd /Users/alpinro/Code\ Prjects/codequal
  npm run clean-build
  npm run build
  cd apps/api
  npm run dev

  5. Verify the endpoint

  The logs show it's trying to access:
  - /v1/analysis-reports/report_1752409229735_y07xorlnv/html ❌

  But should be:
  - /v1/analysis/report_1752409229735_y07xorlnv/report?format=html ✅

  This suggests the browser is using an old cached version of the test file.

  Why Still 0 Findings?

  The orchestrator role configuration isn't being picked up because:
  1. The packages weren't properly rebuilt
  2. The dist files still contain the old code

  After a clean build, the agents should work properly and return actual findings.






Logs from server to troubleshoot the issues
=== Server Startup Debug ===
Initial OPENAI_API_KEY: NOT SET
Loaded environment variables from local .env
Final OPENAI_API_KEY: sk-proj-vD0pX-NeOz99...
[INFO] [Translator:APITranslator] Translator created, waiting for model configuration from Vector DB 
[INFO] [Translator:ErrorTranslator] Translator created, waiting for model configuration from Vector DB 
[INFO] [Translator:DocumentationTranslator] Translator created, waiting for model configuration from Vector DB 
[INFO] [Translator:UITranslator] Translator created, waiting for model configuration from Vector DB 
[INFO] [Translator:CodeTranslator] Translator created, waiting for model configuration from Vector DB 
[INFO] [TranslatorFactory] Initialized specialized translators { contexts: [ 'api', 'error', 'docs', 'ui', 'sdk' ] }
[INFO] [SupabaseClientFactory] Supabase client initialized { url: 'https://ftjhmbbcuqjqmmbaymqb...' }
[INFO] [OpenRouterEmbeddingService] Together AI client initialized 
[INFO] [OpenRouterEmbeddingService] Voyage AI client initialized for code embeddings 
[INFO] [OpenRouterEmbeddingService] Initialized embedding service {
  defaultModel: 'openai/text-embedding-3-large',
  dimensions: 3072,
  togetherEnabled: true,
  voyageEnabled: true
}
[INFO] [AuthenticatedVectorService] Using OpenRouter for embeddings 
CodeQual API Server running on port 3001
Health check available at http://localhost:3001/health
Auth endpoints available at http://localhost:3001/auth
Test OAuth at http://localhost:3001/auth-test.html
[INFO] [OpenRouterEmbeddingService] Loading embedding configuration from database {
  config: 'openai-3-large',
  provider: 'openai',
  model: 'text-embedding-3-large'
}
[INFO] [OpenRouterEmbeddingService] Loaded code-specific embedding config { config: 'voyage-code-3', model: 'voyage-code-3' }
[2025-07-13T16:07:54.945Z] GET /favicon.ico - ::1
[INFO] [EnhancedMonitoringService] Enhanced monitoring service initialized {
  service: 'codequal-api',
  environment: 'development',
  dashboards: 1,
  widgets: 1
}
[2025-07-13T16:07:54.959Z] GET /favicon.ico - 404 - 14ms
Dashboard refreshed: codequal-overview
[2025-07-13T16:08:49.472Z] GET /health - ::1
[2025-07-13T16:08:49.480Z] GET /health - 200 - 8ms
[2025-07-13T16:08:49.512Z] POST /v1/analyze-pr - ::1
[API Key Auth] Test key authenticated successfully
[API Usage] Skipping tracking for test key
[Trial Enforcement] Skipping for test user
[Repository Access] Allowing test user access to all repositories
[INFO] [ResultOrchestrator] ModelVersionSync initialized 
[INFO] [ResultOrchestrator] ModelConfigStore initialized 
[2025-07-13T16:08:49.534Z] POST /analyze-pr - 200 - 22ms
[2025-07-13T16:08:49.541Z] GET /v1/analysis/analysis_1752422929518_7vyid49mc/progress - ::1
[API Key Auth] Test key authenticated successfully
[API Usage] Skipping tracking for test key
[2025-07-13T16:08:49.542Z] GET /analysis/analysis_1752422929518_7vyid49mc/progress - 200 - 1ms
[INFO] [ResultOrchestrator] ModelConfigStore initialized successfully { connectedToDatabase: true, tablesAvailable: true }
[INFO] [ResultOrchestrator] ModelConfigStore initialized successfully 
[INFO] [ResultOrchestrator] Model cache refreshed from database { databaseModels: 11, totalModels: 11 }
[INFO] [ResultOrchestrator] PR diff fetched {
  repositoryUrl: 'https://github.com/facebook/react',
  prNumber: 25000,
  totalFiles: 1,
  changedFiles: 1,
  totalAdditions: 1,
  totalDeletions: 0
}
Repository existence check failed: Error: No search configuration for agent role: orchestrator
    at VectorContextService.getRepositoryContext (/Users/alpinro/Code Prjects/codequal/packages/agents/dist/multi-agent/vector-context-service.js:64:19)
    at DeepWikiManager.checkRepositoryExists (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/deepwiki-manager.js:22:62)
    at ResultOrchestrator.getDeepWikiSummary (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/result-orchestrator.js:1538:60)
    at ResultOrchestrator.extractPRContext (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/result-orchestrator.js:358:42)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async ResultOrchestrator.analyzePR (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/result-orchestrator.js:68:31)
Repository existence check failed: Error: No search configuration for agent role: orchestrator
    at VectorContextService.getRepositoryContext (/Users/alpinro/Code Prjects/codequal/packages/agents/dist/multi-agent/vector-context-service.js:64:19)
    at DeepWikiManager.checkRepositoryExists (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/deepwiki-manager.js:22:62)
    at ResultOrchestrator.getDeepWikiSummary (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/result-orchestrator.js:1538:60)
    at ResultOrchestrator.getExistingRepositoryIssues (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/result-orchestrator.js:1714:45)
    at ResultOrchestrator.extractPRContext (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/result-orchestrator.js:366:41)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async ResultOrchestrator.analyzePR (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/result-orchestrator.js:68:31)
[INFO] [ResultOrchestrator] Vector Storage: found 0 results 
No tool results found for repository facebook/react, agents will analyze without tool context
[INFO] [ResultOrchestrator] Retrieved existing repository issues {
  repository: 'https://github.com/facebook/react',
  securityCount: 0,
  codeQualityCount: 0,
  architectureCount: 0,
  performanceCount: 0,
  dependenciesCount: 0
}
[INFO] [PRContentAnalyzer] Analyzing PR content { fileCount: 1 }
[INFO] [PRContentAnalyzer] PR analysis complete { changeTypes: [ 'mixed' ], complexity: 'trivial', agentsToSkip: [] }
[INFO] [ResultOrchestrator] PR content analysis complete {
  changeTypes: [ 'mixed' ],
  complexity: 'trivial',
  riskLevel: 'low',
  agentsToSkip: [],
  totalChanges: 2
}
Repository existence check failed: Error: No search configuration for agent role: orchestrator
    at VectorContextService.getRepositoryContext (/Users/alpinro/Code Prjects/codequal/packages/agents/dist/multi-agent/vector-context-service.js:64:19)
    at DeepWikiManager.checkRepositoryExists (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/deepwiki-manager.js:22:62)
    at ResultOrchestrator.checkRepositoryStatus (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/result-orchestrator.js:420:61)
    at ResultOrchestrator.analyzePR (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/result-orchestrator.js:74:49)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
[2025-07-13T16:08:54.553Z] GET /v1/analysis/analysis_1752422929518_7vyid49mc/progress - ::1
[API Key Auth] Test key authenticated successfully
[API Usage] Skipping tracking for test key
[2025-07-13T16:08:54.554Z] GET /analysis/analysis_1752422929518_7vyid49mc/progress - 200 - 1ms
Dashboard refreshed: codequal-overview
Repository analysis completed for https://github.com/facebook/react (Job: analysis_1752422930841_4by1f00o4)
[2025-07-13T16:08:59.571Z] GET /v1/analysis/analysis_1752422929518_7vyid49mc/progress - ::1
[API Key Auth] Test key authenticated successfully
[API Usage] Skipping tracking for test key
[2025-07-13T16:08:59.574Z] GET /analysis/analysis_1752422929518_7vyid49mc/progress - 200 - 3ms
[INFO] [VectorContextService] Successfully stored analysis results { repositoryId: 'https://github.com/facebook/react', chunksStored: 0 }
Analysis results stored in Vector DB for https://github.com/facebook/react
[INFO] [ResultOrchestrator] Vector Storage: found 0 results 
No tool results found for repository facebook/react, agents will analyze without tool context
[INFO] [ResultOrchestrator] Agent selection optimized based on PR content {
  mode: 'comprehensive',
  baseAgents: [ 'security', 'architecture', 'performance', 'codeQuality' ],
  skipped: [],
  kept: [
    'security',
    'architecture',
    'performance',
    'dependencies',
    'codeQuality'
  ],
  finalAgents: [
    'security',
    'architecture',
    'performance',
    'codeQuality',
    'dependencies'
  ]
}
[INFO] [ResultOrchestrator] Selected agents for analysis {
  analysisMode: 'comprehensive',
  selectedAgents: [
    'security',
    'architecture',
    'performance',
    'codeQuality',
    'dependencies'
  ],
  prContentAnalysis: { riskLevel: 'low', agentsToSkip: [] }
}
[INFO] [ResultOrchestrator] Found only primary model for security { model: 'gpt-4o:extended' }
[INFO] [ResultOrchestrator] Found only primary model for architecture { model: 'gpt-4o:extended' }
[INFO] [ResultOrchestrator] Found only primary model for performance { model: 'gpt-4o:extended' }
[INFO] [ResultOrchestrator] Found only primary model for codeQuality { model: 'gpt-4o:extended' }
[INFO] [ResultOrchestrator] Found only primary model for dependencies { model: 'gpt-4o:extended' }
[INFO] [ResultOrchestrator] Agent configurations prepared {
  agentCount: 5,
  agents: [
    { type: 'security', role: 'security' },
    { type: 'architecture', role: 'architecture' },
    { type: 'performance', role: 'performance' },
    { type: 'codeQuality', role: 'codeQuality' },
    { type: 'dependencies', role: 'dependencies' }
  ]
}
[WARN] [EnhancedMultiAgentExecutor] Configuration warnings: Fallback is enabled but no fallback agents are defined 
[INFO] [EnhancedMultiAgentExecutor] Enhanced executor initialized {
  agentCount: 5,
  strategy: 'parallel',
  resourceLimits: {
    maxConcurrent: 5,
    modelLimits: {
      'claude-3-opus': 25000,
      'gpt-4': 20000,
      'deepseek-coder': 30000,
      'gemini-pro': 22000
    }
  }
}
[INFO] [EnhancedMultiAgentExecutor] Initializing agents { count: 5 }
[INFO] [MCPContextManager] Selected coordination strategy {
  analysisMode: 'comprehensive',
  strategyName: 'Comprehensive Analysis',
  agentCount: 4
}
[INFO] [EnhancedMultiAgentExecutor] Executing MCP-coordinated strategy {
  analysisMode: 'comprehensive',
  strategyName: 'Comprehensive Analysis',
  totalAgents: 4
}
[INFO] [MCPContextManager] Next agents to execute { readyAgents: [ 'security' ], completed: [], active: [] }
[INFO] [MCPContextManager] Agent registered { agentName: 'security' }
[INFO] [MCPContextManager] Agent subscribed to MCP messages { agentName: 'security' }
[INFO] [VectorContextService] Successfully retrieved repository context {
  repositoryId: 'facebook/react',
  role: 'security',
  resultsCount: 0,
  confidence: 0
}
Retrieving DeepWiki report for security agent { repositoryId: 'facebook/react', changedFiles: 1 }
[INFO] [VectorContextService] Successfully retrieved repository context {
  repositoryId: 'facebook/react',
  role: 'security',
  resultsCount: 0,
  confidence: 0
}
Retrieving DeepWiki report for security agent { repositoryId: 'facebook/react', changedFiles: 1 }
[INFO] [MCPContextManager] Agent unsubscribed from MCP messages { agentName: 'security' }
[INFO] [MCPContextManager] Agent completed { agentName: 'security', resultsCount: 0 }
[INFO] [MCPContextManager] Next agents to execute {
  readyAgents: [ 'codeQuality', 'dependency' ],
  completed: [ 'security' ],
  active: []
}
[INFO] [MCPContextManager] Agent registered { agentName: 'codeQuality' }
[INFO] [MCPContextManager] Agent subscribed to MCP messages { agentName: 'codeQuality' }
[INFO] [MCPContextManager] Next agents to execute {
  readyAgents: [ 'dependency' ],
  completed: [ 'security' ],
  active: [ 'codeQuality' ]
}
[INFO] [MCPContextManager] Agent registered { agentName: 'dependency' }
[ERROR] [EnhancedMultiAgentExecutor] Agent dependency failed in MCP execution { error: 'Agent configuration not found for: dependency' }
[INFO] [VectorContextService] Successfully retrieved repository context {
  repositoryId: 'facebook/react',
  role: 'codeQuality',
  resultsCount: 0,
  confidence: 0
}
Retrieving DeepWiki report for codeQuality agent { repositoryId: 'facebook/react', changedFiles: 1 }
[INFO] [VectorContextService] Successfully retrieved repository context {
  repositoryId: 'facebook/react',
  role: 'codeQuality',
  resultsCount: 0,
  confidence: 0
}
[2025-07-13T16:09:04.589Z] GET /v1/analysis/analysis_1752422929518_7vyid49mc/progress - ::1
[API Key Auth] Test key authenticated successfully
[API Usage] Skipping tracking for test key
[2025-07-13T16:09:04.590Z] GET /analysis/analysis_1752422929518_7vyid49mc/progress - 200 - 1ms
Retrieving DeepWiki report for codeQuality agent { repositoryId: 'facebook/react', changedFiles: 1 }
[INFO] [MCPContextManager] Agent unsubscribed from MCP messages { agentName: 'codeQuality' }
[INFO] [MCPContextManager] Agent completed { agentName: 'codeQuality', resultsCount: 0 }
[INFO] [MCPContextManager] Next agents to execute {
  readyAgents: [ 'performance' ],
  completed: [ 'security', 'codeQuality' ],
  active: [ 'dependency' ]
}
[INFO] [MCPContextManager] Agent registered { agentName: 'performance' }
[INFO] [MCPContextManager] Agent subscribed to MCP messages { agentName: 'performance' }
[INFO] [VectorContextService] Successfully retrieved repository context {
  repositoryId: 'facebook/react',
  role: 'performance',
  resultsCount: 0,
  confidence: 0
}
Retrieving DeepWiki report for performance agent { repositoryId: 'facebook/react', changedFiles: 1 }
[INFO] [VectorContextService] Successfully retrieved repository context {
  repositoryId: 'facebook/react',
  role: 'performance',
  resultsCount: 0,
  confidence: 0
}
Retrieving DeepWiki report for performance agent { repositoryId: 'facebook/react', changedFiles: 1 }
[INFO] [MCPContextManager] Agent unsubscribed from MCP messages { agentName: 'performance' }
[INFO] [MCPContextManager] Agent completed { agentName: 'performance', resultsCount: 0 }
[INFO] [EnhancedMultiAgentExecutor] MCP-coordinated execution completed {
  totalDuration: 6732,
  completedAgents: 3,
  analysisMode: 'comprehensive'
}
[INFO] [MCPContextManager] Selected coordination strategy {
  analysisMode: 'adaptive',
  strategyName: 'Quick Analysis',
  agentCount: 2
}
[INFO] [MCPContextManager] MCP Context Manager cleaned up 
[INFO] [EnhancedMultiAgentExecutor] Execution completed successfully {
  executionId: '30da7900-b43c-4030-b81f-da307343a174',
  duration: 6733,
  successfulAgents: 0,
  totalAgents: 5
}
Repository existence check failed: Error: No search configuration for agent role: orchestrator
    at VectorContextService.getRepositoryContext (/Users/alpinro/Code Prjects/codequal/packages/agents/dist/multi-agent/vector-context-service.js:64:19)
    at DeepWikiManager.checkRepositoryExists (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/deepwiki-manager.js:22:62)
    at ResultOrchestrator.getDeepWikiSummary (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/result-orchestrator.js:1538:60)
    at ResultOrchestrator.analyzePR (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/result-orchestrator.js:90:45)
[INFO] [ResultOrchestrator] Agent results structure: {
  type: 'object',
  isArray: false,
  keys: [
    'analysisId',
    'strategy',
    'config',
    'results',
    'combinedResult',
    'successful',
    'duration',
    'totalCost',
    'usedFallback',
    'fallbackStats',
    'metadata'
  ],
  hasResults: true,
  hasAggregatedInsights: false,
  hasAgentResults: false
}
[WARN] [ResultOrchestrator] Unable to extract results array from agent results {
  structure: '{\n' +
    '  "analysisId": "30da7900-b43c-4030-b81f-da307343a174",\n' +
    '  "strategy": "parallel",\n' +
    '  "config": {\n' +
    '    "name": "PR Analysis",\n' +
    '    "strategy": "parallel",\n' +
    '    "agents": [\n' +
    '      {\n' +
    '        "type": "security",\n' +
    '        "provider": "openai",\n' +
    '        "role": "security",\n' +
    '        "position": "primary",\n' +
    '        "configuration": {\n' +
    '          "provider": "openai",\n' +
    '          "model": "gpt-4o:extended",\n' +
    '          "versionId": "gpt-4o:extended",\n' +
    '          "releaseDate": "2025-06-27T16:26:04.888Z",\n' +
    '          "des'
}
[WARN] [ResultOrchestrator] No formatted results to process 
[INFO] [RecommendationService] Generating recommendation module { findings: 5, hasDeepWiki: true }
[INFO] [EducationalToolOrchestrator] Executing educational tools with compiled context { topics: 5, packages: 0, compiledFindings: 6, recommendations: 0 }
[INFO] [EducationalToolOrchestrator] Would execute Context 7 MCP tool with compiled context { topic: 'security', findingsCount: 5, recommendationsCount: 0 }
[INFO] [EducationalToolOrchestrator] Would execute Context 7 MCP tool with compiled context { topic: 'architecture', findingsCount: 5, recommendationsCount: 0 }
[INFO] [EducationalToolOrchestrator] Would execute Context 7 MCP tool with compiled context { topic: 'performance', findingsCount: 5, recommendationsCount: 0 }
[INFO] [EducationalToolOrchestrator] Would execute Context 7 MCP tool with compiled context { topic: 'dependencies', findingsCount: 5, recommendationsCount: 0 }
[INFO] [EducationalToolOrchestrator] Would execute Context 7 MCP tool with compiled context { topic: 'codeQuality', findingsCount: 5, recommendationsCount: 0 }
[INFO] [EducationalToolOrchestrator] Would execute working examples MCP tool with compiled context { topics: 5, findingsCount: 5 }
[INFO] [EducationalToolOrchestrator] Storage usage { cacheEntries: 0, userId: '00000000-0000-0000-0000-000000000000' }
[INFO] [EducationalToolOrchestrator] Educational tools execution complete {
  documentation: 0,
  examples: 2,
  versions: 0,
  cachedHitRate: 0,
  totalCost: 0,
  executionTime: 2
}
[INFO] [EducationalAgent] Starting recommendation-based educational analysis with tool results {
  totalRecommendations: 0,
  focusAreas: [],
  hasSkillTracking: true,
  toolResultsProvided: { documentation: 0, examples: 2, versions: 0 }
}
[INFO] [EducationalAgent] Retrieved user skills for personalization { skillCount: 0, skills: [] }
[INFO] [SkillTrackingService] Tracking learning engagement {
  userId: '00000000-0000-0000-0000-000000000000',
  contentId: 'recommendations-1752422948101',
  type: 'viewed'
}
[INFO] [EducationalAgent] Tracked educational engagement { skillsTargeted: [], engagementType: 'viewed' }
[INFO] [EducationalCompilationService] Compiling educational data for Reporter Agent {
  educationalItems: { explanations: 0, tutorials: 2, bestPractices: 0, resources: 0 },
  recommendations: 0,
  findings: 5
}
[INFO] [EducationalCompilationService] Educational data compilation completed {
  learningSteps: 0,
  contentItems: 2,
  skillGaps: 0,
  mappedRecommendations: 0
}
[INFO] [ReporterAgent] Generating standardized report for UI { repositoryUrl: 'unknown', prNumber: 0, format: 'full-report' }
[INFO] [ReportFormatterService] Formatting standardized report {
  reportId: 'report_1752422948592_gyrp2essn',
  repositoryUrl: 'unknown',
  totalFindings: 0
}
[INFO] [ReporterAgent] Standardized report generated successfully {
  reportId: 'report_1752422948592_gyrp2essn',
  modulesGenerated: [
    'findings',
    'recommendations',
    'educational',
    'metrics',
    'insights'
  ],
  visualizationsCount: 3
}
[ERROR] [ResultOrchestrator] Failed to store report in Supabase { error: {}, reportId: 'report_1752422948592_gyrp2essn' }
[ERROR] [ResultOrchestrator] Error storing report in Supabase { error: {} }
[INFO] [AnalysisReportsAPI] Report stored temporarily in memory { reportId: 'report_1752422948592_gyrp2essn' }
[INFO] [ResultOrchestrator] Report stored in temporary memory storage { reportId: 'report_1752422948592_gyrp2essn' }
Repository existence check failed: Error: No search configuration for agent role: orchestrator
    at VectorContextService.getRepositoryContext (/Users/alpinro/Code Prjects/codequal/packages/agents/dist/multi-agent/vector-context-service.js:64:19)
    at DeepWikiManager.checkRepositoryExists (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/deepwiki-manager.js:22:62)
    at ResultOrchestrator.getDeepWikiSummary (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/result-orchestrator.js:1538:60)
    at ResultOrchestrator.getExistingRepositoryIssues (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/result-orchestrator.js:1714:45)
    at ResultOrchestrator.trackSkillDevelopment (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/result-orchestrator.js:1612:51)
    at ResultOrchestrator.analyzePR (/Users/alpinro/Code Prjects/codequal/apps/api/dist/services/result-orchestrator.js:143:24)
[INFO] [ResultOrchestrator] Vector Storage: found 0 results 
No tool results found for repository facebook/react, agents will analyze without tool context
[INFO] [ResultOrchestrator] Retrieved existing repository issues {
  repository: 'https://github.com/facebook/react',
  securityCount: 0,
  codeQualityCount: 0,
  architectureCount: 0,
  performanceCount: 0,
  dependenciesCount: 0
}
[INFO] [IssueResolutionDetector] Detecting fixed issues in PR { repository: 'https://github.com/facebook/react', prNumber: 25000 }
[INFO] [IssueResolutionDetector] Issue detection complete { fixedCount: 0, newCount: 0, unchangedCount: 0 }
[INFO] [SkillTrackingService] Assessing skills from PR analysis {
  userId: '00000000-0000-0000-0000-000000000000',
  prNumber: 25000,
  repository: 'https://github.com/facebook/react'
}
[INFO] [SkillTrackingService] Updating skills from assessments { userId: '00000000-0000-0000-0000-000000000000', assessmentCount: 1 }
[WARN] [SkillTrackingService] Skill category not found for user, skipping update {
  category: 'codeQuality',
  userId: '00000000-0000-0000-0000-000000000000'
}
[INFO] [ResultOrchestrator] Skill tracking completed {
  userId: '00000000-0000-0000-0000-000000000000',
  prNumber: 25000,
  assessmentsCount: 1,
  hasEducationalContent: true
}
[INFO] [WebhookHandler] DeepWikiKubernetesService initialized with pod deepwiki in namespace default 
[INFO] [RepositorySchedulerService] Initializing automatic schedule for https://github.com/facebook/react 
[INFO] [RepositorySchedulerService] Loaded 0 active schedules 
[ERROR] [RepositorySchedulerService] Failed to create schedule: {
  code: 'PGRST204',
  details: null,
  hint: null,
  message: "Could not find the 'enabled_tools' column of 'repository_schedules' in the schema cache"
}
Failed to initialize automatic schedule: {
  code: 'PGRST204',
  details: null,
  hint: null,
  message: "Could not find the 'enabled_tools' column of 'repository_schedules' in the schema cache"
}
[2025-07-13T16:09:09.611Z] GET /v1/analysis/analysis_1752422929518_7vyid49mc/progress - ::1
[API Key Auth] Test key authenticated successfully
[API Usage] Skipping tracking for test key
Error in analysis monitoring: Error: Added label "duration_bucket" is not included in initial labelset: [ 'mode', 'repository_size', 'user_tier' ]
    at validateLabel (/Users/alpinro/Code Prjects/codequal/node_modules/prom-client/lib/validation.js:20:10)
    at /Users/alpinro/Code Prjects/codequal/node_modules/prom-client/lib/histogram.js:235:3
    at Histogram.observeWithoutExemplar (/Users/alpinro/Code Prjects/codequal/node_modules/prom-client/lib/histogram.js:74:54)
    at EnhancedMonitoringService.recordAnalysisCompleted (/Users/alpinro/Code Prjects/codequal/packages/core/dist/monitoring/enhanced-monitoring-service.js:432:39)
    at res.json (/Users/alpinro/Code Prjects/codequal/apps/api/dist/middleware/monitoring-middleware.js:252:43)
    at /Users/alpinro/Code Prjects/codequal/apps/api/dist/routes/result-orchestrator.js:250:13
    at Layer.handle [as handle_request] (/Users/alpinro/Code Prjects/codequal/apps/api/node_modules/express/lib/router/layer.js:95:5)
    at next (/Users/alpinro/Code Prjects/codequal/apps/api/node_modules/express/lib/router/route.js:149:13)
    at Route.dispatch (/Users/alpinro/Code Prjects/codequal/apps/api/node_modules/express/lib/router/route.js:119:3)
    at Layer.handle [as handle_request] (/Users/alpinro/Code Prjects/codequal/apps/api/node_modules/express/lib/router/layer.js:95:5)
[2025-07-13T16:09:09.613Z] GET /analysis/analysis_1752422929518_7vyid49mc/progress - 200 - 2ms
[2025-07-13T16:09:09.636Z] GET /v1/analysis/report_1752422948592_gyrp2essn/report?format=html - ::1
[API Key Auth] Test key authenticated successfully
[API Usage] Skipping tracking for test key
[INFO] [AnalysisReportsAPI] Retrieving report {
  reportId: 'report_1752422948592_gyrp2essn',
  userId: 'test_user',
  format: 'html'
}