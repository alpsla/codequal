# SpotBugs Setup Guide

**For CodeQual Users**

---

## 📖 What is SpotBugs?

SpotBugs is a static analysis tool that examines Java **bytecode** (compiled .class files) to find bugs and potential issues. Unlike PMD which analyzes source code, SpotBugs performs deeper analysis on the compiled program.

### Why Use It?

- **Deeper Analysis**: Finds bugs that source-code analysis might miss
- **Bytecode Patterns**: Detects issues only visible in compiled code
- **Proven Track Record**: Evolution of FindBugs (used by thousands of projects)
- **Complementary**: Finds different bugs than PMD/Checkstyle

---

## 🤔 Do You Need SpotBugs?

### ✅ You SHOULD Enable It If:

- You perform release audits before deployment
- You have automated build systems (Maven/Gradle)
- You can afford 1-2 minutes extra analysis time
- You want the deepest possible bug detection
- You're working on critical/production code

### ❌ You DON'T Need It If:

- You need fast PR feedback (<2 minutes)
- Your project doesn't compile reliably
- You're satisfied with PMD's source code analysis
- Compilation takes too long (>2 minutes)
- You're in rapid prototyping phase

---

## 🚀 Quick Start (4 Steps)

### Step 1: Ensure Your Project Compiles

SpotBugs requires compiled .class files. Test your build:

**For Maven**:
```bash
mvn clean compile
ls target/classes  # Should see .class files
```

**For Gradle**:
```bash
./gradlew clean build -x test
ls build/classes/java/main  # Should see .class files
```

**Multi-module Projects**:
```bash
# Maven
mvn clean compile -pl module-name

# Gradle
./gradlew :module-name:build -x test
```

### Step 2: Enable SpotBugs in CodeQual

1. **Open CodeQual Settings**:
   - Navigate to Repository Settings → Tools → Java

2. **Enable SpotBugs**:
   ```
   [✓] Enable SpotBugs
   ```

3. **Configure Build Command**:
   ```
   Build Command: mvn compile
   # Or for Gradle:
   Build Command: ./gradlew build -x test
   ```

4. **Choose Priority Level**:
   - **High (Priority 1)**: Only critical bugs (recommended)
   - **Medium (Priority 1-2)**: Critical + High bugs
   - **Low (Priority 1-3)**: All bugs (not recommended)

5. **Save Settings**

### Step 3: Run Your First Analysis

1. **Create a Pull Request** (or push to existing one)

2. **CodeQual Will**:
   - Clone your repository
   - Compile your code (using your build command)
   - Run SpotBugs on compiled classes
   - Report findings in PR comment

3. **Typical Analysis Time**:
   - Small projects (<100 classes): ~1 minute
   - Medium projects (100-1,000 classes): ~2-3 minutes
   - Large projects (1,000+ classes): ~3-5 minutes

### Step 4: Review Results

**If bugs found**:
```markdown
## CodeQual Analysis

❌ PR BLOCKED - 3 critical bugs found (SpotBugs)

🐛 SpotBugs Issues:
• Null pointer dereference in UserService.java:123
• Resource leak in FileHandler.java:456
• Concurrency issue in OrderProcessor.java:789

[View Details] [Fix Bugs]
```

**If no bugs**:
```markdown
## CodeQual Analysis

✅ No critical bugs found

💡 SpotBugs analyzed 1,234 classes successfully
```

---

## 🔧 Configuration Options

### Basic Configuration (Recommended)

```yaml
spotbugs:
  enabled: true
  priority: high            # Only critical bugs
  effort: default           # Balanced speed/accuracy
  buildCommand: mvn compile
  timeout: 300              # 5 minutes max
```

### Advanced Configuration

```yaml
spotbugs:
  enabled: true
  priority: medium          # Critical + High bugs
  effort: max               # Most thorough (slower)
  buildCommand: ./gradlew :clients:build -x test
  timeout: 600              # 10 minutes for large projects
  includeTests: false       # Don't analyze test classes
  excludeFilter: spotbugs-exclude.xml  # Custom exclusions
```

