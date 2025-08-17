#!/usr/bin/env npx ts-node

/**
 * Note: This test file is currently disabled due to missing dependencies
 * TODO: Update imports and restore functionality
 */

// TypeScript test file - currently disabled
/* eslint-disable */

import { ComparisonOrchestrator } from '../orchestrator/comparison-orchestrator';
import { ComparisonAgent } from '../comparison/comparison-agent';
import { EducatorAgent } from '../educator/educator-agent';
import { ResearcherAgent } from '../researcher/researcher-agent';
import { DeepWikiApiWrapper } from '../services/deepwiki-api-wrapper';
import { SupabaseSkillProvider } from '../infrastructure/supabase/supabase-skill-provider';
import { SupabaseConfigProvider } from '../infrastructure/supabase/supabase-config-provider';
import { SupabaseDataStore } from '../infrastructure/supabase/supabase-data-store';
import { LocationEnhancer } from '../services/location-enhancer';
import { BatchLocationEnhancer } from '../services/batch-location-enhancer';

async function testEducatorIntegration() {
  console.log('🎯 Testing Educator Agent Integration with Report Generation\n');
  
  try {
    // Create test infrastructure
    const skillProvider = new SupabaseSkillProvider();
    const configProvider = new SupabaseConfigProvider();
    const dataStore = new SupabaseDataStore();
    
    // Create service instances
    const deepWikiService = new DeepWikiApiWrapper();
    const locationEnhancer = new LocationEnhancer();
    const batchLocationEnhancer = new BatchLocationEnhancer();
    
    // Create agents
    const comparisonAgent = new ComparisonAgent(deepWikiService, skillProvider);
    const educatorAgent = new EducatorAgent();
    const researcherAgent = new ResearcherAgent();
    
    // Create orchestrator
    const orchestrator = new ComparisonOrchestrator(
      comparisonAgent,
      researcherAgent,
      educatorAgent,
      configProvider,
      skillProvider,
      dataStore,
      locationEnhancer,
      batchLocationEnhancer
    );
    
    // Create mock analysis data with various issues
    const mockMainBranchAnalysis = {
      issues: [
        {
          id: 'issue-1',
          title: 'SQL Injection vulnerability in user input',
          message: 'User input is not sanitized before SQL query',
          severity: 'critical',
          type: 'security',
          location: { file: 'api/users.ts', line: 45 }
        },
        {
          id: 'issue-2',
          title: 'N+1 query problem in data fetching',
          message: 'Multiple database queries in loop',
          severity: 'high',
          type: 'performance',
          location: { file: 'services/data.ts', line: 120 }
        },
        {
          id: 'issue-3',
          title: 'Missing test coverage for auth module',
          message: 'No tests found for authentication logic',
          severity: 'medium',
          type: 'testing',
          location: { file: 'auth/login.ts', line: 1 }
        }
      ]
    };
    
    const mockFeatureBranchAnalysis = {
      issues: [
        {
          id: 'issue-1',
          title: 'SQL Injection vulnerability in user input',
          message: 'User input is not sanitized before SQL query',
          severity: 'critical',
          type: 'security',
          location: { file: 'api/users.ts', line: 45 }
        },
        {
          id: 'issue-2',
          title: 'N+1 query problem in data fetching',
          message: 'Multiple database queries in loop',
          severity: 'high',
          type: 'performance',
          location: { file: 'services/data.ts', line: 120 }
        },
        {
          id: 'issue-4',
          title: 'Console.log statements in production code',
          message: 'Debug statements should be removed',
          severity: 'low',
          type: 'code-quality',
          location: { file: 'utils/logger.ts', line: 25 }
        },
        {
          id: 'issue-5',
          title: 'XSS vulnerability in template rendering',
          message: 'User content not escaped in HTML template',
          severity: 'high',
          type: 'security',
          location: { file: 'views/profile.tsx', line: 88 }
        }
      ]
    };
    
    // Create comparison request
    const request = {
      mainBranchAnalysis: mockMainBranchAnalysis,
      featureBranchAnalysis: mockFeatureBranchAnalysis,
      prMetadata: {
        repository_url: 'https://github.com/test/repo',
        number: 123,
        title: 'Add new user authentication features',
        author: 'developer123',
        created_at: new Date().toISOString(),
        files_changed: 15,
        additions: 450,
        deletions: 120
      },
      userId: 'test-user-123',
      teamId: 'test-team-456',
      language: 'typescript',
      sizeCategory: 'medium' as const,
      includeEducation: true,  // Enable education
      generateReport: true
    };
    
    console.log('📚 Executing orchestrated comparison with Educator integration...\n');
    
    // Execute the comparison
    const result = await orchestrator.executeComparison(request);
    
    console.log('✅ Orchestration completed successfully!\n');
    
    // Check if educational content was generated
    if (result.education) {
      console.log('📖 Educational Content Generated:');
      console.log('  Summary:', result.education.summary);
      console.log('  Learning Paths:', result.education.learningPaths?.length || 0);
      console.log('  Priority Topics:', result.education.priorityTopics);
      console.log('  Resources:');
      console.log('    - Courses:', result.education.resources?.courses?.length || 0);
      console.log('    - Articles:', result.education.resources?.articles?.length || 0);
      console.log('    - Videos:', result.education.resources?.videos?.length || 0);
      console.log('  Estimated Learning Time:', result.education.estimatedLearningTime, 'minutes');
      console.log('  Team Recommendations:', result.education.teamRecommendations?.length || 0);
      console.log('');
    } else {
      console.log('⚠️  No educational content generated\n');
    }
    
    // Check if report contains educational insights
    if (result.report) {
      const hasEducationalSection = result.report.includes('## 8. Educational Insights');
      const hasLearningPaths = result.report.includes('Learning Paths');
      const hasResources = result.report.includes('Educational Resources');
      
      console.log('📄 Report Analysis:');
      console.log('  Has Educational Section:', hasEducationalSection);
      console.log('  Has Learning Paths:', hasLearningPaths);
      console.log('  Has Resources:', hasResources);
      console.log('');
      
      // Extract and display the educational section
      if (hasEducationalSection) {
        const eduStart = result.report.indexOf('## 8. Educational Insights');
        const eduEnd = result.report.indexOf('## 9.', eduStart);
        const educationalSection = result.report.substring(eduStart, eduEnd > 0 ? eduEnd : undefined);
        
        console.log('📚 Educational Section from Report:');
        console.log('----------------------------------------');
        console.log(educationalSection.substring(0, 1000) + '...');
        console.log('----------------------------------------\n');
      }
    }
    
    // Save the report to a file for review
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(__dirname, '../../reports/test-educator-integration-report.md');
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, result.report);
    console.log(`📝 Full report saved to: ${reportPath}\n`);
    
    console.log('✅ Educator integration test completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testEducatorIntegration().catch(console.error);
}

export { testEducatorIntegration };