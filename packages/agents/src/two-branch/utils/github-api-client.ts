/**
 * GitHub API Utility
 * 
 * Fetches real PR data from GitHub API including:
 * - PR author information
 * - Repository statistics
 * - File changes (additions/deletions)
 */

export interface GitHubPRData {
    author: {
        login: string;
        email: string;
    };
    stats: {
        additions: number;
        deletions: number;
        changedFiles: number;
    };
    repository: {
        fullName: string;
        owner: string;
        name: string;
    };
    pr: {
        number: number;
        title: string;
        baseBranch: string;
        headBranch: string;
    };
}

export class GitHubAPIClient {
    private baseUrl = 'https://api.github.com';
    private token?: string;

    constructor(token?: string) {
        this.token = token || process.env.GITHUB_TOKEN;
        console.log('[GitHub API] Initializing client...');
        console.log(`[GitHub API] Token provided via constructor: ${token ? 'YES' : 'NO'}`);
        console.log(`[GitHub API] Token from env (GITHUB_TOKEN): ${process.env.GITHUB_TOKEN ? 'YES (length: ' + process.env.GITHUB_TOKEN.length + ')' : 'NO'}`);
        console.log(`[GitHub API] Final token available: ${this.token ? 'YES (length: ' + this.token.length + ')' : 'NO'}`);
    }

    /**
     * Fetch PR data from GitHub API
     */
    async fetchPRData(repoUrl: string, prNumber: number): Promise<GitHubPRData> {
        const { owner, repo } = this.parseRepoUrl(repoUrl);

        console.log(`[GitHub API] Fetching PR data for ${owner}/${repo}#${prNumber}...`);
        console.log(`[GitHub API] Using token: ${this.token ? 'YES' : 'NO'}`);

        try {
            // Fetch PR data
            const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}`;
            console.log(`[GitHub API] Request URL: ${url}`);

            const prResponse = await this.fetchWithAuth(url);

            console.log(`[GitHub API] Response status: ${prResponse.status} ${prResponse.statusText}`);

            if (!prResponse.ok) {
                const errorBody = await prResponse.text();
                console.error(`[GitHub API] Error response body: ${errorBody.substring(0, 200)}`);
                throw new Error(`GitHub API error: ${prResponse.status} ${prResponse.statusText}`);
            }

            const prData = await prResponse.json() as any; // GitHub PR API response

            console.log(`[GitHub API] ✅ Successfully fetched PR data`);
            console.log(`[GitHub API]    Author: ${prData.user.login}`);
            console.log(`[GitHub API]    Title: ${prData.title}`);
            console.log(`[GitHub API]    Changes: +${prData.additions} -${prData.deletions}`);

            // Extract author email (may not be available without auth)
            const authorEmail = prData.user.email ||
                `${prData.user.login}@users.noreply.github.com`;

            return {
                author: {
                    login: prData.user.login,
                    email: authorEmail
                },
                stats: {
                    additions: prData.additions || 0,
                    deletions: prData.deletions || 0,
                    changedFiles: prData.changed_files || 0
                },
                repository: {
                    fullName: `${owner}/${repo}`,
                    owner,
                    name: repo
                },
                pr: {
                    number: prNumber,
                    title: prData.title,
                    baseBranch: prData.base.ref,
                    headBranch: prData.head.ref
                }
            };
        } catch (error: any) {
            console.error(`[GitHub API] ❌ Failed to fetch PR data: ${error.message}`);
            console.error(`[GitHub API] Error stack: ${error.stack}`);
            console.warn('[GitHub API] Falling back to defaults');

            // Return defaults if API fails
            return this.getDefaultPRData(owner, repo, prNumber);
        }
    }

    /**
     * Fetch repository statistics
     */
    async fetchRepoStats(repoUrl: string): Promise<{
        totalFiles: number;
        totalLinesOfCode: number;
    }> {
        const { owner, repo } = this.parseRepoUrl(repoUrl);

        try {
            // Fetch repository data
            const repoResponse = await this.fetchWithAuth(
                `${this.baseUrl}/repos/${owner}/${repo}`
            );

            if (!repoResponse.ok) {
                throw new Error(`GitHub API error: ${repoResponse.status}`);
            }

            const repoData = await repoResponse.json() as any; // GitHub Repo API response

            // GitHub doesn't provide exact file count or LOC
            // Estimate based on repository size
            const sizeKB = repoData.size || 0;
            const estimatedFiles = Math.round(sizeKB / 10); // Rough estimate
            const estimatedLOC = Math.round(sizeKB * 50); // Very rough estimate

            return {
                totalFiles: estimatedFiles,
                totalLinesOfCode: estimatedLOC
            };
        } catch (error: any) {
            console.warn(`[GitHub API] Failed to fetch repo stats: ${error.message}`);

            // Return reasonable defaults
            return {
                totalFiles: 0,
                totalLinesOfCode: 0
            };
        }
    }

    /**
     * Parse GitHub repository URL
     */
    private parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
        // Handle various URL formats:
        // - https://github.com/owner/repo
        // - https://github.com/owner/repo.git
        // - git@github.com:owner/repo.git

        const httpsMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/);
        if (httpsMatch) {
            return {
                owner: httpsMatch[1],
                repo: httpsMatch[2]
            };
        }

        const sshMatch = repoUrl.match(/github\.com:([^/]+)\/([^/]+?)(\.git)?$/);
        if (sshMatch) {
            return {
                owner: sshMatch[1],
                repo: sshMatch[2]
            };
        }

        throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    /**
     * Fetch with authentication if token available
     */
    private async fetchWithAuth(url: string): Promise<Response> {
        const headers: Record<string, string> = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'CodeQual-Analyzer'
        };

        if (this.token) {
            headers['Authorization'] = `token ${this.token}`;
            console.log(`[GitHub API] Using authenticated request (token length: ${this.token.length})`);
        } else {
            console.log(`[GitHub API] ⚠️  Using unauthenticated request (no token available)`);
        }

        console.log(`[GitHub API] Request headers: ${JSON.stringify(Object.keys(headers))}`);

        return fetch(url, { headers });
    }

    /**
     * Get default PR data when API fails
     */
    private getDefaultPRData(owner: string, repo: string, prNumber: number): GitHubPRData {
        return {
            author: {
                login: 'unknown',
                email: 'unknown@example.com'
            },
            stats: {
                additions: 0,
                deletions: 0,
                changedFiles: 0
            },
            repository: {
                fullName: `${owner}/${repo}`,
                owner,
                name: repo
            },
            pr: {
                number: prNumber,
                title: `PR #${prNumber}`,
                baseBranch: 'main',
                headBranch: `pr-${prNumber}`
            }
        };
    }
}
