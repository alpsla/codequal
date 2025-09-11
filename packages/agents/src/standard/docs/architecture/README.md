# Architecture Documentation

This directory contains architectural design documents and decision records for the Standard Framework.

## 📄 Documents

### Core Architecture
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete system architecture overview, component interactions, and design principles

### Decision Logic
- **[pr-decision-logic.md](./pr-decision-logic.md)** - How the system decides to approve, reject, or conditionally approve pull requests
- **[search-decision-flow.md](./search-decision-flow.md)** - Search strategy and decision flow for finding relevant code and issues

### Data Persistence
- **[SCORE_PERSISTENCE.md](./SCORE_PERSISTENCE.md)** - How developer skills and scores are tracked, stored, and updated over time

## 🎯 Key Concepts

### System Flow
```
DeepWiki Analysis → Comparison Agent → Educator Agent → Report Generator
```

### Core Principles
1. **Single Responsibility**: Each agent has one clear purpose
2. **Interface-Based**: All components communicate through defined interfaces
3. **Stateless Processing**: Each analysis is independent
4. **Skill Tracking**: Continuous improvement through score persistence

## 🔗 Related Documentation
- Implementation details: [`../implementation/`](../implementation/)
- API integration: [`../api/`](../api/)
- Current roadmap: [`../planning/OPERATIONAL-PLAN.md`](../planning/OPERATIONAL-PLAN.md)