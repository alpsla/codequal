# Multi-Agent Architecture for CodeQual

**Last Updated: May 11, 2025**

## Overview

The CodeQual project uses a flexible, adaptive multi-agent architecture to analyze code repositories and pull requests. This document provides an overview of the system architecture, with detailed information available in component-specific documents.

## Core Principles

1. **Flexibility**: Any agent type can fulfill any functional role in the system
2. **Configuration-driven**: Behavior is determined by configuration, not inheritance
3. **Dynamic prompting**: Prompts are generated based on agent role, position, and context
4. **Unified orchestration**: Results are combined using a consistent approach
5. **Separation of concerns**: Each component has a single, well-defined responsibility
6. **Adaptive selection**: Agent-role combinations are chosen based on context
7. **Continuous learning**: Performance data drives ongoing optimization
8. **Real-world calibration**: All models are calibrated using real repositories and PRs

## Two-Tier Analysis Architecture

CodeQual implements a dual-mode analysis architecture to balance speed and depth:

### Quick PR-Only Analysis
- Focuses only on PR and changed files
- Completes in 1-3 minutes
- Provides immediate feedback for day-to-day development
- Uses lightweight context extraction
- Optimized for rapid iteration during development

### Comprehensive Repository + PR Analysis
- Performs deep repository analysis with DeepWiki followed by PR analysis
- Takes 5-10 minutes for complete results
- Caches repository analysis for future use
- Provides architectural insights and dependency analysis
- Best for major features, architectural changes, or periodic reviews

## Architecture Components

The architecture consists of the following detailed components. For more information, see the corresponding component documentation:

### Core System Components

- **Agent Evaluation System**: Selects optimal agents for different contexts
- **Multi-Agent Orchestrator**: Determines required roles and optimal agents
- **Multi-Agent Factory**: Creates agent configurations based on analysis needs
- **Prompt Generator**: Generates context-aware prompts
- **Multi-Agent Executor**: Runs configured agents with fallbacks
- **Result Orchestrator**: Combines results into cohesive analysis
- **Reporting Agent**: Formats results into final reports

### Agent Roles and Evaluation

- **Analysis Agent Roles**: Primary, Secondary, Fallback Agents
- **Support Agent Roles**: Repository Data, Interaction, Documentation, Test, CI/CD Providers
- **Real-Data Model Calibration**: Optimizes models based on real-world performance
- **Context-Adaptive Role Determination**: Selects roles based on PR context
- **Multi-Model Architecture**: Language-specific model selection

### RAG Integration

- **RAG-Powered Repository Analysis**: Semantic vector-based repository understanding
- **RAG for Educational Content**: Context-aware code education
- **RAG for User Support and Tutoring**: Developer assistance and guidance
- **RAG for Documentation**: Automated documentation and knowledge base maintenance
- **Vector Database Integration**: Optimized storage and querying

### Deployment Architecture

- **Unified Container-Based Deployment**: Works across development, cloud, and on-premises
- **Cloud Migration Strategy**: Staged approach from simple to enterprise
- **Development Workflow**: Local development with cloud integration
- **Monitoring and Security**: Comprehensive observability and protection

### Analysis Workflows

- **PR Analysis Flow**: Flexible workflow with optional components
- **Quick Analysis Workflow**: Speed-optimized review
- **Comprehensive Analysis Workflow**: Deep context-aware analysis
- **Custom Analysis Workflows**: Security-focused, educational, and other specialized flows
- **Git Provider Integration**: GitHub, GitLab, Azure DevOps support

## Detailed Documentation

For more detailed information on each component of the architecture, refer to the following documents:

1. [Multi-Agent Core Architecture](components/1-multi-agent-core-architecture.md)
2. [Agent Roles and Evaluation](components/2-agent-roles-and-evaluation.md)
3. [RAG Integration](components/3-rag-integration.md)
4. [Unified Deployment Architecture](components/4-unified-deployment-architecture.md)
5. [Analysis Workflows](components/5-analysis-workflows.md)
