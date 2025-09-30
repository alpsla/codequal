# Dependency-Check Implementation Guide

**Date**: September 30, 2025
**Status**: Ready for Implementation
**Estimated Time**: 2-3 hours (requires user setup for NVD API key)

---

## 🎯 Overview

OWASP Dependency-Check is a Software Composition Analysis (SCA) tool that identifies known vulnerabilities (CVEs) in project dependencies. This guide covers integration as an **optional tool** in CodeQual's Java analysis pipeline.

### Why Optional?

1. **External Dependency**: Requires NVD API key registration
2. **Database Size**: 3GB CVE database download
3. **Redundancy**: Most teams already use GitHub Dependabot or Snyk
4. **Use Case**: Primarily for compliance requirements (SOC 2, ISO 27001, PCI-DSS)

---

## 📋 Prerequisites

### 1. NVD API Key (Required)

**Step 1**: Register for free NVD API key
- Visit: https://nvd.nist.gov/developers/request-an-api-key
- Fill out registration form
- Receive API key via email (usually within 1-2 hours)
- **Rate Limits**:
  - With API key: 100 requests/30 seconds
  - Without API key: 10 requests/30 seconds (not sufficient)

**Step 2**: Store API key securely
```bash
# Add to .env file
NVD_API_KEY=your-api-key-here

# Or export as environment variable
export NVD_API_KEY=your-api-key-here
```

### 2. Docker Image Update

**Current Issue**: Docker image has Dependency-Check 8.4.0 (uses deprecated NVD API v1.1)

**Required**: Upgrade to Dependency-Check 9.0+ (supports NVD API v2.0)

```dockerfile
# Update in Dockerfile for analyzer:lang-java-v5.2

# Current version (8.4.0)
ENV DEPENDENCY_CHECK_VERSION=8.4.0

# Update to latest (9.0+)
ENV DEPENDENCY_CHECK_VERSION=11.1.0

# Download and install
RUN wget https://github.com/jeremylong/DependencyCheck/releases/download/v${DEPENDENCY_CHECK_VERSION}/dependency-check-${DEPENDENCY_CHECK_VERSION}-release.zip && \
    unzip dependency-check-${DEPENDENCY_CHECK_VERSION}-release.zip -d /opt && \
    rm dependency-check-${DEPENDENCY_CHECK_VERSION}-release.zip && \
    chmod +x /opt/dependency-check/bin/dependency-check.sh
```

### 3. Initial Database Setup

**First Run**: Downloads ~3GB CVE database (takes 10-15 minutes)
```bash
docker run --rm \
  -v /tmp/dependency-check-data:/data \
  -e NVD_API_KEY=${NVD_API_KEY} \
  registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.2-arm \
  bash -c '/opt/dependency-check/bin/dependency-check.sh --updateonly --nvdApiKey ${NVD_API_KEY}'
```

**Subsequent Runs**: Only downloads updates (~1-2 minutes)

---

## 🛠️ Implementation

### Configuration Schema

```typescript
interface DependencyCheckConfig {
  enabled: boolean;              // Default: false
  nvdApiKey?: string;           // Required if enabled
  failOnCVSS?: number;          // Default: 7.0 (High severity)
  suppressionFile?: string;     // Optional suppression file
  updateFrequency?: 'always' | 'daily' | 'weekly';  // Default: 'daily'
  timeout?: number;             // Default: 600 (10 minutes)
}

// Example configuration
const config: DependencyCheckConfig = {
  enabled: true,
  nvdApiKey: process.env.NVD_API_KEY,
  failOnCVSS: 7.0,              // Block PR for CVSS >= 7.0
  updateFrequency: 'daily',
  timeout: 600
};
```

### Integration into V9 Pipeline

#### File Location
```
packages/agents/src/two-branch/tools/
└── java/
    ├── pmd.ts
    ├── checkstyle.ts
    ├── semgrep.ts
    ├── spotbugs.ts (optional)
    └── dependency-check.ts (NEW)
```

#### Tool Implementation

