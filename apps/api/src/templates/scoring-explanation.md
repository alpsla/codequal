# CodeQual Scoring System

## Initial Score: 50/100

Every developer starts with a base score of 50/100, representing:
- **Entry-level Developer**: Basic competency
- **Room for Growth**: Can progress to Senior (80+) and Expert (90+)
- **Fair Starting Point**: Not too low (demotivating) or too high (unrealistic)

## Score Calculation

**Total Score = Base Score (50) + PR Score + Repository Health Score**

### Score Ranges:
- **0-30**: Needs significant improvement
- **31-50**: Junior Developer
- **51-70**: Intermediate Developer
- **71-80**: Senior Developer
- **81-90**: Expert Developer
- **91-100**: Master Developer

### Score Components:

1. **PR Quality (Positive)**
   - Clean code practices: +10 to +20
   - Good test coverage: +5 to +15
   - Proper documentation: +5 to +10
   - Performance optimizations: +5 to +10
   - Security best practices: +10 to +20

2. **PR Issues (Negative)**
   - Critical issues: -2.5 per issue
   - High issues: -1.5 per issue
   - Medium issues: -0.2 per issue
   - Low issues: -0.1 per issue

3. **Repository Health (Degradation)**
   - Same scoring as PR issues
   - Accumulates over time if not fixed
   - Affects overall developer score

### Example Calculation:
```
Base Score: 50
PR Quality: +35 (good practices, tests, docs)
PR Issues: -5 (1 critical, 2 high)
Repo Degradation: -8 (existing technical debt)
Total: 50 + 35 - 5 - 8 = 72/100
```

## Skill Tracking

Individual skills start at 50/100 and are modified by:
- **Positive contributions**: Writing secure code, good practices
- **Issue fixes**: Gain points when fixing issues
- **Degradation**: Lose points for unresolved issues

This system encourages:
- Continuous improvement
- Technical debt reduction
- Best practices adoption
- Long-term skill development