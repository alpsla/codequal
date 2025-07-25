"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepWikiManager = void 0;
const vector_context_service_1 = require("@codequal/agents/multi-agent/vector-context-service");
const auth_1 = require("@codequal/agents/multi-agent/types/auth");
/**
 * Simplified DeepWiki Manager - handles Vector DB existence checks and repository analysis coordination
 * Design decision: Only checks Vector DB existence, delegates actual analysis to DeepWiki service
 */
class DeepWikiManager {
    constructor(authenticatedUser) {
        this.authenticatedUser = authenticatedUser;
        this.activeJobs = new Map();
        this.vectorContextService = new vector_context_service_1.VectorContextService(authenticatedUser);
    }
    /**
     * Check if repository analysis exists in Vector DB
     * Simple Vector DB existence check - core responsibility
     */
    async checkRepositoryExists(repositoryUrl) {
        try {
            const existing = await this.vectorContextService.getRepositoryContext(repositoryUrl, 'orchestrator', // Using orchestrator role for general queries
            this.authenticatedUser, // Type compatibility
            { minSimilarity: 0.95 });
            return existing.recentAnalysis.length > 0;
        }
        catch (error) {
            console.error('Repository existence check failed:', error);
            return false;
        }
    }
    /**
     * Trigger repository analysis via DeepWiki service
     * Queues analysis but doesn't wait for completion
     */
    async triggerRepositoryAnalysis(repositoryUrl) {
        try {
            const jobId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            // Create analysis job record
            const job = {
                jobId,
                repositoryUrl,
                status: 'queued',
                startedAt: new Date()
            };
            this.activeJobs.set(jobId, job);
            // In a real implementation, this would call DeepWiki API
            // For now, we'll simulate the job creation
            await this.simulateDeepWikiApiCall(repositoryUrl, jobId);
            return jobId;
        }
        catch (error) {
            console.error('Failed to trigger repository analysis:', error);
            throw new Error(`Repository analysis trigger failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Wait for analysis completion and store results in Vector DB
     */
    async waitForAnalysisCompletion(repositoryUrl) {
        try {
            // Find active job for this repository
            const job = Array.from(this.activeJobs.values())
                .find(j => j.repositoryUrl === repositoryUrl && j.status !== 'completed' && j.status !== 'failed');
            if (!job) {
                throw new Error('No active analysis job found for repository');
            }
            // Poll for completion (in real implementation, would use webhooks)
            const results = await this.pollForResults(job);
            // Store results in Vector DB
            await this.storeAnalysisResults(repositoryUrl, results);
            return results;
        }
        catch (error) {
            console.error('Failed to wait for analysis completion:', error);
            throw new Error(`Analysis completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get job status for tracking
     */
    async getJobStatus(jobId) {
        return this.activeJobs.get(jobId) || null;
    }
    /**
     * Get all active jobs for user
     */
    async getActiveJobs() {
        return Array.from(this.activeJobs.values())
            .filter(job => job.status === 'queued' || job.status === 'processing');
    }
    /**
     * Cancel an active analysis job
     */
    async cancelJob(jobId) {
        const job = this.activeJobs.get(jobId);
        if (!job || job.status === 'completed' || job.status === 'failed') {
            return false;
        }
        // Clear any pending timers
        const timers = job.timers;
        if (timers) {
            clearTimeout(timers.processingTimer);
            clearTimeout(timers.completionTimer);
        }
        job.status = 'failed';
        job.error = 'Cancelled by user';
        job.completedAt = new Date();
        return true;
    }
    // Private helper methods
    /**
     * Simulate DeepWiki API call for repository analysis
     * In production, this would call the actual DeepWiki Kubernetes service
     */
    async simulateDeepWikiApiCall(repositoryUrl, jobId) {
        const job = this.activeJobs.get(jobId);
        if (!job)
            return;
        // Store timer references on the job for proper cleanup
        const processingTimer = setTimeout(() => {
            const currentJob = this.activeJobs.get(jobId);
            if (currentJob && currentJob.status === 'queued') {
                currentJob.status = 'processing';
            }
        }, 100);
        // Add a small random delay to avoid jobs completing at exactly the same time
        const completionDelay = 5000 + Math.floor(Math.random() * 100);
        const completionTimer = setTimeout(() => {
            try {
                const currentJob = this.activeJobs.get(jobId);
                if (currentJob && (currentJob.status === 'queued' || currentJob.status === 'processing')) {
                    // Job is active, proceed with completion
                    // Simulate analysis completion
                    currentJob.status = 'completed';
                    currentJob.completedAt = new Date();
                    console.log(`DeepWiki analysis completed for ${repositoryUrl} (Job: ${jobId})`);
                }
            }
            catch (error) {
                const currentJob = this.activeJobs.get(jobId);
                if (currentJob && currentJob.status !== 'failed') {
                    currentJob.status = 'failed';
                    currentJob.error = error instanceof Error ? error.message : 'Analysis failed';
                    currentJob.completedAt = new Date();
                }
                console.error(`DeepWiki analysis failed for ${repositoryUrl}:`, error);
            }
        }, completionDelay);
        // Store timer references for cleanup if needed
        job.timers = { processingTimer, completionTimer };
    }
    /**
     * Poll for analysis results until completion
     */
    async pollForResults(job) {
        const maxAttempts = 60; // 5 minutes with 5-second intervals
        let attempts = 0;
        return new Promise((resolve, reject) => {
            const pollInterval = setInterval(() => {
                const currentJob = this.activeJobs.get(job.jobId);
                if (!currentJob) {
                    clearInterval(pollInterval);
                    reject(new Error('Analysis job not found'));
                    return;
                }
                if (currentJob.status === 'completed') {
                    clearInterval(pollInterval);
                    // Generate mock results (in production, would fetch from DeepWiki)
                    resolve(this.generateMockAnalysisResults(job.repositoryUrl));
                    return;
                }
                if (currentJob.status === 'failed') {
                    clearInterval(pollInterval);
                    reject(new Error(currentJob.error || 'Analysis failed'));
                    return;
                }
                attempts++;
                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    reject(new Error('Analysis timeout - job did not complete within expected timeframe'));
                    return;
                }
            }, 5000); // Poll every 5 seconds
        });
    }
    /**
     * Store analysis results in Vector DB
     */
    async storeAnalysisResults(repositoryUrl, results) {
        try {
            await this.vectorContextService.storeAnalysisResults(repositoryUrl, [results], this.authenticatedUser.id);
            console.log(`Analysis results stored in Vector DB for ${repositoryUrl}`);
        }
        catch (error) {
            console.error('Failed to store analysis results in Vector DB:', error);
            throw new Error(`Vector DB storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Generate mock analysis results for testing
     * In production, this would parse actual DeepWiki output
     */
    generateMockAnalysisResults(repositoryUrl) {
        const repoName = this.extractRepositoryName(repositoryUrl);
        return {
            repositoryUrl,
            analysis: {
                architecture: {
                    patterns: ['MVC', 'Dependency Injection'],
                    complexity: 'medium',
                    maintainability: 0.8,
                    recommendations: ['Consider extracting service layer', 'Reduce cyclomatic complexity']
                },
                security: {
                    vulnerabilities: [
                        {
                            type: 'potential-sql-injection',
                            severity: 'medium',
                            file: 'src/database/queries.ts',
                            line: 42,
                            description: 'Potential SQL injection vulnerability in user query'
                        }
                    ],
                    score: 0.85,
                    recommendations: ['Use parameterized queries', 'Implement input validation']
                },
                performance: {
                    hotspots: ['Database queries', 'File I/O operations'],
                    score: 0.75,
                    recommendations: ['Implement query optimization', 'Add caching layer']
                },
                codeQuality: {
                    metrics: {
                        maintainability: 0.82,
                        testCoverage: 0.65,
                        codeComplexity: 0.3
                    },
                    issues: [
                        {
                            type: 'high-complexity-function',
                            file: 'src/services/processor.ts',
                            function: 'processData',
                            complexity: 15
                        }
                    ],
                    recommendations: ['Increase test coverage', 'Refactor complex functions']
                },
                dependencies: {
                    outdated: [
                        { name: 'express', current: '4.17.1', latest: '4.18.2', severity: 'low' }
                    ],
                    vulnerabilities: [],
                    recommendations: ['Update dependencies to latest versions']
                }
            },
            metadata: {
                analyzedAt: new Date(),
                analysisVersion: '1.0.0',
                processingTime: 45000 // 45 seconds
            }
        };
    }
    /**
     * Extract repository name from URL
     */
    extractRepositoryName(url) {
        const match = url.match(/\/([^/]+)\.git$/) || url.match(/\/([^/]+)$/);
        return match ? match[1] : 'unknown-repository';
    }
    /**
     * Convert API AuthenticatedUser to Agent AuthenticatedUser
     */
    convertToAgentUser(apiUser) {
        // Create user permissions structure expected by agents package
        const permissions = {
            repositories: {
                // For now, grant access to all repositories the user has access to
                // In production, this would be populated from the database
                '*': {
                    read: true,
                    write: false,
                    admin: false
                }
            },
            organizations: apiUser.organizationId ? [apiUser.organizationId] : [],
            globalPermissions: apiUser.permissions || [],
            quotas: {
                requestsPerHour: 1000,
                maxConcurrentExecutions: 5,
                storageQuotaMB: 1000
            }
        };
        // Map API role to Agent UserRole
        let role;
        switch (apiUser.role) {
            case 'admin':
                role = auth_1.UserRole.ADMIN;
                break;
            case 'system_admin':
                role = auth_1.UserRole.SYSTEM_ADMIN;
                break;
            case 'org_owner':
                role = auth_1.UserRole.ORG_OWNER;
                break;
            case 'org_member':
                role = auth_1.UserRole.ORG_MEMBER;
                break;
            case 'service_account':
                role = auth_1.UserRole.SERVICE_ACCOUNT;
                break;
            default:
                role = auth_1.UserRole.USER;
        }
        // Map API status to Agent UserStatus
        let status;
        switch (apiUser.status) {
            case 'suspended':
                status = auth_1.UserStatus.SUSPENDED;
                break;
            case 'pending_verification':
                status = auth_1.UserStatus.PENDING_VERIFICATION;
                break;
            case 'password_reset_required':
                status = auth_1.UserStatus.PASSWORD_RESET_REQUIRED;
                break;
            case 'locked':
                status = auth_1.UserStatus.LOCKED;
                break;
            default:
                status = auth_1.UserStatus.ACTIVE;
        }
        return {
            id: apiUser.id,
            email: apiUser.email,
            organizationId: apiUser.organizationId,
            permissions,
            session: {
                token: apiUser.session.token,
                expiresAt: apiUser.session.expiresAt,
                fingerprint: 'api-session',
                ipAddress: '127.0.0.1',
                userAgent: 'CodeQual API'
            },
            role,
            status
        };
    }
    /**
     * Create mock RAG service for VectorContextService
     */
    createMockRAGService() {
        return {
            search: async (options, userId) => {
                // Return empty results for now
                // In production, this would be the actual RAG service
                return [];
            },
            supabase: {
                // Mock supabase client
                from: () => ({
                    select: () => ({
                        eq: () => ({
                            eq: () => Promise.resolve({ data: [], error: null })
                        })
                    })
                })
            }
        };
    }
}
exports.DeepWikiManager = DeepWikiManager;
//# sourceMappingURL=deepwiki-manager.js.map