```typescript
// packages/agents/src/two-branch/tools/java/dependency-check.ts

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface DependencyCheckOptions {
  projectPath: string;
  nvdApiKey: string;
  failOnCVSS?: number;
  suppressionFile?: string;
  timeout?: number;
}

export interface CVEVulnerability {
  id: string;                    // CVE-2023-12345
  severity: string;              // CRITICAL, HIGH, MEDIUM, LOW
  cvssScore: number;             // 9.8
  cvssVector: string;            // CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
  cwe?: string;                  // CWE-79
  description: string;
  dependency: {
    fileName: string;            // jackson-databind-2.12.3.jar
    filePath: string;
    group: string;               // com.fasterxml.jackson.core
    name: string;                // jackson-databind
    version: string;             // 2.12.3
  };
  references: string[];          // Links to advisories
  vulnerableSoftware: string[];  // CPE identifiers
}

export interface DependencyCheckResult {
  vulnerabilities: CVEVulnerability[];
  totalDependencies: number;
  vulnerableDependencies: number;
  executionTime: number;
  reportPath: string;
}

export async function runDependencyCheck(
  options: DependencyCheckOptions
): Promise<DependencyCheckResult> {
  const startTime = Date.now();

  // Validate API key
  if (!options.nvdApiKey) {
    throw new Error('NVD API key is required for Dependency-Check');
  }

  // Validate project path
  if (!existsSync(options.projectPath)) {
    throw new Error(`Project path not found: ${options.projectPath}`);
  }

  // Determine project file (pom.xml or build.gradle)
  const pomPath = join(options.projectPath, 'pom.xml');
  const gradlePath = join(options.projectPath, 'build.gradle');

  let scanTarget = options.projectPath;
  if (existsSync(pomPath)) {
    scanTarget = pomPath;
  } else if (existsSync(gradlePath)) {
    scanTarget = gradlePath;
  }

  // Prepare output directory
  const outputDir = join(options.projectPath, '.codequal', 'dependency-check');
  const reportPath = join(outputDir, 'dependency-check-report.json');

  // Build command
  const cmd = [
    '/opt/dependency-check/bin/dependency-check.sh',
    '--scan', scanTarget,
    '--format', 'JSON',
    '--out', outputDir,
    '--nvdApiKey', options.nvdApiKey,
    '--data', '/data/dependency-check',  // Persistent cache
    '--suppression', options.suppressionFile || '',
    options.failOnCVSS ? `--failOnCVSS ${options.failOnCVSS}` : ''
  ].filter(Boolean).join(' ');

  try {
    // Run Dependency-Check
    execSync(cmd, {
      cwd: options.projectPath,
      timeout: (options.timeout || 600) * 1000,
      stdio: 'pipe',
      env: {
        ...process.env,
        NVD_API_KEY: options.nvdApiKey
      }
    });

    // Parse results
    if (!existsSync(reportPath)) {
      throw new Error('Dependency-Check report not generated');
    }

    const report = JSON.parse(readFileSync(reportPath, 'utf-8'));
    const vulnerabilities = parseVulnerabilities(report);

    return {
      vulnerabilities,
      totalDependencies: report.dependencies?.length || 0,
      vulnerableDependencies: vulnerabilities.length,
      executionTime: Date.now() - startTime,
      reportPath
    };

  } catch (error: any) {
    // Handle timeout
    if (error.code === 'ETIMEDOUT') {
      throw new Error(`Dependency-Check timed out after ${options.timeout}s`);
    }

    // Handle NVD API errors
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      throw new Error('NVD API authentication failed. Check your API key.');
    }

    // Re-throw other errors
    throw error;
  }
}

function parseVulnerabilities(report: any): CVEVulnerability[] {
  const vulnerabilities: CVEVulnerability[] = [];

  for (const dep of report.dependencies || []) {
    if (!dep.vulnerabilities || dep.vulnerabilities.length === 0) {
      continue;
    }

    for (const vuln of dep.vulnerabilities) {
      vulnerabilities.push({
        id: vuln.name,                    // CVE-2023-12345
        severity: vuln.severity,
        cvssScore: vuln.cvssv3?.baseScore || vuln.cvssv2?.score || 0,
        cvssVector: vuln.cvssv3?.attackVector || '',
        cwe: vuln.cwe,
        description: vuln.description,
        dependency: {
          fileName: dep.fileName,
          filePath: dep.filePath,
          group: dep.packages?.[0]?.id?.split(':')[0] || '',
          name: dep.packages?.[0]?.id?.split(':')[1] || '',
          version: dep.packages?.[0]?.id?.split(':')[2] || ''
        },
        references: vuln.references?.map((r: any) => r.url) || [],
        vulnerableSoftware: vuln.vulnerableSoftware || []
      });
    }
  }

  return vulnerabilities;
}
```

