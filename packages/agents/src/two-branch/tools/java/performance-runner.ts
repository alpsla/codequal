/**
 * Java Performance Tool Runner
 *
 * Static performance analysis for Java code:
 * - PMD Performance rules: Performance anti-patterns detection
 * - SpotBugs Performance: Performance-related bugs detection
 * - Checkstyle Metrics: Complexity and maintainability metrics
 *
 * NOTE: Runtime profilers (JMH, VisualVM, JProfiler) are NOT included
 * because they require actual code execution, which is outside the scope
 * of static PR analysis.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface JavaPerformanceIssue {
    tool: 'pmd-perf' | 'spotbugs-perf' | 'checkstyle-metrics' | 'memory-pattern';
    rule: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    file: string;
    line: number;
    metric?: {
        name: string;
        value: number;
        threshold: number;
    };
}

/**
 * PMD Performance rules reference:
 * - AvoidInstantiatingObjectsInLoops
 * - AvoidCallingFinalize
 * - AvoidUsingShortType
 * - BooleanInstantiation
 * - ByteInstantiation
 * - InefficientEmptyStringCheck
 * - InefficientStringBuffering
 * - IntegerInstantiation
 * - LongInstantiation
 * - OptimizableToArrayCall
 * - ShortInstantiation
 * - SimplifyStartsWith
 * - StringInstantiation
 * - StringToString
 * - TooFewBranchesForASwitchStatement
 * - UseArrayListInsteadOfVector
 * - UseArraysAsList
 * - UseIndexOfChar
 * - UselessStringValueOf
 * - UseStringBufferForStringAppends
 */
const PMD_PERF_RULES = [
    'category/java/performance.xml'
];

export class JavaPerformanceRunner {
    /**
     * Run PMD with performance-specific rules
     */
    async runPMDPerf(repoPath: string): Promise<JavaPerformanceIssue[]> {
        try {
            console.log('[PMD Perf] Running Java performance analysis...');

            // Check if PMD is available
            const pmdPath = process.env.PMD_PATH || 'pmd';

            // Build PMD command with performance rules
            const rulesConfig = PMD_PERF_RULES.join(',');
            const srcDir = this.findJavaSourceDir(repoPath);

            if (!srcDir) {
                console.log('[PMD Perf] No Java source directory found');
                return [];
            }

            const { stdout } = await execAsync(
                `${pmdPath} check -d "${srcDir}" -R ${rulesConfig} -f json --no-cache`,
                { timeout: 120000, maxBuffer: 50 * 1024 * 1024 }
            );

            return this.parsePMDResults(stdout);
        } catch (error: any) {
            // PMD returns non-zero when issues found
            if (error.stdout) {
                try {
                    return this.parsePMDResults(error.stdout);
                } catch (parseError) {
                    console.warn('[PMD Perf] Failed to parse results:', parseError);
                }
            }
            console.warn('[PMD Perf] Failed:', error.message);
            return [];
        }
    }

    /**
     * Run SpotBugs for performance-related bugs
     */
    async runSpotBugsPerf(repoPath: string): Promise<JavaPerformanceIssue[]> {
        try {
            console.log('[SpotBugs Perf] Running performance bug detection...');

            const spotbugsPath = process.env.SPOTBUGS_PATH || 'spotbugs';
            const classDir = this.findJavaClassDir(repoPath);

            if (!classDir) {
                console.log('[SpotBugs Perf] No compiled Java classes found');
                return [];
            }

            // Run SpotBugs with performance detector
            const { stdout } = await execAsync(
                `${spotbugsPath} -textui -xml:withMessages -include performance.xml "${classDir}"`,
                { timeout: 180000, maxBuffer: 50 * 1024 * 1024 }
            );

            return this.parseSpotBugsResults(stdout);
        } catch (error: any) {
            console.warn('[SpotBugs Perf] Failed:', error.message);
            return [];
        }
    }

    /**
     * Run Checkstyle for complexity metrics
     */
    async runCheckstyleMetrics(repoPath: string): Promise<JavaPerformanceIssue[]> {
        try {
            console.log('[Checkstyle] Running complexity metrics...');

            const checkstylePath = process.env.CHECKSTYLE_PATH || 'checkstyle';
            const srcDir = this.findJavaSourceDir(repoPath);

            if (!srcDir) {
                console.log('[Checkstyle] No Java source directory found');
                return [];
            }

            // Create a temp config with metrics checks
            const metricsConfig = this.createMetricsConfig(repoPath);

            const { stdout } = await execAsync(
                `${checkstylePath} -c "${metricsConfig}" -f xml "${srcDir}"`,
                { timeout: 120000, maxBuffer: 50 * 1024 * 1024 }
            );

            return this.parseCheckstyleResults(stdout);
        } catch (error: any) {
            // Checkstyle returns non-zero when issues found
            if (error.stdout) {
                try {
                    return this.parseCheckstyleResults(error.stdout);
                } catch (parseError) {
                    console.warn('[Checkstyle] Failed to parse results:', parseError);
                }
            }
            console.warn('[Checkstyle] Failed:', error.message);
            return [];
        }
    }

