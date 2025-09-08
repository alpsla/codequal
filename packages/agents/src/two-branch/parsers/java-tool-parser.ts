/**
 * Java Tool Output Parser
 * Parses real output from Java analysis tools:
 * - SpotBugs (bug detection)
 * - PMD (code quality and style)
 * - Checkstyle (coding standards)
 * - OWASP Dependency Check (security vulnerabilities)
 * - JUnit (test results)
 * - JaCoCo (code coverage)
 */

import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parseStringPromise } from 'xml2js';

const exec = promisify(execCallback);

export interface JavaIssue {
  id: string;
  type: 'security' | 'performance' | 'quality' | 'bug' | 'style' | 'test';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  message: string;
  suggestion?: string;
  tool: string;
  category?: string;
  code?: string;
  help?: string;
  priority?: number;
}

export interface JavaToolResult {
  tool: string;
  executionTime: number;
  exitCode: number;
  issues: JavaIssue[];
  rawOutput?: string;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  coverage?: {
    lines: number;
    branches: number;
    methods: number;
    classes: number;
    instructions: number;
  };
}

export class JavaToolParser {
  
  /**
   * Run SpotBugs and parse its output
   */
  async runSpotBugs(repoPath: string, files?: string[]): Promise<JavaToolResult> {
    const startTime = Date.now();
    let issues: JavaIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';

    try {
      // Check if SpotBugs is configured
      const buildTool = await this.detectBuildTool(repoPath);
      let command = '';
      
      if (buildTool === 'maven') {
        command = `cd ${repoPath} && mvn spotbugs:spotbugs -DspotbugsXmlOutput=true 2>&1`;
      } else if (buildTool === 'gradle') {
        command = `cd ${repoPath} && ./gradlew spotbugsMain 2>&1`;
      } else {
        // Standalone SpotBugs
        const classPath = files && files.length > 0 
          ? files.filter(f => f.endsWith('.class')).join(' ')
          : 'target/classes build/classes';
        command = `cd ${repoPath} && spotbugs -xml ${classPath} 2>&1`;
      }
      
      const { stdout, stderr } = await exec(command, { 
        maxBuffer: 10 * 1024 * 1024,
        timeout: 180000  // 3 minutes
      });
      
      rawOutput = stdout + stderr;
      
      // Find and parse XML output
      const xmlPath = await this.findSpotBugsXml(repoPath);
      if (xmlPath) {
        const xmlContent = await fs.readFile(xmlPath, 'utf-8');
        issues = await this.parseSpotBugsXml(xmlContent);
      } else {
        // Fallback to text parsing
        issues = this.parseSpotBugsTextOutput(rawOutput);
      }

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      issues = this.parseSpotBugsTextOutput(rawOutput);
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'spotbugs',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues)
    };
  }

  /**
   * Run PMD and parse its output
   */
  async runPMD(repoPath: string, files?: string[]): Promise<JavaToolResult> {
    const startTime = Date.now();
    let issues: JavaIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';

    try {
      // Run PMD with JSON or CSV format
      const sourceDir = files && files.length > 0 
        ? files.filter(f => f.endsWith('.java')).join(',')
        : 'src/main/java';
      
      const command = `cd ${repoPath} && pmd check -d ${sourceDir} -R rulesets/java/quickstart.xml -f json 2>&1`;
      
      const { stdout, stderr } = await exec(command, { 
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120000
      });
      
      rawOutput = stdout + stderr;
      
      // Parse JSON output
      try {
        const pmdResult = JSON.parse(stdout);
        if (pmdResult.files) {
          issues = this.parsePMDJson(pmdResult.files);
        }
      } catch (e) {
        // Try CSV format or text parsing
        issues = this.parsePMDTextOutput(rawOutput);
      }

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      
      // PMD returns non-zero if violations found
      try {
        const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const pmdResult = JSON.parse(jsonMatch[0]);
          if (pmdResult.files) {
            issues = this.parsePMDJson(pmdResult.files);
          }
        } else {
          issues = this.parsePMDTextOutput(rawOutput);
        }
      } catch {
        issues = this.parsePMDTextOutput(rawOutput);
      }
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'pmd',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues)
    };
  }

  /**
   * Run Checkstyle and parse its output
   */
  async runCheckstyle(repoPath: string, files?: string[]): Promise<JavaToolResult> {
    const startTime = Date.now();
    let issues: JavaIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';

    try {
      // Detect build tool and configuration
      const buildTool = await this.detectBuildTool(repoPath);
      let command = '';
      
      if (buildTool === 'maven') {
        command = `cd ${repoPath} && mvn checkstyle:check 2>&1`;
      } else if (buildTool === 'gradle') {
        command = `cd ${repoPath} && ./gradlew checkstyleMain 2>&1`;
      } else {
        // Standalone Checkstyle
        const sourceFiles = files && files.length > 0 
          ? files.filter(f => f.endsWith('.java')).join(' ')
          : 'src/**/*.java';
        
        // Look for checkstyle.xml or use default
        const configFile = await this.findCheckstyleConfig(repoPath);
        command = `cd ${repoPath} && java -jar checkstyle.jar -c ${configFile} ${sourceFiles} -f xml 2>&1`;
      }
      
      const { stdout, stderr } = await exec(command, { 
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120000
      });
      
      rawOutput = stdout + stderr;
      
      // Parse XML output if available
      if (rawOutput.includes('<?xml') || rawOutput.includes('<checkstyle')) {
        issues = await this.parseCheckstyleXml(rawOutput);
      } else {
        // Look for generated XML file
        const xmlPath = await this.findCheckstyleXml(repoPath);
        if (xmlPath) {
          const xmlContent = await fs.readFile(xmlPath, 'utf-8');
          issues = await this.parseCheckstyleXml(xmlContent);
        } else {
          issues = this.parseCheckstyleTextOutput(rawOutput);
        }
      }

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      issues = this.parseCheckstyleTextOutput(rawOutput);
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'checkstyle',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues)
    };
  }

  /**
   * Run OWASP Dependency Check and parse its output
   */
  async runDependencyCheck(repoPath: string): Promise<JavaToolResult> {
    const startTime = Date.now();
    let issues: JavaIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';

    try {
      const buildTool = await this.detectBuildTool(repoPath);
      let command = '';
      
      if (buildTool === 'maven') {
        command = `cd ${repoPath} && mvn org.owasp:dependency-check-maven:check -Dformat=JSON 2>&1`;
      } else if (buildTool === 'gradle') {
        command = `cd ${repoPath} && ./gradlew dependencyCheckAnalyze 2>&1`;
      } else {
        // Standalone dependency-check
        command = `cd ${repoPath} && dependency-check.sh --project "Java Project" --scan . --format JSON --out . 2>&1`;
      }
      
      const { stdout, stderr } = await exec(command, { 
        maxBuffer: 10 * 1024 * 1024,
        timeout: 300000  // 5 minutes (can be slow)
      });
      
      rawOutput = stdout + stderr;
      
      // Find and parse JSON report
      const jsonPath = await this.findDependencyCheckJson(repoPath);
      if (jsonPath) {
        const jsonContent = await fs.readFile(jsonPath, 'utf-8');
        const report = JSON.parse(jsonContent);
        issues = this.parseDependencyCheckJson(report);
      } else {
        issues = this.parseDependencyCheckTextOutput(rawOutput);
      }

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      issues = this.parseDependencyCheckTextOutput(rawOutput);
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'dependency-check',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues)
    };
  }

  /**
   * Run JUnit tests and parse results
   */
  async runJUnit(repoPath: string): Promise<JavaToolResult> {
    const startTime = Date.now();
    let issues: JavaIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';
    let coverage = {
      lines: 0,
      branches: 0,
      methods: 0,
      classes: 0,
      instructions: 0
    };

    try {
      const buildTool = await this.detectBuildTool(repoPath);
      let command = '';
      
      if (buildTool === 'maven') {
        command = `cd ${repoPath} && mvn test 2>&1`;
      } else if (buildTool === 'gradle') {
        command = `cd ${repoPath} && ./gradlew test 2>&1`;
      } else {
        // Standalone JUnit (rare)
        command = `cd ${repoPath} && java -cp ".:junit.jar:hamcrest.jar" org.junit.runner.JUnitCore 2>&1`;
      }
      
      const { stdout, stderr } = await exec(command, { 
        maxBuffer: 10 * 1024 * 1024,
        timeout: 300000  // 5 minutes
      });
      
      rawOutput = stdout + stderr;
      
      // Parse test results from XML reports
      const xmlFiles = await this.findJUnitXmlReports(repoPath);
      for (const xmlFile of xmlFiles) {
        const xmlContent = await fs.readFile(xmlFile, 'utf-8');
        const fileIssues = await this.parseJUnitXml(xmlContent);
        issues.push(...fileIssues);
      }
      
      // Try to get JaCoCo coverage if available
      const jacocoPath = await this.findJaCoCoReport(repoPath);
      if (jacocoPath) {
        const jacocoContent = await fs.readFile(jacocoPath, 'utf-8');
        coverage = await this.parseJaCoCoXml(jacocoContent);
      }
      
      // Fallback to text parsing if no XML found
      if (issues.length === 0) {
        issues = this.parseJUnitTextOutput(rawOutput);
      }

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      issues = this.parseJUnitTextOutput(rawOutput);
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'junit',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues),
      coverage
    };
  }

  /**
   * Detect build tool (Maven or Gradle)
   */
  private async detectBuildTool(repoPath: string): Promise<'maven' | 'gradle' | 'none'> {
    try {
      await fs.access(path.join(repoPath, 'pom.xml'));
      return 'maven';
    } catch {
      try {
        await fs.access(path.join(repoPath, 'build.gradle'));
        return 'gradle';
      } catch {
        try {
          await fs.access(path.join(repoPath, 'build.gradle.kts'));
          return 'gradle';
        } catch {
          return 'none';
        }
      }
    }
  }

  /**
   * Find SpotBugs XML output
   */
  private async findSpotBugsXml(repoPath: string): Promise<string | null> {
    const possiblePaths = [
      'target/spotbugsXml.xml',
      'build/reports/spotbugs/main.xml',
      'spotbugs-report.xml'
    ];
    
    for (const relativePath of possiblePaths) {
      const fullPath = path.join(repoPath, relativePath);
      try {
        await fs.access(fullPath);
        return fullPath;
      } catch {
        // Continue checking
      }
    }
    
    return null;
  }

  /**
   * Parse SpotBugs XML
   */
  private async parseSpotBugsXml(xmlContent: string): Promise<JavaIssue[]> {
    const issues: JavaIssue[] = [];
    
    try {
      const result = await parseStringPromise(xmlContent);
      const bugInstances = result.BugCollection?.BugInstance || [];
      
      for (const bug of bugInstances) {
        const sourceLines = bug.SourceLine || [];
        const primarySource = sourceLines[0] || {};
        
        issues.push({
          id: `spotbugs-${bug.$.type}-${primarySource.$.sourcefile}-${primarySource.$.start}`,
          type: this.mapSpotBugsType(bug.$.category),
          severity: this.mapSpotBugsPriority(bug.$.priority),
          file: primarySource.$.sourcepath || primarySource.$.sourcefile || 'unknown',
          line: parseInt(primarySource.$.start || '1'),
          endLine: parseInt(primarySource.$.end || primarySource.$.start || '1'),
          message: bug.LongMessage?.[0] || bug.ShortMessage?.[0] || bug.$.type,
          tool: 'spotbugs',
          category: bug.$.category,
          code: bug.$.type,
          priority: parseInt(bug.$.priority || '2')
        });
      }
    } catch (e) {
      // XML parsing failed
    }
    
    return issues;
  }

  /**
   * Parse SpotBugs text output (fallback)
   */
  private parseSpotBugsTextOutput(output: string): JavaIssue[] {
    const issues: JavaIssue[] = [];
    const lines = output.split('\n');
    
    // Pattern for SpotBugs text output
    const bugRegex = /^([HML]):\s+(.+?)\s+(.+?):(\d+)/;
    
    for (const line of lines) {
      const match = line.match(bugRegex);
      if (match) {
        issues.push({
          id: `spotbugs-${Date.now()}-${issues.length}`,
          type: 'bug',
          severity: match[1] === 'H' ? 'high' : match[1] === 'M' ? 'medium' : 'low',
          file: match[3],
          line: parseInt(match[4]),
          message: match[2],
          tool: 'spotbugs'
        });
      }
    }
    
    return issues;
  }

  /**
   * Parse PMD JSON output
   */
  private parsePMDJson(files: any[]): JavaIssue[] {
    const issues: JavaIssue[] = [];
    
    for (const file of files) {
      if (!file.violations) continue;
      
      for (const violation of file.violations) {
        issues.push({
          id: `pmd-${violation.rule}-${file.filename}-${violation.beginline}`,
          type: this.mapPMDType(violation.rule),
          severity: this.mapPMDPriority(violation.priority),
          file: file.filename,
          line: violation.beginline,
          column: violation.begincolumn,
          endLine: violation.endline,
          message: violation.description || violation.message,
          tool: 'pmd',
          category: violation.ruleset,
          code: violation.rule,
          help: violation.externalInfoUrl,
          priority: violation.priority
        });
      }
    }
    
    return issues;
  }

  /**
   * Parse PMD text output (fallback)
   */
  private parsePMDTextOutput(output: string): JavaIssue[] {
    const issues: JavaIssue[] = [];
    const lines = output.split('\n');
    
    // Pattern: file.java:line: message
    const pmdRegex = /^(.+?):(\d+):\s+(.+)$/;
    
    for (const line of lines) {
      const match = line.match(pmdRegex);
      if (match) {
        issues.push({
          id: `pmd-${Date.now()}-${issues.length}`,
          type: 'quality',
          severity: 'medium',
          file: match[1],
          line: parseInt(match[2]),
          message: match[3],
          tool: 'pmd'
        });
      }
    }
    
    return issues;
  }

  /**
   * Find Checkstyle configuration
   */
  private async findCheckstyleConfig(repoPath: string): Promise<string> {
    const possiblePaths = [
      'checkstyle.xml',
      'config/checkstyle/checkstyle.xml',
      '.checkstyle.xml',
      'google_checks.xml',
      'sun_checks.xml'
    ];
    
    for (const relativePath of possiblePaths) {
      const fullPath = path.join(repoPath, relativePath);
      try {
        await fs.access(fullPath);
        return fullPath;
      } catch {
        // Continue checking
      }
    }
    
    // Use Google style as default
    return '/google_checks.xml';
  }

  /**
   * Find Checkstyle XML output
   */
  private async findCheckstyleXml(repoPath: string): Promise<string | null> {
    const possiblePaths = [
      'target/checkstyle-result.xml',
      'build/reports/checkstyle/main.xml',
      'checkstyle-report.xml'
    ];
    
    for (const relativePath of possiblePaths) {
      const fullPath = path.join(repoPath, relativePath);
      try {
        await fs.access(fullPath);
        return fullPath;
      } catch {
        // Continue checking
      }
    }
    
    return null;
  }

  /**
   * Parse Checkstyle XML
   */
  private async parseCheckstyleXml(xmlContent: string): Promise<JavaIssue[]> {
    const issues: JavaIssue[] = [];
    
    try {
      const result = await parseStringPromise(xmlContent);
      const files = result.checkstyle?.file || [];
      
      for (const file of files) {
        const errors = file.error || [];
        for (const error of errors) {
          issues.push({
            id: `checkstyle-${error.$.source}-${file.$.name}-${error.$.line}`,
            type: 'style',
            severity: this.mapCheckstyleSeverity(error.$.severity),
            file: file.$.name,
            line: parseInt(error.$.line || '1'),
            column: parseInt(error.$.column || '0'),
            message: error.$.message,
            tool: 'checkstyle',
            category: error.$.source
          });
        }
      }
    } catch (e) {
      // XML parsing failed
    }
    
    return issues;
  }

  /**
   * Parse Checkstyle text output (fallback)
   */
  private parseCheckstyleTextOutput(output: string): JavaIssue[] {
    const issues: JavaIssue[] = [];
    const lines = output.split('\n');
    
    // Pattern: [ERROR] file.java:line:column: message
    const checkstyleRegex = /^\[(ERROR|WARN|INFO)\]\s+(.+?):(\d+)(?::(\d+))?\s*:\s+(.+)$/;
    
    for (const line of lines) {
      const match = line.match(checkstyleRegex);
      if (match) {
        issues.push({
          id: `checkstyle-${Date.now()}-${issues.length}`,
          type: 'style',
          severity: match[1] === 'ERROR' ? 'high' : match[1] === 'WARN' ? 'medium' : 'low',
          file: match[2],
          line: parseInt(match[3]),
          column: match[4] ? parseInt(match[4]) : undefined,
          message: match[5],
          tool: 'checkstyle'
        });
      }
    }
    
    return issues;
  }

  /**
   * Find Dependency Check JSON report
   */
  private async findDependencyCheckJson(repoPath: string): Promise<string | null> {
    const possiblePaths = [
      'dependency-check-report.json',
      'target/dependency-check-report.json',
      'build/reports/dependency-check-report.json'
    ];
    
    for (const relativePath of possiblePaths) {
      const fullPath = path.join(repoPath, relativePath);
      try {
        await fs.access(fullPath);
        return fullPath;
      } catch {
        // Continue checking
      }
    }
    
    return null;
  }

  /**
   * Parse Dependency Check JSON
   */
  private parseDependencyCheckJson(report: any): JavaIssue[] {
    const issues: JavaIssue[] = [];
    const dependencies = report.dependencies || [];
    
    for (const dep of dependencies) {
      if (!dep.vulnerabilities || dep.vulnerabilities.length === 0) continue;
      
      for (const vuln of dep.vulnerabilities) {
        issues.push({
          id: `dependency-check-${vuln.name}`,
          type: 'security',
          severity: this.mapCVSSSeverity(vuln.cvssv3?.baseScore || vuln.cvssv2?.score),
          file: dep.fileName || 'pom.xml',
          line: 1,
          message: `${vuln.name}: ${vuln.description || 'Security vulnerability'} in ${dep.fileName}`,
          suggestion: 'Update to a version without known vulnerabilities',
          tool: 'dependency-check',
          category: 'vulnerability',
          code: vuln.name,
          help: vuln.references?.[0]?.url
        });
      }
    }
    
    return issues;
  }

  /**
   * Parse Dependency Check text output (fallback)
   */
  private parseDependencyCheckTextOutput(output: string): JavaIssue[] {
    const issues: JavaIssue[] = [];
    const lines = output.split('\n');
    
    // Look for CVE patterns
    const cveRegex = /CVE-\d{4}-\d+/g;
    const depRegex = /(.+?\.jar)\s+\((.+?)\)/;
    
    let currentDep = '';
    
    for (const line of lines) {
      const depMatch = line.match(depRegex);
      if (depMatch) {
        currentDep = depMatch[1];
      }
      
      const cveMatches = line.match(cveRegex);
      if (cveMatches && currentDep) {
        for (const cve of cveMatches) {
          issues.push({
            id: `dependency-check-${cve}`,
            type: 'security',
            severity: 'high',
            file: currentDep || 'pom.xml',
            line: 1,
            message: `Security vulnerability ${cve} found in ${currentDep}`,
            tool: 'dependency-check',
            category: 'vulnerability',
            code: cve
          });
        }
      }
    }
    
    return issues;
  }

  /**
   * Find JUnit XML reports
   */
  private async findJUnitXmlReports(repoPath: string): Promise<string[]> {
    const reports: string[] = [];
    const possibleDirs = [
      'target/surefire-reports',
      'build/test-results/test',
      'test-results'
    ];
    
    for (const dir of possibleDirs) {
      const fullPath = path.join(repoPath, dir);
      try {
        const files = await fs.readdir(fullPath);
        for (const file of files) {
          if (file.startsWith('TEST-') && file.endsWith('.xml')) {
            reports.push(path.join(fullPath, file));
          }
        }
      } catch {
        // Directory doesn't exist
      }
    }
    
    return reports;
  }

  /**
   * Parse JUnit XML
   */
  private async parseJUnitXml(xmlContent: string): Promise<JavaIssue[]> {
    const issues: JavaIssue[] = [];
    
    try {
      const result = await parseStringPromise(xmlContent);
      const testsuites = result.testsuite || result.testsuites?.testsuite || [];
      const suites = Array.isArray(testsuites) ? testsuites : [testsuites];
      
      for (const suite of suites) {
        const testcases = suite.testcase || [];
        const cases = Array.isArray(testcases) ? testcases : [testcases];
        
        for (const testcase of cases) {
          if (testcase.failure || testcase.error) {
            const failure = testcase.failure?.[0] || testcase.error?.[0];
            issues.push({
              id: `junit-${testcase.$.classname}-${testcase.$.name}`,
              type: 'test',
              severity: 'high',
              file: testcase.$.classname?.replace(/\./g, '/') + '.java',
              line: 1,
              message: `Test failed: ${testcase.$.name} - ${failure.$.message || failure.$.type}`,
              tool: 'junit',
              category: 'test-failure',
              help: failure._ || failure.$.message
            });
          }
        }
      }
    } catch (e) {
      // XML parsing failed
    }
    
    return issues;
  }

  /**
   * Parse JUnit text output (fallback)
   */
  private parseJUnitTextOutput(output: string): JavaIssue[] {
    const issues: JavaIssue[] = [];
    const lines = output.split('\n');
    
    // Pattern for failed tests
    const failRegex = /^Tests run:\s+\d+,\s+Failures:\s+(\d+),\s+Errors:\s+(\d+)/;
    const testFailRegex = /^Failed:\s+(.+?)\.(.+?)$/;
    
    for (const line of lines) {
      const testMatch = line.match(testFailRegex);
      if (testMatch) {
        issues.push({
          id: `junit-${testMatch[1]}-${testMatch[2]}`,
          type: 'test',
          severity: 'high',
          file: testMatch[1].replace(/\./g, '/') + '.java',
          line: 1,
          message: `Test failed: ${testMatch[2]}`,
          tool: 'junit',
          category: 'test-failure'
        });
      }
    }
    
    return issues;
  }

  /**
   * Find JaCoCo coverage report
   */
  private async findJaCoCoReport(repoPath: string): Promise<string | null> {
    const possiblePaths = [
      'target/site/jacoco/jacoco.xml',
      'build/reports/jacoco/test/jacocoTestReport.xml',
      'jacoco.xml'
    ];
    
    for (const relativePath of possiblePaths) {
      const fullPath = path.join(repoPath, relativePath);
      try {
        await fs.access(fullPath);
        return fullPath;
      } catch {
        // Continue checking
      }
    }
    
    return null;
  }

  /**
   * Parse JaCoCo XML for coverage
   */
  private async parseJaCoCoXml(xmlContent: string): Promise<any> {
    const coverage = {
      lines: 0,
      branches: 0,
      methods: 0,
      classes: 0,
      instructions: 0
    };
    
    try {
      const result = await parseStringPromise(xmlContent);
      const report = result.report;
      
      if (report && report.counter) {
        for (const counter of report.counter) {
          const type = counter.$.type?.toLowerCase();
          const covered = parseInt(counter.$.covered || '0');
          const missed = parseInt(counter.$.missed || '0');
          const total = covered + missed;
          const percentage = total > 0 ? (covered / total) * 100 : 0;
          
          switch (type) {
            case 'line':
              coverage.lines = percentage;
              break;
            case 'branch':
              coverage.branches = percentage;
              break;
            case 'method':
              coverage.methods = percentage;
              break;
            case 'class':
              coverage.classes = percentage;
              break;
            case 'instruction':
              coverage.instructions = percentage;
              break;
          }
        }
      }
    } catch (e) {
      // XML parsing failed
    }
    
    return coverage;
  }

  /**
   * Map SpotBugs category to issue type
   */
  private mapSpotBugsType(category: string): JavaIssue['type'] {
    if (!category) return 'bug';
    
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('security')) return 'security';
    if (lowerCategory.includes('performance')) return 'performance';
    if (lowerCategory.includes('style')) return 'style';
    return 'bug';
  }

  /**
   * Map SpotBugs priority to severity
   */
  private mapSpotBugsPriority(priority: string): JavaIssue['severity'] {
    switch (priority) {
      case '1':
        return 'critical';
      case '2':
        return 'high';
      case '3':
        return 'medium';
      case '4':
      case '5':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Map PMD type
   */
  private mapPMDType(rule: string): JavaIssue['type'] {
    if (!rule) return 'quality';
    
    const lowerRule = rule.toLowerCase();
    if (lowerRule.includes('security')) return 'security';
    if (lowerRule.includes('performance')) return 'performance';
    if (lowerRule.includes('unused') || lowerRule.includes('dead')) return 'bug';
    return 'quality';
  }

  /**
   * Map PMD priority to severity
   */
  private mapPMDPriority(priority: number): JavaIssue['severity'] {
    switch (priority) {
      case 1:
        return 'critical';
      case 2:
        return 'high';
      case 3:
        return 'medium';
      case 4:
      case 5:
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Map Checkstyle severity
   */
  private mapCheckstyleSeverity(severity: string): JavaIssue['severity'] {
    switch (severity?.toLowerCase()) {
      case 'error':
        return 'high';
      case 'warning':
        return 'medium';
      case 'info':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Map CVSS score to severity
   */
  private mapCVSSSeverity(score?: number): JavaIssue['severity'] {
    if (!score) return 'high';
    
    if (score >= 9.0) return 'critical';
    if (score >= 7.0) return 'high';
    if (score >= 4.0) return 'medium';
    return 'low';
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(issues: JavaIssue[]) {
    return {
      total: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };
  }
}

export default JavaToolParser;