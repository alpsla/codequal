#!/usr/bin/env ts-node

import axios from 'axios';
import { createLogger } from '../packages/core/src/utils/logger';

const logger = createLogger('test-deepwiki');

async function testDeepWikiWithMonitoring() {
  const API_URL = 'http://localhost:3001';
  
  // Test repository
  const testRepo = {
    repositoryUrl: 'https://github.com/sindresorhus/is',
    branch: 'main',
    prNumber: 123,
  };
  
  logger.info('🚀 Starting DeepWiki analysis test with monitoring');
  logger.info(`📦 Repository: ${testRepo.repositoryUrl}`);
  
  try {
    // 1. Check disk usage before
    const diskBefore = await axios.get(`${API_URL}/api/monitoring/deepwiki/metrics`);
    logger.info(`📊 Disk usage before: ${diskBefore.data.disk.percent}%`);
    
    // 2. Trigger DeepWiki analysis
    logger.info('🔍 Triggering DeepWiki analysis...');
    const analysisResponse = await axios.post(
      `${API_URL}/api/deepwiki/analyze`,
      testRepo,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      }
    );
    
    const analysisId = analysisResponse.data.analysisId;
    logger.info(`✅ Analysis started: ${analysisId}`);
    
    // 3. Monitor disk usage during analysis
    let analysisComplete = false;
    let maxDiskUsage = diskBefore.data.disk.percent;
    
    const monitorInterval = setInterval(async () => {
      try {
        const metrics = await axios.get(`${API_URL}/api/monitoring/deepwiki/metrics`);
        const currentUsage = metrics.data.disk.percent;
        
        logger.info(`📊 Current disk usage: ${currentUsage}% (repos: ${metrics.data.activeRepositories})`);
        
        if (currentUsage > maxDiskUsage) {
          maxDiskUsage = currentUsage;
        }
        
        // Check if analysis is complete
        const status = await axios.get(`${API_URL}/api/deepwiki/status/${analysisId}`);
        if (status.data.status === 'completed' || status.data.status === 'failed') {
          analysisComplete = true;
          clearInterval(monitorInterval);
        }
      } catch (error) {
        logger.error('Monitoring error:', error);
      }
    }, 5000); // Check every 5 seconds
    
    // 4. Wait for analysis to complete
    await new Promise(resolve => {
      const checkComplete = setInterval(() => {
        if (analysisComplete) {
          clearInterval(checkComplete);
          resolve(undefined);
        }
      }, 1000);
    });
    
    // 5. Get final results
    const finalMetrics = await axios.get(`${API_URL}/api/monitoring/deepwiki/metrics`);
    const result = await axios.get(`${API_URL}/api/deepwiki/report/${analysisId}`);
    
    logger.info('📈 Analysis Summary:');
    logger.info(`   - Model Used: ${result.data.metadata?.selectedModel || 'Vector DB Selection'}`);
    logger.info(`   - Peak Disk Usage: ${maxDiskUsage}%`);
    logger.info(`   - Final Disk Usage: ${finalMetrics.data.disk.percent}%`);
    logger.info(`   - Cleanup Success: ${finalMetrics.data.disk.percent <= diskBefore.data.disk.percent ? '✅' : '❌'}`);
    
    // 6. Display report excerpt
    logger.info('📄 Report Excerpt:');
    if (result.data.report) {
      const lines = result.data.report.split('\\n').slice(0, 20);
      lines.forEach(line => logger.info(`   ${line}`));
    }
    
  } catch (error) {
    logger.error('Test failed:', error);
    if (axios.isAxiosError(error)) {
      logger.error('Response:', error.response?.data);
    }
  }
}

// Run the test
testDeepWikiWithMonitoring().catch(console.error);