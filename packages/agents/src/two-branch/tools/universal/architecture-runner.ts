/**
 * Architecture Tool Runner
 * 
 * Executes architecture analysis tools and parses their results:
 * - Madge: Circular dependency detection
 * - Dependency Cruiser: Architecture rule validation
 * - ts-unused-exports: Dead code detection
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface ArchitectureIssue {
    tool: 'madge' | 'dependency-cruiser' | 'ts-unused-exports';
    rule: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    file?: string;
    line?: number;
    details?: any;
}

export class ArchitectureRunner {
    /**
     * Run Madge for circular dependency detection
     */
    async runMadge(repoPath: string): Promise<ArchitectureIssue[]> {
        try {
            console.log('[Madge] Detecting circular dependencies...');

            const { stdout } = await execAsync(
                'npx madge --circular --extensions ts,tsx,js,jsx --json src/',
                { cwd: repoPath, timeout: 30000 }
            );

            return this.parseMadgeResults(stdout);
        } catch (error: any) {
            // Madge returns non-zero exit code when circular deps found
            if (error.stdout) {
                try {
                    return this.parseMadgeResults(error.stdout);
                } catch (parseError) {
                    console.warn('[Madge] Failed to parse results:', parseError);
                }
            }
            console.warn('[Madge] Failed:', error.message);
            return [];
        }
    }

    /**
     * Run Dependency Cruiser for architecture rule validation
     */
    async runDependencyCruiser(repoPath: string): Promise<ArchitectureIssue[]> {
        try {
            console.log('[Dependency Cruiser] Validating architecture rules...');

            // Check if .dependency-cruiser.js exists
            const configPath = path.join(repoPath, '.dependency-cruiser.js');
            if (!fs.existsSync(configPath)) {
                console.log('[Dependency Cruiser] Config not found, skipping');
                return [];
            }

            const { stdout } = await execAsync(
                'npx depcruise --validate .dependency-cruiser.js --output-type json src/',
                { cwd: repoPath, timeout: 30000 }
            );

            return this.parseDepCruiserResults(stdout);
        } catch (error: any) {
            // Dependency cruiser returns non-zero when violations found
            if (error.stdout) {
                try {
                    return this.parseDepCruiserResults(error.stdout);
                } catch (parseError) {
                    console.warn('[Dependency Cruiser] Failed to parse results:', parseError);
                }
            }
            console.warn('[Dependency Cruiser] Failed:', error.message);
            return [];
        }
    }

    /**
     * Run ts-unused-exports for dead code detection
     */
    async runUnusedExports(repoPath: string): Promise<ArchitectureIssue[]> {
        try {
            console.log('[ts-unused-exports] Detecting unused exports...');

            // Check if tsconfig.json exists
            const tsconfigPath = path.join(repoPath, 'tsconfig.json');
            if (!fs.existsSync(tsconfigPath)) {
                console.log('[ts-unused-exports] tsconfig.json not found, skipping');
                return [];
            }

            const { stdout } = await execAsync(
                'npx ts-unused-exports tsconfig.json --excludePathsFromReport="node_modules;dist;build"',
                { cwd: repoPath, timeout: 30000 }
            );

            return this.parseUnusedExportsResults(stdout);
        } catch (error: any) {
            // ts-unused-exports returns non-zero when unused exports found
            if (error.stdout) {
                try {
                    return this.parseUnusedExportsResults(error.stdout);
                } catch (parseError) {
                    console.warn('[ts-unused-exports] Failed to parse results:', parseError);
                }
            }
            console.warn('[ts-unused-exports] Failed:', error.message);
            return [];
        }
    }

    /**
     * Parse Madge circular dependency results
     */
    private parseMadgeResults(output: string): ArchitectureIssue[] {
        const issues: ArchitectureIssue[] = [];

        try {
            const circular = JSON.parse(output);

            if (circular && Array.isArray(circular) && circular.length > 0) {
                circular.forEach((cycle: string[]) => {
                    // Calculate severity based on cycle length
                    const severity: 'high' | 'medium' = cycle.length > 3 ? 'high' : 'medium';

                    issues.push({
                        tool: 'madge',
                        rule: 'circular-dependency',
                        severity,
                        message: `Circular dependency detected (${cycle.length} files): ${cycle.join(' → ')}`,
                        file: cycle[0],
                        details: { cycle, cycleLength: cycle.length }
                    });
                });
            }
        } catch (error) {
            console.error('[Madge] Failed to parse results:', error);
        }

        return issues;
    }

    /**
     * Parse Dependency Cruiser results
     */
    private parseDepCruiserResults(output: string): ArchitectureIssue[] {
        const issues: ArchitectureIssue[] = [];

        try {
            const results = JSON.parse(output);

            if (results.violations && Array.isArray(results.violations)) {
                results.violations.forEach((violation: any) => {
                    const severity = this.mapDepCruiserSeverity(violation.rule?.severity);

                    issues.push({
                        tool: 'dependency-cruiser',
                        rule: violation.rule?.name || 'unknown-rule',
                        severity,
                        message: violation.comment ||
                            `Architecture rule violated: ${violation.rule?.name}`,
                        file: violation.from,
                        details: {
                            from: violation.from,
                            to: violation.to,
                            rule: violation.rule
                        }
                    });
                });
            }
        } catch (error) {
            console.error('[Dependency Cruiser] Failed to parse results:', error);
        }

        return issues;
    }

    /**
     * Parse ts-unused-exports results
     */
    private parseUnusedExportsResults(output: string): ArchitectureIssue[] {
        const issues: ArchitectureIssue[] = [];

        try {
            const lines = output.split('\n').filter(line => line.trim());

            lines.forEach((line) => {
                // Format: "path/to/file.ts: exportName1, exportName2"
                const match = line.match(/^(.+?):\s*(.+)$/);
                if (match) {
                    const [, filePath, exports] = match;
                    const exportList = exports.split(',').map(e => e.trim());

                    issues.push({
                        tool: 'ts-unused-exports',
                        rule: 'unused-export',
                        severity: 'low',
                        message: `Unused exports (${exportList.length}): ${exportList.join(', ')}`,
                        file: filePath.trim(),
                        details: {
                            unusedExports: exportList,
                            count: exportList.length
                        }
                    });
                }
            });
        } catch (error) {
            console.error('[ts-unused-exports] Failed to parse results:', error);
        }

        return issues;
    }

    /**
     * Map Dependency Cruiser severity to our severity levels
     */
    private mapDepCruiserSeverity(severity?: string): 'critical' | 'high' | 'medium' | 'low' {
        switch (severity?.toLowerCase()) {
            case 'error':
                return 'high';
            case 'warn':
            case 'warning':
                return 'medium';
            case 'info':
                return 'low';
            default:
                return 'medium';
        }
    }
}
