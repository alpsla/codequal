#!/usr/bin/env ts-node

/**
 * Run Production Research
 * 
 * This script:
 * 1. Connects to the production API
 * 2. Triggers comprehensive research
 * 3. Updates all model configurations in Vector DB
 * 4. Shows the results and next scheduled update
 */

import axios from 'axios';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('RunProductionResearch');

// Configuration
const JWT_TOKEN = process.env.JWT_TOKEN || 'eyJhbGciOiJIUzI1NiIsImtpZCI6InVMS2F5R1RkcUVOTWJ1RUQiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2Z0amhtYmJjdXFqcW1tYmF5bXFiLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzYzFmMTQzOC1mNWJkLTQxZDItYTllZi1iZjQyNjhiNzdmZjciLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzUzMDQ1OTkzLCJpYXQiOjE3NTMwNDIzOTMsImVtYWlsIjoidGVzdDFAZ3JyLmxhIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6InRlc3QxQGdyci5sYSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6IjNjMWYxNDM4LWY1YmQtNDFkMi1hOWVmLWJmNDI2OGI3N2ZmNyJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im90cCIsInRpbWVzdGFtcCI6MTc1MzA0MjM5M31dLCJzZXNzaW9uX2lkIjoiZTNhNzk1NTEtMWM2OC00OGNmLThkNDUtZDZmZDViMzNjMTFlIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.zpVXnItx6vsHd-eV-208jcRsB54MdnfF4M-O3NAVdTc';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

async function runProductionResearch() {
  console.log('🚀 Production Research Update\n');
  console.log('================================================================================');
  console.log(`API: ${API_BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('================================================================================\n');

  try {
    // Step 1: Check API health
    console.log('1️⃣  Checking API health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('   ✅ API is healthy:', healthResponse.data.status);

    // Step 2: Get current configurations
    console.log('\n2️⃣  Getting current configurations...');
    try {
      const currentConfigsResponse = await axios.get(
        `${API_BASE_URL}/api/researcher/configurations`,
        {
          headers: {
            'Authorization': `Bearer ${JWT_TOKEN}`
          }
        }
      );
      
      const currentConfigs = currentConfigsResponse.data.configurations || [];
      console.log(`   📊 Found ${currentConfigs.length} existing configurations`);
      
      if (currentConfigs.length > 0) {
        console.log('\n   Current configurations:');
        currentConfigs.slice(0, 5).forEach((config: any) => {
          console.log(`   - ${config.role}: ${config.primary_model} (updated: ${config.last_updated})`);
        });
        if (currentConfigs.length > 5) {
          console.log(`   ... and ${currentConfigs.length - 5} more`);
        }
      }
    } catch (error) {
      console.log('   ⚠️  No existing configurations found (this is normal for first run)');
    }

    // Step 3: Trigger comprehensive research
    console.log('\n3️⃣  Triggering comprehensive research...');
    console.log('   This will fetch latest models from OpenRouter and update all configurations.');
    console.log('   ⏳ This may take 1-2 minutes...\n');

    const startTime = Date.now();
    
    const researchResponse = await axios.post(
      `${API_BASE_URL}/api/researcher/research`,
      {
        trigger: 'manual',
        source: 'production-research-update',
        updateAllRoles: true
      },
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const result = researchResponse.data;

    console.log(`   ✅ Research completed in ${duration} seconds!`);
    console.log(`   📦 Operation ID: ${result.operationId}`);
    console.log(`   🔍 Models evaluated: ${result.modelsEvaluated}`);
    console.log(`   💾 Configurations updated: ${result.configurationsUpdated}`);

    // Step 4: Display updated configurations
    if (result.selectedConfigurations && result.selectedConfigurations.length > 0) {
      console.log('\n4️⃣  Updated Configurations:');
      console.log('   ' + '─'.repeat(76));
      console.log('   Role            | Primary Model                    | Cost/M  | Reasoning');
      console.log('   ' + '─'.repeat(76));
      
      result.selectedConfigurations.forEach((config: any) => {
        const role = config.role.padEnd(15);
        const primary = `${config.primary.provider}/${config.primary.model}`.padEnd(32);
        const cost = config.primary.pricing ? 
          `$${((config.primary.pricing.input + config.primary.pricing.output) / 2).toFixed(2)}`.padEnd(7) : 
          'N/A'.padEnd(7);
        const reason = config.reasoning?.[0] || 'Optimal selection';
        
        console.log(`   ${role} | ${primary} | ${cost} | ${reason.substring(0, 40)}...`);
      });
      console.log('   ' + '─'.repeat(76));
    }

    // Step 5: Show next scheduled update
    console.log('\n5️⃣  Scheduling Information:');
    console.log(`   📅 Next automatic update: ${new Date(result.nextScheduledUpdate).toDateString()}`);
    console.log(`   ⏰ Time until next update: ${getTimeUntilNext(result.nextScheduledUpdate)}`);

    // Step 6: Verify Vector DB storage
    console.log('\n6️⃣  Verifying Vector DB storage...');
    const verifyResponse = await axios.get(
      `${API_BASE_URL}/api/researcher/configurations`,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`
        }
      }
    );

    const storedConfigs = verifyResponse.data.configurations || [];
    console.log(`   ✅ Confirmed ${storedConfigs.length} configurations stored in Vector DB`);

    // Summary
    console.log('\n================================================================================');
    console.log('✨ PRODUCTION RESEARCH COMPLETED SUCCESSFULLY!');
    console.log('================================================================================');
    console.log('\nKey Points:');
    console.log('• All model configurations have been updated with latest OpenRouter data');
    console.log('• Configurations are stored in Vector DB and will persist');
    console.log('• Next automatic update scheduled for ' + new Date(result.nextScheduledUpdate).toDateString());
    console.log('• The scheduler will automatically run quarterly updates');
    console.log('\nTo manually trigger another update, run this script again.');

  } catch (error) {
    console.error('\n❌ Research failed:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        console.error('\n⚠️  Authentication failed. Your JWT token may have expired.');
        console.error('Please get a new token and set JWT_TOKEN environment variable.');
      } else if (error.response?.status === 404) {
        console.error('\n⚠️  API endpoint not found. Make sure the API server is running with the latest code.');
      } else {
        console.error('Response:', error.response?.data);
      }
    }
  }
}

function getTimeUntilNext(nextDate: string): string {
  const now = new Date();
  const next = new Date(nextDate);
  const diff = next.getTime() - now.getTime();
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  return `${days} days, ${hours} hours`;
}

// Run the script
if (require.main === module) {
  runProductionResearch().catch(console.error);
}