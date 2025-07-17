# Changelog

All notable changes to the CodeQual project will be documented in this file.

## [Unreleased] - 2025-01-15

### Added

#### Progress Tracking System
- Real-time progress tracking API for PR analysis
- Server-Sent Events (SSE) endpoint for live updates
- Progress phases: initialization, toolExecution, agentAnalysis, resultProcessing, reportGeneration
- Individual agent and tool progress monitoring
- Time estimation based on current progress
- API endpoints:
  - `GET /api/progress/:analysisId` - Get progress for specific analysis
  - `GET /api/progress` - Get all active analyses
  - `GET /api/progress/:analysisId/updates` - Get recent updates
  - `GET /api/progress/:analysisId/stream` - SSE for real-time updates

#### Tool Results Vector Storage
- Automatic storage of MCP tool execution results in Vector DB
- Semantic search capabilities for finding similar issues
- Historical metrics aggregation
- Embeddings for each finding and summary
- Integration with Enhanced Multi-Agent Executor

#### Vector DB Retention Policy
- Prevents exponential growth of Vector database
- Configurable retention periods (90 days for tools, 180 days for analyses)
- Per-repository storage limits (10k records)
- Global storage limit (1M records)
- Automatic daily cleanup at 2 AM
- Data aggregation before deletion
- Critical security findings preservation
- Admin API endpoints:
  - `GET /api/vector-retention/stats` - Storage statistics
  - `GET /api/vector-retention/config` - View configuration
  - `POST /api/vector-retention/cleanup` - Manual cleanup
  - `PUT /api/vector-retention/schedule` - Update schedule
  - `GET /api/vector-retention/preview` - Preview impact

#### MCP Tool Integration
- Real MCP tool adapters for ESLint, Semgrep, and Context Retrieval
- Automatic tool execution for each agent role
- Cross-agent coordination and insight sharing
- Tool results collection and storage

#### Debug Logging System
- Comprehensive execution trace logging
- Sanitization of sensitive data (API keys, tokens)
- Export functionality for troubleshooting
- Integration with Enhanced Multi-Agent Executor

#### Automatic Mode Selection
- Risk-based analysis mode selection
- Configurable thresholds for quick/comprehensive/deep analysis
- Smart resource allocation based on PR complexity

### Changed

#### Enhanced Multi-Agent Executor
- Integrated progress tracking throughout execution lifecycle
- Added tool results collection for Vector DB storage
- Improved error handling and logging
- Better resource management with smart limits

#### API Documentation
- Updated OpenAPI specification with new endpoints
- Added Progress and Vector DB Management tags
- Comprehensive schema definitions for new features

### Fixed

- Agent response parsing for models that include thinking tags
- Results aggregation in enhanced executor
- MCP tools execution and results collection
- Dependency vs dependencies naming inconsistency

### Security

- Sanitization of sensitive data in debug logs
- Repository access validation
- Admin-only access for retention policy management
- Preserved critical security findings in retention policy

## Database Changes

### New Tables
- `tool_results_vectors` - Stores tool execution results with embeddings
- `retention_policy_runs` - Tracks retention policy executions
- `tool_results_archive` - Archives summary data before deletion

### New Functions
- `compact_similar_embeddings()` - Merges similar embeddings
- `get_vector_storage_stats()` - Returns storage statistics
- `archive_old_tool_results()` - Archives data before deletion
- `log_retention_run()` - Logs retention policy executions

### New Indexes
- `idx_tool_results_created_at` - For efficient date-based queries
- `idx_tool_results_repository_id` - For repository filtering
- `idx_tool_results_severity` - For severity-based filtering

## Configuration

### Environment Variables
No new environment variables required. Uses existing:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `OPENROUTER_API_KEY`

### Default Settings
- Progress tracking: Enabled automatically
- Tool results storage: Enabled when Vector DB available
- Retention policy: Daily at 2 AM, 90/180 day retention
- Storage limits: 10k per repo, 1M global

## Migration Guide

1. **Database Migration**
   - Run `vector-db-retention-functions.sql` to add retention support
   - Existing data is preserved

2. **API Updates**
   - Progress endpoints available immediately
   - Retention endpoints require admin role

3. **Integration**
   - Progress tracking works automatically
   - Tool results storage activates with Vector DB
   - Retention policy starts on server startup

## Known Issues

- Embedding compaction function is a placeholder (requires pgvector implementation)
- Admin role checking is simplified (production needs proper RBAC)

## Future Enhancements

- WebSocket support for progress updates (currently SSE only)
- Progress visualization UI component
- Machine learning for retention optimization
- Tiered storage with hot/cold data separation
- Advanced compliance features (GDPR, etc.)