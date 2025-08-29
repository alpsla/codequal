# Existing Prompts Analysis and Update Plan

## 1. Current State Analysis

### 1.1 Specialized Agents (Found Issues)

#### SecurityAgent (`src/specialized/security-agent.ts`)
**Current State:**
- NO PROMPT FOUND - Agent only has basic analysis logic
- Missing language-specific prompt configuration
- No size-based adaptation

**Issues:**
- No role prompt defined
- No language awareness
- No repository size consideration

#### PerformanceAgent (`src/specialized/performance-agent.ts`)
**Current State:**
- NO PROMPT FOUND - Agent only has basic analysis logic
- Missing language-specific optimization patterns
- No size-based analysis approach

**Issues:**
- No role prompt defined
- No language-specific performance patterns
- No adaptive analysis based on repo size

#### CodeQualityAgent (`src/specialized/code-quality-agent.ts`)
**Current State:**
- NO PROMPT FOUND - Agent only has basic analysis logic
- Missing language idioms and best practices
- No coding standards awareness

**Issues:**
- No role prompt defined
- No language-specific quality standards
- No size-based quality metrics

### 1.2 Standard Framework Prompts

#### ComparisonOrchestrator (`src/standard/orchestrator/comparison-orchestrator.ts`)
**Current Prompt (line 821):**
```typescript
return `You are an expert AI comparison analyst specializing in code quality assessment.
Your task is to compare two code branches and identify differences, improvements, and potential issues.
Focus on: ${focus || 'security vulnerabilities, performance issues, code quality, and best practices'}`;
```

**Issues:**
- Generic prompt, not language-aware
- No repository size consideration
- No role-specific expertise areas

#### ComparisonAgent (`src/standard/comparison/comparison-agent.ts`)
**Current Prompts:**

Line 585:
```typescript
return `You are an expert code reviewer analyzing a pull request.
Focus on identifying security issues, performance problems, and code quality concerns.
Provide actionable suggestions for improvement.`;
```

Line 990:
```typescript
rolePrompt: 'You are an expert code reviewer focused on security, performance, and best practices.'
```

**Issues:**
- Too generic, not specialized by role
- No language awareness
- No size-based adaptation

### 1.3 DeepWiki Related Prompts (To Be Migrated)

Found various prompts in DeepWiki services that should inform our new approach:
- Architecture analysis prompts
- Security-focused prompts
- Location finding prompts
- Repository structure analysis

## 2. Update Plan

### 2.1 Immediate Actions Required

#### A. Update Specialized Agents

**SecurityAgent Updates:**
```typescript
// Add to SecurityAgent class
private generateRolePrompt(language: string, repoSize: 'small' | 'medium' | 'large'): string {
  const basePrompt = `You are an expert security analyst specializing in ${language} code security assessment.`;
  
  const expertiseAreas = `
EXPERTISE AREAS:
- Vulnerability Detection (OWASP Top 10, CWE)
- Authentication & Authorization Issues
- Injection Vulnerabilities (SQL, Command, XSS)
- Cryptographic Weaknesses
- Dependency Vulnerabilities
- Security Best Practices for ${language}`;

  const sizeApproach = this.getSizeSpecificApproach(repoSize);
  const languageSpecifics = this.getLanguageSpecificFocus(language);
  
  return `${basePrompt}\n${expertiseAreas}\n${sizeApproach}\n${languageSpecifics}`;
}
```

**PerformanceAgent Updates:**
```typescript
// Add to PerformanceAgent class
private generateRolePrompt(language: string, repoSize: 'small' | 'medium' | 'large'): string {
  const basePrompt = `You are an expert performance engineer specializing in ${language} optimization.`;
  
  const expertiseAreas = `
EXPERTISE AREAS:
- Algorithm Complexity Analysis
- Memory Management & Leaks
- Database Query Optimization
- Caching Strategies
- Concurrency & Threading Issues
- ${language}-Specific Performance Patterns`;

  const sizeApproach = this.getSizeSpecificApproach(repoSize);
  const languagePatterns = this.getLanguagePerformancePatterns(language);
  
  return `${basePrompt}\n${expertiseAreas}\n${sizeApproach}\n${languagePatterns}`;
}
```

**CodeQualityAgent Updates:**
```typescript
// Add to CodeQualityAgent class
private generateRolePrompt(language: string, repoSize: 'small' | 'medium' | 'large'): string {
  const basePrompt = `You are an expert code quality analyst specializing in ${language} best practices.`;
  
  const expertiseAreas = `
EXPERTISE AREAS:
- Code Complexity Metrics
- Design Patterns & Anti-patterns
- ${language} Idioms and Best Practices
- Test Coverage Analysis
- Documentation Quality
- Maintainability Index`;

  const sizeApproach = this.getSizeSpecificApproach(repoSize);
  const standards = this.getLanguageStandards(language);
  
  return `${basePrompt}\n${expertiseAreas}\n${sizeApproach}\n${standards}`;
}
```

### 2.2 Language-Specific Enhancements Map

