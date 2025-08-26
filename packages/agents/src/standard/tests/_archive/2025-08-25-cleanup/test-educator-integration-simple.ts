#!/usr/bin/env npx ts-node

import { ComparisonOrchestrator } from '../orchestrator/comparison-orchestrator';
import { ComparisonAgent } from '../comparison/comparison-agent';
import { EducatorAgent } from '../educator/educator-agent';

// Mock implementations
class MockConfigProvider {
  async getConfig() { return null; }
  async saveConfig(config: any) { return 'mock-id'; }
  async findSimilarConfigs() { return []; }
}

class MockSkillProvider {
  async getUserSkills() { return null; }
  async getTeamSkills() { return null; }
  async updateSkills() { return; }
  async getBatchUserSkills() { 
    return {
      userProfile: null,
      teamProfiles: []
    };
  }
}

class MockDataStore {
  async store() { return; }
  async retrieve() { return null; }
}

class MockResearcherAgent {
  async research() {
    return {
      provider: 'openai',
      model: 'gpt-4',
      confidence: 0.85
    };
  }
}

async function testEducatorIntegration() {
  console.log('🎯 Testing Educator Agent Integration with Report Generation\n');
  
  try {
    // Create mock infrastructure
    const configProvider = new MockConfigProvider() as any;
    const skillProvider = new MockSkillProvider() as any;
    const dataStore = new MockDataStore() as any;
    const researcherAgent = new MockResearcherAgent() as any;
    const educatorAgent = new EducatorAgent();
    const logger = console;
    
    // Create comparison agent
    const comparisonAgent = new ComparisonAgent(logger as any);
    
    // Create orchestrator
    const orchestrator = new ComparisonOrchestrator(
      configProvider,
      skillProvider,
      dataStore,
      researcherAgent,
      educatorAgent,
      logger,
      comparisonAgent as any
    );
    
    // Create mock analysis data with various issues
    const mockMainBranchAnalysis = {
      issues: [
        {
          id: 'issue-1',
          title: 'SQL Injection vulnerability in user input',
          message: 'User input is not sanitized before SQL query',
          severity: 'critical' as const,
          type: 'vulnerability' as const,
          category: 'security' as const,
          location: { file: 'api/users.ts', line: 45, column: 1 }
        },
        {
          id: 'issue-2',
          title: 'N+1 query problem in data fetching',
          message: 'Multiple database queries in loop',
          severity: 'high' as const,
          type: 'optimization' as const,
          category: 'performance' as const,
          location: { file: 'services/data.ts', line: 120, column: 1 }
        },
        {
          id: 'issue-3',
          title: 'Missing test coverage for auth module',
          message: 'No tests found for authentication logic',
          severity: 'medium' as const,
          type: 'code-smell' as const,
          category: 'code-quality' as const,
          location: { file: 'auth/login.ts', line: 1, column: 1 }
        }
      ]
    };
    
    const mockFeatureBranchAnalysis = {
      issues: [
        {
          id: 'issue-1',
          title: 'SQL Injection vulnerability in user input',
          message: 'User input is not sanitized before SQL query',
          severity: 'critical' as const,
          type: 'vulnerability' as const,
          category: 'security' as const,
          location: { file: 'api/users.ts', line: 45, column: 1 }
        },
        {
          id: 'issue-2',
          title: 'N+1 query problem in data fetching',
          message: 'Multiple database queries in loop',
          severity: 'high' as const,
          type: 'optimization' as const,
          category: 'performance' as const,
          location: { file: 'services/data.ts', line: 120, column: 1 }
        },
        {
          id: 'issue-4',
          title: 'Console.log statements in production code',
          message: 'Debug statements should be removed',
          severity: 'low' as const,
          type: 'code-smell' as const,
          category: 'code-quality' as const,
          location: { file: 'utils/logger.ts', line: 25, column: 1 }
        },
        {
          id: 'issue-5',
          title: 'XSS vulnerability in template rendering',
          message: 'User content not escaped in HTML template',
          severity: 'high' as const,
          type: 'vulnerability' as const,
          category: 'security' as const,
          location: { file: 'views/profile.tsx', line: 88, column: 1 }
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
      const edu = result.education as any;
      console.log('  Summary:', edu.summary);
      console.log('  Learning Paths:', edu.learningPaths?.length || 0);
      console.log('  Priority Topics:', edu.priorityTopics);
      console.log('  Resources:');
      console.log('    - Courses:', edu.resources?.courses?.length || 0);
      console.log('    - Articles:', edu.resources?.articles?.length || 0);
      console.log('    - Videos:', edu.resources?.videos?.length || 0);
      console.log('  Estimated Learning Time:', edu.estimatedLearningTime, 'minutes');
      console.log('  Team Recommendations:', edu.teamRecommendations?.length || 0);
      console.log('');
      
      // Show sample resources
      if (edu.resources?.courses?.length > 0) {
        console.log('  Sample Courses:');
        edu.resources.courses.slice(0, 2).forEach((course: any) => {
          console.log(`    - ${course.title} (${course.provider || 'Unknown'})`);
        });
      }
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
        
        console.log('📚 Educational Section Preview:');
        console.log('----------------------------------------');
        console.log(educationalSection.substring(0, 800));
        if (educationalSection.length > 800) {
          console.log('...[truncated]');
        }
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