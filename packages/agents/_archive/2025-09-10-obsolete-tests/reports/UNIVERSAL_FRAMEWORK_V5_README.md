# Universal Framework V5 - Quick Start Guide

## 🚀 What's New in V5

- **Configurable Analysis Depth**: Choose between Quick (1min), Standard (3-5min), Thorough (7-10min), or Complete analysis
- **Intelligent Parallelization**: Run tools and languages in parallel for 3-5x speedup
- **Increased File Limits**: Default 500 files (up from 100), dynamically adjusted
- **Balanced Scoring**: More reasonable penalty system (5-3-1-0.5 weights)
- **Real Tool Integration**: No more mock data - actual tool output parsing

## 📦 Installation

```bash
# Navigate to agents directory
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

# Install dependencies
npm install

# Build TypeScript
npm run build
```

## 🎯 Quick Start

### Basic Usage

```bash
# Analyze current directory with standard depth (500 files)
npx ts-node test-universal-framework.ts

# Analyze specific repository
npx ts-node test-universal-framework.ts /path/to/repo

# Analyze with PR context
npx ts-node test-universal-framework.ts /path/to/repo 123

# Specify analysis depth
npx ts-node test-universal-framework.ts /path/to/repo "" quick
npx ts-node test-universal-framework.ts /path/to/repo "" standard
npx ts-node test-universal-framework.ts /path/to/repo "" thorough
npx ts-node test-universal-framework.ts /path/to/repo "" complete
```

### Enable Parallelization

```bash
# Parallel tool execution (recommended)
PARALLEL_TOOLS=true npx ts-node test-universal-framework.ts /path/to/repo

# Parallel language analysis
PARALLEL_LANGUAGES=true npx ts-node test-universal-framework.ts /path/to/repo

# Both parallel options (maximum speed)
PARALLEL_TOOLS=true PARALLEL_LANGUAGES=true npx ts-node test-universal-framework.ts /path/to/repo "" thorough
```

## 📊 Analysis Depth Options

| Depth | Files | Time | Best For |
|-------|-------|------|----------|
| **quick** | 150 | ~1 min | CI/CD, rapid feedback |
| **standard** | 500 | 3-5 min | Default, daily development |
| **thorough** | 1000 | 7-10 min | Pre-release, code reviews |
| **complete** | All | Varies | Security audits, full analysis |

## 🔧 Supported Languages & Tools

### Production Ready (Phase 1)

| Language | Tools |
|----------|-------|
| **Rust** | Clippy, cargo-audit, cargo-outdated |
| **Python** | Pylint, Bandit, mypy, safety |
| **TypeScript/JS** | ESLint, TSC, npm audit, Jest |
| **Go** | go vet, golangci-lint, gosec, go test, go mod |
| **Java** | SpotBugs, PMD, Checkstyle, OWASP, JUnit |

## 🧪 Running Tests

```bash
# Quick validation test
./run-quick-test.sh

# Full parallel execution test suite
./test-parallel-execution.sh /path/to/repo

# Test with specific PR
./test-parallel-execution.sh /path/to/repo 123
```

## 📈 Performance Tips

1. **Use Parallel Execution**: Enable `PARALLEL_TOOLS=true` for 2-4x speedup
2. **Choose Appropriate Depth**: Use "quick" for CI, "standard" for development
3. **Cache Warm-up**: Second runs are faster due to caching
4. **File Limits**: Adjust based on your needs and time constraints

## 📊 Understanding Scores

The new balanced scoring system:
- **Critical Issue**: -5 points
- **High Issue**: -3 points
- **Medium Issue**: -1 point
- **Low Issue**: -0.5 points

Score interpretation:
- **95-100**: Excellent quality, minimal issues
- **80-94**: Good quality, minor problems
- **60-79**: Fair quality, needs attention
- **40-59**: Poor quality, significant work needed
- **0-39**: Critical issues, urgent attention required

## 🔍 Output Files

After analysis, you'll find:
- `universal-analysis-report-{timestamp}.md` - Detailed analysis report
- `test-output-*.log` - Execution logs (if using test scripts)

## 🐛 Troubleshooting

### Tools Not Found
```bash
# Install language-specific tools
# Rust
cargo install clippy cargo-audit cargo-outdated

# Python
pip install pylint bandit mypy safety

# TypeScript/JavaScript
npm install -g eslint typescript

# Go
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Java
# Ensure Maven or Gradle is installed
```

### Memory Issues
- Reduce file limit: Use "quick" depth or set custom limit
- Disable parallelization: Don't set PARALLEL_* environment variables

### Slow Performance
- Enable parallelization: `PARALLEL_TOOLS=true`
- Use appropriate depth for your needs
- Ensure tools are installed locally

## 📝 Examples

### CI/CD Pipeline
```yaml
- name: Code Analysis
  run: |
    PARALLEL_TOOLS=true npx ts-node test-universal-framework.ts . ${{ github.event.pull_request.number }} quick
```

### Pre-commit Hook
```bash
#!/bin/sh
npx ts-node test-universal-framework.ts . "" quick
```

### Full Security Audit
```bash
PARALLEL_TOOLS=true npx ts-node test-universal-framework.ts . "" complete
```

## 🚀 Advanced Configuration

### Custom Analysis
```typescript
import { UniversalAnalysisFramework } from './test-universal-framework';
import { createCustomAnalysis } from './src/two-branch/core/analysis-depth-manager';

const framework = new UniversalAnalysisFramework();
const config = createCustomAnalysis(
  750,  // maxFiles
  300,  // maxTime (seconds)
  6     // maxConcurrentTools
);

const result = await framework.analyzeLanguage(
  '/path/to/repo',
  'typescript',
  undefined,
  config
);
```

## 📚 Architecture

See [V5 Architecture Document](../../docs/architecture/updated-architecture-document-v5.md) for detailed information about:
- Parallel execution strategies
- File selection algorithms
- Scoring methodology
- Performance optimizations

## 🤝 Contributing

To add support for a new language:
1. Create a parser in `src/two-branch/parsers/`
2. Add tool execution methods
3. Update `getToolExecutions` in test framework
4. Add to language list in demo function

## 📄 License

[Your License Here]

---

**Universal Framework V5** - Real tools, smart selection, configurable depth, parallel execution