    /**
     * Run static memory pattern detection
     */
    async runMemoryPatternDetection(repoPath: string): Promise<JavaPerformanceIssue[]> {
        try {
            console.log('[Memory Patterns] Detecting potential memory leaks...');

            const issues: JavaPerformanceIssue[] = [];
            const srcDir = this.findJavaSourceDir(repoPath);

            if (!srcDir) {
                return [];
            }

            // Find Java files
            const { stdout: filesOutput } = await execAsync(
                `find "${srcDir}" -name "*.java" -type f | head -200`,
                { maxBuffer: 10 * 1024 * 1024 }
            );

            const files = filesOutput.trim().split('\n').filter(f => f);

            for (const file of files) {
                try {
                    const content = fs.readFileSync(file, 'utf-8');
                    const fileIssues = this.detectMemoryLeakPatterns(content, file, repoPath);
                    issues.push(...fileIssues);
                } catch {
                    // Skip unreadable files
                }
            }

            console.log(`[Memory Patterns] Found ${issues.length} potential issues`);
            return issues;
        } catch (error: any) {
            console.warn('[Memory Patterns] Failed:', error.message);
            return [];
        }
    }

    /**
     * Detect common memory leak patterns in Java code
     */
    private detectMemoryLeakPatterns(content: string, file: string, repoPath: string): JavaPerformanceIssue[] {
        const issues: JavaPerformanceIssue[] = [];
        const lines = content.split('\n');
        const relativePath = file.replace(repoPath + '/', '');

        lines.forEach((line, index) => {
            const lineNum = index + 1;

            // Pattern 1: Unclosed resources (without try-with-resources)
            const resourceMatch = line.match(/new\s+(FileInputStream|FileOutputStream|BufferedReader|Connection|PreparedStatement|ResultSet)\s*\(/);
            if (resourceMatch) {
                // Check if in try-with-resources
                const prevLines = lines.slice(Math.max(0, index - 3), index + 1).join('\n');
                if (!prevLines.includes('try (') && !prevLines.includes('try(')) {
                    issues.push({
                        tool: 'memory-pattern',
                        rule: 'unclosed-resource',
                        severity: 'high',
                        message: `Resource ${resourceMatch[1]} opened without try-with-resources. May cause resource leak.`,
                        file: relativePath,
                        line: lineNum
                    });
                }
            }

            // Pattern 2: Static collections that grow unbounded
            if (line.match(/static\s+.*(?:List|Map|Set|Collection)\s*<.*>\s+\w+\s*=\s*new/)) {
                issues.push({
                    tool: 'memory-pattern',
                    rule: 'static-collection-growth',
                    severity: 'medium',
                    message: `Static collection may grow unbounded and cause memory leak. Consider using bounded cache.`,
                    file: relativePath,
                    line: lineNum
                });
            }

            // Pattern 3: Inner class holding outer reference
            if (line.match(/class\s+\w+\s+implements\s+Runnable/) ||
                line.match(/new\s+Thread\s*\(\s*new\s+Runnable/)) {
                // Check if it's a non-static inner class
                const classContext = lines.slice(Math.max(0, index - 20), index).join('\n');
                if (classContext.match(/class\s+\w+\s*\{/) && !line.includes('static')) {
                    issues.push({
                        tool: 'memory-pattern',
                        rule: 'inner-class-reference',
                        severity: 'medium',
                        message: `Non-static inner class holds reference to outer class. May prevent GC of outer instance.`,
                        file: relativePath,
                        line: lineNum
                    });
                }
            }

            // Pattern 4: String concatenation in loops
            if (line.match(/^\s*(for|while)\s*\(/)) {
                const loopBody = lines.slice(index + 1, Math.min(lines.length, index + 20)).join('\n');
                if (loopBody.match(/\w+\s*\+=\s*"/)) {
                    issues.push({
                        tool: 'memory-pattern',
                        rule: 'string-concat-in-loop',
                        severity: 'medium',
                        message: `String concatenation in loop. Use StringBuilder for better performance.`,
                        file: relativePath,
                        line: lineNum
                    });
                }
            }

            // Pattern 5: Creating objects in tight loops
            if (line.match(/^\s*(for|while)\s*\(/)) {
                const loopBody = lines.slice(index + 1, Math.min(lines.length, index + 10)).join('\n');
                const newMatches = loopBody.match(/new\s+\w+\s*\(/g);
                if (newMatches && newMatches.length > 3) {
                    issues.push({
                        tool: 'memory-pattern',
                        rule: 'object-creation-in-loop',
                        severity: 'medium',
                        message: `Multiple object creations inside loop. Consider object pooling or reuse.`,
                        file: relativePath,
                        line: lineNum
                    });
                }
            }

            // Pattern 6: Large method body (complexity indicator)
            if (line.match(/^\s*(public|private|protected)?\s*\w+\s+\w+\s*\([^)]*\)\s*\{?\s*$/)) {
                // Count lines until closing brace
                let braceCount = 1;
                let methodLines = 0;
                for (let i = index + 1; i < lines.length && braceCount > 0; i++) {
                    braceCount += (lines[i].match(/\{/g) || []).length;
                    braceCount -= (lines[i].match(/\}/g) || []).length;
                    methodLines++;
                }
                if (methodLines > 100) {
                    issues.push({
                        tool: 'memory-pattern',
                        rule: 'large-method',
                        severity: 'low',
                        message: `Method has ${methodLines} lines. Large methods are harder to optimize and test.`,
                        file: relativePath,
                        line: lineNum,
                        metric: {
                            name: 'method-lines',
                            value: methodLines,
                            threshold: 50
                        }
                    });
                }
            }
        });

        return issues;
    }

    /**
     * Parse PMD JSON results
     */
    private parsePMDResults(output: string): JavaPerformanceIssue[] {
        const issues: JavaPerformanceIssue[] = [];

        try {
            const results = JSON.parse(output);

            for (const file of results.files || []) {
                for (const violation of file.violations || []) {
                    issues.push({
                        tool: 'pmd-perf',
                        rule: violation.rule,
                        severity: this.mapPMDPriority(violation.priority),
                        message: violation.description || violation.message,
                        file: file.filename,
                        line: violation.beginline || violation.beginLine || 1
                    });
                }
            }
        } catch (error) {
            console.error('[PMD Perf] Failed to parse results:', error);
        }

        return issues;
    }

    /**
     * Parse SpotBugs XML results
     */
    private parseSpotBugsResults(output: string): JavaPerformanceIssue[] {
        const issues: JavaPerformanceIssue[] = [];

        try {
            // Simple XML parsing for SpotBugs output
            const bugPattern = /<BugInstance[^>]*type="([^"]*)"[^>]*priority="(\d)"[^>]*>/g;
            const filePattern = /<SourceLine[^>]*sourcepath="([^"]*)"[^>]*start="(\d+)"/g;

            let match;
            while ((match = bugPattern.exec(output)) !== null) {
                const bugType = match[1];
                const priority = parseInt(match[2]);

                // Find the corresponding source line
                const sourceMatch = filePattern.exec(output);
                if (sourceMatch) {
                    issues.push({
                        tool: 'spotbugs-perf',
                        rule: bugType,
                        severity: this.mapSpotBugsPriority(priority),
                        message: `SpotBugs performance issue: ${bugType}`,
                        file: sourceMatch[1],
                        line: parseInt(sourceMatch[2])
                    });
                }
            }
        } catch (error) {
            console.error('[SpotBugs Perf] Failed to parse results:', error);
        }

        return issues;
    }

    /**
     * Parse Checkstyle XML results
     */
    private parseCheckstyleResults(output: string): JavaPerformanceIssue[] {
        const issues: JavaPerformanceIssue[] = [];

        try {
            // Simple XML parsing for Checkstyle output
            const errorPattern = /<error[^>]*line="(\d+)"[^>]*severity="([^"]*)"[^>]*message="([^"]*)"/g;
            const filePattern = /<file[^>]*name="([^"]*)"/g;

            let currentFile = '';
            let match;

            // First, get file names
            const fileMatches: string[] = [];
            while ((match = filePattern.exec(output)) !== null) {
                fileMatches.push(match[1]);
            }

            // Then parse errors
            const sections = output.split('<file');

            for (let i = 1; i < sections.length; i++) {
                currentFile = fileMatches[i - 1] || 'unknown';
                const section = sections[i];
                const errorPattern2 = /line="(\d+)"[^>]*severity="([^"]*)"[^>]*message="([^"]*)"/g;

                while ((match = errorPattern2.exec(section)) !== null) {
                    issues.push({
                        tool: 'checkstyle-metrics',
                        rule: 'complexity-metric',
                        severity: this.mapCheckstyleSeverity(match[2]),
                        message: match[3],
                        file: currentFile,
                        line: parseInt(match[1])
                    });
                }
            }
        } catch (error) {
            console.error('[Checkstyle] Failed to parse results:', error);
        }

        return issues;
    }

    /**
     * Find Java source directory
     */
    private findJavaSourceDir(repoPath: string): string | null {
        const possibleDirs = [
            path.join(repoPath, 'src/main/java'),
            path.join(repoPath, 'src'),
            path.join(repoPath, 'java'),
            repoPath
        ];

        for (const dir of possibleDirs) {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir, { recursive: true }) as string[];
                if (files.some(f => f.endsWith('.java'))) {
                    return dir;
                }
            }
        }

