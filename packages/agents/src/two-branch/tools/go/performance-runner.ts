/**
 * Go Performance Tool Runner
 *
 * Static performance analysis for Go code:
 * - staticcheck: Performance-related static analysis (SA* rules)
 * - golangci-lint: Performance linters (prealloc, ineffassign, etc.)
 * - Memory pattern detection: Static detection of common memory issues
 *
 * NOTE: Runtime profilers (pprof, go tool trace) are NOT included
 * because they require actual code execution, which is outside the scope
 * of static PR analysis.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface GoPerformanceIssue {
    tool: 'staticcheck-perf' | 'golangci-perf' | 'memory-pattern';
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
 * Staticcheck SA* rules relevant to performance:
 * - SA6002: Argument passed to sync.Pool.Put can't be garbage collected
 * - SA6003: fmt.Sprintf with single %s or %v argument is inefficient
 * - SA6005: Inefficient string comparison with strings.ToLower or strings.ToUpper
 *
 * Also useful S* rules:
 * - S1019: Simplify make call by omitting redundant arguments
 * - S1023: Omit redundant control flow
 */
const STATICCHECK_PERF_CHECKS = [
    'SA6002',  // sync.Pool inefficiency
    'SA6003',  // Sprintf inefficiency
    'SA6005',  // String comparison inefficiency
    'SA1015',  // Wrong time format
    'SA9003',  // Empty body in if/else
];

/**
 * golangci-lint performance-related linters
 */
const GOLANGCI_PERF_LINTERS = [
    'prealloc',      // Find slice declarations that could be preallocated
    'ineffassign',   // Detect ineffectual assignments
    'staticcheck',   // Subset of staticcheck with perf rules
    'gocritic',      // Performance diagnostics
    'unconvert',     // Unnecessary type conversions
    'maligned',      // Detect structs that could be smaller if fields were sorted
    'bodyclose',     // HTTP body close
];

export class GoPerformanceRunner {
    /**
     * Run staticcheck with performance-specific rules
     */
    async runStaticcheckPerf(repoPath: string): Promise<GoPerformanceIssue[]> {
        try {
            console.log('[Staticcheck Perf] Running Go performance analysis...');

            // Check if this is a Go module
            const goModPath = path.join(repoPath, 'go.mod');
            if (!fs.existsSync(goModPath)) {
                console.log('[Staticcheck Perf] No go.mod found, skipping');
                return [];
            }

            // Run staticcheck with performance checks
            const checks = STATICCHECK_PERF_CHECKS.join(',');
            const { stdout } = await execAsync(
                `staticcheck -checks=${checks} -f json ./...`,
                { cwd: repoPath, timeout: 120000, maxBuffer: 50 * 1024 * 1024 }
            );

            return this.parseStaticcheckResults(stdout, repoPath);
        } catch (error: any) {
            // staticcheck returns non-zero when issues found
            if (error.stdout) {
                try {
                    return this.parseStaticcheckResults(error.stdout, repoPath);
                } catch (parseError) {
                    console.warn('[Staticcheck Perf] Failed to parse results:', parseError);
                }
            }
            console.warn('[Staticcheck Perf] Failed:', error.message);
            return [];
        }
    }

    /**
     * Run golangci-lint with performance linters
     */
    async runGolangciPerf(repoPath: string): Promise<GoPerformanceIssue[]> {
        try {
            console.log('[golangci-lint Perf] Running performance linters...');

            // Check if this is a Go module
            const goModPath = path.join(repoPath, 'go.mod');
            if (!fs.existsSync(goModPath)) {
                console.log('[golangci-lint Perf] No go.mod found, skipping');
                return [];
            }

            // Run golangci-lint with performance linters only
            const linters = GOLANGCI_PERF_LINTERS.map(l => `--enable ${l}`).join(' ');
            const { stdout } = await execAsync(
                `golangci-lint run --out-format json --disable-all ${linters} ./...`,
                { cwd: repoPath, timeout: 180000, maxBuffer: 50 * 1024 * 1024 }
            );

            return this.parseGolangciResults(stdout, repoPath);
        } catch (error: any) {
            // golangci-lint returns non-zero when issues found
            if (error.stdout) {
                try {
                    return this.parseGolangciResults(error.stdout, repoPath);
                } catch (parseError) {
                    console.warn('[golangci-lint Perf] Failed to parse results:', parseError);
                }
            }
            console.warn('[golangci-lint Perf] Failed:', error.message);
            return [];
        }
    }

