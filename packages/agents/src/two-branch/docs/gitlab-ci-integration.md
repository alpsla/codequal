# GitLab CI/CD Integration Guide

Complete guide for integrating CodeQual Code Quality reports into GitLab merge requests.

## Overview

CodeQual generates GitLab Code Quality reports in the Code Climate format, which GitLab natively supports. This enables:

- 📊 Code Quality widget in merge requests
- 📈 Quality degradation/improvement metrics
- 🚫 Quality gates (block merge on critical issues)
- 📋 Issue visualization directly in GitLab UI
- 🔍 Issue tracking across commits

## Quick Start

### 1. Basic Integration

Add CodeQual analysis to your `.gitlab-ci.yml`:

```yaml
# .gitlab-ci.yml
stages:
  - test
  - quality

codequal_analysis:
  stage: quality
  image: node:18  # Or your preferred environment
  script:
    # Run CodeQual analysis
    - npm install -g codequal
    - codequal analyze --repository $CI_PROJECT_URL --pr $CI_MERGE_REQUEST_IID

  artifacts:
    reports:
      # GitLab will automatically display this in MR widget
      codequality: codequal-gitlab-codequality.json
    paths:
      # Also save other formats for download
      - codequal-gitlab-codequality.json
      - codequal-lsp-actions.json
      - codequal-sarif-report.json
    expire_in: 30 days

  only:
    - merge_requests
```

### 2. With Docker

Using CodeQual Docker image:

```yaml
codequal_analysis:
  stage: quality
  image: codequal/analyzer:latest
  script:
    - codequal analyze --output codequal-gitlab-codequality.json

  artifacts:
    reports:
      codequality: codequal-gitlab-codequality.json

  only:
    - merge_requests
```

### 3. With Caching

Speed up analysis with repository caching:

```yaml
codequal_analysis:
  stage: quality
  image: node:18

  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - .codequal-cache/

  script:
    - npm install -g codequal
    - codequal analyze --cache-dir .codequal-cache/

  artifacts:
    reports:
      codequality: codequal-gitlab-codequality.json

  only:
    - merge_requests
```

## Advanced Configuration

### Quality Gates (Block Merge)

Block merges when critical issues are found:

```yaml
codequal_analysis:
  stage: quality
  image: node:18

  script:
    - npm install -g codequal
    - codequal analyze --fail-on-critical --fail-on-high

  artifacts:
    reports:
      codequality: codequal-gitlab-codequality.json

  allow_failure: false  # Block pipeline if critical/high issues found

  only:
    - merge_requests
```

### Parallel Analysis

Run CodeQual in parallel with other tests:

```yaml
stages:
  - test
  - quality

# Unit tests
unit_tests:
  stage: test
  script:
    - npm test

# CodeQual runs in parallel
codequal_analysis:
  stage: test  # Same stage as unit_tests
  image: node:18
  script:
    - npm install -g codequal
    - codequal analyze

  artifacts:
    reports:
      codequality: codequal-gitlab-codequality.json

  only:
    - merge_requests
```

### Multi-Language Projects

Analyze multiple languages:

```yaml
# Java analysis
codequal_java:
  stage: quality
  image: codequal/analyzer:lang-java-v6.0
  script:
    - codequal analyze --language java --output codequal-java.json
  artifacts:
    reports:
      codequality: codequal-java.json
  only:
    - merge_requests

# TypeScript analysis
codequal_typescript:
  stage: quality
  image: codequal/analyzer:lang-typescript-v5.0
  script:
    - codequal analyze --language typescript --output codequal-typescript.json
  artifacts:
    reports:
      codequality: codequal-typescript.json
  only:
    - merge_requests

# Merge reports (if needed)
codequal_merge:
  stage: quality
  dependencies:
    - codequal_java
    - codequal_typescript
  script:
    - codequal merge-reports --output codequal-gitlab-codequality.json codequal-java.json codequal-typescript.json
  artifacts:
    reports:
      codequality: codequal-gitlab-codequality.json
  only:
    - merge_requests
```

## GitLab Configuration

### Enable Code Quality Widget

1. Go to **Settings → CI/CD**
2. Expand **General pipelines**
3. Enable **Code Quality** reports
4. Save changes

### Configure Quality Gate Rules

1. Go to **Settings → Merge requests**
2. Configure **Merge request approvals**
3. Set rules based on Code Quality degradation:
   - Block merge if quality degrades
   - Require approval for new blockers
   - Auto-approve if quality improves

### Custom Quality Rules

Create custom rules in **Settings → Repository → Quality**:

```yaml
# .gitlab/quality.yml
rules:
  - name: "Block Critical Issues"
    severity: blocker
    action: block_merge

  - name: "Warn on High Issues"
    severity: critical
    action: require_approval

  - name: "Track Improvements"
    severity: major
    action: comment
```

## Report Format Details

### GitLab Code Quality Schema

CodeQual generates reports matching GitLab's expected format:

