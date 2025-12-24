## 🔍 Scanner Tool Insights

*These tools provide valuable analysis even without auto-fix capabilities. Review the findings and apply fixes manually using the guidance below.*

### Lighthouse (2 issues)

**Category:** Performance

**What You Get:**
- ✓ Core Web Vitals metrics (LCP, FID, CLS)
- ✓ Performance score breakdown (0-100)
- ✓ Specific optimization opportunities
- ✓ Metric thresholds vs your values

**How to Fix:**
- Optimize Largest Contentful Paint (LCP): Reduce server response time, preload critical resources
- Reduce First Input Delay (FID): Split long JavaScript tasks, use web workers
- Fix Cumulative Layout Shift (CLS): Set explicit dimensions for images/embeds

**Resources:**
- https://web.dev/vitals/
- https://developers.google.com/web/tools/lighthouse

### Madge (1 issues)

**Category:** Architecture

**What You Get:**
- ✓ Complete circular dependency cycle paths
- ✓ Visual dependency graph
- ✓ Affected file list
- ✓ Cycle entry/exit points

**How to Fix:**
- Extract shared code to a new module (break the cycle)
- Use dependency injection pattern
- Introduce interface layer between modules
- Consider lazy loading for optional dependencies

**Resources:**
- https://github.com/pahen/madge
- https://en.wikipedia.org/wiki/Circular_dependency

### pydeps (1 issues)

**Category:** Architecture

**What You Get:**
- ✓ Python module dependency graph
- ✓ Circular dependency detection
- ✓ Import relationship visualization
- ✓ Module coupling analysis

**How to Fix:**
- Extract shared code to a new module to break cycles
- Use dependency injection to decouple modules
- Introduce an interface/protocol layer between modules
- Consider lazy imports for optional dependencies
- Restructure code to follow layered architecture

**Resources:**
- https://github.com/thebjorn/pydeps
- https://en.wikipedia.org/wiki/Circular_dependency

### Bandit (2 issues)

**Category:** Security

**What You Get:**
- ✓ Python security vulnerability detection
- ✓ CWE classification
- ✓ Severity ratings
- ✓ Code location with context

**How to Fix:**
- Replace hardcoded secrets with environment variables
- Use parameterized queries for SQL
- Sanitize user input before use
- Use secure random number generators

**Resources:**
- https://bandit.readthedocs.io/
- https://owasp.org/www-project-web-security-testing-guide/

