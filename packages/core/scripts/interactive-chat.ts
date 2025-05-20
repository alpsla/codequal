#!/usr/bin/env node

/**
 * DeepWiki Interactive Chat CLI
 * 
 * A command-line tool for chatting with repositories using DeepWiki.
 * Provides an interactive terminal-based chat interface with support for:
 * - Basic chat with repositories
 * - Targeted perspective questions
 * - Conversation history
 * - Multiple model support
 * 
 * Usage:
 * ```
 * # Chat with a repository
 * ts-node interactive-chat.ts --repo AsyncFuncAI/deepwiki-open
 * 
 * # Specify a model
 * ts-node interactive-chat.ts --repo AsyncFuncAI/deepwiki-open --provider openai --model gpt-4o
 * 
 * # Start with a specific perspective
 * ts-node interactive-chat.ts --repo AsyncFuncAI/deepwiki-open --perspective architecture
 * ```
 */

import { DeepWikiChatService, RepositoryContext, DeepWikiClient, DeepWikiProvider, ModelConfig } from '../src/deepwiki';
import { Logger } from '../src/utils/logger';
import * as readline from 'readline';

// Create a simple logger
const logger = {
  info: (message: string, context?: any) => {
    if (process.env.DEBUG) {
      console.log(`[INFO] ${message}`, context || '');
    }
  },
  error: (message: string, context?: any) => console.error(`[ERROR] ${message}`, context || ''),
  warn: (message: string, context?: any) => {
    if (process.env.DEBUG) {
      console.warn(`[WARN] ${message}`, context || '');
    }
  },
  debug: (message: string, context?: any) => {
    if (process.env.DEBUG) {
      console.debug(`[DEBUG] ${message}`, context || '');
    }
  }
} as Logger;

