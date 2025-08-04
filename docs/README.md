# CodeQual Documentation

**Last Updated**: July 31, 2025

## Current Architecture (Clean Architecture)

### 📁 Implementation Status
- [`implementation-plans/current-implementation-status-july-31-2025.md`](implementation-plans/current-implementation-status-july-31-2025.md) - Current state of clean architecture
- [`implementation-plans/session-summary-july-31-2025.md`](implementation-plans/session-summary-july-31-2025.md) - Latest development session
- [`implementation-plans/todo-list-2025-07-31.md`](implementation-plans/todo-list-2025-07-31.md) - Complete 16-week roadmap

### 🏗️ Architecture
- [`architecture/`](architecture/) - System architecture documentation
- [`api/`](api/) - API documentation and specifications
- [`deployment/`](deployment/) - Deployment guides and configurations
- [`monitoring/`](monitoring/) - Monitoring and observability setup

### 🔧 Development
- [`development/`](development/) - Development guides and standards
- [`testing/`](testing/) - Testing strategies and guides
- [`security/`](security/) - Security policies and guidelines

### 🚀 Getting Started
1. Read the [Current Implementation Status](implementation-plans/current-implementation-status-july-31-2025.md)
2. Review the [TODO List](implementation-plans/todo-list-2025-07-31.md) for roadmap
3. Check `/packages/agents/src/standard/` for clean architecture code

## Clean Architecture Structure

```
packages/agents/src/
├── standard/              # Core business logic (no external dependencies)
│   ├── orchestrator/      # Main pipeline coordination
│   ├── comparison/        # Analysis & report generation
│   ├── researcher/        # Model selection
│   ├── educator/          # Course discovery
│   └── types/            # Shared types
└── infrastructure/        # External dependencies
    ├── factory.ts        # Dependency injection
    └── supabase/         # Database implementations
```

## Key Principles

1. **Interface-Based Design** - All external dependencies behind interfaces
2. **Dependency Injection** - Factory pattern for flexible configuration
3. **Clean Separation** - Business logic independent of infrastructure
4. **Simplified Architecture** - Comparison agent generates reports directly

## Archived Documentation

Historical documentation from before the clean architecture implementation has been moved to [`archive/2025-07-pre-clean-architecture/`](archive/2025-07-pre-clean-architecture/).

## Quick Links

- [Session Summaries](session-summaries/) - Recent development sessions
- [User Guide](user-guide/) - End-user documentation
- [API Documentation](api/) - API reference
- [Deployment Guides](deployment/) - Production deployment