### Priority Levels Explained

| Priority | Severity | Bug Count (Kafka) | Recommended For |
|----------|----------|-------------------|-----------------|
| **High** | Critical only | 3 bugs | **Most teams** ✅ |
| **Medium** | Critical + High | 2,404 bugs | Teams with strict quality standards |
| **Low** | All bugs | 5,000+ bugs | Not recommended (too much noise) |

### Effort Levels Explained

| Effort | Speed | Accuracy | Description |
|--------|-------|----------|-------------|
| **min** | Fast | Good | Quick analysis, may miss some bugs |
| **default** | Medium | Better | **Recommended** - balanced approach |
| **max** | Slow | Best | Most thorough, use for releases |

---

## 🛠️ Build System Setup

### Maven Projects

#### Single Module

```xml
<!-- pom.xml -->
<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-compiler-plugin</artifactId>
      <version>3.11.0</version>
      <configuration>
        <source>17</source>
        <target>17</target>
      </configuration>
    </plugin>
  </plugins>
</build>
```

**Build Command**: `mvn compile`

#### Multi-Module

```xml
<!-- parent pom.xml -->
<modules>
  <module>core</module>
  <module>api</module>
  <module>web</module>
</modules>
```

**Build Command**:
- All modules: `mvn compile`
- Specific module: `mvn compile -pl api`
- Module + dependencies: `mvn compile -pl api -am`

### Gradle Projects

#### Single Module

```groovy
// build.gradle
plugins {
    id 'java'
}

java {
    sourceCompatibility = '17'
    targetCompatibility = '17'
}
```

**Build Command**: `./gradlew build -x test`

#### Multi-Module

```groovy
// settings.gradle
include 'core', 'api', 'web'
```

**Build Command**:
- All modules: `./gradlew build -x test`
- Specific module: `./gradlew :api:build -x test`

---

## 🚨 Troubleshooting

### Issue 1: "Compilation failed"

**Symptoms**:
```
❌ Error: Build failed with exit code 1
SpotBugs analysis skipped
```

**Solutions**:
1. **Test build locally**:
   ```bash
   mvn clean compile
   # Or
   ./gradlew clean build -x test
   ```

2. **Check for syntax errors**:
   ```bash
   # Look for compilation errors
   mvn compile 2>&1 | grep ERROR
   ```

3. **Verify Java version**:
   ```bash
   # Ensure compatible Java version
   java -version
   javac -version
   ```

4. **Check dependencies**:
   ```bash
   # Maven
   mvn dependency:tree | grep MISSING

   # Gradle
   ./gradlew dependencies
   ```

### Issue 2: "No .class files found"

**Symptoms**:
```
❌ Error: No compiled classes found
Cannot run SpotBugs analysis
```

**Solutions**:
1. **Verify build output**:
   ```bash
   # Maven
   ls -la target/classes

   # Gradle
   ls -la build/classes/java/main
   ```

2. **Check build command**:
   - Ensure it actually compiles (not just `clean`)
   - For tests: use `-x test` or `-DskipTests`

3. **Multi-module projects**:
   ```bash
   # Build specific module that has code
   mvn compile -pl core
   ```

### Issue 3: "Build timeout"

**Symptoms**:
```
❌ Error: Build timed out after 300 seconds
```

**Solutions**:
1. **Increase timeout**:
   ```yaml
   spotbugs:
     timeout: 600  # 10 minutes
   ```

2. **Optimize build**:
   ```bash
   # Skip unnecessary steps
   mvn compile -DskipTests -Dmaven.javadoc.skip=true

   # Use build cache
   ./gradlew build --build-cache
   ```

3. **Build only necessary modules**:
   ```bash
   mvn compile -pl module-name -am
   ```

### Issue 4: Too many false positives

**Symptoms**:
```
❌ PR BLOCKED - 2,404 bugs found
(Most are low-priority or false positives)
```

