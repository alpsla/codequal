import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe('Phase 1: Vector DB & DeepWiki Integration', () => {
  const TEST_REPO_ID = '550e8400-e29b-41d4-a716-446655440000'; // express-test-repo
  const TEST_TIMEOUT = 30000;

  beforeAll(() => {
    jest.setTimeout(TEST_TIMEOUT);
  });

  describe('DeepWiki Report Storage & Retrieval', () => {
    it('should retrieve DeepWiki summary from Vector DB', async () => {
      const startTime = Date.now();
      
      const { data, error } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('repository_id', TEST_REPO_ID)
        .eq('source_type', 'manual')
        .eq('metadata->>content_type', 'deepwiki_summary')
        .single();

      const duration = Date.now() - startTime;
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.content).toBeDefined();
      expect(data.metadata?.content_type).toBe('deepwiki_summary');
      expect(duration).toBeLessThan(500); // Performance requirement
      
      console.log(`Summary retrieval time: ${duration}ms`);
    });

    it('should retrieve specific DeepWiki sections', async () => {
      const startTime = Date.now();
      
      const { data, error } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('repository_id', TEST_REPO_ID)
        .eq('source_type', 'manual')
        .eq('metadata->>content_type', 'deepwiki_section')
        .eq('metadata->>section', 'Security Analysis');

      const duration = Date.now() - startTime;
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data).not.toBeNull();
      expect(data!.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(500);
      
      console.log(`Section retrieval time: ${duration}ms`);
    });

    it('should compile full DeepWiki context for agents', async () => {
      const startTime = Date.now();
      
      // Get all chunks for the repository
      const { data, error } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('repository_id', TEST_REPO_ID)
        .eq('source_type', 'manual')
        .in('metadata->>content_type', ['deepwiki_summary', 'deepwiki_section']);

      const duration = Date.now() - startTime;
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data).not.toBeNull();
      expect(data!.length).toBeGreaterThan(0);
      
      // Verify we have both summary and sections
      const summary = data!.find(chunk => chunk.metadata?.content_type === 'deepwiki_summary');
      const sections = data!.filter(chunk => chunk.metadata?.content_type === 'deepwiki_section');
      
      expect(summary).toBeDefined();
      expect(sections.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(500);
      
      console.log(`Full context compilation time: ${duration}ms`);
    });
  });

  describe('Performance Requirements', () => {
    it('should meet <500ms retrieval performance', async () => {
      const iterations = 5;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await supabase
          .from('analysis_chunks')
          .select('*')
          .eq('repository_id', TEST_REPO_ID)
          .limit(10);
        
        times.push(Date.now() - startTime);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      
      expect(avgTime).toBeLessThan(300);
      expect(maxTime).toBeLessThan(500);
      
      console.log(`Performance test - Avg: ${avgTime}ms, Max: ${maxTime}ms`);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing repository gracefully', async () => {
      const NONEXISTENT_REPO = '00000000-0000-0000-0000-000000000000';
      
      const { data, error } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('repository_id', NONEXISTENT_REPO)
        .eq('source_type', 'manual');
      
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe('Context Compilation for Orchestrator', () => {
    it('should compile context for Educational and Reporting agents', async () => {
      const startTime = Date.now();
      
      // Simulate orchestrator fetching context for final agents
      const { data, error } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('repository_id', TEST_REPO_ID)
        .eq('source_type', 'manual')
        .or('metadata->>importance_score.gte.0.8,metadata->>section.in.(Executive Summary,Key Findings)');
      
      const duration = Date.now() - startTime;
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(duration).toBeLessThan(500);
      
      // Verify context is suitable for agents
      const context = {
        summary: data!.find(chunk => chunk.metadata?.content_type === 'deepwiki_summary'),
        keyFindings: data!.filter(chunk => chunk.metadata?.importance_score >= 0.8)
      };
      
      expect(context.summary).toBeDefined();
      console.log(`Context compilation time: ${duration}ms`);
    });
  });
});
