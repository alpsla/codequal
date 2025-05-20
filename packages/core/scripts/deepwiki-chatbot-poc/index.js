/**
 * DeepWiki Chatbot POC - Main Entry Point
 * 
 * This file demonstrates how to use the DeepWiki chatbot components
 * to create a simple chatbot that can answer questions about code repositories.
 */

const ChatSession = require('./chat-session');
const readline = require('readline');

// Create a readline interface for command-line interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Run a demo chat session from the command line
 */
async function runCommandLineDemo() {
  console.log('DeepWiki Chatbot POC - Command Line Demo');
  console.log('----------------------------------------');
  console.log('Type "exit" to quit, "reset" to clear the conversation,');
  console.log('or enter a GitHub repository URL to analyze it.');
  console.log('');
  
  const chatSession = new ChatSession();
  
  try {
    await chatSession.initialize();
    console.log('Chat session initialized successfully.');
    
    // Main conversation loop
    let running = true;
    while (running) {
      const userInput = await askQuestion('You: ');
      
      if (userInput.toLowerCase() === 'exit') {
        running = false;
        continue;
      }
      
      if (userInput.toLowerCase() === 'reset') {
        chatSession.reset();
        console.log('Conversation reset.');
        continue;
      }
      
      // Check if input is a GitHub URL
      if (userInput.match(/https?:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+/)) {
        console.log(`Setting repository: ${userInput}`);
        console.log('This might take a moment...');
        
        const setRepoResult = await chatSession.setRepository({
          repositoryUrl: userInput,
          generateAnalysis: true
        });
        
        if (setRepoResult.success && setRepoResult.analysisSuccess) {
          console.log('Repository analysis completed successfully.');
          console.log('You can now ask questions about this repository.');
        } else {
          console.log('Repository set, but analysis encountered issues.');
          console.log('Some questions might not be answered correctly.');
        }
        continue;
      }
      
      console.log('Thinking...');
      
      // Send the message to the chat session
      const response = await chatSession.sendMessage({
        message: userInput
      });
      
      // Display the response
      console.log(`DeepWiki (${response.model_used || 'unknown model'}): ${response.message}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Clean up resources
    chatSession.cleanup();
    rl.close();
  }
}

/**
 * Prompt the user for input
 * 
 * @param {string} prompt - Text to display when prompting
 * @returns {Promise<string>} User input
 */
function askQuestion(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Programmatic usage example
 */
async function programmaticUsageExample() {
  const chatSession = new ChatSession();
  
  try {
    await chatSession.initialize();
    
    // Set a repository to analyze
    const repoUrl = 'https://github.com/expressjs/express';
    
    console.log(`Setting repository: ${repoUrl}`);
    await chatSession.setRepository({
      repositoryUrl: repoUrl,
      generateAnalysis: true
    });
    
    // Send a message
    const question = 'What is the architecture pattern of this project?';
    console.log(`Question: ${question}`);
    
    const response = await chatSession.sendMessage({
      message: question
    });
    
    console.log(`Response (using ${response.model_used || 'unknown model'}):`);
    console.log(response.message);
    
    // Ask a follow-up question
    const followUp = 'How does middleware work in this framework?';
    console.log(`\nFollow-up question: ${followUp}`);
    
    const followUpResponse = await chatSession.sendMessage({
      message: followUp
    });
    
    console.log(`Response (using ${followUpResponse.model_used || 'unknown model'}):`);
    console.log(followUpResponse.message);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    chatSession.cleanup();
  }
}

/**
 * Main function to run the demo
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--programmatic')) {
    await programmaticUsageExample();
  } else {
    await runCommandLineDemo();
  }
}

// Run the demo
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  ChatSession,
  runCommandLineDemo,
  programmaticUsageExample
};
