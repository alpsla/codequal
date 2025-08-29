#!/usr/bin/env npx ts-node

/**
 * Test the Model Update Scheduler Service
 */

import { modelUpdateScheduler } from '../services/model-update-scheduler';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function showMenu() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('         Model Update Scheduler Test Menu');
  console.log('═══════════════════════════════════════════════════════');
  console.log('1. Start scheduler (runs every 3 months)');
  console.log('2. Stop scheduler');
  console.log('3. Run update NOW (for testing)');
  console.log('4. Check scheduler status');
  console.log('5. Exit');
  console.log('═══════════════════════════════════════════════════════');
}

async function handleChoice(choice: string) {
  switch (choice.trim()) {
    case '1':
      console.log('\n🚀 Starting scheduler...');
      modelUpdateScheduler.start();
      break;
      
    case '2':
      console.log('\n🛑 Stopping scheduler...');
      modelUpdateScheduler.stop();
      break;
      
    case '3':
      console.log('\n🔄 Running update immediately...');
      await modelUpdateScheduler.runNow();
      break;
      
    case '4':
      const status = modelUpdateScheduler.getStatus();
      console.log('\n📊 Scheduler Status:');
      console.log(`   Running: ${status.isRunning ? '✅ Yes' : '❌ No'}`);
      console.log(`   Updating: ${status.isUpdating ? '🔄 In Progress' : '⏸️  Idle'}`);
      console.log(`   Next Run: ${status.nextRun}`);
      break;
      
    case '5':
      console.log('\n👋 Exiting...');
      modelUpdateScheduler.stop();
      rl.close();
      process.exit(0);
      break;
      
    default:
      console.log('\n⚠️  Invalid choice. Please try again.');
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('     Model Update Scheduler Service Test');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\nThis service automatically updates model configurations');
  console.log('every 3 months to ensure we use the latest AI models.');
  
  const promptUser = () => {
    showMenu();
    rl.question('\nEnter your choice (1-5): ', async (choice) => {
      await handleChoice(choice);
      if (choice !== '5') {
        setTimeout(promptUser, 1000);
      }
    });
  };
  
  promptUser();
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down scheduler...');
  modelUpdateScheduler.stop();
  rl.close();
  process.exit(0);
});

main();