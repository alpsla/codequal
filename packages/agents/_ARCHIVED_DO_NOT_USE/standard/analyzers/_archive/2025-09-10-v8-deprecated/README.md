# Archived V8 Analyzers

**Archived Date**: 2025-09-10  
**Reason**: Superseded by V9 analyzers in `/src/two-branch/analyzers/`

## Archived Files
- `v8-base-analyzer.ts` - Base V8 analyzer implementation
- `v8-java-analyzer.ts` - Java-specific V8 analyzer
- `v8-rust-analyzer.ts` - Rust-specific V8 analyzer

## Migration Notes
The V9 analyzers provide:
- Smart file selection for large repositories (>10,000 files or >50,000 LOC)
- Consistent scoring system (Critical=5, High=3, Medium=1, Low=0.5)
- Comprehensive report generation with all sections
- Dynamic model selection from Supabase (no hardcoded models)

## Active Implementation
Use the V9 analyzers located at:
- `/src/two-branch/analyzers/v9-base-analyzer.ts`
- `/src/two-branch/analyzers/v9-java-analyzer.ts`
- `/src/two-branch/analyzers/v9-rust-analyzer.ts`

**DO NOT USE THESE ARCHIVED FILES**