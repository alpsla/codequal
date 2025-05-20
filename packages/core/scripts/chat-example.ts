/**
 * DeepWiki Chat Service Example
 * 
 * This script demonstrates how to use the DeepWikiChatService to chat with repositories.
 * The example includes both simple message sending and targeted perspective questioning.
 * 
 * To run this example:
 * 1. Make sure DeepWiki server is running (see start-deepwiki-server.sh)
 * 2. Run: `ts-node chat-example.ts`
 */

import { DeepWikiChatService, RepositoryContext } from '../src/deepwiki';
import { DeepWikiClient } from '../src/deepwiki/DeepWikiClient';
import { Logger } from '../src/utils/logger';

// Create a simple logger
const logger = {
  info: (message: string, context?: any) => console.log(`[INFO] ${message}`, context || ''),
  error: (message: string, context?: any) => console.error(`[ERROR] ${message}`, context || ''),
  warn: (message: string, context?: any) => console.warn(`[WARN] ${message}`, context || ''),
  debug: (message: string, context?: any) => console.debug(`[DEBUG] ${message}`, context || '')
} as Logger;

// DeepWiki server URL (update to match your environment)
const deepWikiUrl = process.env.DEEPWIKI_URL || 'http://localhost:8000';

// Example repository to chat about
const repository: RepositoryContext = {
  owner: 'AsyncFuncAI',
  repo: 'deepwiki-open',
  repoType: 'github'
};

/**
 * Main function to run the example
 */
async function main() {
  try {
    // Create the DeepWiki client
    const client = new DeepWikiClient(deepWikiUrl, logger);
    
    // Create the chat service
    const chatService = new DeepWikiChatService(client, logger);
    
    console.log('DeepWiki Chat Service Example\n');
    console.log(`Repository: ${repository.owner}/${repository.repo}\n`);
    
    // Example 1: Basic chat message
    console.log('Example 1: Basic chat message');
    console.log('-----------------------------');
    
    const basicQuestion = 'What are the main components of this repository and how are they organized?';
    console.log(`Question: ${basicQuestion}\n`);
    
    const basicResponse = await chatService.sendMessage(repository, basicQuestion);
    
    console.log(`Response (using ${basicResponse.provider}/${basicResponse.model}):\n`);
    console.log(basicResponse.content);
    console.log('\n');
    
    // Example 2: Chat with history
    console.log('Example 2: Chat with history');
    console.log('---------------------------');
    
    const followUpQuestion = 'How is the wiki generation process implemented?';
    console.log(`Follow-up Question: ${followUpQuestion}\n`);
    
    const historyResponse = await chatService.sendMessage(
      repository,
      followUpQuestion,
      [
        { role: 'user', content: basicQuestion },
        { role: 'assistant', content: basicResponse.content }
      ]
    );
    
    console.log(`Response (using ${historyResponse.provider}/${historyResponse.model}):\n`);
    console.log(historyResponse.content);
    console.log('\n');
    
    // Example 3: Targeted perspective question
    console.log('Example 3: Targeted perspective question');
    console.log('---------------------------------------');
    
    const perspective = 'architecture';
    console.log(`Perspective: ${perspective}\n`);
    
    const perspectiveResponse = await chatService.askPerspectiveQuestion(
      repository,
      perspective
    );
    
    console.log(`Response (using ${perspectiveResponse.provider}/${perspectiveResponse.model}):\n`);
    console.log(perspectiveResponse.content);
    console.log('\n');
    
    // Example 4: Custom perspective question
    console.log('Example 4: Custom perspective question');
    console.log('-------------------------------------');
    
    const customPerspective = 'security';
    const customQuestion = 'Are there any potential security vulnerabilities in the API endpoints?';
    console.log(`Perspective: ${customPerspective}`);
    console.log(`Question: ${customQuestion}\n`);
    
    const customResponse = await chatService.askPerspectiveQuestion(
      repository,
      customPerspective,
      customQuestion
    );
    
    console.log(`Response (using ${customResponse.provider}/${customResponse.model}):\n`);
    console.log(customResponse.content);
    
  } catch (error) {
    console.error('Error running example:', error);
  }
}

// Run the example
main().catch(console.error);