        return null;
    }

    /**
     * Find Java compiled class directory
     */
    private findJavaClassDir(repoPath: string): string | null {
        const possibleDirs = [
            path.join(repoPath, 'target/classes'),
            path.join(repoPath, 'build/classes'),
            path.join(repoPath, 'out'),
            path.join(repoPath, 'bin')
        ];

        for (const dir of possibleDirs) {
            if (fs.existsSync(dir)) {
                return dir;
            }
        }

        return null;
    }

    /**
     * Create Checkstyle metrics config
     */
    private createMetricsConfig(repoPath: string): string {
        const configPath = path.join(repoPath, '.checkstyle-metrics.xml');
        const config = `<?xml version="1.0"?>
<!DOCTYPE module PUBLIC "-//Checkstyle//DTD Checkstyle Configuration 1.3//EN"
        "https://checkstyle.org/dtds/configuration_1_3.dtd">
<module name="Checker">
  <module name="TreeWalker">
    <module name="CyclomaticComplexity">
      <property name="max" value="10"/>
    </module>
    <module name="MethodLength">
      <property name="max" value="50"/>
    </module>
    <module name="ParameterNumber">
      <property name="max" value="5"/>
    </module>
    <module name="ClassDataAbstractionCoupling">
      <property name="max" value="10"/>
    </module>
    <module name="ClassFanOutComplexity">
      <property name="max" value="20"/>
    </module>
    <module name="NPathComplexity">
      <property name="max" value="200"/>
    </module>
  </module>
</module>`;

        fs.writeFileSync(configPath, config);
        return configPath;
    }

    /**
     * Map PMD priority to severity
     */
    private mapPMDPriority(priority: number): 'critical' | 'high' | 'medium' | 'low' {
        switch (priority) {
            case 1: return 'critical';
            case 2: return 'high';
            case 3: return 'medium';
            default: return 'low';
        }
    }

    /**
     * Map SpotBugs priority to severity
     */
    private mapSpotBugsPriority(priority: number): 'critical' | 'high' | 'medium' | 'low' {
        switch (priority) {
            case 1: return 'high';
            case 2: return 'medium';
            default: return 'low';
        }
    }

    /**
     * Map Checkstyle severity
     */
    private mapCheckstyleSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
        switch (severity.toLowerCase()) {
            case 'error': return 'high';
            case 'warning': return 'medium';
            default: return 'low';
        }
    }

    /**
     * Run all Java performance analysis tools
     */
    async runAll(repoPath: string): Promise<JavaPerformanceIssue[]> {
        const allIssues: JavaPerformanceIssue[] = [];

        // Run tools in parallel where possible
        const [pmdIssues, memoryIssues] = await Promise.all([
            this.runPMDPerf(repoPath),
            this.runMemoryPatternDetection(repoPath)
        ]);

        allIssues.push(...pmdIssues, ...memoryIssues);

        // Note: SpotBugs and Checkstyle require compiled classes
        // They can be run if target/classes exists
        const classDir = this.findJavaClassDir(repoPath);
        if (classDir) {
            const [spotbugsIssues, checkstyleIssues] = await Promise.all([
                this.runSpotBugsPerf(repoPath),
                this.runCheckstyleMetrics(repoPath)
            ]);
            allIssues.push(...spotbugsIssues, ...checkstyleIssues);
        }

        console.log(`[Java Performance] Total issues: ${allIssues.length}`);
        return allIssues;
    }
}
