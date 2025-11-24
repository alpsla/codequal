/**
 * Performance Tool Runner
 * 
 * Executes performance analysis tools and parses their results:
 * - Lighthouse CI: Web performance metrics (Core Web Vitals)
 * - Webpack Bundle Analyzer: Bundle size analysis
 * - ESLint Performance Plugin: Code performance patterns
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface PerformanceIssue {
    tool: 'lighthouse' | 'bundle-analyzer' | 'eslint-perf';
    rule: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    file?: string;
    line?: number;
    metric?: {
        name: string;
        value: number;
        threshold: number;
    };
}

export class PerformanceRunner {
    /**
     * Run Lighthouse CI for web performance analysis
     */
    async runLighthouse(repoPath: string): Promise<PerformanceIssue[]> {
        try {
            console.log('[Lighthouse] Running web performance analysis...');

            // Check for monorepo structure and skip if detected
            const fs = await import('fs');
            const path = await import('path');
            const isMonorepo = await (async () => {
                try {
                    const packagesDir = path.join(repoPath, 'packages');
                    const appsDir = path.join(repoPath, 'apps');
                    const hasPackages = await fs.promises.access(packagesDir).then(() => true).catch(() => false);
                    const hasApps = await fs.promises.access(appsDir).then(() => true).catch(() => false);
                    return hasPackages || hasApps;
                } catch {
                    return false;
                }
            })();

            if (isMonorepo) {
                console.log('[Lighthouse] ⏭️  Skipping Lighthouse - monorepo detected');
                return [];
            }

            const { stdout } = await execAsync(
                'npx lhci autorun --collect.numberOfRuns=1 --collect.settings.chromeFlags="--no-sandbox" --upload.target=temporary-public-storage',
                { cwd: repoPath, timeout: 120000 }
            );

            return this.parseLighthouseResults(stdout);
        } catch (error: any) {
            console.warn('[Lighthouse] Failed:', error.message);
            return [];
        }
    }

    /**
     * Run Webpack Bundle Analyzer for bundle size analysis
     */
    async runBundleAnalyzer(repoPath: string): Promise<PerformanceIssue[]> {
        try {
            console.log('[Bundle Analyzer] Analyzing bundle size...');

            // Check for monorepo structure and skip if detected
            const fs = await import('fs');
            const path = await import('path');
            const isMonorepo = await (async () => {
                try {
                    const packagesDir = path.join(repoPath, 'packages');
                    const appsDir = path.join(repoPath, 'apps');
                    const hasPackages = await fs.promises.access(packagesDir).then(() => true).catch(() => false);
                    const hasApps = await fs.promises.access(appsDir).then(() => true).catch(() => false);
                    return hasPackages || hasApps;
                } catch {
                    return false;
                }
            })();

            if (isMonorepo) {
                console.log('[Bundle Analyzer] ⏭️  Skipping Bundle Analyzer - monorepo detected');
                return [];
            }

            // Check if webpack stats exist
            const statsPath = path.join(repoPath, 'stats.json');
            if (!fs.existsSync(statsPath)) {
                console.log('[Bundle Analyzer] stats.json not found, attempting to generate...');

                // Try to generate stats
                try {
                    await execAsync('npm run build -- --json > stats.json', {
                        cwd: repoPath,
                        timeout: 60000
                    });
                } catch (buildError) {
                    console.warn('[Bundle Analyzer] Could not generate stats.json, skipping');
                    return [];
                }
            }

            const { stdout } = await execAsync(
                'npx webpack-bundle-analyzer stats.json --mode json --no-open',
                { cwd: repoPath }
            );

            return this.parseBundleResults(stdout);
        } catch (error: any) {
            console.warn('[Bundle Analyzer] Failed:', error.message);
            return [];
        }
    }

    /**
     * Run ESLint with performance plugin
     */
    async runESLintPerf(repoPath: string, files: string[]): Promise<PerformanceIssue[]> {
        try {
            console.log('[ESLint Perf] Analyzing code performance patterns...');

            // Check for monorepo structure and skip if detected
            const fs = await import('fs');
            const path = await import('path');

            const isMonorepo = await (async () => {
                try {
                    const packagesDir = path.join(repoPath, 'packages');
                    const appsDir = path.join(repoPath, 'apps');
                    const hasPackages = await fs.promises.access(packagesDir).then(() => true).catch(() => false);
                    const hasApps = await fs.promises.access(appsDir).then(() => true).catch(() => false);
                    return hasPackages || hasApps;
                } catch {
                    return false;
                }
            })();

            if (isMonorepo) {
                console.log('[ESLint Perf] ⏭️  Skipping ESLint Perf - monorepo detected');
                return [];
            }

            if (!files || files.length === 0) {
                console.warn('[ESLint Perf] No files provided, skipping');
                return [];
            }

            const fileArgs = files.slice(0, 100).join(' '); // Limit to 100 files

            // Explicitly enable performance rules
            const perfRules = [
                '--rule "perf-standard/no-instanceof-guard: error"',
                '--rule "perf-standard/no-self-in-constructor: error"',
                '--rule "perf-standard/check-function-inline: warn"'
            ].join(' ');

            // Use --no-eslintrc to avoid config conflicts, but pass rules explicitly
            // Set ESLINT_USE_FLAT_CONFIG=false to ensure legacy mode works with --no-eslintrc
            const { stdout } = await execAsync(
                `npx eslint ${fileArgs} --plugin perf-standard ${perfRules} --format json --no-eslintrc`,
                {
                    cwd: repoPath,
                    timeout: 30000,
                    env: { ...process.env, ESLINT_USE_FLAT_CONFIG: 'false' }
                }
            );

            return this.parseESLintPerfResults(stdout);
        } catch (error: any) {
            // ESLint returns non-zero exit code when issues found, check if we got JSON output
            if (error.stdout) {
                try {
                    return this.parseESLintPerfResults(error.stdout);
                } catch (parseError) {
                    console.warn('[ESLint Perf] Failed to parse results:', parseError);
                }
            }
            console.warn('[ESLint Perf] Failed:', error.message);
            return [];
        }
    }

    /**
     * Parse Lighthouse results from JSON output
     */
    private parseLighthouseResults(output: string): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];

        try {
            const results = JSON.parse(output);
            const audits = results.lhr?.audits || {};

            // Check Core Web Vitals - Largest Contentful Paint
            if (audits['largest-contentful-paint']?.score < 0.9) {
                const lcp = audits['largest-contentful-paint'];
                issues.push({
                    tool: 'lighthouse',
                    rule: 'largest-contentful-paint',
                    severity: lcp.score < 0.5 ? 'high' : 'medium',
                    message: `Largest Contentful Paint is too slow (${lcp.displayValue}). Target: < 2.5s`,
                    metric: {
                        name: 'LCP',
                        value: lcp.numericValue,
                        threshold: 2500
                    }
                });
            }

            // First Input Delay
            if (audits['first-input-delay']?.score < 0.9) {
                const fid = audits['first-input-delay'];
                issues.push({
                    tool: 'lighthouse',
                    rule: 'first-input-delay',
                    severity: 'medium',
                    message: `First Input Delay needs improvement (${fid.displayValue}). Target: < 100ms`,
                    metric: {
                        name: 'FID',
                        value: fid.numericValue,
                        threshold: 100
                    }
                });
            }

            // Cumulative Layout Shift
            if (audits['cumulative-layout-shift']?.score < 0.9) {
                const cls = audits['cumulative-layout-shift'];
                issues.push({
                    tool: 'lighthouse',
                    rule: 'cumulative-layout-shift',
                    severity: cls.score < 0.5 ? 'high' : 'medium',
                    message: `Cumulative Layout Shift is too high (${cls.displayValue}). Target: < 0.1`,
                    metric: {
                        name: 'CLS',
                        value: cls.numericValue,
                        threshold: 0.1
                    }
                });
            }

            // Total Blocking Time
            if (audits['total-blocking-time']?.score < 0.9) {
                const tbt = audits['total-blocking-time'];
                issues.push({
                    tool: 'lighthouse',
                    rule: 'total-blocking-time',
                    severity: 'medium',
                    message: `Total Blocking Time is too high (${tbt.displayValue}). Target: < 200ms`,
                    metric: {
                        name: 'TBT',
                        value: tbt.numericValue,
                        threshold: 200
                    }
                });
            }
        } catch (error) {
            console.error('[Lighthouse] Failed to parse results:', error);
        }

        return issues;
    }

    /**
     * Parse bundle analyzer results
     */
    private parseBundleResults(output: string): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];

        try {
            const stats = JSON.parse(output);

            // Check bundle sizes
            if (stats.assets) {
                stats.assets.forEach((asset: any) => {
                    const sizeKB = asset.size / 1024;

                    // Flag bundles over 500KB
                    if (asset.size > 500000) {
                        issues.push({
                            tool: 'bundle-analyzer',
                            rule: 'large-bundle',
                            severity: asset.size > 1000000 ? 'high' : 'medium',
                            message: `Bundle ${asset.name} is too large (${sizeKB.toFixed(2)}KB). Consider code splitting.`,
                            file: asset.name,
                            metric: {
                                name: 'bundle-size',
                                value: asset.size,
                                threshold: 500000
                            }
                        });
                    }
                });
            }

            // Check for duplicate dependencies
            if (stats.chunks) {
                const moduleMap = new Map<string, number>();

                stats.chunks.forEach((chunk: any) => {
                    chunk.modules?.forEach((module: any) => {
                        const count = moduleMap.get(module.name) || 0;
                        moduleMap.set(module.name, count + 1);
                    });
                });

                moduleMap.forEach((count, moduleName) => {
                    if (count > 1 && !moduleName.includes('node_modules')) {
                        issues.push({
                            tool: 'bundle-analyzer',
                            rule: 'duplicate-module',
                            severity: 'low',
                            message: `Module ${moduleName} is duplicated ${count} times across bundles`,
                            file: moduleName
                        });
                    }
                });
            }
        } catch (error) {
            console.error('[Bundle Analyzer] Failed to parse results:', error);
        }

        return issues;
    }

    /**
     * Parse ESLint performance plugin results
     */
    private parseESLintPerfResults(output: string): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];

        try {
            const results = JSON.parse(output);

            results.forEach((fileResult: any) => {
                fileResult.messages.forEach((msg: any) => {
                    // Only include performance-related rules
                    if (msg.ruleId?.includes('perf') || msg.ruleId?.includes('performance')) {
                        issues.push({
                            tool: 'eslint-perf',
                            rule: msg.ruleId,
                            severity: msg.severity === 2 ? 'high' : 'medium',
                            message: msg.message,
                            file: fileResult.filePath,
                            line: msg.line
                        });
                    }
                });
            });
        } catch (error) {
            console.error('[ESLint Perf] Failed to parse results:', error);
        }

        return issues;
    }
}
