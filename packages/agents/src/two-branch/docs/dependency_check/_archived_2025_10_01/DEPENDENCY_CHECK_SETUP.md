# Dependency-Check Setup Guide

**For CodeQual Users**

---

## 📖 What is Dependency-Check?

OWASP Dependency-Check is a Software Composition Analysis (SCA) tool that identifies known security vulnerabilities (CVEs) in your project's dependencies. It checks your dependencies against the National Vulnerability Database (NVD) to find publicly disclosed security issues.

### Why Use It?

- **Security Compliance**: Required for SOC 2, ISO 27001, PCI-DSS certifications
- **Supply Chain Security**: Detect vulnerabilities in third-party libraries
- **Proactive Defense**: Find issues before attackers exploit them
- **Audit Trail**: Document security due diligence

---

## 🤔 Do You Need Dependency-Check?

### ✅ You SHOULD Enable It If:

- Your organization requires security compliance certifications
- You work in regulated industries (finance, healthcare, government)
- You need detailed CVE reporting for audits
- You want comprehensive dependency vulnerability scanning
- You don't currently use GitHub Dependabot or Snyk

### ❌ You DON'T Need It If:

- You already use GitHub Dependabot (covers most CVEs)
- You use commercial SCA tools (Snyk, Sonatype, WhiteSource)
- You're in early development with no compliance requirements
- Setup time (15 minutes) outweighs benefits

---

## 🚀 Quick Start (5 Steps)

### Step 1: Get Your NVD API Key (Free)

1. **Visit**: https://nvd.nist.gov/developers/request-an-api-key

2. **Fill Out the Form**:
   - Email address (required)
   - Organization name (optional)
   - Use case: "Automated security scanning for software development"