```json
[
  {
    "description": "Human-readable issue description",
    "check_name": "tool-name/rule-id",
    "fingerprint": "unique-hash",
    "severity": "blocker",  // blocker, critical, major, minor, info
    "location": {
      "path": "src/main/java/File.java",
      "lines": {
        "begin": 42
      }
    },
    "categories": ["security", "java", "severity-critical"],
    "content": {
      "body": "Detailed fix explanation with code examples"
    }
  }
]
```

### Severity Mapping

CodeQual → GitLab severity mapping:

| CodeQual | GitLab | Impact |
|----------|--------|--------|
| Critical | **Blocker** | Blocks merge (if configured) |
| High | **Critical** | Requires attention |
| Medium | **Major** | Should fix soon |
| Low | **Minor** | Nice to have |
| Info | **Info** | Informational only |

## Viewing Results

### In Merge Request Widget

1. Create merge request
2. Wait for pipeline to complete
3. View **Code Quality** widget:
   - **New issues**: Introduced in this MR
   - **Resolved issues**: Fixed in this MR
   - **Degradation**: Net change in quality

### In Pipeline View

1. Go to **CI/CD → Pipelines**
2. Click on pipeline
3. View **Code Quality** tab
4. Filter by severity, file, or issue type

### Downloading Files

All formats available as pipeline artifacts:

```bash
# Download GitLab format
curl -o codequal-gitlab.json "https://gitlab.com/api/v4/projects/$PROJECT_ID/jobs/$JOB_ID/artifacts/codequal-gitlab-codequality.json"

# Download LSP format (for IDE)
curl -o codequal-lsp.json "https://gitlab.com/api/v4/projects/$PROJECT_ID/jobs/$JOB_ID/artifacts/codequal-lsp-actions.json"

# Download SARIF format (for security scanning)
curl -o codequal-sarif.json "https://gitlab.com/api/v4/projects/$PROJECT_ID/jobs/$JOB_ID/artifacts/codequal-sarif-report.json"
```

## Troubleshooting

### Issue: Code Quality Widget Not Showing

**Solution**: Ensure artifact path matches exactly:

```yaml
artifacts:
  reports:
    codequality: codequal-gitlab-codequality.json  # Must be exact filename
```

### Issue: Invalid JSON Format

**Solution**: Validate format meets GitLab requirements:

```bash
# Check JSON is valid array
jq 'if type == "array" then "✅ Valid" else "❌ Must be array" end' codequal-gitlab-codequality.json

# Check required fields
jq '.[0] | keys' codequal-gitlab-codequality.json
# Should include: description, check_name, fingerprint, severity, location
```

### Issue: Quality Degradation Shows Incorrectly

**Solution**: Ensure fingerprints are stable across commits:

- Fingerprints based on: file path, line, rule, message
- Do NOT include: timestamp, author, commit hash
- CodeQual handles this automatically

### Issue: Too Many Issues Reported

**Solution**: Filter by severity or category:

```bash
# Filter to only critical/high before upload
jq '[.[] | select(.severity == "blocker" or .severity == "critical")]' \
  codequal-gitlab-codequality.json > filtered-report.json
```

## Best Practices

### 1. Run on Every Merge Request

```yaml
only:
  - merge_requests  # Only run on MRs, not on every commit
```

### 2. Cache Repository Data

```yaml
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - .codequal-cache/
```

### 3. Parallel Execution

Run CodeQual in parallel with other tests to save time.

### 4. Incremental Analysis

Only analyze changed files on large repositories:

```yaml
script:
  - codequal analyze --changed-files-only
```

### 5. Set Realistic Quality Gates

Start with warnings, then gradually enforce blocking:

```yaml
# Week 1: Track metrics
- codequal analyze --no-fail

# Week 2: Warn on critical
- codequal analyze --warn-on-critical

# Week 3: Block critical
- codequal analyze --fail-on-critical
```

## Integration with Other Tools

### With SonarQube

Run both tools and merge reports:

```yaml
sonarqube_analysis:
  stage: quality
  script:
    - sonar-scanner

codequal_analysis:
  stage: quality
  script:
    - codequal analyze
    - codequal export --format sonarqube --output sonar-external.json
```

### With Snyk

Combine security scanning:

```yaml
security_scan:
  stage: quality
  script:
    # Run both Snyk and CodeQual
    - snyk test --json > snyk-results.json
    - codequal analyze
    - codequal merge-security snyk-results.json --output combined-security.json
```

### With GitLab SAST

Combine with GitLab's built-in security scanning:

```yaml
include:
  - template: Security/SAST.gitlab-ci.yml

codequal_analysis:
  stage: test
  script:
    - codequal analyze
  artifacts:
    reports:
      codequality: codequal-gitlab-codequality.json
```

## Resources

- [GitLab Code Quality Docs](https://docs.gitlab.com/ee/ci/testing/code_quality.html)
- [Code Climate Format Spec](https://github.com/codeclimate/platform/blob/master/spec/analyzers/SPEC.md)
- [CodeQual Documentation](https://docs.codequal.com)

## Support

For issues with GitLab integration:
- GitHub Issues: https://github.com/your-org/codequal/issues
- GitLab Support: https://gitlab.com/your-org/codequal/-/issues
- Email: support@codequal.com