**Solutions**:
1. **Use stricter priority**:
   ```yaml
   spotbugs:
     priority: high  # Only critical (3 bugs vs 2,404)
   ```

2. **Create exclusion filter**:
   ```xml
   <!-- spotbugs-exclude.xml -->
   <FindBugsFilter>
     <!-- Exclude test code -->
     <Match>
       <Class name="~.*Test" />
     </Match>

     <!-- Exclude specific bug types -->
     <Match>
       <Bug pattern="SE_BAD_FIELD" />
     </Match>

     <!-- Exclude generated code -->
     <Match>
       <Class name="~.*\.generated\..*" />
     </Match>
   </FindBugsFilter>
   ```

   ```yaml
   spotbugs:
     excludeFilter: spotbugs-exclude.xml
   ```

3. **Suppress specific warnings**:
   ```java
   @SuppressFBWarnings(value = "NP_NULL_ON_SOME_PATH",
                      justification = "Null check done elsewhere")
   public void myMethod() { ... }
   ```

---

## 📊 Understanding Results

### Bug Report Example

```markdown
🐛 NP_NULL_ON_SOME_PATH: Possible null pointer dereference

File: src/main/java/com/example/UserService.java
Line: 123
Priority: 1 (Critical)
Category: CORRECTNESS

Description:
This method may return null, and the code doesn't check for null
before dereferencing the result. This will throw NullPointerException
at runtime if the value is null.

Code:
122: User user = userRepository.findById(userId);
123: return user.getName();  ← Null pointer risk here
124:

Suggested Fix:
122: User user = userRepository.findById(userId);
123: if (user == null) {
124:     throw new UserNotFoundException("User not found: " + userId);
125: }
126: return user.getName();

References:
• SpotBugs Bug Pattern: NP_NULL_ON_SOME_PATH
• https://spotbugs.readthedocs.io/en/stable/bugDescriptions.html
```

### Bug Categories

| Category | Description | Example |
|----------|-------------|---------|
| **CORRECTNESS** | Code that is probably wrong | Null pointer dereferences, equals() bugs |
| **BAD_PRACTICE** | Violations of recommended practice | Ignored exceptions, missing serialVersionUID |
| **PERFORMANCE** | Code that is inefficient | Inefficient string concatenation |
| **MALICIOUS_CODE** | Security vulnerabilities | SQL injection, XSS |
| **MT_CORRECTNESS** | Thread safety issues | Race conditions, deadlocks |
| **SECURITY** | Security best practices | Weak cryptography, insecure random |

### Priority to Severity Mapping

```
SpotBugs Priority 1 → CodeQual Severity: CRITICAL
SpotBugs Priority 2 → CodeQual Severity: HIGH
SpotBugs Priority 3 → CodeQual Severity: MEDIUM
```

---

## 🏎️ Performance Optimization

### Reduce Compilation Time

1. **Use Incremental Compilation**:
   ```bash
   # Maven
   mvn compile -Dmaven.compiler.useIncrementalCompilation=true

   # Gradle (enabled by default)
   ./gradlew build
   ```

2. **Enable Build Cache**:
   ```bash
   # Gradle
   ./gradlew build --build-cache

   # Maven (use Maven Build Cache Extension)
   ```

3. **Compile Only Changed Modules**:
   ```bash
   # Maven
   mvn compile -pl changed-module -am

   # Gradle
   ./gradlew :changed-module:build
   ```

4. **Skip Unnecessary Steps**:
   ```bash
   mvn compile -DskipTests -Dmaven.javadoc.skip=true -Dcheckstyle.skip=true
   ```

### When to Run SpotBugs

**✅ Recommended**:
- Pre-release audits
- Nightly builds
- Weekly scheduled scans
- Before major releases

**❌ Not Recommended**:
- Every PR (too slow for rapid feedback)
- Draft PRs (not stable yet)
- Work-in-progress branches

---

## 🔒 Security Best Practices

### Build Security

