# MCP Tools Implementation Priority Plan

## Executive Summary

**Current State**: Only 12.5% language coverage (JavaScript/TypeScript only)
**Critical Gap**: Missing support for Python, Go, Java - the most common languages after JS/TS
**Solution**: Implement 9 free tools to achieve 50% coverage

## Immediate Priority Tools (Phase 1)

### 1. Python Tools (33% of projects use Python)

#### Bandit (Security)
```bash
pip install bandit
bandit -r /path/to/python/code -f json
```
- Detects common security issues in Python
- Free and open source
- JSON output format available

#### Pylint (Code Quality)
```bash
pip install pylint
pylint --output-format=json /path/to/python/code
```
- Comprehensive Python linting
- Highly configurable
- Free and open source

#### pip-audit (Dependencies)
```bash
pip install pip-audit
pip-audit --format json
```
- Scans Python dependencies for vulnerabilities
- Uses OSV database
- Free and open source

### 2. Go Tools (15% of projects use Go)

#### GoSec (Security)
```bash
go install github.com/securego/gosec/v2/cmd/gosec@latest
gosec -fmt json ./...
```
- Go security checker
- Inspects source for security problems
- Free and open source

#### golangci-lint (Code Quality)
```bash
golangci-lint run --out-format json
```
- Fast Go linters aggregator
- Runs multiple linters in parallel
- Free and open source

#### Nancy (Dependencies)
```bash
go install github.com/sonatype-nexus-community/nancy@latest
nancy sleuth -o json
```
- Vulnerability scanner for Go dependencies
- Uses OSS Index
- Free and open source

### 3. Java Tools (25% of projects use Java)

#### SpotBugs (Security & Quality)
```bash
java -jar spotbugs.jar -textui -xml:withMessages -output report.xml
```
- Find bugs in Java programs
- Security and correctness issues
- Free and open source

#### Checkstyle (Code Quality)
```bash
java -jar checkstyle.jar -c config.xml -f xml -o report.xml
```
- Java code style checker
- Highly configurable rules
- Free and open source

#### OWASP Dependency Check (Dependencies)
```bash
dependency-check --scan /path --format JSON --out report.json
```
- Identifies project dependencies with known vulnerabilities
- Uses NVD and other databases
- Free and open source

## Implementation Template

Here's a template for implementing each tool:

```typescript
// Template: src/mcp-wrappers/{tool}-mcp.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class {Tool}MCP {
  async analyze(targetPath: string) {
    try {
      const command = this.buildCommand(targetPath);
      const { stdout } = await execAsync(command, {
        cwd: targetPath,
        timeout: 300000, // 5 minutes
        maxBuffer: 50 * 1024 * 1024
      });
      
      const result = JSON.parse(stdout);
      return {
        tool: '{tool}',
        success: true,
        findings: this.convertToMCPFormat(result),
        metrics: this.calculateMetrics(result)
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  private buildCommand(targetPath: string): string {
    // Tool-specific command
  }
  
  private convertToMCPFormat(result: any): any[] {
    // Convert to standardized format
  }
}
```

## Coverage Impact Analysis

### Before Implementation (Current)
```
Languages Supported: 1/8 (12.5%)
- ✅ JavaScript/TypeScript
- ❌ Python
- ❌ Go  
- ❌ Java
- ❌ Ruby
- ❌ PHP
- ❌ C/C++
- ❌ Rust
```

### After Phase 1 Implementation
```
Languages Supported: 4/8 (50%)
- ✅ JavaScript/TypeScript (existing)
- ✅ Python (new)
- ✅ Go (new)
- ✅ Java (new)
- ❌ Ruby
- ❌ PHP
- ❌ C/C++
- ❌ Rust
```

### Market Coverage Achieved
- **JavaScript/TypeScript**: ~40% of projects
- **Python**: ~33% of projects
- **Java**: ~25% of projects
- **Go**: ~15% of projects
- **Total Coverage**: ~85% of common projects

## Integration Points

