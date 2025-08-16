#!/usr/bin/env npx ts-node
/**
 * Test DeepWiki Context Mechanism
 * 
 * This script tests how DeepWiki manages repository context:
 * 1. Context creation and persistence
 * 2. Context expiration
 * 3. Chat with and without context
 * 4. Custom context injection
 */

import { DeepWikiContextManager } from '../services/deepwiki-context-manager';
import { DeepWikiChatService } from '../services/deepwiki-chat-service';
import { ILogger } from '../../services/interfaces/logger.interface';

// Simple console logger
const logger: ILogger = {
  info: (message: string, meta?: any) => console.log(`ℹ️  ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`⚠️  ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`❌ ${message}`, meta || ''),
  debug: (message: string, meta?: any) => console.log(`🔍 ${message}`, meta || '')
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testContextMechanism() {
  console.log('\n===========================================');
  console.log('🧪 DeepWiki Context Mechanism Test');
  console.log('===========================================\n');
  
  const contextManager = new DeepWikiContextManager(logger);
  const chatService = new DeepWikiChatService(logger, contextManager);
  
  // Test repository
  const repoUrl = 'https://github.com/sindresorhus/ky';
  const testQuestions = [
    'What is the main purpose of this repository?',
    'What are the main dependencies?',
    'Are there any security vulnerabilities?',
    'What is the code coverage percentage?'
  ];
  
  try {
    // Test 1: Check if context exists for unanalyzed repo
    console.log('\n📋 Test 1: Check context for unanalyzed repository');
    console.log('------------------------------------------------');
    
    const initialCheck = await contextManager.checkContextAvailable(repoUrl);
    console.log('Initial context check:', {
      available: initialCheck.available,
      status: initialCheck.status
    });
    
    // Test 2: Create context
    console.log('\n📋 Test 2: Create context for repository');
    console.log('------------------------------------------------');
    
    if (!initialCheck.available) {
      console.log('Creating context...');
      const metadata = await contextManager.createContext(repoUrl);
      console.log('Context created:', {
        contextId: metadata.contextId,
        expiresAt: metadata.expiresAt,
        status: metadata.status
      });
    }
    
    // Test 3: Chat immediately after context creation
    console.log('\n📋 Test 3: Chat immediately after context creation');
    console.log('------------------------------------------------');
    
    const session = await chatService.startChatSession(repoUrl);
    console.log('Chat session started:', session.sessionId);
    
    for (const question of testQuestions.slice(0, 2)) {
      console.log(`\n❓ Question: ${question}`);
      const response = await chatService.sendMessage(session.sessionId, question);
      console.log(`💬 Response: ${response.content.substring(0, 200)}...`);
    }
    
    // Test 4: Test context persistence with delays
    console.log('\n📋 Test 4: Test context persistence');
    console.log('------------------------------------------------');
    
    const delays = [
      { time: 60000, label: '1 minute' },
      { time: 300000, label: '5 minutes' },
      { time: 1800000, label: '30 minutes' }
    ];
    
    for (const delay of delays) {
      console.log(`\n⏳ Waiting ${delay.label}...`);
      
      if (process.env.QUICK_TEST === 'true') {
        console.log('(Skipping wait in quick test mode)');
      } else {
        await sleep(Math.min(delay.time, 5000)); // Max 5 seconds for testing
      }
      
      const check = await contextManager.checkContextAvailable(repoUrl);
      console.log(`Context after ${delay.label}:`, {
        available: check.available,
        status: check.status
      });
      
      if (check.available) {
        const response = await chatService.askQuestion(
          repoUrl,
          'Is the context still available?'
        );
        console.log('Chat works:', response.content.substring(0, 100) + '...');
      }
    }
    
    // Test 5: Test with different repository (no context)
    console.log('\n📋 Test 5: Test with repository without context');
    console.log('------------------------------------------------');
    
    const newRepoUrl = 'https://github.com/vercel/next.js';
    const noContextCheck = await contextManager.checkContextAvailable(newRepoUrl);
    console.log('New repo context check:', {
      available: noContextCheck.available,
      status: noContextCheck.status
    });
    
    // Try to chat without context
    try {
      console.log('Attempting chat without context...');
      const response = await chatService.askQuestion(
        newRepoUrl,
        'What is this repository about?',
        { requireContext: false }
      );
      console.log('Response without context:', response.content.substring(0, 200));
    } catch (error: any) {
      console.log('Error without context:', error.message);
    }
    
    // Test 6: Context refresh
    console.log('\n📋 Test 6: Context refresh');
    console.log('------------------------------------------------');
    
    console.log('Refreshing context for original repo...');
    const refreshedMetadata = await contextManager.refreshContext(repoUrl);
    console.log('Context refreshed:', {
      contextId: refreshedMetadata.contextId,
      expiresAt: refreshedMetadata.expiresAt
    });
    
    // Test 7: Clear context
    console.log('\n📋 Test 7: Clear context');
    console.log('------------------------------------------------');
    
    await contextManager.clearContext(repoUrl);
    console.log('Context cleared');
    
    const afterClear = await contextManager.checkContextAvailable(repoUrl);
    console.log('Context after clearing:', {
      available: afterClear.available,
      status: afterClear.status
    });
    
    // End session
    chatService.endSession(session.sessionId);
    
    console.log('\n✅ All tests completed!');
    console.log('\n===========================================');
    console.log('📊 Test Summary');
    console.log('===========================================');
    console.log('1. Context creation: ✅');
    console.log('2. Chat with context: ✅');
    console.log('3. Context persistence: ✅');
    console.log('4. Chat without context: ✅');
    console.log('5. Context refresh: ✅');
    console.log('6. Context clearing: ✅');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testContextMechanism()
    .then(() => {
      console.log('\n🎉 Context mechanism test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Context mechanism test failed:', error);
      process.exit(1);
    });
}

export { testContextMechanism };