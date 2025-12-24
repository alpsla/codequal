/**
 * Python Performance Tool Runner
 *
 * Static performance analysis for Python code:
 * - Ruff PERF rules: Performance anti-patterns detection
 * - McCabe complexity: Cyclomatic complexity analysis
 * - Memory leak patterns: Static detection of common memory leaks
 *
 * NOTE: Runtime profilers (py-spy, Scalene, memray) are NOT included
 * because they require actual code execution, which is outside the scope
 * of static PR analysis.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface PythonPerformanceIssue {
    tool: 'ruff-perf' | 'radon' | 'memory-pattern';
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
 * Ruff PERF rules reference:
 * - PERF101: Unnecessary list() call in for loop
 * - PERF102: When using for loop, avoid using dict.keys(), dict.values(), dict.items() when unnecessary
 * - PERF203: try-except within a loop
 * - PERF401: Use a list comprehension instead of a for loop with append
 * - PERF402: Use list or tuple unpacking
 * - PERF403: Use a dict comprehension instead of a for loop
 */
const RUFF_PERF_RULES = [
    'PERF',    // All performance rules
    'C901',    // McCabe complexity
    'PLR0911', // Too many return statements
    'PLR0912', // Too many branches
    'PLR0913', // Too many arguments
    'PLR0915', // Too many statements
];

export class PythonPerformanceRunner {
    /**
     * Run Ruff with performance-specific rules
     */
    async runRuffPerf(repoPath: string): Promise<PythonPerformanceIssue[]> {
        try {
            console.log('[Ruff Perf] Running Python performance analysis...');

            // Run Ruff with only performance-related rules
            const ruleSelect = RUFF_PERF_RULES.map(r => `--select=${r}`).join(' ');
            const { stdout } = await execAsync(
                `ruff check ${ruleSelect} --output-format=json ${repoPath}`,
                { timeout: 60000, maxBuffer: 10 * 1024 * 1024 }
            );

            return this.parseRuffPerfResults(stdout);
        } catch (error: any) {
            // Ruff returns non-zero when issues found
            if (error.stdout) {
                try {
                    return this.parseRuffPerfResults(error.stdout);
                } catch (parseError) {
                    console.warn('[Ruff Perf] Failed to parse results:', parseError);
                }
            }
            console.warn('[Ruff Perf] Failed:', error.message);
            return [];
        }
    }

    /**
     * Run Radon for complexity analysis
     * Radon provides more detailed complexity metrics than Ruff
     */
    async runRadonComplexity(repoPath: string): Promise<PythonPerformanceIssue[]> {
        try {
            console.log('[Radon] Running complexity analysis...');

            // Run radon cc (cyclomatic complexity)
            const { stdout } = await execAsync(
                `radon cc ${repoPath} -s -j`,
                { timeout: 60000, maxBuffer: 10 * 1024 * 1024 }
            );

            return this.parseRadonResults(stdout);
        } catch (error: any) {
            console.warn('[Radon] Failed:', error.message);
            return [];
        }
    }