### V9 Issue Transformation

```typescript
// Transform Dependency-Check results to V9 Issue format

export function transformToV9Issue(
  vulnerability: CVEVulnerability,
  repository: string,
  branch: 'main' | 'pr'
): V9Issue {
  // Map CVSS score to severity
  const severity = mapCVSSToSeverity(vulnerability.cvssScore);

  // Find dependency declaration in build file
  const location = findDependencyLocation(
    vulnerability.dependency,
    repository
  );

  return {
    // Core Identity
    id: `DEPCHECK-${vulnerability.id}`,
    issueHash: generateHash(vulnerability),

    // Classification
    severity,
    category: 'security',
    type: 'vulnerability',
    tool: 'Dependency-Check',
    ruleName: vulnerability.id,         // CVE-2023-12345
    ruleId: `OWASP-${vulnerability.id}`,

    // Location
    repository,
    branch,
    file: location.file,                // pom.xml or build.gradle
    startLine: location.line,
    endLine: location.line,

    // Code Context
    codeSnippet: {
      before: location.contextBefore,
      affected: [location.dependencyDeclaration],
      after: location.contextAfter,
      language: location.file.endsWith('.xml') ? 'xml' : 'groovy'
    },

    // AI-Powered Analysis
    title: `${vulnerability.severity} vulnerability: ${vulnerability.id} in ${vulnerability.dependency.name}`,

    explanation: `
A known security vulnerability (${vulnerability.id}) has been identified in
${vulnerability.dependency.name} version ${vulnerability.dependency.version}.

${vulnerability.description}

**CVSS Score**: ${vulnerability.cvssScore}/10 (${vulnerability.severity})
**CWE**: ${vulnerability.cwe || 'Not specified'}

This vulnerability affects your project through the dependency declaration in ${location.file}.
`.trim(),

    impact: {
      technical: `CVSS ${vulnerability.cvssScore}: ${vulnerability.severity} severity vulnerability`,
      business: 'Security compliance risk, potential data breach or service disruption',
      userExperience: 'Possible security exploits affecting user data or availability'
    },

    // AI-Generated Fix
    suggestedFix: {
      description: `Upgrade ${vulnerability.dependency.name} to a patched version`,
      code: generateFixedDependencyDeclaration(vulnerability, location),
      diff: generateDependencyUpgradeDiff(vulnerability, location),
      confidence: 95,
      alternativeFixes: [
        {
          description: 'Apply security patch if available',
          code: generatePatchedVersion(vulnerability),
          pros: ['Minimal version change', 'Lower compatibility risk'],
          cons: ['May not be available for all vulnerabilities']
        },
        {
          description: 'Use virtual patching with dependency exclusion',
          code: generateExclusionFix(vulnerability),
          pros: ['Immediate mitigation', 'No version upgrade needed'],
          cons: ['May break functionality', 'Temporary solution only']
        }
      ]
    },

    // Educational Content
    learnMore: {
      explanation: `
**What is ${vulnerability.id}?**

${vulnerability.description}

**Why is this dangerous?**

Dependencies with known vulnerabilities can be exploited by attackers to:
- Gain unauthorized access to your application
- Steal sensitive data
- Disrupt service availability
- Execute arbitrary code

**How to fix it:**

