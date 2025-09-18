# Cloud Pod Tool Deployment

## Overview

All analysis tools are deployed in cloud pods and run remotely. Tools cannot be added to language analyzers without proper deployment.

## Current Deployed Tools

### Java Tools (Cloud Pod: java-analysis-pod)

**Deployed and Available:**
- **SpotBugs** - Code quality analysis (QualityAnalyzer)
- **PMD** - Code quality and design analysis (QualityAnalyzer)
- **Checkstyle** - Code style checking (QualityAnalyzer)
- **Semgrep** - Security vulnerability scanning (SecurityAnalyzer)
- **OWASP Dependency Check** - Dependency vulnerability scanning (DependencyAnalyzer)

**Not Yet Deployed (Planned):**
- **JMH** - Performance benchmarking (PerformanceAnalyzer)
- **JProfiler** - Performance profiling (PerformanceAnalyzer)
- **ArchUnit** - Architecture testing (ArchitectureAnalyzer)
- **Structure101** - Dependency structure analysis (ArchitectureAnalyzer)

### Python Tools (Cloud Pod: python-analysis-pod)

**Deployed and Available:**
- **Pylint** - Code quality (QualityAnalyzer)
- **Bandit** - Security scanning (SecurityAnalyzer)
- **Safety** - Dependency checking (DependencyAnalyzer)

### JavaScript/TypeScript Tools (Cloud Pod: js-analysis-pod)

**Deployed and Available:**
- **ESLint** - Code quality (QualityAnalyzer)
- **npm audit** - Dependency vulnerabilities (DependencyAnalyzer)
- **Semgrep** - Security scanning (SecurityAnalyzer)

## Analysis Roles Coverage

| Role | Java | Python | JavaScript | Status |
|------|------|--------|------------|--------|
| QualityAnalyzer | ✅ SpotBugs, PMD, Checkstyle | ✅ Pylint | ✅ ESLint | Active |
| SecurityAnalyzer | ✅ Semgrep | ✅ Bandit | ✅ Semgrep | Active |
| DependencyAnalyzer | ✅ OWASP DC | ✅ Safety | ✅ npm audit | Active |
| PerformanceAnalyzer | ❌ Not deployed | ❌ Not deployed | ❌ Not deployed | Planned |
| ArchitectureAnalyzer | ❌ Not deployed | ❌ Not deployed | ❌ Not deployed | Planned |

## Adding New Tools

To add a new tool to the system:

### 1. Build Container
```dockerfile
# Example Dockerfile for Java tools
FROM openjdk:11-jdk

# Install existing tools
RUN apt-get update && apt-get install -y \
    maven \
    gradle

# Install SpotBugs
RUN wget https://github.com/spotbugs/spotbugs/releases/download/4.7.3/spotbugs-4.7.3.tgz \
    && tar -xzf spotbugs-4.7.3.tgz \
    && mv spotbugs-4.7.3 /opt/spotbugs

# Install PMD
RUN wget https://github.com/pmd/pmd/releases/download/pmd_releases%2F6.55.0/pmd-bin-6.55.0.zip \
    && unzip pmd-bin-6.55.0.zip \
    && mv pmd-bin-6.55.0 /opt/pmd

# Install NEW TOOL HERE
# RUN wget/install commands for new tool

ENV PATH="/opt/spotbugs/bin:/opt/pmd/bin:${PATH}"
```

### 2. Push to Cloud Repository
```bash
docker build -t codequal/java-analysis:v2.0 .
docker push codequal/java-analysis:v2.0
```

### 3. Update Cloud Pod Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: java-analysis-pod
spec:
  template:
    spec:
      containers:
      - name: java-tools
        image: codequal/java-analysis:v2.0  # Updated version
```

### 4. Update Language Analyzer
Only after the tool is deployed, add it to the language analyzer configuration:
```typescript
// v9-java-analyzer.ts
tools: [
  // ... existing tools
  {
    name: 'new-tool-name',
    command: 'new-tool-command',
    agent: 'AppropriateAnalyzer',  // One of the 5 roles
    parser: this.parseNewToolOutput.bind(this)
  }
]
```

## Important Notes

- **Never add tools to analyzer configurations without deployment**
- Tools run in isolated cloud pods for security and scalability
- Each language has its own pod with language-specific tools
- Tool outputs are parsed locally but execution happens remotely
- The V9ToolOrchestrator handles routing tool results to appropriate agents

## Current Limitations

1. **Performance tools not deployed** - No JMH, JProfiler, or performance profiling tools
2. **Architecture tools not deployed** - No ArchUnit, Structure101, or design analysis tools
3. **Limited language coverage** - Full tool sets only for Java, Python, JavaScript

## Future Roadmap

1. Deploy performance analysis tools for all languages
2. Deploy architecture analysis tools for all languages
3. Add support for more languages (Go, Rust, C++, etc.)
4. Implement tool versioning and rollback capabilities
5. Add custom tool upload functionality for enterprise customers