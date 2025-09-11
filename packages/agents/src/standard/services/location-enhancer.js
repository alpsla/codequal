"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchLocationEnhancer = exports.LocationEnhancer = void 0;
// Using EnhancedLocationFinder - the consolidated location finding implementation
const enhanced_location_finder_1 = require("./enhanced-location-finder");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
class LocationEnhancer {
    constructor(locationFinder, modelVersionSync, vectorStorage) {
        // Create an adapter for EnhancedLocationFinder to match ILocationFinder interface
        if (!locationFinder) {
            const enhancedFinder = new enhanced_location_finder_1.EnhancedLocationFinder();
            this.locationFinder = {
                findExactLocation: async (issue, repoPath) => {
                    const results = await enhancedFinder.findLocations(repoPath, [{
                            id: issue.id || 'temp',
                            title: issue.title || issue.message || '',
                            description: issue.description || '',
                            category: issue.category || 'general',
                            severity: issue.severity || 'medium',
                            codeSnippet: issue.codeSnippet || issue.evidence?.snippet,
                            file: issue.file
                        }]);
                    return results[0] || null;
                }
            };
        }
        else {
            this.locationFinder = locationFinder;
        }
    }
    async enhanceIssuesWithLocations(issues, repoUrl, prNumber) {
        const repoPath = this.getRepoPath(repoUrl, prNumber);
        if (!repoPath) {
            console.warn('Repository path not found, returning issues without location enhancement');
            return {
                enhanced: 0,
                failed: issues.length,
                issues: issues.map(issue => this.normalizeIssue(issue))
            };
        }
        const enhancedIssues = [];
        let enhanced = 0;
        let failed = 0;
        // Log first issue structure for debugging
        if (issues.length > 0) {
            console.log('First issue structure:', JSON.stringify(issues[0], null, 2));
        }
        // Process issues in parallel for better performance
        const enhancementPromises = issues.map(async (issue) => {
            try {
                const location = await this.locationFinder.findExactLocation(issue, repoPath);
                if (location) {
                    enhanced++;
                    return this.mergeLocationWithIssue(issue, location);
                }
                else {
                    failed++;
                    return this.normalizeIssue(issue);
                }
            }
            catch (error) {
                console.error(`Failed to enhance issue: ${issue.title || issue.description}`, error);
                failed++;
                return this.normalizeIssue(issue);
            }
        });
        const results = await Promise.all(enhancementPromises);
        enhancedIssues.push(...results);
        return {
            enhanced,
            failed,
            issues: enhancedIssues
        };
    }
    getRepoPath(repoUrl, prNumber) {
        try {
            // Extract repo info from URL
            const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
            if (!match)
                return null;
            const [, owner, repo] = match;
            // Check multiple possible cache locations
            const possiblePaths = [
                // Expected structure from our cloning
                prNumber
                    ? path.join('/tmp/codequal-repos', owner, repo, `pr-${prNumber}`)
                    : path.join('/tmp/codequal-repos', owner, repo, 'main'),
                // Alternative structure
                prNumber
                    ? path.join('/tmp/codequal-repos', `${owner}-${repo}-pr-${prNumber}`)
                    : path.join('/tmp/codequal-repos', `${owner}-${repo}`),
                // Environment variable override
                process.env.REPO_CACHE_DIR
                    ? path.join(process.env.REPO_CACHE_DIR, owner, repo, prNumber ? `pr-${prNumber}` : 'main')
                    : null
            ].filter(Boolean);
            // Try each possible path
            for (const localCachePath of possiblePaths) {
                if (!localCachePath)
                    continue;
                try {
                    (0, child_process_1.execSync)(`test -d "${localCachePath}"`, { stdio: 'ignore' });
                    console.log(`  ✓ Found repository at: ${localCachePath}`);
                    return localCachePath;
                }
                catch {
                    // Directory doesn't exist, try next
                }
            }
            console.log(`  ✗ Repository not found in any of: ${possiblePaths.join(', ')}`);
            return null;
        }
        catch (error) {
            console.error('Error getting repo path:', error);
            return null;
        }
    }
    getFromRedisCache(key) {
        try {
            // Try to get from Redis if available
            if (process.env.REDIS_URL) {
                const result = (0, child_process_1.execSync)(`redis-cli -u "${process.env.REDIS_URL}" GET "${key}" 2>/dev/null`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
                if (result && result !== '(nil)') {
                    return result;
                }
            }
        }
        catch {
            // Redis not available or key not found
        }
        return null;
    }
    mergeLocationWithIssue(issue, location) {
        return {
            id: issue.id || this.generateIssueId(issue),
            title: issue.title || issue.description?.substring(0, 100),
            description: issue.description,
            severity: issue.severity?.toLowerCase() || 'medium',
            category: issue.category || 'general',
            location: {
                file: issue.location?.file,
                line: location.line,
                column: location.column
            },
            codeSnippet: location.codeSnippet,
            contextLines: location.contextLines,
            remediation: issue.remediation,
            evidence: issue.evidence,
            locationConfidence: location.confidence
        };
    }
    normalizeIssue(issue) {
        return {
            id: issue.id || this.generateIssueId(issue),
            title: issue.title || issue.description?.substring(0, 100),
            description: issue.description,
            severity: issue.severity?.toLowerCase() || 'medium',
            category: issue.category || 'general',
            location: issue.location,
            codeSnippet: issue.codeSnippet || issue.evidence?.snippet,
            remediation: issue.remediation,
            evidence: issue.evidence
        };
    }
    generateIssueId(issue) {
        const prefix = issue.severity?.toUpperCase() || 'ISSUE';
        const hash = this.simpleHash(issue.description || '');
        return `${prefix}-${hash}`;
    }
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36).substring(0, 6).toUpperCase();
    }
}
exports.LocationEnhancer = LocationEnhancer;
class BatchLocationEnhancer {
    constructor() {
        this.enhancer = new LocationEnhancer();
    }
    async enhanceComparisonResults(comparisonResult, repoUrl, prNumber) {
        console.log('🔍 Enhancing comparison results with exact locations...');
        // Enhance different issue categories in parallel
        const [newIssuesResult, unchangedIssuesResult, fixedIssuesResult] = await Promise.all([
            this.enhancer.enhanceIssuesWithLocations(comparisonResult.newIssues || [], repoUrl, prNumber),
            this.enhancer.enhanceIssuesWithLocations(comparisonResult.unchangedIssues || [], repoUrl, prNumber),
            this.enhancer.enhanceIssuesWithLocations(comparisonResult.fixedIssues || [], repoUrl, 'main' // Fixed issues are from main branch
            )
        ]);
        // Log enhancement statistics
        const totalEnhanced = newIssuesResult.enhanced + unchangedIssuesResult.enhanced + fixedIssuesResult.enhanced;
        const totalFailed = newIssuesResult.failed + unchangedIssuesResult.failed + fixedIssuesResult.failed;
        const totalIssues = totalEnhanced + totalFailed;
        console.log(`✅ Enhanced ${totalEnhanced}/${totalIssues} issues with exact locations`);
        console.log(`   - New issues: ${newIssuesResult.enhanced}/${newIssuesResult.issues.length}`);
        console.log(`   - Unchanged issues: ${unchangedIssuesResult.enhanced}/${unchangedIssuesResult.issues.length}`);
        console.log(`   - Fixed issues: ${fixedIssuesResult.enhanced}/${fixedIssuesResult.issues.length}`);
        return {
            ...comparisonResult,
            newIssues: newIssuesResult.issues,
            unchangedIssues: unchangedIssuesResult.issues,
            fixedIssues: fixedIssuesResult.issues,
            enhancementStats: {
                totalEnhanced,
                totalFailed,
                successRate: totalIssues > 0 ? (totalEnhanced / totalIssues * 100).toFixed(1) : 0
            }
        };
    }
}
exports.BatchLocationEnhancer = BatchLocationEnhancer;
