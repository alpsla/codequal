# DeepWiki Module

This module contains all DeepWiki-related functionality for the CodeQual analysis system.

## Overview

DeepWiki is our core code analysis engine that provides:
- Repository analysis and issue detection
- Code quality scoring
- Security vulnerability scanning
- Performance issue identification
- Best practice validation

## Directory Structure

```
deepwiki/
├── services/       # Core service implementations
├── interfaces/     # TypeScript interfaces and types
├── models/         # Data models and schemas
├── utils/          # Utility functions and helpers
├── config/         # Configuration and templates
├── __tests__/      # Test suites
├── docs/           # Documentation
└── scripts/        # Testing and utility scripts
```

## Quick Start

```typescript
import { DeepWikiClient, DeepWikiRepositoryAnalyzer } from './deepwiki';

// Initialize the client
const client = new DeepWikiClient(apiUrl, logger);

// Analyze a repository
const analyzer = new DeepWikiRepositoryAnalyzer();
const result = await analyzer.analyzeRepository(repoUrl, {
  branch: 'main',
  useCache: true
});
```

## Key Services

### DeepWikiClient
Main API client for interacting with DeepWiki endpoints.

### DeepWikiRepositoryAnalyzer
Handles repository cloning, analysis, and issue extraction with file locations.

### DeepWikiContextManager
Manages repository context for chat interactions and persistent analysis.

### DeepWikiChatService
Provides chat interface for asking questions about analyzed repositories.

## Configuration

See `config/default-config.ts` for default settings and environment variables.

## Testing

```bash
# Run unit tests
npm test deepwiki

# Run integration tests
npm run test:integration deepwiki

# Test context mechanism
npx ts-node scripts/test-context-mechanism.ts
```

## Documentation

- [API Documentation](./docs/API.md)
- [Integration Guide](./docs/INTEGRATION.md)
- [Research Findings](./docs/RESEARCH.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)

## Environment Variables

```bash
DEEPWIKI_API_URL=http://localhost:8001
DEEPWIKI_API_KEY=your-api-key
USE_DEEPWIKI_MOCK=false
DEEPWIKI_TIMEOUT=60000
```

## Known Issues

1. **File locations showing as "unknown"**
   - Solution: Use structured prompts with response_format parameter
   
2. **Limited issue detection**
   - Solution: Implement two-pass analysis
   
3. **Model selection not dynamic**
   - Solution: Integrate with RepositoryModelSelectionService

## Contributing

When adding new DeepWiki functionality:
1. Add services to `services/`
2. Define interfaces in `interfaces/`
3. Add tests to `__tests__/`
4. Update this README