```bash
# ❌ Don't expose secrets in build
mvn compile -Dapi.key=secret123

# ✅ Use environment variables
export API_KEY=secret123
mvn compile
```

### Exclusion Patterns

```xml
<!-- ❌ Don't exclude security checks -->
<Match>
  <Bug category="SECURITY" />
</Match>

<!-- ✅ Only exclude after investigation -->
<Match>
  <Bug pattern="SQL_PREPARED_STATEMENT_GENERATED_FROM_NONCONSTANT_STRING" />
  <Class name="com.example.LegacyQueryBuilder" />
  <!-- TODO: Refactor this class to use PreparedStatement -->
</Match>
```

---

## 📚 Additional Resources

### Documentation
- [SpotBugs Official Docs](https://spotbugs.readthedocs.io/)
- [Bug Descriptions](https://spotbugs.readthedocs.io/en/stable/bugDescriptions.html)
- [Maven Plugin](https://spotbugs.github.io/spotbugs-maven-plugin/)
- [Gradle Plugin](https://plugins.gradle.org/plugin/com.github.spotbugs)

### Learning
- [SpotBugs Tutorial](https://spotbugs.github.io/spotbugs/)
- [FindBugs to SpotBugs Migration](https://spotbugs.readthedocs.io/en/stable/migration.html)

### Support
- **CodeQual Docs**: https://docs.codequal.com
- **Community Forum**: https://community.codequal.com
- **Email Support**: support@codequal.com

---

## ❓ FAQ

### Q: How is SpotBugs different from PMD?
**A**: PMD analyzes source code (.java files), SpotBugs analyzes bytecode (.class files). SpotBugs can find bugs that only appear in compiled code, like bytecode-level vulnerabilities. PMD is faster but less deep. Use both for comprehensive coverage.

### Q: Why does SpotBugs need compilation?
**A**: SpotBugs examines the compiled bytecode to find patterns that indicate bugs. It can't work with source code because many bug patterns only appear after compilation.

### Q: Can I use SpotBugs without Maven/Gradle?
**A**: Yes, but you need to compile your code somehow. SpotBugs needs .class files. You can use `javac` directly:
```bash
javac -d build src/**/*.java
spotbugs -textui build
```

### Q: How long does SpotBugs take?
**A**: Compilation: 30-120 seconds (depends on project size)
Analysis: 5-60 seconds (depends on number of classes)
Total: Usually 1-3 minutes for most projects

### Q: Can I run SpotBugs locally?
**A**: Yes! Install SpotBugs and run:
```bash
# Maven
mvn compile spotbugs:spotbugs

# Gradle
./gradlew spotbugsMain

# Standalone
spotbugs -textui -high target/classes
```

### Q: What if my build is flaky?
**A**: Consider disabling SpotBugs. It's optional for a reason. If your build fails >10% of the time, SpotBugs will be frustrating. Fix your build first, then enable SpotBugs.

### Q: Can SpotBugs analyze Kotlin/Scala?
**A**: Yes! SpotBugs works on any JVM bytecode. It can analyze Kotlin, Scala, Groovy, or any language that compiles to .class files.

---

## 🎓 Next Steps

1. ✅ **Test your build locally**
   ```bash
   mvn clean compile
   # Verify .class files exist
   ```

2. ✅ **Enable SpotBugs in CodeQual**
   - Repository Settings → Tools → Java → Enable SpotBugs

3. ✅ **Configure build command**
   - Maven: `mvn compile`
   - Gradle: `./gradlew build -x test`

4. ✅ **Create test PR**
   - Push changes and see SpotBugs in action

5. ✅ **Review and fix bugs**
   - Start with Priority 1 (critical) bugs
   - Work through Priority 2 (high) as time permits

6. ✅ **Create exclusion filter** (optional)
   - Suppress false positives
   - Document why certain warnings are excluded

**Need Help?** Contact support@codequal.com or visit our community forum.

---

**Document Version**: 1.0
**Last Updated**: September 30, 2025
**Applies To**: CodeQual v9+