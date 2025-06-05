# CodeQual Calibration Context Parameters

## Complete List of Context Parameters

Based on the codebase analysis, here are all the context parameters used in the CodeQual researcher agent system:

### 1. **Agent Role** (Required)
The specific type of analysis the agent will perform:
- `security` - Security vulnerability analysis
- `performance` - Performance optimization analysis
- `architecture` - System architecture analysis
- `codeQuality` - Code quality and best practices
- `dependency` - Dependency management and security

### 2. **Language** (Required)
The primary programming language of the repository:
- `typescript`
- `javascript`
- `python`
- `java`
- `go`
- `rust`
- `csharp`
- `php`
- `ruby`
- `c`
- `cpp`

### 3. **Frameworks** (Required)
Array of frameworks used in the repository:
- TypeScript/JavaScript: `['react', 'nextjs', 'angular', 'vue', 'express', 'nestjs']`
- Python: `['django', 'fastapi', 'flask', 'pytest']`
- Java: `['spring', 'springboot', 'hibernate', 'junit']`
- Go: `['gin', 'echo', 'gorm', 'testify']`
- Rust: `['actix', 'tokio', 'rocket', 'serde']`

### 4. **Repository Size** (Required)
The size category of the repository:
- `small` - Small repositories
- `medium` - Medium-sized repositories
- `large` - Large repositories

### 5. **Complexity** (Required)
A numeric value (1-5) indicating code complexity:
- `1` - Very simple
- `2` - Simple
- `3` - Moderate
- `4` - Complex
- `5` - Very complex

### 6. **Price Tier** (Required in enhanced version)
Budget constraints for model selection:
- `budget` - Cost-conscious (< $2/1M tokens)
- `standard` - Balanced cost/performance ($2-10/1M tokens)
- `premium` - Quality-focused ($10-30/1M tokens)
- `enterprise` - Best-in-class (no budget constraints)

### 7. **Tags** (Optional)
Additional context tags for better model selection:
- Examples: `['frontend', 'backend', 'fullstack', 'microservices', 'legacy', 'modern', 'ml', 'data']`

### 8. **Session ID** (Optional)
Used for caching and tracking related requests:
- Format: `session_<timestamp>_<random>`

## Context Example

```javascript
{
  agentRole: 'security',
  language: 'typescript',
  frameworks: ['react', 'nextjs'],
  repoSize: 'large',
  complexity: 4,
  priceTier: 'premium',
  tags: ['frontend', 'modern'],
  sessionId: 'session_1717123456_abc123'
}
```

## How These Parameters Are Used

1. **Model Selection**: The researcher agent uses these parameters to find the most suitable AI model for the specific context.

2. **Evaluation Criteria**: Different agent roles have different evaluation weights (e.g., security focuses on accuracy, performance focuses on technical depth).

3. **Framework-Specific Knowledge**: Models are evaluated based on their understanding of specific frameworks.

4. **Cost Optimization**: Price tier helps balance between model quality and budget constraints.

5. **Complexity Handling**: Higher complexity requires models with better reasoning capabilities.

## Missing Parameters We Could Consider

While not currently implemented, these could be valuable additions:

1. **Domain**: Specific industry or domain (e.g., 'fintech', 'healthcare', 'ecommerce')
2. **Compliance Requirements**: Regulatory needs (e.g., 'HIPAA', 'GDPR', 'SOC2')
3. **Team Skill Level**: Developer expertise level to adjust explanation depth
4. **Analysis Depth**: Quick scan vs. comprehensive analysis
5. **Language Version**: Specific language version (e.g., 'python3.11', 'java17')
6. **Code Style**: Coding paradigm (e.g., 'functional', 'oop', 'procedural')
7. **Time Constraints**: Urgency of analysis (affects model speed vs. quality trade-off)

## Usage in Calibration

The enhanced calibration script now tests combinations of all these parameters to find optimal models for each specific context. This ensures that CodeQual can provide the best possible analysis for any given repository configuration.
