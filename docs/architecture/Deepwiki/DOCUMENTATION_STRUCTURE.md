# DeepWiki Documentation Structure

**Last Updated:** August 9, 2025

## Primary Documentation
All core DeepWiki documentation has been consolidated into:
- **Main Document:** `/docs/architecture/Deepwiki/README.md`

## Directory Structure

```
/docs/architecture/Deepwiki/
├── README.md                           # Main consolidated documentation
├── DOCUMENTATION_STRUCTURE.md          # This file
├── deepwiki_openrouter_integration.md  # OpenRouter integration details
├── prompts/                            # AI prompt templates
│   ├── architecture_prompt.txt
│   ├── code_quality_prompt.txt
│   ├── security_prompt.txt
│   └── standard_prompt.txt
└── template_command_updated.sh         # Template command script
```

## Other DeepWiki Files (Operational)

These files remain in their original locations as they serve specific operational purposes:

### Kubernetes & Deployment
- `/k8s/deepwiki-analyzer/setup-deepwiki-binary.md` - K8s setup guide
- `/docs/deployment/deepwiki-redis-maintenance-guide.md` - Redis maintenance
- `/docs/monitoring/dashboards/deepwiki-dashboard.md` - Monitoring dashboard

### Claude Configuration
- `/.claude/DO-NOT-DELETE-DEEPWIKI-STANDARD.md` - Claude-specific config

### Research & Design
- `/docs/research/deepwiki-chat-*.md` - Research documents
- `/packages/mcp-hybrid/docs/deepwiki-tool-integration-architecture.md` - MCP integration

### Package-Specific Docs
- `/packages/agents/docs/deepwiki-cost-analysis-*.md` - Cost analysis
- `/packages/agents/src/standard/docs/HOW_TO_RUN_REAL_DEEPWIKI_TESTS.md` - Testing guide
- `/packages/agents/src/standard/docs/deepwiki/DEEPWIKI_QUICK_START.md` - Quick start

### Test Reports
- `/packages/*/reports/*deepwiki*.md` - Various test reports

## Archived Documentation

All outdated and duplicate DeepWiki documentation has been archived to:
- `/docs/archive/deepwiki-legacy-20250809/`

This includes:
- 19 legacy documentation files
- Old API documentation
- Outdated integration guides
- Historical session summaries

## Quick Navigation

| Topic | Location |
|-------|----------|
| **Overview & Architecture** | [README.md](./README.md#architecture) |
| **API Reference** | [README.md](./README.md#api-reference) |
| **Deployment Guide** | [README.md](./README.md#deployment--configuration) |
| **Troubleshooting** | [README.md](./README.md#common-issues--solutions) |
| **Testing & Debugging** | [README.md](./README.md#testing--debugging) |
| **OpenRouter Integration** | [deepwiki_openrouter_integration.md](./deepwiki_openrouter_integration.md) |
| **Prompt Templates** | [prompts/](./prompts/) |

## Maintenance Notes

1. **All new DeepWiki documentation should be added to the main README.md**
2. **Package-specific docs can remain in their packages**
3. **Test reports should continue to be generated in their respective locations**
4. **Operational docs (K8s, monitoring) stay in their functional locations**

## Contact

For questions about DeepWiki documentation or integration:
- Check the main [README.md](./README.md) first
- Review troubleshooting section for common issues
- Use the diagnostic tool for debugging