# ⚠️ ARCHIVED CODE - DO NOT USE ⚠️

## Status: DEPRECATED

All code in this directory has been replaced by the V9 Two-Branch Analyzer.

## Active Implementation

**Location**: `/packages/agents/src/two-branch/`
**Entry Point**: `/packages/agents/src/two-branch/analyzers/v9-analyzer-framework.ts`

## Why These Were Archived

- **standard/**: Replaced by V9 two-branch implementation
- **specialized/**: Merged into V9 language-specific analyzers
- **v7/v8/**: Outdated versions, superseded by V9
- **base/claude/deepseek/**: Old agent structure, replaced by unified V9
- **services/**: Most services integrated into V9 modules

## DO NOT:
- Import from these files
- Copy code from these files
- Try to "fix" or update these files
- Reference these implementations

## DO:
- Use V9 Two-Branch Analyzer
- Follow the flow in `.codequal-config.yaml`
- Run `test-v9-kafka-fixed.ts` for testing

## Migration Guide

| Old Code | New V9 Equivalent |
|----------|-------------------|
| `ComparisonAgent` | `V9AnalyzerFramework` |
| `ComparisonOrchestrator` | Built into V9 framework |
| `EducatorAgent` | `V9EducationalResources` |
| `DependencyAgent` | Language-specific V9 analyzers |
| `ResearcherAgent` | Integrated into V9 |

## Deletion Date

These files will be permanently deleted on: **2025-10-01**

---

**Remember**: The V9 implementation is COMPLETE and WORKING. Do not reimplement!