1. Check the NVD database for patched versions
2. Review release notes for breaking changes
3. Update the dependency version in your build file
4. Run tests to ensure compatibility
5. Verify the fix with Dependency-Check
      `.trim(),

      examples: {
        bad: location.dependencyDeclaration,
        good: generateFixedDependencyDeclaration(vulnerability, location)
      },

      references: [
        {
          title: `${vulnerability.id} - NVD Database`,
          url: `https://nvd.nist.gov/vuln/detail/${vulnerability.id}`,
          type: 'documentation'
        },
        ...vulnerability.references.map(url => ({
          title: 'Security Advisory',
          url,
          type: 'article' as const
        })),
        {
          title: 'OWASP Dependency-Check',
          url: 'https://owasp.org/www-project-dependency-check/',
          type: 'documentation'
        }
      ]
    },

    // Metadata
    cwe: vulnerability.cwe ? [vulnerability.cwe] : undefined,
    cve: [vulnerability.id],
    owaspTop10: mapCWEToOWASP(vulnerability.cwe),
    effort: 'easy',
    estimatedTime: '5-15 minutes',

    // Historical Context
    status: 'new',
    firstSeen: new Date(),
    lastSeen: new Date(),
    occurrences: 1,

    // User Actions
    ignored: false
  };
}

function mapCVSSToSeverity(cvssScore: number): 'critical' | 'high' | 'medium' | 'low' {
  if (cvssScore >= 9.0) return 'critical';
  if (cvssScore >= 7.0) return 'high';
  if (cvssScore >= 4.0) return 'medium';
  return 'low';
}

// Helper functions for dependency location and fix generation
// (Implementation details omitted for brevity)
```

---

## 🔧 Configuration Presets

### Preset 1: Disabled (Default)
```typescript
const config = {
  dependencyCheck: {
    enabled: false
  }
};
```

### Preset 2: Basic Security
```typescript
const config = {
  dependencyCheck: {
    enabled: true,
    nvdApiKey: process.env.NVD_API_KEY,
    failOnCVSS: 7.0,              // Block only HIGH and CRITICAL
    updateFrequency: 'daily'
  }
};
```

### Preset 3: Compliance-Ready
```typescript
const config = {
  dependencyCheck: {
    enabled: true,
    nvdApiKey: process.env.NVD_API_KEY,
    failOnCVSS: 4.0,              // Block MEDIUM and above
    suppressionFile: './dependency-check-suppressions.xml',
    updateFrequency: 'always',
    timeout: 900                  // 15 minutes for large projects
  }
};
```

---

## 📊 Expected Performance

### Initial Run (First Time)
- **Database Download**: 10-15 minutes
- **Analysis**: 30-60 seconds
- **Total**: ~15 minutes

### Subsequent Runs (Daily Updates)
- **Database Update**: 1-2 minutes
- **Analysis**: 30-60 seconds
- **Total**: ~2-3 minutes

### Cached Runs (No Updates)
- **Analysis Only**: 30-60 seconds

---

## 🎯 Severity Filtering Strategy

### Block PR For:
- **Critical** (CVSS >= 9.0): All vulnerabilities
- **High** (CVSS >= 7.0): All vulnerabilities

### Informational Only:
- **Medium** (CVSS 4.0-6.9): Show in recommendations
- **Low** (CVSS < 4.0): Hidden by default

### Rationale:
- HIGH and CRITICAL CVEs require immediate action
- MEDIUM CVEs should be addressed but not blocking
- LOW CVEs are informational (fix during maintenance)

---

## 🚀 Testing Plan

### Test 1: Setup Validation
```bash
# Test NVD API key
docker run --rm \
  -e NVD_API_KEY=${NVD_API_KEY} \
  registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.2-arm \
  bash -c 'echo "API Key: ${NVD_API_KEY:0:10}..."'

# Test database download
docker run --rm \
  -v /tmp/dependency-check-data:/data \
  -e NVD_API_KEY=${NVD_API_KEY} \
  registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.2-arm \
  bash -c '/opt/dependency-check/bin/dependency-check.sh --updateonly --nvdApiKey ${NVD_API_KEY}'
```

### Test 2: Scan Known Vulnerable Project
```bash
# Use Apache Struts 2 (known CVEs)
git clone https://github.com/apache/struts /tmp/struts-test
cd /tmp/struts-test
git checkout tags/STRUTS_2_5_10  # Known vulnerable version

# Run scan
docker run --rm \
  -v /tmp/struts-test:/workspace \
  -v /tmp/dependency-check-data:/data \
  -e NVD_API_KEY=${NVD_API_KEY} \
  registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.2-arm \
  bash -c '/opt/dependency-check/bin/dependency-check.sh \
    --scan /workspace \
    --format JSON \
    --out /workspace/results \
    --nvdApiKey ${NVD_API_KEY}'

