# Proposed Cross-Language API Agent Architecture

## Current Problem
GitHub and GitLab agents are treated as separate "languages" when they should be cross-language security platforms that enhance analysis for ALL languages.

## Proposed Solution

### 1. Create a New Agent Category: Platform Agents
```typescript
interface PlatformAgent {
  // Analyzes entire repository across all languages
  analyzeRepository(repoUrl: string): Promise<PlatformAnalysisResult>;
  
  // Enhances language-specific results with platform data
  enhanceLanguageResults(
    language: string, 
    localResults: Issue[],
    platformData: PlatformData
  ): Promise<EnhancedIssue[]>;
}
```

### 2. Integration Pattern
```typescript
class UnifiedSecurityAnalyzer {
  private languageAgents: Map<string, BaseSecurityAgent>;
  private platformAgents: PlatformAgent[];
  
  async analyze(repoUrl: string): Promise<ComprehensiveResult> {
    // Step 1: Platform-level analysis (GitHub/GitLab)
    const platformResults = await Promise.all(
      this.platformAgents.map(agent => agent.analyzeRepository(repoUrl))
    );
    
    // Step 2: Language-specific analysis
    const languageResults = await this.analyzeByLanguage(repoUrl);
    
    // Step 3: Correlate and enhance
    return this.correlateResults(platformResults, languageResults);
  }
  
  private correlateResults(
    platform: PlatformAnalysisResult[],
    language: LanguageResults
  ): ComprehensiveResult {
    // Merge findings
    // Deduplicate issues
    // Enhance with platform metadata
    // Add severity based on multiple confirmations
  }
}
```

### 3. Platform Agent Capabilities

#### GitHub Agent Should Provide:
- **CodeQL**: Advanced semantic analysis for 10+ languages
- **Dependabot**: Dependency vulnerabilities across all ecosystems
- **Secret Scanning**: Repository-wide secret detection
- **Security Advisories**: CVE database integration
- **Branch Protection**: Security policy compliance

#### GitLab Agent Should Provide:
- **SAST**: Static analysis for 15+ languages
- **DAST**: Dynamic application security testing
- **Container Scanning**: Docker image vulnerabilities
- **License Compliance**: Full dependency tree licensing
- **Infrastructure as Code**: Terraform/K8s security

### 4. Implementation Benefits

1. **Unified Coverage**: One API call covers all languages in repo
2. **Rich Metadata**: PR info, commit history, contributor analysis
3. **Policy Enforcement**: Branch protection, required reviews
4. **Historical Trends**: Security posture over time
5. **Integration Points**: CI/CD, issue tracking, notifications

### 5. Example Usage

```typescript
const analyzer = new UnifiedSecurityAnalyzer();

// Configure platform agents with repo context
analyzer.addPlatformAgent(new GitHubPlatformAgent({
  token: process.env.GITHUB_TOKEN,
  features: ['codeql', 'dependabot', 'secret-scanning']
}));

analyzer.addPlatformAgent(new GitLabPlatformAgent({
  token: process.env.GITLAB_TOKEN,
  features: ['sast', 'dast', 'container', 'license']
}));

// Add language-specific agents
analyzer.addLanguageAgent('python', new PythonSecurityAgent());
analyzer.addLanguageAgent('javascript', new JavaScriptSecurityAgent());

// Analyze with full correlation
const results = await analyzer.analyze('https://github.com/org/repo');

// Results include:
// - Platform-wide issues (secrets, dependencies, policies)
// - Language-specific issues (linting, type safety, patterns)
// - Correlated findings (vulnerable dep + usage locations)
// - Enhanced severity (confirmed by multiple tools)
```

## Migration Path

1. **Phase 1**: Keep current agents, add correlation layer
2. **Phase 2**: Refactor to PlatformAgent interface
3. **Phase 3**: Implement cross-language correlation
4. **Phase 4**: Add advanced features (trends, policies)

## Expected Improvements

- **Coverage**: From 10 "languages" to true multi-language analysis
- **Accuracy**: Reduce false positives through correlation
- **Context**: Rich metadata for better prioritization
- **Efficiency**: One API call instead of per-language
- **Scalability**: Platform APIs handle large codebases better