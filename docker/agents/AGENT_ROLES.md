# CodeQual Agent Roles and Responsibilities

## Fix Generation Agents (5 Core Roles)

These agents generate AI-powered fix suggestions for detected issues.

### 1. Security Agent
- **Responsibility**: Security vulnerabilities and threats
- **Issue Types**: SQL injection, XSS, authentication, encryption, access control
- **Pod Count**: 2-3 (scales with security issues)
- **Examples**:
  - SQL injection → Use prepared statements
  - Hardcoded credentials → Use environment variables
  - Weak encryption → Implement AES-256

### 2. Performance Agent
- **Responsibility**: Performance optimizations and efficiency
- **Issue Types**: Algorithm complexity, memory leaks, caching, database queries
- **Pod Count**: 2 (scales with performance issues)
- **Examples**:
  - O(n²) loop → Optimize to O(n) or O(n log n)
  - String concatenation in loop → Use StringBuilder
  - N+1 queries → Implement eager loading

### 3. Quality Agent
- **Responsibility**: Code quality and maintainability
- **Issue Types**: Code style, naming, documentation, error handling
- **Pod Count**: 5 (handles ~89% of all issues)
- **Examples**:
  - Empty catch blocks → Add proper error handling
  - Long methods → Refactor into smaller functions
  - Magic numbers → Extract to named constants

### 4. Architecture Agent
- **Responsibility**: Design patterns and structural issues
- **Issue Types**: SOLID violations, circular dependencies, coupling
- **Pod Count**: 2 (scales with architecture issues)
- **Examples**:
  - Circular dependency → Implement dependency injection
  - God class → Apply Single Responsibility Principle
  - Tight coupling → Use interface abstraction

### 5. Dependency Agent
- **Responsibility**: Package management and dependencies
- **Issue Types**: Outdated packages, vulnerabilities, version conflicts
- **Pod Count**: 2 (scales with dependency issues)
- **Examples**:
  - Vulnerable package → Update to patched version
  - Deprecated API → Migrate to new API
  - Version conflict → Resolve with compatible versions

## Support Agents (3 Additional Roles)

These agents provide additional analysis and educational content.

### 6. Orchestrator Agent
- **Responsibility**: Coordinate entire analysis workflow
- **Functions**:
  - Clone repository
  - Trigger tool execution
  - Coordinate fix generation
  - Compile final report
- **Pod Count**: 1-2 (stateless, can scale)

### 7. Educator Agent
- **Responsibility**: Generate learning content
- **Functions**:
  - Explain why issues matter
  - Provide best practice guidance
  - Create improvement suggestions
  - Generate skill progression metrics
- **Pod Count**: 1

### 8. Comparator Agent
- **Responsibility**: Compare main vs PR branches
- **Functions**:
  - Identify new issues (PR only)
  - Find resolved issues (main only)
  - Track existing issues (both branches)
  - Calculate impact metrics
- **Pod Count**: 1

### 9. Researcher Agent
- **Responsibility**: Analyze patterns and trends
- **Functions**:
  - Identify recurring issues
  - Track improvement over time
  - Generate insights
  - Predict potential problems
- **Pod Count**: 1

## Agent Distribution by Issue Volume

Based on real-world data:

| Agent | Issue % | Pod Count | Rationale |
|-------|---------|-----------|-----------|
| Quality | 89% | 5 | Highest volume, needs most resources |
| Security | 5% | 2-3 | Critical but lower volume |
| Performance | 3% | 2 | Important for user experience |
| Architecture | 2% | 2 | Complex analysis required |
| Dependency | 1% | 2 | Quick checks but important |

## Scaling Strategy

### Horizontal Pod Autoscaling (HPA)
```yaml
Quality Agent:
  Min: 3, Max: 20, Target CPU: 70%

Security Agent:
  Min: 2, Max: 10, Target CPU: 70%

Performance/Architecture/Dependency:
  Min: 1, Max: 5, Target CPU: 80%
```

### Cache-First Architecture
- 70-90% of fixes come from Redis cache
- Only new patterns hit the agents
- Cache TTL: 7 days
- Pattern-based key: `{tool}:{type}:{severity}:{hash}`

## Communication Flow

```
1. Tool detects issue
2. Check Redis cache for fix
3. If cache miss:
   - Route to appropriate agent based on issue type
   - Agent generates AI-powered fix
   - Store in Redis for future use
4. Return fix to orchestrator
5. Include in final report
```

## Total Pod Count

| Category | Pods | Notes |
|----------|------|-------|
| Fix Generation Agents | 13 | 5 types, scaled by volume |
| Support Agents | 4 | Orchestrator, Educator, Comparator, Researcher |
| **Total** | **17** | Can scale to 50+ under load |

## Benefits of This Architecture

1. **Specialization**: Each agent is expert in its domain
2. **Scalability**: Independent scaling per agent type
3. **Efficiency**: 90% cache hit rate reduces AI calls
4. **Reliability**: No single point of failure
5. **Cost-Effective**: Only pay for what you use

## Deployment Priority

1. **Phase 1**: Quality Agent (handles 89% of issues)
2. **Phase 2**: Security & Performance Agents
3. **Phase 3**: Architecture & Dependency Agents
4. **Phase 4**: Support Agents (Educator, Comparator, Researcher)
5. **Phase 5**: Full orchestration

This phased approach allows testing with immediate value delivery.