# Expected: Find CVE-2017-5638 and others
```

### Test 3: Integration with V9 Pipeline
```typescript
// packages/agents/src/two-branch/tests/integration/dependency-check.test.ts

import { runDependencyCheck } from '../../tools/java/dependency-check';
import { transformToV9Issue } from '../../tools/java/dependency-check';

describe('Dependency-Check Integration', () => {
  it('should find CVEs in vulnerable project', async () => {
    const result = await runDependencyCheck({
      projectPath: '/tmp/struts-test',
      nvdApiKey: process.env.NVD_API_KEY!,
      failOnCVSS: 7.0
    });

    expect(result.vulnerabilities.length).toBeGreaterThan(0);
    expect(result.vulnerabilities.some(v => v.id.includes('CVE'))).toBe(true);
  });

  it('should transform to V9 issue format', () => {
    const vulnerability: CVEVulnerability = {
      id: 'CVE-2023-12345',
      severity: 'CRITICAL',
      cvssScore: 9.8,
      // ... full mock data
    };

    const issue = transformToV9Issue(vulnerability, 'test-repo', 'pr');

    expect(issue.id).toContain('DEPCHECK');
    expect(issue.severity).toBe('critical');
    expect(issue.tool).toBe('Dependency-Check');
    expect(issue.cve).toContain('CVE-2023-12345');
  });
});
```

---

## 📋 Implementation Checklist

- [ ] **Step 1**: User obtains NVD API key (external action)
- [ ] **Step 2**: Update Docker image to Dependency-Check 9.0+
- [ ] **Step 3**: Build and push new Docker image (v5.2)
- [ ] **Step 4**: Implement dependency-check.ts tool wrapper
- [ ] **Step 5**: Implement V9 issue transformation
- [ ] **Step 6**: Add configuration schema and validation
- [ ] **Step 7**: Integrate into V9 orchestration pipeline
- [ ] **Step 8**: Add unit tests for parsing logic
- [ ] **Step 9**: Add integration tests with vulnerable projects
- [ ] **Step 10**: Test full pipeline with Apache Kafka
- [ ] **Step 11**: Document user setup guide
- [ ] **Step 12**: Update configuration UI to show toggle

---

## 🎓 User Setup Guide (To Be Created)

Create: `docs/DEPENDENCY_CHECK_SETUP.md`

**Contents**:
1. Why Dependency-Check?
2. When to enable it (compliance, enterprise)
3. How to get NVD API key (step-by-step with screenshots)
4. Configuration options
5. Suppression file format
6. Troubleshooting common issues
7. Performance tips

---

## 🚨 Known Issues & Limitations

### Issue 1: Large Projects
**Problem**: Projects with 200+ dependencies can take 5-10 minutes
**Mitigation**: Use caching, run only on schedule (not every commit)

### Issue 2: False Positives
**Problem**: Transitive dependencies may report CVEs that don't affect your code
**Mitigation**: Use suppression file to document false positives

### Issue 3: Database Updates
**Problem**: NVD database updates daily, initial download is 3GB
**Mitigation**: Persistent volume for cache, update only when needed

### Issue 4: API Rate Limits
**Problem**: Without API key, only 10 requests/30 seconds
**Mitigation**: Require API key, document rate limits

---

## ✅ Success Criteria

- [ ] Successfully scans Apache Kafka dependencies (30-60s)
- [ ] Finds all HIGH and CRITICAL CVEs
- [ ] Generates V9 issues with complete metadata
- [ ] AI generates correct upgrade suggestions
- [ ] Integration tests pass 100%
- [ ] Documentation is clear and comprehensive
- [ ] User can enable/disable via config UI

---

## 🔗 References

- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/)
- [NVD API Documentation](https://nvd.nist.gov/developers)
- [Dependency-Check GitHub](https://github.com/jeremylong/DependencyCheck)
- [CVSS Calculator](https://www.first.org/cvss/calculator/3.1)
- [Suppression File Format](https://jeremylong.github.io/DependencyCheck/general/suppression.html)

---

**Next Steps**: Wait for user to obtain NVD API key, then proceed with Docker image update and implementation.