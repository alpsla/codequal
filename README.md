# CodeQual

A comprehensive code quality analysis system powered by AI.

## Directory Structure

- `/scripts`: Core scripts for repository analysis and testing
- `/reports`: Generated analysis reports (timestamped)
- `/docs`: Documentation and guides
- `/archive`: Archived files from previous versions

## Getting Started

1. Run a quick test to verify the integration is working:
   ```bash
   ./scripts/quick_test.sh
   ```

2. Analyze a repository:
   ```bash
   ./scripts/analyze_repository.sh <repository_url> [model_name]
   ```
   
3. View the latest report:
   ```bash
   open ./reports/latest/comprehensive_analysis.md
   ```

## Documentation

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
