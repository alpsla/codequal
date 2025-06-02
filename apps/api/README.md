# CodeQual API Server

The CodeQual API Server provides the Result Orchestrator functionality for coordinating PR analysis workflows. It serves as the central entry point for PR analysis requests and manages the complete analysis pipeline.

## 🚀 Features

- **PR Analysis Orchestration**: Complete workflow coordination from PR context extraction to final report generation
- **Multi-Agent Coordination**: Leverages existing EnhancedMultiAgentExecutor for parallel agent execution
- **Dynamic Model Selection**: Uses existing ModelVersionSync for optimal model configuration
- **Vector DB Integration**: Seamless integration with existing pgvector database
- **Educational Content**: RAG-powered educational content generation
- **Repository Management**: Repository analysis status tracking and manual triggering
- **Analysis History**: Complete analysis history and statistics tracking
- **Authentication**: Full Supabase authentication integration

## 📋 Prerequisites

- Node.js 18+ and npm
- Existing CodeQual infrastructure (Vector DB, Authentication, Agent packages)
- Supabase project with authentication configured

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure environment variables (see Configuration section)
nano .env

# Build the project
npm run build

# Start development server
npm run dev
```

## ⚙️ Configuration

### Required Environment Variables

```bash
# Server
PORT=3001
NODE_ENV=development

# Supabase Authentication (Required)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Allowed origins for CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Optional Environment Variables

```bash
# GitHub/GitLab integration
GITHUB_TOKEN=your_github_token
GITLAB_TOKEN=your_gitlab_token

# Additional API keys (fallback to existing configuration)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

## 🔗 API Endpoints

### Analysis Endpoints

#### `POST /api/analyze-pr`
Start a new PR analysis

**Request:**
```json
{
  "repositoryUrl": "https://github.com/owner/repo",
  "prNumber": 123,
  "analysisMode": "comprehensive",
  "githubToken": "optional_github_token"
}
```

**Response:**
```json
{
  "analysisId": "analysis_1234567890_abc123",
  "status": "queued",
  "estimatedTime": 180
}
```

#### `GET /api/analysis/:id/progress`
Check analysis progress

**Response:**
```json
{
  "analysisId": "analysis_1234567890_abc123",
  "status": "processing",
  "progress": 75,
  "currentStep": "Processing results",
  "estimatedTimeRemaining": 45000
}
```

#### `GET /api/analysis/history`
Get user's analysis history

**Query Parameters:**
- `limit` (default: 20, max: 100)
- `offset` (default: 0)
- `repositoryUrl` (optional filter)

### Repository Endpoints

#### `GET /api/repository/status`
Check repository analysis status

**Query Parameters:**
- `repositoryUrl` (required)

**Response:**
```json
{
  "repositoryUrl": "https://github.com/owner/repo",
  "existsInVectorDB": true,
  "lastAnalyzed": "2025-06-01T10:30:00Z",
  "analysisQuality": "fresh",
  "nextScheduledAnalysis": "2025-06-08T10:30:00Z"
}
```

#### `POST /api/repository/analyze`
Manually trigger repository analysis

**Request:**
```json
{
  "repositoryUrl": "https://github.com/owner/repo",
  "force": false
}
```

### Analysis Results Endpoints

#### `GET /api/analysis/:id/results`
Get complete analysis results

#### `GET /api/analysis/:id/report`
Get formatted report

**Query Parameters:**
- `format` (json, markdown, pr-comment)

#### `POST /api/analysis/:id/feedback`
Submit feedback on analysis

## 🏗️ Architecture

The API server implements the Result Orchestrator design with the following key components:

### Core Services

1. **ResultOrchestrator** - Main coordination engine
   - PR context extraction
   - Repository status checking
   - Multi-agent coordination
   - Result processing and report generation

2. **DeepWikiManager** - Repository analysis management
   - Vector DB existence checks
   - Analysis job tracking
   - Result storage coordination

3. **PRContextService** - GitHub/GitLab integration
   - PR details fetching
   - Diff analysis
   - Change impact assessment

4. **ResultProcessor** - Finding processing
   - Deduplication algorithms
   - Conflict resolution
   - Severity calculation

5. **EducationalContentService** - Learning content generation
   - RAG integration
   - Skill level adaptation
   - Content matching

### Middleware

- **Authentication Middleware** - Supabase JWT validation
- **Error Handler** - Centralized error processing
- **Request Logger** - Request/response logging

### Integration Points

- **EnhancedMultiAgentExecutor** - Parallel agent execution
- **ModelVersionSync** - Dynamic model selection
- **VectorContextService** - Vector DB operations
- **RAG Framework** - Educational content retrieval

## 🔄 Workflow

1. **PR Analysis Request** → Authentication → Repository Access Check
2. **PR Context Extraction** → GitHub/GitLab API integration
3. **Repository Status Check** → Vector DB existence verification
4. **Repository Analysis** → DeepWiki integration (if needed)
5. **Model Selection** → Dynamic orchestrator configuration
6. **Agent Coordination** → Parallel multi-agent execution
7. **Result Processing** → Deduplication and conflict resolution
8. **Educational Content** → RAG-powered learning materials
9. **Report Generation** → Final formatted output
10. **History Storage** → Analysis tracking and metrics

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Test specific endpoint
curl -X POST http://localhost:3001/api/analyze-pr \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_supabase_jwt" \
  -d '{
    "repositoryUrl": "https://github.com/owner/repo",
    "prNumber": 123,
    "analysisMode": "quick"
  }'
```