```typescript
interface LanguagePromptEnhancements {
  javascript: {
    security: ['XSS vulnerabilities', 'Prototype pollution', 'npm vulnerabilities'],
    performance: ['Event loop optimization', 'Memory leaks in closures', 'Async patterns'],
    quality: ['ESLint rules', 'React/Vue/Angular patterns', 'Module patterns']
  },
  python: {
    security: ['Pickle deserialization', 'SQL injection in ORMs', 'YAML vulnerabilities'],
    performance: ['GIL considerations', 'NumPy optimization', 'Async/await patterns'],
    quality: ['PEP 8 compliance', 'Type hints', 'Pythonic idioms']
  },
  java: {
    security: ['Deserialization', 'XXE', 'Spring Security configs'],
    performance: ['JVM tuning', 'Garbage collection', 'Thread pools'],
    quality: ['SOLID principles', 'Spring patterns', 'Effective Java']
  },
  objectivec: {
    security: ['Keychain security', 'URL schemes', 'Memory management'],
    performance: ['ARC optimization', 'Core Data performance', 'UI responsiveness'],
    quality: ['Apple guidelines', 'Memory management patterns', 'Delegate patterns']
  }
  // ... continue for all 16 languages
}
```

### 2.3 Size-Based Adaptation Strategy

```typescript
interface SizeBasedApproach {
  small: {
    depth: 'exhaustive',
    sampling: '100%',
    focus: 'Complete analysis of all code paths',
    timeout: 300000  // 5 minutes
  },
  medium: {
    depth: 'targeted',
    sampling: '60%',
    focus: 'Critical paths and entry points',
    timeout: 600000  // 10 minutes
  },
  large: {
    depth: 'risk-based',
    sampling: '30%',
    focus: 'High-risk areas and recent changes',
    timeout: 900000  // 15 minutes
  }
}
```

## 3. Implementation Files to Update

### Priority 1 (Immediate)
1. `src/specialized/security-agent.ts` - Add prompt generation
2. `src/specialized/performance-agent.ts` - Add prompt generation
3. `src/specialized/code-quality-agent.ts` - Add prompt generation
4. `src/specialized/dependency-agent.ts` - Add prompt generation (if exists)
5. `src/specialized/architecture-agent.ts` - Add prompt generation (if exists)

### Priority 2 (Next)
1. `src/standard/orchestrator/comparison-orchestrator.ts` - Update buildRolePrompt()
2. `src/standard/comparison/comparison-agent.ts` - Update buildComparisonPrompt()
3. Create `src/standard/prompts/language-specific-prompts.ts` - Centralized prompt templates
4. Create `src/standard/prompts/size-adaptation.ts` - Size-based prompt adjustments

### Priority 3 (Configuration)
1. Create `src/standard/config/agent-model-mapping.ts` - Map languages to models
2. Create `src/standard/config/language-tool-matrix.ts` - Tool availability per language
3. Update `src/standard/orchestrator/language-router.ts` - Add prompt selection logic

## 4. Testing Strategy

### Unit Tests Required
```typescript
// Example test structure
describe('SecurityAgent Prompts', () => {
  it('should generate JavaScript-specific security prompt', () => {
    const prompt = agent.generateRolePrompt('javascript', 'medium');
    expect(prompt).toContain('XSS vulnerabilities');
    expect(prompt).toContain('npm package vulnerabilities');
  });
  
  it('should adapt prompt for large repositories', () => {
    const prompt = agent.generateRolePrompt('python', 'large');
    expect(prompt).toContain('risk-based sampling');
    expect(prompt).toContain('high-risk areas');
  });
});
```

## 5. Configuration Schema for Researcher

### Required Configuration Structure
```typescript
interface AgentConfiguration {
  agentType: 'security' | 'performance' | 'quality' | 'dependency' | 'architecture';
  language: string;
  repoSize: 'small' | 'medium' | 'large';
  model: {
    primary: string;  // e.g., 'claude-3-opus'
    fallback: string; // e.g., 'claude-3-sonnet'
  };
  analysisConfig: {
    samplingRate: number;
    timeout: number;
    maxTokens: number;
    temperature: number;
  };
  focusAreas: string[];
  tools: {
    primary: string[];
    fallback: string[];
  };
  outputConfig: {
    detailLevel: 'verbose' | 'standard' | 'summary';
    includeCodeExamples: boolean;
    metricsVisualization: boolean;
  };
}
```

## 6. Next Steps

1. **Implement prompt generation methods** in all specialized agents
2. **Create centralized prompt templates** for reusability
3. **Add language detection** to orchestrator initialization
4. **Update agent initialization** to use language-aware prompts
5. **Test with sample repositories** in different languages
6. **Deploy updated agents** to cloud service
7. **Request researcher** to generate 240 configurations

## 7. Validation Checklist

- [ ] All agents have generateRolePrompt() method
- [ ] Language-specific enhancements defined for all 16 languages
- [ ] Size-based approaches implemented (small/medium/large)
- [ ] Prompt templates are testable and configurable
- [ ] Integration with LanguageRouter complete
- [ ] Cloud service updated with new prompt logic
- [ ] Documentation updated with prompt examples
- [ ] Researcher requirements document finalized