# Repository Analysis Guide

This document explains how to use the CodeQual repository analysis tools.

## Quick Start

To analyze a repository:

```bash
./scripts/analyze_repository.sh <repository_url> [model_name]
```

Example:
```bash
./scripts/analyze_repository.sh https://github.com/expressjs/express anthropic/claude-3-opus
```

## Analysis Process

The script performs the following analyses:

1. **Architecture Analysis**: Evaluates the overall design patterns, code organization, component relationships, and modularity.
2. **Code Quality Analysis**: Assesses code style, error handling, documentation, and testing approach.
3. **Security Analysis**: Reviews input handling, authentication, data protection, and error handling from a security perspective.
4. **Dependencies Analysis**: Examines direct dependencies, dependency management, third-party integration, and dependency quality.
5. **Performance Analysis**: Analyzes resource usage, optimization techniques, concurrency handling, and caching strategies.

Each analysis is given a score from 1-10, and these scores are combined to create an overall repository score.

## Output Files

The script generates several output files in a timestamped directory under `/reports`:

- `architecture_analysis.md`: Architecture analysis results
- `code_quality_analysis.md`: Code quality analysis results
- `security_analysis.md`: Security analysis results
- `dependencies_analysis.md`: Dependencies analysis results
- `performance_analysis.md`: Performance analysis results
- `repository_scoring.md`: Summary of scores across all categories
- `comprehensive_analysis.md`: Combined report with all analyses

A symlink to the latest report is created at `/reports/latest` for easy access.

## Fallback Mechanism

The script includes a fallback mechanism that automatically tries alternative models if the primary model fails. The fallback sequence is:

1. Primary model (specified or default)
2. openai/gpt-4.1
3. anthropic/claude-3.7-sonnet
4. openai/gpt-4

## Testing the Integration

To quickly test if the DeepWiki OpenRouter integration is working:

```bash
./scripts/quick_test.sh [repository_url] [model_name]
```

This script sends a minimal request and displays the response, which is useful for troubleshooting.
