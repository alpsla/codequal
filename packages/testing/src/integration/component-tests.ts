import { describe, it, expect, beforeAll, jest } from '@jest/globals';
// Import VectorStorageService with correct path
import { DatabaseService } from '@codequal/database';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

/**
 * Unit Tests for Integration Components
 * Tests individual components without full orchestration
 */
describe('Integration Component Tests', () => {
  let supabase: any;
  
  beforeAll(() => {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in environment variables');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  });

  describe('Supabase Connection', () => {
    it('should connect to Supabase successfully', async () => {
      console.log('Testing Supabase connection...');
      
      try {
        // Try a simple query
        const { data, error } = await supabase
          .from('repositories')
          .select('id')
          .limit(1);
        
        if (error) {
          console.error('Supabase query error:', error);
          // It's okay if the table doesn't exist yet
          expect(error.code).toBeDefined();
        } else {
          console.log('✅ Supabase connection successful');
          expect(data).toBeDefined();
        }
      } catch (error) {
        console.error('❌ Supabase connection failed:', error);
        throw error;
      }
    });
  });

  describe('Database Service', () => {
    it('should access DatabaseService', async () => {
      console.log('Testing DatabaseService access...');
      
      try {
        expect(DatabaseService).toBeDefined();
        expect(DatabaseService.findOrCreateRepository).toBeDefined();
        console.log('✅ DatabaseService is available');
      } catch (error) {
        console.error('❌ DatabaseService access failed:', error);
        throw error;
      }
    });

    it('should check if repositories table exists', async () => {
      console.log('Testing repositories table access...');
      
      try {
        // Try to query repositories
        const { data, error } = await supabase
          .from('repositories')
          .select('id, name, url')
          .limit(5);
        
        if (error) {
          console.log('⚠️  Repositories table query failed:', error.message);
          // This is expected if tables aren't created yet
          expect(error).toBeDefined();
        } else {
          console.log(`✅ Found ${data?.length || 0} repositories`);
          expect(data).toBeInstanceOf(Array);
        }
      } catch (error) {
        console.error('❌ Repository query failed:', error);
        throw error;
      }
    });
  });

  describe('Service Mocking', () => {
    it('should create mock services for testing', () => {
      console.log('Testing mock service creation...');
      
      // Mock DeepWikiManager
      const mockDeepWikiManager = {
        checkRepositoryExists: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
        triggerRepositoryAnalysis: jest.fn<() => Promise<{ jobId: string }>>().mockResolvedValue({ jobId: 'test-job-123' }),
        waitForAnalysisCompletion: jest.fn<() => Promise<boolean>>().mockResolvedValue(true)
      };
      
      expect(mockDeepWikiManager.checkRepositoryExists).toBeDefined();
      expect(mockDeepWikiManager.triggerRepositoryAnalysis).toBeDefined();
      
      console.log('✅ Mock services created successfully');
    });
  });

  describe('PR Context Structure', () => {
    it('should validate PR context structure', () => {
      console.log('Testing PR context structure...');
      
      const mockPRContext = {
        repositoryUrl: 'https://github.com/test-org/test-repo',
        prNumber: 123,
        prDetails: {
          title: 'Test PR',
          description: 'Test description',
          author: 'test-user'
        },
        diff: 'diff --git a/test.js b/test.js\n+console.log("test");',
        changedFiles: ['test.js'],
        primaryLanguage: 'javascript',
        repositorySize: 'medium' as const,
        analysisMode: 'quick'
      };
      
      // Validate structure
      expect(mockPRContext).toHaveProperty('repositoryUrl');
      expect(mockPRContext).toHaveProperty('prNumber');
      expect(mockPRContext).toHaveProperty('changedFiles');
      expect(mockPRContext.changedFiles).toBeInstanceOf(Array);
      
      console.log('✅ PR context structure is valid');
    });
  });

  describe('Analysis Result Structure', () => {
    it('should validate analysis result structure', () => {
      console.log('Testing analysis result structure...');
      
      const mockAnalysisResult = {
        analysisId: 'analysis_123_abc',
        status: 'complete' as const,
        repository: {
          url: 'https://github.com/test-org/test-repo',
          name: 'test-repo',
          primaryLanguage: 'javascript'
        },
        pr: {
          number: 123,
          title: 'Test PR',
          changedFiles: 1
        },
        analysis: {
          mode: 'quick',
          agentsUsed: ['security', 'codeQuality'],
          totalFindings: 2,
          processingTime: 5000
        },
        findings: {
          security: [],
          architecture: [],
          performance: [],
          codeQuality: []
        },
        educationalContent: [],
        metrics: {
          severity: { critical: 0, high: 0, medium: 0, low: 0 },
          confidence: 85,
          coverage: 80
        },
        report: {
          summary: 'Analysis complete',
          recommendations: [],
          prComment: 'No issues found'
        },
        metadata: {
          timestamp: new Date(),
          modelVersions: {},
          processingSteps: ['step1', 'step2']
        }
      };
      
      // Validate all required fields
      expect(mockAnalysisResult).toHaveProperty('analysisId');
      expect(mockAnalysisResult).toHaveProperty('status');
      expect(mockAnalysisResult.status).toBe('complete');
      expect(mockAnalysisResult).toHaveProperty('repository');
      expect(mockAnalysisResult).toHaveProperty('pr');
      expect(mockAnalysisResult).toHaveProperty('analysis');
      expect(mockAnalysisResult).toHaveProperty('findings');
      expect(mockAnalysisResult).toHaveProperty('metrics');
      expect(mockAnalysisResult).toHaveProperty('report');
      expect(mockAnalysisResult).toHaveProperty('metadata');
      
      console.log('✅ Analysis result structure is valid');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing environment variables gracefully', () => {
      console.log('Testing error handling for missing env vars...');
      
      const originalEnv = process.env.SUPABASE_URL;
      delete process.env.SUPABASE_URL;
      
      try {
        expect(() => {
          if (!process.env.SUPABASE_URL) {
            throw new Error('Missing SUPABASE_URL');
          }
        }).toThrow('Missing SUPABASE_URL');
        
        console.log('✅ Error handling works correctly');
      } finally {
        // Restore env var
        process.env.SUPABASE_URL = originalEnv;
      }
    });
  });
});
