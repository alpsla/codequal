# CodeQual

A comprehensive AI-powered code quality analysis platform with multi-agent architecture and advanced RAG (Retrieval-Augmented Generation) capabilities.

## 🎯 Current Status: ~80% Complete & Production Ready

**Major Implementations Complete:**
- ✅ Multi-agent architecture (Claude, ChatGPT, DeepSeek, Gemini)
- ✅ Advanced RAG framework with selective retrieval
- ✅ DeepWiki integration for repository analysis
- ✅ Comprehensive scoring and assessment system
- ✅ Vector database with pgvector support
- ✅ 200+ tests with local CI/CD validation

## 📚 Key Documentation

- **[Current Implementation Status](docs/implementation-plans/current_implementation_status.md)** - Complete project overview
- **[Next Steps - Focused Action Plan](docs/implementation-plans/next_steps_focused.md)** - Immediate priorities
- **[Local CI/CD Setup](LOCAL_CI_SETUP_COMPLETE.md)** - Development workflow
- **[RAG Framework Guide](docs/local-ci-validation.md)** - RAG implementation details

## 🚀 Quick Start

### Development Setup
```bash
# 1. One-time setup (installs git hooks, validation scripts)
npm run setup:ci

# 2. Install dependencies
npm install

# 3. Validate everything works
npm run validate
```

### Running the System
```bash
# Test RAG framework
npm run test -- --testPathPattern="rag"

# Test multi-agent system  
npm run test -- --testPathPattern="agent"

# Full validation (like CI/CD)
npm run validate:strict
```

## 🏗️ Architecture

### Core Components
- **Multi-Agent System**: Intelligent agent selection with fallbacks
- **RAG Framework**: Query analysis with metadata-based filtering  
- **Vector Database**: Semantic search with rich metadata
- **DeepWiki Integration**: Comprehensive repository analysis
- **Scoring System**: Multi-dimensional code quality assessment

### Technology Stack
- **Backend**: TypeScript, Node.js, Supabase (PostgreSQL + pgvector)
- **AI Providers**: OpenAI, Anthropic Claude, DeepSeek, Google Gemini  
- **Infrastructure**: DigitalOcean Kubernetes, GitHub Actions CI/CD
- **Testing**: Jest with 200+ tests, local CI/CD validation

## 📊 Project Structure

For detailed documentation, see:

- [Repository Analysis Guide](./docs/guides/repository_analysis.md)

## Architecture

CodeQual uses a multi-agent approach with fallback capabilities to analyze repositories across multiple dimensions:

- Architecture
- Code Quality
- Security
- Dependencies
- Performance

Each analysis produces a score from 1-10, which are combined to create an overall repository score.