// Parse command line arguments
const args = process.argv.slice(2);
const options: {
  repo?: string;
  provider?: DeepWikiProvider;
  model?: string;
  perspective?: string;
  url?: string;
} = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--repo' && i + 1 < args.length) {
    options.repo = args[++i];
  } else if (arg === '--provider' && i + 1 < args.length) {
    options.provider = args[++i] as DeepWikiProvider;
  } else if (arg === '--model' && i + 1 < args.length) {
    options.model = args[++i];
  } else if (arg === '--perspective' && i + 1 < args.length) {
    options.perspective = args[++i];
  } else if (arg === '--url' && i + 1 < args.length) {
    options.url = args[++i];
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
DeepWiki Interactive Chat CLI

A command-line tool for chatting with repositories using DeepWiki.

Options:
  --repo OWNER/REPO       Repository to chat with (e.g., AsyncFuncAI/deepwiki-open)
  --provider PROVIDER     AI provider to use (openai, anthropic, google, openrouter)
  --model MODEL           Specific model to use
  --perspective TYPE      Start with a perspective question (architecture, security, etc.)
  --url URL               DeepWiki server URL (default: http://localhost:8000)
  --help, -h              Show this help message
    `);
    process.exit(0);
  }
}

// Validate repository
if (!options.repo) {
  console.error('Error: Repository is required (--repo OWNER/REPO)');
  process.exit(1);
}

// Parse repository
const repoParts = options.repo.split('/');
if (repoParts.length !== 2) {
  console.error('Error: Repository must be in format OWNER/REPO');
  process.exit(1);
}

const repository: RepositoryContext = {
  owner: repoParts[0],
  repo: repoParts[1],
  repoType: 'github'
};

// DeepWiki server URL
const deepWikiUrl = options.url || process.env.DEEPWIKI_URL || 'http://localhost:8000';

// Create model config if provider and model are specified
let modelConfig: ModelConfig<DeepWikiProvider> | undefined;
if (options.provider && options.model) {
  modelConfig = {
    provider: options.provider,
    model: options.model as any // Type handling simplification for this script
  };
}

// Chat history
const history: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Start the interactive chat session
 */
async function startChat() {
  try {
    console.log('\n🤖 DeepWiki Interactive Chat');
    console.log('----------------------------');
    console.log(`📦 Repository: ${repository.owner}/${repository.repo}`);
    if (modelConfig) {
      console.log(`🧠 Model: ${modelConfig.provider}/${modelConfig.model}`);
    }
    console.log('----------------------------');
    console.log('Type your questions about the repository. Type /exit to quit.');
    console.log('Special commands:');
    console.log('  /clear - Clear chat history');
    console.log('  /perspectives - List available perspectives');
    console.log('  /perspective PERSPECTIVE [QUESTION] - Ask from a specific perspective');
    console.log('  /exit - Exit the chat');
    console.log('----------------------------\n');
    
    // Create the DeepWiki client
    const client = new DeepWikiClient(deepWikiUrl, logger);
    
    // Create the chat service
    const chatService = new DeepWikiChatService(client, logger);
    
    // If a perspective was specified, start with that
    if (options.perspective) {
      await handlePerspectiveQuestion(chatService, options.perspective);
    }
    
    // Start the main chat loop
    chatLoop(chatService);
    
  } catch (error) {
    console.error('Error starting chat:', error);
    process.exit(1);
  }
}

/**
 * Main chat loop
 * @param chatService DeepWiki chat service
 */
function chatLoop(chatService: DeepWikiChatService) {
  rl.question('\n> ', async (message) => {
    try {
      if (message.trim() === '/exit') {
        console.log('\nGoodbye! 👋');
        rl.close();
        process.exit(0);
      } else if (message.trim() === '/clear') {
        history.length = 0;
        console.log('\nChat history cleared.');
        chatLoop(chatService);
      } else if (message.trim() === '/perspectives') {
        const perspectives = chatService.getAvailablePerspectives();
        console.log('\nAvailable perspectives:');
        perspectives.forEach(p => console.log(`- ${p}`));
        chatLoop(chatService);
      } else if (message.trim().startsWith('/perspective ')) {
        const args = message.trim().slice('/perspective '.length).split(' ');
        const perspective = args[0];
        const question = args.slice(1).join(' ');
        
        await handlePerspectiveQuestion(chatService, perspective, question);
        chatLoop(chatService);
      } else {
        // Add user message to history
        history.push({ role: 'user', content: message });
        
        console.log('\nThinking...');
        
        // Get response
        const response = await chatService.sendMessage(
          repository,
          message,
          history,
          modelConfig
        );
        
        // Print response
        console.log(`\n🤖 [${response.provider}/${response.model}]`);
        console.log(response.content);
        
        // Add response to history
        history.push({ role: 'assistant', content: response.content });
        
        // Continue the loop
        chatLoop(chatService);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      chatLoop(chatService);
    }
  });
}

/**
 * Handle a perspective question
 * @param chatService DeepWiki chat service
 * @param perspective Perspective to use
 * @param question Optional specific question
 */
async function handlePerspectiveQuestion(
  chatService: DeepWikiChatService,
  perspective: string,
  question?: string
) {
  try {
    // Get available perspectives
    const availablePerspectives = chatService.getAvailablePerspectives();
    
    // Check if the perspective is valid
    if (!availablePerspectives.includes(perspective)) {
      console.log(`\n❌ Invalid perspective: ${perspective}`);
      console.log('Available perspectives:');
      availablePerspectives.forEach(p => console.log(`- ${p}`));
      return;
    }
    
    console.log(`\n🔍 Analyzing from ${perspective} perspective...`);
    
    // Get response
    const response = await chatService.askPerspectiveQuestion(
      repository,
      perspective,
      question,
      modelConfig
    );
    
    // Print response
    console.log(`\n🤖 [${response.provider}/${response.model}]`);
    console.log(response.content);
    
    // Add to history
    history.push({ 
      role: 'user', 
      content: question 
        ? `From the ${perspective} perspective: ${question}` 
        : `Analyze this repository from the ${perspective} perspective.`
    });
    history.push({ role: 'assistant', content: response.content });
    
  } catch (error) {
    console.error('Error processing perspective question:', error);
  }
}

// Start the chat session
startChat().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
