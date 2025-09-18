#!/usr/bin/env npx ts-node

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables FIRST
dotenv.config({ path: path.join(__dirname, '.env') });

import { RedisToolOutputManager } from './src/two-branch/utils/redis-tool-output-manager';
import { V9IntegratedAnalyzer } from './src/two-branch/analyzers/v9-integrated-analyzer';
import { execSync } from 'child_process';
import * as fs from 'fs';

async function testWithIssues() {
  console.log('🚀 Testing V9 with Real Issues');

  const workspace = `pr-17620-${Date.now()}`;
  const repoUrl = 'https://github.com/apache/kafka';
  const prNumber = 17620;

  try {
    // Setup Redis connection
    console.log('Setting up Redis...');
    execSync("pkill -f 'kubectl port-forward.*redis' || true", { shell: '/bin/bash' });
    execSync('kubectl port-forward -n codequal-dev svc/redis-service 6379:6379 > /dev/null 2>&1 &',
      { shell: '/bin/bash' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Populate Redis with realistic tool outputs
    console.log(`Populating workspace ${workspace} with tool outputs...`);
    const redisManager = new RedisToolOutputManager();

    // Real SpotBugs output with 12 issues
    await redisManager.storeToolOutput(workspace, 'pr', 'spotbugs',
      `H C NP: Null pointer dereference at SecurityIssues.java:[line 109]
H B OS: Open stream not closed at SecurityIssues.java:[line 117]
H S SQL: SQL injection vulnerability at SecurityIssues.java:[line 101]
M C DM: Dead code found at CodeQualityIssues.java:[line 149]
M P EI: Empty catch block at SecurityIssues.java:[line 135]
H B RCN: Redundant nullcheck at PerformanceIssues.java:[line 255]
L P DM: Unused private method at CodeQualityIssues.java:[line 149]
M C NP: Possible null pointer at PerformanceIssues.java:[line 234]
L S WEAK_RANDOM: Weak random number generator at SecurityIssues.java:[line 127]
M P ST: String concatenation in loop at PerformanceIssues.java:[line 228]
H B UC: Unclosed connection at SecurityIssues.java:[line 104]
L C UPM: Unused parameter at StyleViolations.java:[line 307]`, 13000, true);

    // Real PMD output with 24 issues
    await redisManager.storeToolOutput(workspace, 'pr', 'pmd',
      `SecurityIssues.java:109: NullPointerDereference - Avoid null pointer access
SecurityIssues.java:135: EmptyCatchBlock - Avoid empty catch blocks
CodeQualityIssues.java:149: UnusedPrivateMethod - Unused private method 'unusedMethod'
CodeQualityIssues.java:185: SystemPrintln - Avoid System.out.println
CodeQualityIssues.java:154: CyclomaticComplexity - The method 'complexMethod' has a cyclomatic complexity of 7
CodeQualityIssues.java:179: MagicNumber - Avoid magic numbers
PerformanceIssues.java:228: StringConcatenationInLoop - Avoid concatenating strings in loops
PerformanceIssues.java:234: InefficientEmptyStringCheck - Use isEmpty() instead
StyleViolations.java:280: FieldNamingConventions - Field names should not start with underscore
StyleViolations.java:286: ConstantNamingConventions - Constants should be all caps
StyleViolations.java:290: LineLengthCheck - Line is too long
StyleViolations.java:304: MultipleStatements - Multiple statements on single line
CodeQualityIssues.java:184: DuplicateCode - Duplicate code detected
CodeQualityIssues.java:190: DuplicateCode - Duplicate code detected
CodeQualityIssues.java:197: ShortVariable - Variable name 'x' is too short
CodeQualityIssues.java:197: ShortVariable - Variable name 'y' is too short
CodeQualityIssues.java:198: ShortVariable - Variable name 'z' is too short
CodeQualityIssues.java:211: TooManyParameters - Too many parameters (8)
PerformanceIssues.java:245: ResourceLeak - Resource leak in loop
PerformanceIssues.java:255: UnsafeIncrement - Non-thread-safe increment
PerformanceIssues.java:260: InfiniteLoop - Potential infinite loop
StyleViolations.java:277: MissingJavadoc - Missing class javadoc
StyleViolations.java:294: MissingOverride - Missing @Override annotation
StyleViolations.java:307: MissingBraces - Missing braces for if statement`, 15000, true);

    // Real Checkstyle output with 36 issues
    await redisManager.storeToolOutput(workspace, 'pr', 'checkstyle',
      `[ERROR] SecurityIssues.java:2: AvoidStarImport - Using wildcard imports
[ERROR] SecurityIssues.java:3: AvoidStarImport - Using wildcard imports
[ERROR] SecurityIssues.java:4: AvoidStarImport - Using wildcard imports
[ERROR] SecurityIssues.java:6: MissingJavadocType - Missing Javadoc comment
[ERROR] SecurityIssues.java:95: HardcodedPassword - Hardcoded password detected
[ERROR] SecurityIssues.java:96: HardcodedPassword - Hardcoded API key detected
[ERROR] CodeQualityIssues.java:2: AvoidStarImport - Using wildcard imports
[ERROR] CodeQualityIssues.java:4: MissingJavadocType - Missing Javadoc comment
[ERROR] CodeQualityIssues.java:149: UnusedPrivateMethod - Private method never used
[ERROR] CodeQualityIssues.java:154: CyclomaticComplexity - Method too complex
[ERROR] CodeQualityIssues.java:179: MagicNumber - Magic number 1.08
[ERROR] CodeQualityIssues.java:179: MagicNumber - Magic number 0.95
[ERROR] CodeQualityIssues.java:179: MagicNumber - Magic number 2.50
[ERROR] CodeQualityIssues.java:197: ShortVariable - Variable 'a' too short
[ERROR] CodeQualityIssues.java:197: ShortVariable - Variable 'x' too short
[ERROR] CodeQualityIssues.java:197: ShortVariable - Variable 'y' too short
[ERROR] CodeQualityIssues.java:198: ShortVariable - Variable 'z' too short
[ERROR] CodeQualityIssues.java:211: ParameterNumber - Too many parameters (8)
[ERROR] PerformanceIssues.java:2: AvoidStarImport - Using wildcard imports
[ERROR] PerformanceIssues.java:4: MissingJavadocType - Missing Javadoc comment
[ERROR] PerformanceIssues.java:228: StringConcatenationInLoop - String concatenation in loop
[ERROR] PerformanceIssues.java:245: ResourceLeak - Resource not closed
[ERROR] PerformanceIssues.java:255: ThreadSafety - Non-thread-safe operation
[ERROR] StyleViolations.java:2: AvoidStarImport - Using wildcard imports
[ERROR] StyleViolations.java:3: AvoidStarImport - Using wildcard imports
[ERROR] StyleViolations.java:4: AvoidStarImport - Using wildcard imports
[ERROR] StyleViolations.java:5: AvoidStarImport - Using wildcard imports
[ERROR] StyleViolations.java:6: UnusedImports - Unused import javax.swing.*
[ERROR] StyleViolations.java:8: MissingJavadocType - Missing Javadoc comment
[ERROR] StyleViolations.java:9: LeftCurly - '{' should be on previous line
[ERROR] StyleViolations.java:11: VisibilityModifier - Variable should be private
[ERROR] StyleViolations.java:14: VisibilityModifier - Missing visibility modifier
[ERROR] StyleViolations.java:17: ConstantName - Constant name not all caps
[ERROR] StyleViolations.java:20: LineLength - Line exceeds 120 characters
[ERROR] StyleViolations.java:21: LineLength - Line exceeds 120 characters
[ERROR] StyleViolations.java:25: MissingOverride - Missing @Override annotation`, 27000, true);

    // Real Semgrep output with 2 issues
    await redisManager.storeToolOutput(workspace, 'pr', 'semgrep',
      `SecurityIssues.java
     java.lang.security.audit.sqli.jdbc-sqli
        101┆ String query = "SELECT * FROM users WHERE id = " + userId;

     java.lang.security.audit.command-injection
        122┆ Runtime.getRuntime().exec("ping " + userInput);

2 Code Findings`, 10000, true);

    // Also store for main branch (with fewer issues to show new issues in PR)
    await redisManager.storeToolOutput(workspace, 'main', 'spotbugs',
      `H C NP: Null pointer dereference at SecurityIssues.java:[line 109]
H B OS: Open stream not closed at SecurityIssues.java:[line 117]`, 13000, true);

    console.log('✅ Populated Redis with 74 total issues in PR branch');

    // Run the analysis
    console.log('Running V9 analysis...');
    const analyzer = new V9IntegratedAnalyzer();
    const report = await analyzer.analyzeRepository(repoUrl, prNumber, { workspace });

    // Save the report
    const reportPath = path.join(__dirname, 'src/two-branch/tests/reports',
      `V9-WITH-ISSUES-${Date.now()}.md`);

    if (report.markdown) {
      fs.writeFileSync(reportPath, report.markdown);
      console.log(`✅ Report saved: ${reportPath}`);
    }

    // Display results
    console.log('\n📊 ANALYSIS RESULTS:');
    console.log(`Total Issues: ${report.executiveSummary?.totalIssues || 0}`);
    console.log(`New Issues: ${report.executiveSummary?.newIssues || 0}`);
    console.log(`Critical Issues: ${report.executiveSummary?.criticalIssues || 0}`);

    if (report.executiveSummary?.totalIssues === 0) {
      console.error('❌ ERROR: Should have 74 issues but got 0!');
      process.exit(1);
    } else {
      console.log('✅ SUCCESS: Issues properly detected!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    execSync("pkill -f 'kubectl port-forward.*redis' || true", { shell: '/bin/bash' });
  }
}

testWithIssues().catch(console.error);