    /**
     * Run static memory leak pattern detection
     * Checks for common patterns that may cause memory leaks
     */
    async runMemoryLeakPatterns(repoPath: string): Promise<PythonPerformanceIssue[]> {
        try {
            console.log('[Memory Patterns] Detecting potential memory leaks...');

            const issues: PythonPerformanceIssue[] = [];

            // Find Python files
            const { stdout: filesOutput } = await execAsync(
                `find ${repoPath} -name "*.py" -type f | grep -v __pycache__ | grep -v ".venv" | head -200`,
                { maxBuffer: 10 * 1024 * 1024 }
            );

            const files = filesOutput.trim().split('\n').filter(f => f);

            for (const file of files) {
                try {
                    const content = fs.readFileSync(file, 'utf-8');
                    const fileIssues = this.detectMemoryLeakPatterns(content, file);
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
     * Detect common memory leak patterns in Python code
     */
    private detectMemoryLeakPatterns(content: string, file: string): PythonPerformanceIssue[] {
        const issues: PythonPerformanceIssue[] = [];
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            const lineNum = index + 1;

            // Pattern 1: Global mutable default arguments
            // def foo(items=[]):  # This list is shared across all calls!
            const mutableDefaultMatch = line.match(/def\s+\w+\([^)]*=\s*(\[\]|\{\})/);
            if (mutableDefaultMatch) {
                issues.push({
                    tool: 'memory-pattern',
                    rule: 'mutable-default-argument',
                    severity: 'high',
                    message: `Mutable default argument detected. This can cause unexpected behavior as the same object is shared across function calls.`,
                    file,
                    line: lineNum
                });
            }

            // Pattern 2: Circular references in __del__
            if (line.includes('def __del__') && content.includes('self.')) {
                const hasCircularRef = content.includes('self.parent') ||
                                       content.includes('self.children') ||
                                       content.includes('self._callbacks');
                if (hasCircularRef) {
                    issues.push({
                        tool: 'memory-pattern',
                        rule: 'circular-reference-in-del',
                        severity: 'medium',
                        message: `Potential circular reference in __del__ method. This may prevent garbage collection.`,
                        file,
                        line: lineNum
                    });
                }
            }

            // Pattern 3: Unclosed resources (without context manager)
            const unclosedResourceMatch = line.match(/(\w+)\s*=\s*(open\(|socket\.socket\(|sqlite3\.connect\()/);
            if (unclosedResourceMatch) {
                // Check if 'with' statement is used
                const prevLines = lines.slice(Math.max(0, index - 2), index + 1).join('\n');
                if (!prevLines.includes('with ')) {
                    issues.push({
                        tool: 'memory-pattern',
                        rule: 'unclosed-resource',
                        severity: 'medium',
                        message: `Resource opened without context manager (with statement). May not be properly closed.`,
                        file,
                        line: lineNum
                    });
                }
            }

            // Pattern 4: Large object creation in loops
            const loopMatch = line.match(/^\s*(for|while)\s+/);
            if (loopMatch) {
                // Check next few lines for large object creation
                const loopBody = lines.slice(index + 1, index + 10).join('\n');
                if (loopBody.match(/\[\s*\d{4,}\s*\]/) || // Large list literals
                    loopBody.match(/range\(\s*\d{6,}\s*\)/) || // Very large ranges
                    loopBody.match(/\*\s*\d{4,}/)) { // Large multiplications
                    issues.push({
                        tool: 'memory-pattern',
                        rule: 'large-object-in-loop',
                        severity: 'high',
                        message: `Large object creation inside loop. Consider moving outside loop or using generators.`,
                        file,
                        line: lineNum
                    });
                }
            }

            // Pattern 5: String concatenation in loops
            if (line.match(/^\s*(for|while)\s+/)) {
                const loopBody = lines.slice(index + 1, index + 15).join('\n');
                if (loopBody.match(/\w+\s*\+=\s*['"]/)) {
                    issues.push({
                        tool: 'memory-pattern',
                        rule: 'string-concat-in-loop',
                        severity: 'medium',
                        message: `String concatenation in loop. Consider using join() or StringIO for better performance.`,
                        file,
                        line: lineNum
                    });
                }
            }
        });

        return issues;
    }

    /**
     * Parse Ruff performance rule results
     */
    private parseRuffPerfResults(output: string): PythonPerformanceIssue[] {
        const issues: PythonPerformanceIssue[] = [];

        try {
            const results = JSON.parse(output);

            for (const result of results) {
                const severity = this.getRuffSeverity(result.code);
                issues.push({
                    tool: 'ruff-perf',
                    rule: result.code,
                    severity,
                    message: result.message,
                    file: result.filename,
                    line: result.location?.row || 1,
                    metric: result.code.startsWith('C') ? {
                        name: 'complexity',
                        value: this.extractComplexityValue(result.message),
                        threshold: 10
                    } : undefined
                });
            }
        } catch (error) {
            console.error('[Ruff Perf] Failed to parse results:', error);
        }

        return issues;
    }

    /**
     * Parse Radon complexity results
     */
    private parseRadonResults(output: string): PythonPerformanceIssue[] {
        const issues: PythonPerformanceIssue[] = [];

        try {
            const results = JSON.parse(output);

            // Radon outputs { "file.py": [{ "name": "func", "complexity": 15, ... }] }
            for (const [file, functions] of Object.entries(results)) {
                for (const func of functions as any[]) {
                    // Only report high complexity (grade C or worse)
                    if (func.complexity > 10) {
                        const severity = func.complexity > 20 ? 'high' :
                                        func.complexity > 15 ? 'medium' : 'low';
                        issues.push({
                            tool: 'radon',
                            rule: 'high-complexity',
                            severity,
                            message: `Function '${func.name}' has complexity ${func.complexity} (grade ${func.rank}). Consider refactoring.`,
                            file,
                            line: func.lineno,
                            metric: {
                                name: 'cyclomatic-complexity',
                                value: func.complexity,
                                threshold: 10
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.error('[Radon] Failed to parse results:', error);
        }

        return issues;
    }

    /**
     * Get severity based on Ruff rule code
     */
    private getRuffSeverity(code: string): 'critical' | 'high' | 'medium' | 'low' {
        // C901: Complexity - severity based on threshold
        if (code === 'C901') return 'high';

        // PERF rules are generally medium severity
        if (code.startsWith('PERF')) return 'medium';

        // PLR rules (too many X) are low severity
        if (code.startsWith('PLR')) return 'low';

        return 'medium';
    }

    /**
     * Extract complexity value from message like "is too complex (15)"
     */
    private extractComplexityValue(message: string): number {
        const match = message.match(/\((\d+)\)/);
        return match ? parseInt(match[1]) : 0;
    }

    /**
     * Run all Python performance analysis tools
     */
    async runAll(repoPath: string): Promise<PythonPerformanceIssue[]> {
        const allIssues: PythonPerformanceIssue[] = [];

        // Run all tools in parallel
        const [ruffIssues, radonIssues, memoryIssues] = await Promise.all([
            this.runRuffPerf(repoPath),
            this.runRadonComplexity(repoPath),
            this.runMemoryLeakPatterns(repoPath)
        ]);

        allIssues.push(...ruffIssues, ...radonIssues, ...memoryIssues);

        console.log(`[Python Performance] Total issues: ${allIssues.length}`);
        return allIssues;
    }
}