3. **Submit and Wait**:
   - Check your email (arrives within 1-2 hours)
   - Look for subject: "NVD API Key Request"
   - Copy your API key (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

4. **Keep It Secure**:
   - Store in password manager
   - NEVER commit to Git
   - Treat like a password

### Step 2: Configure CodeQual

1. **Open CodeQual Settings**:
   - Navigate to Repository Settings → Tools → Java

2. **Enable Dependency-Check**:
   ```
   [✓] Enable Dependency-Check
   ```

3. **Add Your API Key**:
   ```
   NVD API Key: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

4. **Choose Severity Threshold**:
   - **High & Critical** (Recommended): Block only severe vulnerabilities
   - **Medium & Above**: More strict, block moderate issues too
   - **Low & Above**: Very strict, block everything (not recommended)

5. **Save Settings**

### Step 3: Initial Database Download (One-Time)

The first run will download the CVE database (~3GB). This takes 10-15 minutes.

**You'll see**:
```
⏳ Downloading NVD CVE database...
📥 Downloaded 1.2GB / 3.0GB (40%)
⏱️ Estimated time remaining: 8 minutes
```

**Note**: Subsequent runs only download updates (~1-2 minutes)

### Step 4: Run Your First Scan

1. **Create a Pull Request** (or push to an existing one)

2. **CodeQual Will**:
   - Clone your repository
   - Analyze dependencies from `pom.xml` or `build.gradle`
   - Check for known CVEs
   - Report findings in PR comment

3. **Typical Scan Time**:
   - Small projects (< 50 dependencies): 30-60 seconds
   - Medium projects (50-200 dependencies): 1-3 minutes
   - Large projects (200+ dependencies): 3-10 minutes

### Step 5: Review Results

**If vulnerabilities found**:
```markdown
## CodeQual Analysis

❌ PR BLOCKED - Security vulnerabilities found

🚨 Critical Issues:
• CVE-2023-12345 in jackson-databind 2.12.3 (CVSS 9.8)
• CVE-2023-67890 in spring-core 5.3.10 (CVSS 7.5)

[View Details] [Fix Vulnerabilities]
```

**If no vulnerabilities**:
```markdown
## CodeQual Analysis

✅ No critical vulnerabilities found

💡 All dependencies are secure
```

---

## 🔧 Configuration Options

### Basic Configuration (Recommended)

```yaml
dependency-check:
  enabled: true
  nvdApiKey: ${NVD_API_KEY}
  failOnCVSS: 7.0              # Block HIGH and CRITICAL only
  updateFrequency: daily       # Check for database updates once per day
  timeout: 600                 # 10 minutes max
```

### Advanced Configuration

```yaml
dependency-check:
  enabled: true
  nvdApiKey: ${NVD_API_KEY}
  failOnCVSS: 4.0              # Block MEDIUM and above
  suppressionFile: .codequal/suppressions.xml
  updateFrequency: always      # Always check for updates
  timeout: 900                 # 15 minutes for large projects
  excludes:
    - "**/test/**"             # Exclude test dependencies
    - "**/dev/**"              # Exclude dev dependencies
```

### Severity Thresholds Explained

| Threshold | CVSS Range | Description | Recommended For |
|-----------|------------|-------------|-----------------|
| **Critical** | 9.0-10.0 | Extremely severe vulnerabilities | Not recommended (too lenient) |
| **High** | 7.0-8.9 | Severe vulnerabilities | **Most teams** ✅ |
| **Medium** | 4.0-6.9 | Moderate vulnerabilities | Compliance-heavy organizations |
| **Low** | 0.1-3.9 | Minor vulnerabilities | Not recommended (too strict) |

---

## 🛠️ Suppressing False Positives

Sometimes Dependency-Check reports vulnerabilities that don't affect your code (false positives). You can suppress these using a suppression file.

### Create Suppression File

1. **Create file**: `.codequal/dependency-check-suppressions.xml`

2. **Add suppressions**:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<suppressions xmlns="https://jeremylong.github.io/DependencyCheck/dependency-suppression.1.3.xsd">

  <!-- Suppress specific CVE -->
  <suppress>
    <notes>CVE-2023-12345 does not affect us because we don't use the vulnerable feature</notes>
    <cve>CVE-2023-12345</cve>
  </suppress>

  <!-- Suppress by package -->
  <suppress>
    <notes>Test dependencies are not deployed to production</notes>
    <packageUrl regex="true">^pkg:maven/junit/junit@.*$</packageUrl>
  </suppress>

  <!-- Suppress by CVSS score -->
  <suppress until="2025-12-31">
    <notes>Low severity issue, will fix in next major release</notes>
    <cvssBelow>4.0</cvssBelow>
  </suppress>

</suppressions>
```

3. **Update CodeQual config**:
```yaml
dependency-check:
  suppressionFile: .codequal/dependency-check-suppressions.xml
```

### Best Practices for Suppressions

✅ **DO**:
- Document WHY you're suppressing (use `<notes>`)
- Set expiration dates (`until="2025-12-31"`)
- Review suppressions quarterly
- Suppress only after investigation

❌ **DON'T**:
- Suppress without understanding the issue
- Suppress all findings to "go green"
- Use suppressions as permanent fixes
- Ignore HIGH/CRITICAL vulnerabilities

---

## 🏎️ Performance Optimization

### Reduce Scan Time

1. **Use Persistent Cache**:
   - Database updates are cached
   - First run: 15 minutes
   - Subsequent runs: 1-3 minutes

2. **Schedule Updates**:
   ```yaml
   updateFrequency: daily    # Instead of 'always'
   ```

3. **Exclude Test Dependencies**:
   ```yaml
   excludes:
     - "**/test/**"
     - "**/src/test/**"
   ```

4. **Use Shorter Timeout for Small Projects**:
   ```yaml
   timeout: 300    # 5 minutes for < 50 dependencies
   ```

### When to Run

**Recommended**:
- ✅ On pull requests to `main` branch
- ✅ Nightly scheduled builds
- ✅ Before releases

**Not Recommended**:
- ❌ Every commit on feature branches (too slow)
- ❌ On draft PRs (unnecessary)

---

## 🚨 Troubleshooting

### Issue 1: "NVD API authentication failed"

**Symptoms**:
```
❌ Error: NVD API authentication failed. Check your API key.
```

**Solutions**:
1. Verify API key is correct (check for spaces/typos)
2. Ensure API key is activated (check NVD email)
3. Try regenerating API key
4. Check API rate limits (100 requests/30 seconds)

### Issue 2: "Dependency-Check timed out"

**Symptoms**:
```
❌ Error: Dependency-Check timed out after 600s
```

**Solutions**:
1. Increase timeout:
   ```yaml
   timeout: 900    # 15 minutes
   ```
2. Check network connectivity
3. Exclude test dependencies
4. Contact support if persistent

### Issue 3: "Database download failed"

**Symptoms**:
```
❌ Error: Failed to download NVD CVE database
```

**Solutions**:
1. Check internet connection
2. Verify firewall allows HTTPS to nvd.nist.gov
3. Check disk space (need 5GB free)
4. Retry after 30 minutes (NVD may be rate-limiting)

### Issue 4: Too many false positives

**Symptoms**:
```
❌ PR BLOCKED - 50 vulnerabilities found
(Most are in test dependencies or don't affect code)
```

**Solutions**:
1. Exclude test dependencies:
   ```yaml
   excludes: ["**/test/**"]
   ```
2. Create suppression file (see above)
3. Increase CVSS threshold:
   ```yaml
   failOnCVSS: 9.0    # Only CRITICAL
   ```

---

## 📊 Understanding Results

### CVE Report Example

```markdown
🚨 CVE-2023-12345: Critical vulnerability in jackson-databind

Severity: CRITICAL (CVSS 9.8/10)
CWE: CWE-502 (Deserialization of Untrusted Data)

Affected Dependency:
  • jackson-databind 2.12.3
  • Location: pom.xml:45

Description:
jackson-databind before 2.12.6 allows remote attackers to execute
arbitrary code via crafted JSON input.

Suggested Fix:
Upgrade to jackson-databind 2.12.6 or later

<dependency>
  <groupId>com.fasterxml.jackson.core</groupId>
  <artifactId>jackson-databind</artifactId>
- <version>2.12.3</version>
+ <version>2.15.3</version>
</dependency>

References:
• https://nvd.nist.gov/vuln/detail/CVE-2023-12345
• https://github.com/FasterXML/jackson-databind/issues/1234
```

### CVSS Score Meaning

| Score | Severity | Risk Level | Action Required |
|-------|----------|------------|-----------------|
| 9.0-10.0 | **CRITICAL** | Extreme | Fix immediately (< 24 hours) |
| 7.0-8.9 | **HIGH** | Severe | Fix within 1 week |
| 4.0-6.9 | **MEDIUM** | Moderate | Fix within 1 month |
| 0.1-3.9 | **LOW** | Minor | Fix when convenient |

---

## 🔐 Security Best Practices

### Protecting Your API Key

1. **Never Commit to Git**:
   ```bash
   # Add to .gitignore
   .env
   .codequal/secrets.yml
   ```

2. **Use Environment Variables**:
   ```bash
   # In CI/CD
   export NVD_API_KEY=your-key-here
   ```

3. **Rotate Periodically**:
   - Regenerate API key every 6-12 months
   - Update in all environments

4. **Limit Access**:
   - Only give to CI/CD systems
   - Don't share with developers

### Vulnerability Management Process

1. **Detection**: Dependency-Check finds CVE
2. **Assessment**: Review CVSS score and description
3. **Triage**: Determine if vulnerability affects your code
4. **Remediation**: Upgrade dependency or apply patch
5. **Verification**: Re-run scan to confirm fix
6. **Documentation**: Log in security audit trail

---

## 📚 Additional Resources

### Documentation
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/)
- [NVD Database](https://nvd.nist.gov/)
- [CVSS Calculator](https://www.first.org/cvss/calculator/3.1)
- [CWE Database](https://cwe.mitre.org/)

### Tools Integration
- [Maven Plugin](https://jeremylong.github.io/DependencyCheck/dependency-check-maven/)
- [Gradle Plugin](https://jeremylong.github.io/DependencyCheck/dependency-check-gradle/)
- [GitHub Actions](https://github.com/marketplace/actions/owasp-dependency-check)

### Support
- **CodeQual Docs**: https://docs.codequal.com
- **Community Forum**: https://community.codequal.com
- **Email Support**: support@codequal.com
- **Security Issues**: security@codequal.com

---

## ❓ FAQ

### Q: Is the NVD API key really free?
**A**: Yes, 100% free for unlimited use with rate limits (100 requests/30 seconds).

### Q: How often is the CVE database updated?
**A**: NVD updates daily. CodeQual checks for updates based on your `updateFrequency` setting.

### Q: What if a vulnerability has no fix available?
**A**: You can:
1. Suppress with expiration date
2. Apply virtual patch (workaround)
3. Switch to alternative library
4. Accept risk and document

### Q: Does this replace GitHub Dependabot?
**A**: No, they complement each other:
- **Dependabot**: Automatic PR creation for updates
- **Dependency-Check**: Detailed CVE reports, compliance documentation

### Q: Can I use this for non-Java projects?
**A**: Dependency-Check supports:
- Java (Maven, Gradle)
- .NET (NuGet)
- Ruby (Bundler)
- Python (pip)
- Node.js (npm, yarn)
- PHP (Composer)

CodeQual currently integrates Java only. Contact us for other languages.

### Q: What's the cost of API rate limit overages?
**A**: NVD API is free with no overages. If you exceed 100 requests/30 seconds, you'll need to wait 30 seconds.

---

## 🎓 Next Steps

1. ✅ **Get your NVD API key** (if you haven't already)
2. ✅ **Enable in CodeQual settings**
3. ✅ **Run your first scan**
4. ✅ **Review and fix vulnerabilities**
5. ✅ **Set up suppression file** (if needed)
6. ✅ **Integrate into CI/CD workflow**

**Need Help?** Contact support@codequal.com or visit our community forum.

---

**Document Version**: 1.0
**Last Updated**: September 30, 2025
**Applies To**: CodeQual v9+