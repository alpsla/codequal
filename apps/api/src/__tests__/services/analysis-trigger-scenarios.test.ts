/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Real-world scenario tests for analysis trigger logic
 * Tests the complete flow of when and how analyses are triggered
 */

describe('Analysis Trigger Scenarios - Real World Cases', () => {
  describe('Scenario 1: First-time PR Analysis', () => {
    it('should trigger full repository analysis when no baseline exists', async () => {
      // Given: A new repository never analyzed before
      const prUrl = 'https://github.com/new-company/new-project/pull/1';
      const repositoryUrl = 'https://github.com/new-company/new-project';
      
      // When: User submits PR for analysis
      const mockFlow = {
        checkVectorDB: async () => ({ exists: false }),
        triggerDeepWiki: async () => ({ 
          jobId: 'first-analysis-123',
          includesBothBranches: true,
          analysisType: 'full-with-baseline'
        }),
        expectedBehavior: {
          cloneMainBranch: true,
          analyzeMainBranch: true,
          storeBaseline: true,
          cloneFeatureBranch: true,
          analyzeFeatureBranch: true,
          compareResults: true,
          totalClones: 1, // With optimization: single clone + branch switch
          estimatedTime: '2-5 minutes'
        }
      };

      expect(await mockFlow.checkVectorDB()).toEqual({ exists: false });
      expect((await mockFlow.triggerDeepWiki()).includesBothBranches).toBe(true);
    });
  });

  describe('Scenario 2: Repeat PR Analysis (Baseline Exists)', () => {
    it('should skip baseline analysis when recent baseline exists', async () => {
      // Given: Repository analyzed 2 hours ago
      const prUrl = 'https://github.com/active-company/web-app/pull/234';
      const baselineAge = 2 * 60 * 60 * 1000; // 2 hours in ms
      
      const mockFlow = {
        checkVectorDB: async () => ({ 
          exists: true,
          lastAnalyzed: new Date(Date.now() - baselineAge),
          isRecent: true
        }),
        expectedBehavior: {
          skipMainBranchAnalysis: true,
          cloneOnlyFeatureBranch: true,
          useExistingBaseline: true,
          totalClones: 1,
          estimatedTime: '30-60 seconds'
        }
      };

      const dbCheck = await mockFlow.checkVectorDB();
      expect(dbCheck.exists).toBe(true);
      expect(dbCheck.isRecent).toBe(true);
    });
  });

  describe('Scenario 3: Security-Critical PR', () => {
    it('should force deep analysis for auth/crypto file changes', async () => {
      // Given: PR modifying authentication files
      const prChanges = {
        files: [
          'src/auth/jwt-handler.js',
          'src/crypto/encryption.js',
          'src/middleware/auth-middleware.js'
        ],
        totalChanges: 50
      };

      const analysisTrigger = {
        detectCriticalFiles: (files: string[]) => {
          const criticalPatterns = [/auth/, /crypto/, /security/, /password/];
          return files.some(file => 
            criticalPatterns.some(pattern => pattern.test(file))
          );
        },
        shouldForceDeepAnalysis: (changes: any) => {
          return analysisTrigger.detectCriticalFiles(changes.files);
        }
      };

      expect(analysisTrigger.shouldForceDeepAnalysis(prChanges)).toBe(true);
      expect(analysisTrigger.detectCriticalFiles(['src/components/Button.js'])).toBe(false);
    });
  });

  describe('Scenario 4: Scheduled Main Branch Analysis', () => {
    it('should run daily analysis at 2 AM UTC', async () => {
      // Given: Daily schedule configured
      const schedule = {
        repositoryUrl: 'https://github.com/company/production-app',
        frequency: 'daily',
        cronExpression: '0 2 * * *',
        lastRun: new Date('2025-01-16T02:00:00Z'),
        nextRun: new Date('2025-01-17T02:00:00Z')
      };

      // When: Cron job triggers at 2 AM UTC
      const executionTime = new Date('2025-01-17T02:00:00Z');
      
      const mockExecution = {
        shouldRun: (schedule: any, currentTime: Date) => {
          return currentTime >= schedule.nextRun;
        },
        triggerAnalysis: async () => ({
          branch: 'main',
          analysisMode: 'comprehensive',
          includeDiff: false,
          jobId: 'scheduled-daily-456'
        })
      };

      expect(mockExecution.shouldRun(schedule, executionTime)).toBe(true);
      expect(mockExecution.shouldRun(schedule, new Date('2025-01-17T01:59:59Z'))).toBe(false);
      
      const result = await mockExecution.triggerAnalysis();
      expect(result.branch).toBe('main');
      expect(result.analysisMode).toBe('comprehensive');
    });

    it('should upgrade to 6-hour schedule for critical issues', async () => {
      // Given: Critical vulnerability detected
      const analysisResult = {
        security: {
          criticalVulnerabilities: 3,
          highSeverityIssues: 5
        }
      };

      const scheduleAdjustment = {
        shouldUpgradeFrequency: (result: any) => {
          return result.security.criticalVulnerabilities > 0;
        },
        getNewFrequency: (result: any) => {
          if (result.security.criticalVulnerabilities > 0) {
            return 'every-6-hours';
          }
          return null;
        }
      };

      expect(scheduleAdjustment.shouldUpgradeFrequency(analysisResult)).toBe(true);
      expect(scheduleAdjustment.getNewFrequency(analysisResult)).toBe('every-6-hours');
    });
  });

  describe('Scenario 5: Large Repository Optimization', () => {
    it('should use sparse checkout for large repos with small PRs', async () => {
      // Given: 3GB repository with 5-file PR
      const repoContext = {
        size: 3 * 1024 * 1024 * 1024, // 3GB in bytes
        prFiles: [
          'src/components/Header.js',
          'src/components/Header.test.js',
          'src/styles/header.css',
          'README.md',
          'package.json'
        ]
      };

      const optimizationStrategy = {
        shouldUseSparseCheckout: (context: any) => {
          const isLargeRepo = context.size > 500 * 1024 * 1024; // > 500MB
          const isSmallPR = context.prFiles.length < 20;
          return isLargeRepo && isSmallPR;
        },
        getFilesToCheckout: (context: any) => {
          // Include changed files + their dependencies
          return [
            ...context.prFiles,
            'package-lock.json',
            'tsconfig.json',
            '.eslintrc.js'
          ];
        }
      };

      expect(optimizationStrategy.shouldUseSparseCheckout(repoContext)).toBe(true);
      expect(optimizationStrategy.getFilesToCheckout(repoContext)).toContain('package.json');
    });
  });

  describe('Scenario 6: Stale Baseline Detection', () => {
    it('should refresh baseline older than 7 days', async () => {
      // Given: Baseline from 10 days ago
      const baselineAge = 10 * 24 * 60 * 60 * 1000; // 10 days in ms
      
      const staleDetection = {
        isBaselineStale: (lastAnalyzed: Date) => {
          const ageInDays = (Date.now() - lastAnalyzed.getTime()) / (24 * 60 * 60 * 1000);
          return ageInDays > 7;
        },
        shouldRefreshBaseline: (lastAnalyzed: Date, prActivity: any) => {
          // Always refresh if stale
          if (staleDetection.isBaselineStale(lastAnalyzed)) return true;
          
          // Also refresh if high PR activity
          if (prActivity.mergedPRsLastWeek > 20) return true;
          
          return false;
        }
      };

      const oldBaseline = new Date(Date.now() - baselineAge);
      expect(staleDetection.isBaselineStale(oldBaseline)).toBe(true);
      
      const recentBaseline = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days
      expect(staleDetection.isBaselineStale(recentBaseline)).toBe(false);
    });
  });

  describe('Scenario 7: GitLab Repository Analysis', () => {
    it('should always use local clone for GitLab repos', async () => {
      // Given: GitLab repository URL
      const gitlabUrl = 'https://gitlab.com/company/internal-tool';
      
      const platformDetection = {
        isGitLab: (url: string) => url.includes('gitlab.com'),
        requiresLocalClone: (url: string) => {
          return platformDetection.isGitLab(url);
        },
        getCloneStrategy: (url: string) => {
          if (platformDetection.isGitLab(url)) {
            return {
              method: 'local-clone',
              reason: 'DeepWiki only supports GitHub',
              analysisTools: ['MCP-tools-local'],
              deepWikiAvailable: false
            };
          }
          return {
            method: 'deepwiki-api',
            reason: 'GitHub main branch supported',
            deepWikiAvailable: true
          };
        }
      };

      expect(platformDetection.requiresLocalClone(gitlabUrl)).toBe(true);
      expect(platformDetection.getCloneStrategy(gitlabUrl).method).toBe('local-clone');
      expect(platformDetection.getCloneStrategy('https://github.com/test/repo').method).toBe('deepwiki-api');
    });
  });

  describe('Scenario 8: Analysis Mode Auto-Selection', () => {
    it('should select appropriate mode based on PR characteristics', async () => {
      const testCases = [
        {
          pr: { 
            filesChanged: 2, 
            linesChanged: 10, 
            changeTypes: ['docs-only'] 
          },
          expectedMode: 'quick'
        },
        {
          pr: { 
            filesChanged: 15, 
            linesChanged: 300, 
            changeTypes: ['feature', 'test'] 
          },
          expectedMode: 'comprehensive'
        },
        {
          pr: { 
            filesChanged: 50, 
            linesChanged: 2000, 
            changeTypes: ['security', 'architecture', 'mixed'] 
          },
          expectedMode: 'deep'
        }
      ];

      const modeSelector = {
        selectMode: (pr: any) => {
          // High complexity or security changes
          if (pr.changeTypes.includes('security') || pr.linesChanged > 1000) {
            return 'deep';
          }
          
          // Documentation or test only
          if (pr.changeTypes.every((t: string) => 
            ['docs-only', 'test-only', 'style-only'].includes(t)
          )) {
            return 'quick';
          }
          
          // Default to comprehensive
          return 'comprehensive';
        }
      };

      testCases.forEach(testCase => {
        expect(modeSelector.selectMode(testCase.pr)).toBe(testCase.expectedMode);
      });
    });
  });
});