    /**
     * Run static memory pattern detection
     */
    async runMemoryPatternDetection(repoPath: string): Promise<GoPerformanceIssue[]> {
        try {
            console.log('[Memory Patterns] Detecting potential memory issues...');

            const issues: GoPerformanceIssue[] = [];

            // Find Go files
            const { stdout: filesOutput } = await execAsync(
                `find "${repoPath}" -name "*.go" -type f | grep -v _test.go | grep -v vendor | head -200`,
                { maxBuffer: 10 * 1024 * 1024 }
            );

            const files = filesOutput.trim().split('\n').filter(f => f);

            for (const file of files) {
                try {
                    const content = fs.readFileSync(file, 'utf-8');
                    const fileIssues = this.detectMemoryPatterns(content, file, repoPath);
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
     * Detect common memory/performance patterns in Go code
     */
    private detectMemoryPatterns(content: string, file: string, repoPath: string): GoPerformanceIssue[] {
        const issues: GoPerformanceIssue[] = [];
        const lines = content.split('\n');
        const relativePath = file.replace(repoPath + '/', '');

        lines.forEach((line, index) => {
            const lineNum = index + 1;

            // Pattern 1: String concatenation in loops
            if (line.match(/^\s*for\s+/)) {
                const loopBody = lines.slice(index + 1, Math.min(lines.length, index + 15)).join('\n');
                if (loopBody.match(/\w+\s*\+=\s*"/)) {
                    issues.push({
                        tool: 'memory-pattern',
                        rule: 'string-concat-in-loop',
                        severity: 'medium',
                        message: `String concatenation in loop. Use strings.Builder for better performance.`,
                        file: relativePath,
                        line: lineNum
                    });
                }
            }

            // Pattern 2: Append without preallocation
            if (line.match(/make\s*\(\s*\[\s*\]\s*\w+\s*,\s*0\s*\)/)) {
                const funcBody = lines.slice(index, Math.min(lines.length, index + 20)).join('\n');
                if (funcBody.match(/append\s*\(/)) {
                    issues.push({
                        tool: 'memory-pattern',
                        rule: 'no-prealloc',
                        severity: 'low',
                        message: `Slice created with 0 capacity then appended to. Consider preallocating with known capacity.`,
                        file: relativePath,
                        line: lineNum
                    });
                }
            }

            // Pattern 3: defer in loop
            if (line.match(/^\s*for\s+/)) {
                const loopBody = lines.slice(index + 1, Math.min(lines.length, index + 20)).join('\n');
                if (loopBody.match(/^\s*defer\s+/m)) {
                    issues.push({
                        tool: 'memory-pattern',
                        rule: 'defer-in-loop',
                        severity: 'high',
                        message: `defer inside loop. Deferred functions accumulate until the enclosing function returns, causing memory pressure.`,
                        file: relativePath,
                        line: lineNum
                    });
                }
            }

            // Pattern 4: Large struct passed by value
            const funcMatch = line.match(/func\s+\w+\s*\([^)]*(\w+)\s+(\w+)[^)]*\)/);
            if (funcMatch) {
                // Check if it's a large struct being passed by value (heuristic)
                const paramType = funcMatch[2];
                if (!paramType.startsWith('*') && !['int', 'string', 'bool', 'float64', 'error', 'interface'].includes(paramType)) {
                    const funcBody = lines.slice(index + 1, Math.min(lines.length, index + 30)).join('\n');
                    // If the function is complex (many lines), suggest passing by pointer
                    if (funcBody.split('\n').length > 15) {
                        issues.push({
                            tool: 'memory-pattern',
                            rule: 'large-struct-by-value',
                            severity: 'low',
                            message: `Parameter '${funcMatch[1]}' of type '${paramType}' passed by value. Consider passing by pointer if struct is large.`,
                            file: relativePath,
                            line: lineNum
                        });
                    }
                }
            }

            // Pattern 5: Goroutine without context
            if (line.match(/go\s+func\s*\(/)) {
                const goroutineBody = lines.slice(index, Math.min(lines.length, index + 10)).join('\n');
                if (!goroutineBody.includes('context') && !goroutineBody.includes('ctx')) {
                    issues.push({
                        tool: 'memory-pattern',
                        rule: 'goroutine-without-context',
                        severity: 'medium',
                        message: `Goroutine started without context. Consider passing context for cancellation and timeout.`,
                        file: relativePath,
                        line: lineNum
                    });
                }
            }

            // Pattern 6: Map without size hint
            if (line.match(/make\s*\(\s*map\s*\[/)) {
                if (!line.match(/make\s*\(\s*map\s*\[[^\]]+\]\s*\w+\s*,\s*\d+\s*\)/)) {
                    const funcBody = lines.slice(index, Math.min(lines.length, index + 15)).join('\n');
                    // Check if map is populated in a loop
                    if (funcBody.match(/for\s+/) && funcBody.includes('[')) {
                        issues.push({
                            tool: 'memory-pattern',
                            rule: 'map-no-size-hint',
                            severity: 'low',
                            message: `Map created without size hint but populated in loop. Consider providing initial size.`,
                            file: relativePath,
                            line: lineNum
                        });
                    }
                }
            }

            // Pattern 7: Inefficient JSON handling (repeated Marshal/Unmarshal)
            if (line.match(/json\.(Marshal|Unmarshal)\s*\(/)) {
                const funcContext = lines.slice(Math.max(0, index - 5), index + 1).join('\n');
                if (funcContext.match(/for\s+/)) {
                    issues.push({
                        tool: 'memory-pattern',
                        rule: 'json-in-loop',
                        severity: 'medium',
                        message: `JSON marshaling/unmarshaling inside loop. Consider using Decoder/Encoder for streaming.`,
                        file: relativePath,
                        line: lineNum
                    });
                }
            }
        });

        return issues;
    }

    /**
     * Parse staticcheck JSON output
     */
    private parseStaticcheckResults(output: string, repoPath: string): GoPerformanceIssue[] {
        const issues: GoPerformanceIssue[] = [];

        try {
            // Staticcheck outputs one JSON object per line
            const lines = output.trim().split('\n').filter(l => l.trim());

            for (const line of lines) {
                try {
                    const result = JSON.parse(line);

                    if (result.code) {
                        issues.push({
                            tool: 'staticcheck-perf',
                            rule: result.code,
                            severity: this.mapStaticcheckSeverity(result.severity || 'warning'),
                            message: result.message,
                            file: result.location?.file?.replace(repoPath + '/', '') || 'unknown',
                            line: result.location?.line || 1
                        });
                    }
                } catch {
                    // Skip malformed lines
                }
            }
        } catch (error) {
            console.error('[Staticcheck Perf] Failed to parse results:', error);
        }

        return issues;
    }

    /**
     * Parse golangci-lint JSON output
     */
    private parseGolangciResults(output: string, repoPath: string): GoPerformanceIssue[] {
        const issues: GoPerformanceIssue[] = [];

        try {
            const results = JSON.parse(output);

            for (const issue of results.Issues || []) {
                // Only include performance-related linters
                if (GOLANGCI_PERF_LINTERS.some(l => issue.FromLinter === l)) {
                    issues.push({
                        tool: 'golangci-perf',
                        rule: issue.FromLinter,
                        severity: this.mapGolangciSeverity(issue.Severity),
                        message: issue.Text,
                        file: issue.Pos?.Filename?.replace(repoPath + '/', '') || 'unknown',
                        line: issue.Pos?.Line || 1
                    });
                }
            }
        } catch (error) {
            console.error('[golangci-lint Perf] Failed to parse results:', error);
        }

        return issues;
    }

    /**
     * Map staticcheck severity
     */
    private mapStaticcheckSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
        switch (severity.toLowerCase()) {
            case 'error': return 'high';
            case 'warning': return 'medium';
            default: return 'low';
        }
    }

    /**
     * Map golangci-lint severity
     */
    private mapGolangciSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
        switch (severity?.toLowerCase()) {
            case 'error': return 'high';
            case 'warning': return 'medium';
            default: return 'low';
        }
    }

    /**
     * Run all Go performance analysis tools
     */
    async runAll(repoPath: string): Promise<GoPerformanceIssue[]> {
        const allIssues: GoPerformanceIssue[] = [];

        // Run tools in parallel
        const [staticcheckIssues, golangciIssues, memoryIssues] = await Promise.all([
            this.runStaticcheckPerf(repoPath),
            this.runGolangciPerf(repoPath),
            this.runMemoryPatternDetection(repoPath)
        ]);

        allIssues.push(...staticcheckIssues, ...golangciIssues, ...memoryIssues);

        console.log(`[Go Performance] Total issues: ${allIssues.length}`);
        return allIssues;
    }
}
