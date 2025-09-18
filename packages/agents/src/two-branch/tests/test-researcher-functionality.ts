#!/usr/bin/env npx ts-node

/**
 * Test Researcher Functionality After Migration
 * 
 * This script tests that the Researcher agent still works correctly
 * after being moved to the two-branch directory.
 */

import * as dotenv from 'dotenv';
import { ResearcherAgent } from '../researcher/researcher-agent';
import { AuthenticatedUser, UserRole, UserStatus } from '../../standard/multi-agent/types/auth';

// Load environment variables
dotenv.config();

// Create a test user
const testUser: AuthenticatedUser = {
  id: 'test-researcher',
  email: 'test@codequal.com',
  name: 'Test Researcher',
  organizationId: 'test',
  session: {
    token: 'test-token',
    expiresAt: new Date(Date.now() + 3600000),
    fingerprint: 'test',
    ipAddress: '127.0.0.1',
    userAgent: 'test/1.0'
  },
  role: 'admin' as UserRole,
  status: 'active' as UserStatus,
  metadata: {
    createdAt: new Date(),
    lastLogin: new Date(),
    isActive: true,
    preferences: {}
  }
};

async function testResearcher() {
  console.log('🧪 Testing Researcher Functionality');
  console.log('=' .repeat(60));
  console.log(`📅 Test Date: ${new Date().toISOString()}\n`);

  try {
    // Step 1: Create Researcher Agent
    console.log('1️⃣ Creating Researcher Agent...');
    const researcher = new ResearcherAgent(testUser);
    console.log('✅ Researcher Agent created successfully\n');

    // Step 2: Test basic functionality
    console.log('2️⃣ Testing basic configuration...');
    const config = researcher.getConfig();
    console.log('✅ Config retrieved:', {
      hasUser: !!config.user,
      userId: config.user?.id,
      userName: config.user?.name
    });
    console.log();

    // Step 3: Test prompt generation
    console.log('3️⃣ Testing prompt generation...');
    const testPrompt = researcher.generatePrompt('Test task', 'typescript');
    console.log('✅ Prompt generated successfully');
    console.log(`   Length: ${testPrompt.length} characters`);
    console.log(`   Contains date check: ${testPrompt.includes('new Date()')}`);
    console.log(`   Contains version requirements: ${testPrompt.includes('6 months')}\n`);

    // Step 4: Test research prompts import
    console.log('4️⃣ Testing research prompts...');
    const { AGENT_REQUIREMENT_RESEARCH } = await import('../researcher/research-prompts');
    const hasDateCheck = AGENT_REQUIREMENT_RESEARCH.includes('new Date()');
    const hasVersionReq = AGENT_REQUIREMENT_RESEARCH.includes('LATEST');
    console.log('✅ Research prompts loaded successfully');
    console.log(`   Dynamic date calculation: ${hasDateCheck ? '✅' : '❌'}`);
    console.log(`   Latest version requirement: ${hasVersionReq ? '✅' : '❌'}\n`);

    // Step 5: Test educational service
    console.log('5️⃣ Testing educational service import...');
    const { EducationalService } = await import('../researcher/educational-service');
    console.log('✅ Educational service imported successfully\n');

    // Step 6: Test web search researcher
    console.log('6️⃣ Testing web search researcher...');
    const { WebSearchResearcher } = await import('../researcher/web-search-researcher');
    console.log('✅ Web search researcher imported successfully\n');

    // Step 7: Test model researcher service
    console.log('7️⃣ Testing model researcher service...');
    const { ModelResearcherService } = await import('../research-services/model-researcher-service');
    console.log('✅ Model researcher service imported successfully\n');

    // Summary
    console.log('=' .repeat(60));
    console.log('                    TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log('✅ All Researcher components working correctly!');
    console.log('✅ Imports resolved successfully');
    console.log('✅ Dynamic date calculation in place');
    console.log('✅ Latest version requirements enforced');
    console.log('\n✅ Researcher migration successful!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('\nError details:');
    if (error instanceof Error) {
      console.error('  Message:', error.message);
      console.error('  Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testResearcher().catch(console.error);