## 📊 Monitoring

### Health Check

```bash
GET /health
```

### Metrics

- Analysis completion times
- Error rates
- User activity
- Repository analysis frequency

## 🚀 Deployment

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Docker (Future)

```bash
docker build -t codequal-api .
docker run -p 3001:3001 codequal-api
```

## 🔧 Integration with Existing Infrastructure

This API server is designed to integrate seamlessly with the existing CodeQual infrastructure:

- **Uses existing authentication system** (Supabase)
- **Leverages existing agent packages** (`@codequal/agents`)
- **Integrates with existing model configuration** (`@codequal/core`)
- **Uses existing Vector DB setup** (pgvector)
- **Connects to existing RAG framework**
- **Works with existing DeepWiki integration**

## 📝 Configuration Management

The server automatically loads optimal configurations using the existing ModelVersionSync system:

- **Dynamic model selection** based on repository context
- **Automatic fallback handling** for failed models
- **Cost optimization** using existing calibration data
- **Performance tracking** and model efficiency monitoring

## 🔐 Security

- **JWT token validation** via Supabase
- **Repository access control** using existing permissions
- **Request rate limiting**
- **Input validation and sanitization**
- **CORS configuration**
- **Security headers** via Helmet.js

## 📈 Performance

- **Async processing** for long-running analyses
- **Progress tracking** with real-time updates
- **Concurrent agent execution** via existing executor
- **Efficient Vector DB queries**
- **Response caching** where appropriate

## 🤝 Contributing

This API server follows the existing CodeQual development patterns:

1. Use existing TypeScript configurations
2. Follow existing code style and patterns
3. Leverage existing test frameworks
4. Integrate with existing CI/CD pipelines
5. Use existing logging and monitoring systems

## 📚 Documentation

- [Complete Design Document](../../docs/implementation-plans/result-orchestrator-design-document.md)
- [Gap Analysis](../../docs/implementation-plans/result-orchestrator-gap-analysis.md)
- [Requirements](../../docs/implementation-plans/result-orchestrator-requirements.md)
- [Project Roadmap](../../docs/implementation-plans/complete_roadmap_corrected.md)

## 🆘 Support

For issues and questions:

1. Check the existing documentation
2. Review the design documents
3. Examine the test cases
4. Consult the project roadmap

---

**Status**: ✅ Implementation Complete - Ready for Testing and Integration