### 1. Language Detection Service
```typescript
class LanguageDetector {
  detect(repoPath: string): Language[] {
    // Check for language indicators:
    // - package.json → JavaScript/TypeScript
    // - requirements.txt, setup.py → Python
    // - go.mod → Go
    // - pom.xml, build.gradle → Java
    // - Gemfile → Ruby
    // - composer.json → PHP
    // - Cargo.toml → Rust
    // - CMakeLists.txt → C/C++
  }
}
```

### 2. Tool Router Update
```typescript
class ToolRouter {
  selectTools(language: string): Tool[] {
    const toolMap = {
      'javascript': [ESLintMCP, SemgrepMCP, NpmAuditMCP],
      'typescript': [ESLintMCP, SemgrepMCP, NpmAuditMCP],
      'python': [BanditMCP, PylintMCP, PipAuditMCP],
      'go': [GoSecMCP, GolangciLintMCP, NancyMCP],
      'java': [SpotBugsMCP, CheckstyleMCP, DependencyCheckMCP]
    };
    return toolMap[language] || [];
  }
}
```

### 3. Universal Parser Extensions
```typescript
// Add to UniversalToolParser
switch (toolType) {
  // Existing
  case 'semgrep': return this.parseSemgrep(output);
  case 'eslint': return this.parseESLint(output);
  
  // New Phase 1
  case 'bandit': return this.parseBandit(output);
  case 'pylint': return this.parsePylint(output);
  case 'pip-audit': return this.parsePipAudit(output);
  case 'gosec': return this.parseGoSec(output);
  case 'golangci-lint': return this.parseGolangciLint(output);
  case 'nancy': return this.parseNancy(output);
  case 'spotbugs': return this.parseSpotBugs(output);
  case 'checkstyle': return this.parseCheckstyle(output);
  case 'dependency-check': return this.parseDependencyCheck(output);
}
```

## Testing Strategy

### Unit Tests for Each Tool
```typescript
describe('BanditMCP', () => {
  it('should detect SQL injection in Python', async () => {
    const result = await bandit.analyze('test/fixtures/python/sql-injection');
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        type: 'security',
        severity: 'high',
        category: 'sql-injection'
      })
    );
  });
});
```

### Integration Tests
```typescript
describe('Multi-language Integration', () => {
  it('should analyze Python project', async () => {
    const tools = router.selectTools('python');
    expect(tools).toHaveLength(3);
    
    const results = await Promise.all(
      tools.map(tool => tool.analyze('test/fixtures/python'))
    );
    
    expect(results.every(r => r.success)).toBe(true);
  });
});
```

## Effort Estimation

### Per Tool Implementation
- MCP Wrapper Creation: 2-3 hours
- Parser Implementation: 1-2 hours
- Testing: 1-2 hours
- Documentation: 1 hour
- **Total per tool**: ~6 hours

### Phase 1 Total (9 tools)
- Implementation: 54 hours (~7 days)
- Integration: 8 hours (1 day)
- Testing: 8 hours (1 day)
- **Total Phase 1**: ~70 hours (9 days)

## Success Criteria

### Phase 1 Complete When:
- [ ] All 9 tools have MCP wrappers
- [ ] Universal parser handles all new formats
- [ ] Language detection service operational
- [ ] Tool router selects appropriate tools
- [ ] Integration tests pass for all languages
- [ ] Documentation updated
- [ ] 50% language coverage achieved

## Risk Mitigation

### Potential Issues & Solutions

1. **Tool Installation Complexity**
   - Solution: Docker containers with pre-installed tools
   - Fallback: Check if tool installed, provide installation instructions

2. **Output Format Variations**
   - Solution: Robust parser with fallbacks
   - Fallback: Generic parser for unexpected formats

3. **Performance Impact**
   - Solution: Parallel execution, caching
   - Fallback: Configurable timeout limits

4. **Language Detection Accuracy**
   - Solution: Multiple detection strategies
   - Fallback: Allow manual language specification

## Conclusion

Implementing these 9 tools will increase our language coverage from 12.5% to 50%, covering approximately 85% of real-world projects. All tools are free and open-source, maintaining our commitment to avoiding licensing costs.