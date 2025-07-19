#!/usr/bin/env ts-node

/**
 * E2E Data Flow Validator
 * Part 2: Identify missing data in the flow
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });
config({ path: resolve(__dirname, '../../.env.test') });

const API_URL = process.env.API_URL || 'http://localhost:3001';
const API_KEY = process.env.TEST_API_KEY || 'test_key';

// Expected data structure at each stage
interface DataFlowExpectation {
  stage: string;
  required: string[];
  optional: string[];
  validation: (data: any) => { valid: boolean; missing: string[]; issues: string[] };
}

// Data flow stages and expectations
const DATA_FLOW_STAGES: Record<string, DataFlowExpectation[]> = {
  'PR_ANALYSIS': [
    {
      stage: 'Initial Request',
      required: ['repositoryUrl', 'prNumber'],
      optional: ['analysisMode', 'accessToken', 'baseBranch'],
      validation: (data) => {
        const missing: string[] = [];
        const issues: string[] = [];
        
        if (!data.repositoryUrl) missing.push('repositoryUrl');
        if (!data.prNumber) missing.push('prNumber');
        
        if (data.repositoryUrl && !data.repositoryUrl.includes('github.com')) {
          issues.push('repositoryUrl must be a GitHub URL');
        }
        
        if (data.prNumber && (typeof data.prNumber !== 'number' || data.prNumber < 1)) {
          issues.push('prNumber must be a positive number');
        }
        
        return { valid: missing.length === 0 && issues.length === 0, missing, issues };
      }
    },
    {
      stage: 'Analysis Started Response',
      required: ['analysisId', 'status'],
      optional: ['message', 'estimatedTime'],
      validation: (data) => {
        const missing: string[] = [];
        const issues: string[] = [];
        
        if (!data.analysisId) missing.push('analysisId');
        if (!data.status) missing.push('status');
        
        if (data.status && !['queued', 'processing'].includes(data.status)) {
          issues.push(`Unexpected initial status: ${data.status}`);
        }
        
        return { valid: missing.length === 0, missing, issues };
      }
    },
    {
      stage: 'Analysis Status Response',
      required: ['analysisId', 'status', 'progress'],
      optional: ['result', 'error', 'startedAt', 'completedAt'],
      validation: (data) => {
        const missing: string[] = [];
        const issues: string[] = [];
        
        if (!data.analysisId) missing.push('analysisId');
        if (!data.status) missing.push('status');
        if (data.progress === undefined) missing.push('progress');
        
        if (data.status === 'completed' && !data.result) {
          missing.push('result (required when status=completed)');
        }
        
        if (data.status === 'failed' && !data.error) {
          missing.push('error (required when status=failed)');
        }
        
        return { valid: missing.length === 0, missing, issues };
      }
    },
    {
      stage: 'Completed Analysis Result',
      required: ['summary', 'findings', 'metadata'],
      optional: ['recommendations', 'visualizations', 'educational'],
      validation: (data) => {
        const missing: string[] = [];
        const issues: string[] = [];
        
        if (!data.summary) missing.push('summary');
        if (!data.findings) missing.push('findings');
        if (!data.metadata) missing.push('metadata');
        
        // Check summary structure
        if (data.summary) {
          if (!data.summary.totalIssues && data.summary.totalIssues !== 0) {
            issues.push('summary.totalIssues is missing');
          }
          if (!data.summary.criticalIssues && data.summary.criticalIssues !== 0) {
            issues.push('summary.criticalIssues is missing');
          }
        }
        
        // Check findings structure
        if (data.findings) {
          const expectedCategories = ['security', 'performance', 'maintainability', 'reliability'];
          const missingCategories = expectedCategories.filter(cat => !data.findings[cat]);
          if (missingCategories.length > 0) {
            issues.push(`Missing finding categories: ${missingCategories.join(', ')}`);
          }
        }
        
        // Check metadata
        if (data.metadata) {
          if (!data.metadata.repository) issues.push('metadata.repository is missing');
          if (!data.metadata.prNumber) issues.push('metadata.prNumber is missing');
          if (!data.metadata.analysisMode) issues.push('metadata.analysisMode is missing');
        }
        
        return { valid: missing.length === 0 && issues.length === 0, missing, issues };
      }
    }
  ],
  'VECTOR_STORAGE': [
    {
      stage: 'Vector Storage Request',
      required: ['repositoryId', 'content', 'metadata'],
      optional: ['embedding', 'tags'],
      validation: (data) => {
        const missing: string[] = [];
        const issues: string[] = [];
        
        if (!data.repositoryId) missing.push('repositoryId');
        if (!data.content) missing.push('content');
        if (!data.metadata) missing.push('metadata');
        
        if (data.metadata && !data.metadata.type) {
          issues.push('metadata.type is required');
        }
        
        return { valid: missing.length === 0, missing, issues };
      }
    }
  ],
  'DEEPWIKI': [
    {
      stage: 'DeepWiki Analysis Request',
      required: ['repositoryUrl', 'jobId'],
      optional: ['branch', 'includeDiff', 'prNumber'],
      validation: (data) => {
        const missing: string[] = [];
        const issues: string[] = [];
        
        if (!data.repositoryUrl) missing.push('repositoryUrl');
        if (!data.jobId) missing.push('jobId');
        
        return { valid: missing.length === 0, missing, issues };
      }
    },
    {
      stage: 'DeepWiki Result',
      required: ['codebaseSummary', 'findings', 'metadata'],
      optional: ['modelUsed', 'tokenCount', 'processingTime'],
      validation: (data) => {
        const missing: string[] = [];
        const issues: string[] = [];
        
        if (!data.codebaseSummary) missing.push('codebaseSummary');
        if (!data.findings) missing.push('findings');
        if (!data.metadata) missing.push('metadata');
        
        // Check if findings have the expected structure
        if (data.findings && Array.isArray(data.findings)) {
          if (data.findings.length === 0) {
            issues.push('findings array is empty');
          } else {
            const firstFinding = data.findings[0];
            if (!firstFinding.type) issues.push('findings[0].type is missing');
            if (!firstFinding.title) issues.push('findings[0].title is missing');
            if (!firstFinding.description) issues.push('findings[0].description is missing');
          }
        }
        
        return { valid: missing.length === 0 && issues.length === 0, missing, issues };
      }
    }
  ]
};

// Data collection for validation
interface CollectedData {
  scenario: string;
  timestamp: string;
  stages: {
    stage: string;
    data: any;
    validation: {
      valid: boolean;
      missing: string[];
      issues: string[];
    };
  }[];
}

const collectedData: CollectedData[] = [];

// Validation functions
async function validatePRAnalysisFlow(): Promise<void> {
  console.log('\n🔍 Validating PR Analysis Data Flow...');
  
  const testData = {
    repositoryUrl: 'https://github.com/expressjs/express',
    prNumber: 5500,
    analysisMode: 'quick'
  };
  
  const flowData: CollectedData = {
    scenario: 'PR Analysis',
    timestamp: new Date().toISOString(),
    stages: []
  };
  
  try {
    // Stage 1: Initial request
    console.log('   1️⃣ Testing initial request...');
    const stage1 = DATA_FLOW_STAGES.PR_ANALYSIS[0];
    const validation1 = stage1.validation(testData);
    flowData.stages.push({
      stage: stage1.stage,
      data: testData,
      validation: validation1
    });
    console.log(`   ${validation1.valid ? '✅' : '❌'} Initial request validation`);
    
    // Stage 2: Start analysis
    console.log('   2️⃣ Starting analysis...');
    const startResponse = await axios.post(
      `${API_URL}/v1/analyze-pr`,
      testData,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        }
      }
    );
    
    const stage2 = DATA_FLOW_STAGES.PR_ANALYSIS[1];
    const validation2 = stage2.validation(startResponse.data);
    flowData.stages.push({
      stage: stage2.stage,
      data: startResponse.data,
      validation: validation2
    });
    console.log(`   ${validation2.valid ? '✅' : '❌'} Start response validation`);
    
    const analysisId = startResponse.data.analysisId;
    
    // Stage 3: Check status
    console.log('   3️⃣ Checking analysis status...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statusResponse = await axios.get(
      `${API_URL}/v1/analysis/${analysisId}`,
      {
        headers: { 'X-API-Key': API_KEY }
      }
    );
    
    const stage3 = DATA_FLOW_STAGES.PR_ANALYSIS[2];
    const validation3 = stage3.validation(statusResponse.data);
    flowData.stages.push({
      stage: stage3.stage,
      data: statusResponse.data,
      validation: validation3
    });
    console.log(`   ${validation3.valid ? '✅' : '❌'} Status response validation`);
    
    // Stage 4: Check completed result (if available)
    if (statusResponse.data.status === 'completed' && statusResponse.data.result) {
      console.log('   4️⃣ Validating completed result...');
      const stage4 = DATA_FLOW_STAGES.PR_ANALYSIS[3];
      const validation4 = stage4.validation(statusResponse.data.result);
      flowData.stages.push({
        stage: stage4.stage,
        data: statusResponse.data.result,
        validation: validation4
      });
      console.log(`   ${validation4.valid ? '✅' : '❌'} Result data validation`);
    }
    
  } catch (error: any) {
    console.log(`   ❌ Flow failed: ${error.message}`);
    flowData.stages.push({
      stage: 'Error',
      data: { error: error.message, statusCode: error.response?.status },
      validation: { valid: false, missing: [], issues: ['Flow interrupted by error'] }
    });
  }
  
  collectedData.push(flowData);
}

async function validateVectorStorageFlow(): Promise<void> {
  console.log('\n🔍 Validating Vector Storage Data Flow...');
  
  const flowData: CollectedData = {
    scenario: 'Vector Storage',
    timestamp: new Date().toISOString(),
    stages: []
  };
  
  try {
    // Test vector search to see what data is returned
    const searchResponse = await axios.post(
      `${API_URL}/v1/vector/search`,
      {
        query: 'security vulnerability',
        repositoryUrl: 'https://github.com/expressjs/express',
        limit: 5
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        }
      }
    );
    
    console.log('   ✅ Vector search completed');
    
    // Check what data is returned
    if (searchResponse.data.results && searchResponse.data.results.length > 0) {
      const firstResult = searchResponse.data.results[0];
      const expectedFields = ['content', 'metadata', 'similarity', 'id'];
      const actualFields = Object.keys(firstResult);
      const missingFields = expectedFields.filter(f => !actualFields.includes(f));
      
      flowData.stages.push({
        stage: 'Vector Search Result',
        data: firstResult,
        validation: {
          valid: missingFields.length === 0,
          missing: missingFields,
          issues: []
        }
      });
      
      console.log(`   Fields present: ${actualFields.join(', ')}`);
      if (missingFields.length > 0) {
        console.log(`   ⚠️  Missing fields: ${missingFields.join(', ')}`);
      }
    } else {
      console.log('   ⚠️  No vector results returned');
    }
    
  } catch (error: any) {
    console.log(`   ❌ Vector storage test failed: ${error.message}`);
  }
  
  collectedData.push(flowData);
}

async function generateDataFlowReport(): Promise<void> {
  console.log('\n📊 Generating Data Flow Report...');
  
  // Analyze collected data
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalScenarios: collectedData.length,
      totalStages: collectedData.reduce((sum, flow) => sum + flow.stages.length, 0),
      validStages: 0,
      invalidStages: 0,
      missingDataPoints: [] as string[],
      dataIssues: [] as string[]
    },
    scenarios: collectedData,
    recommendations: [] as string[]
  };
  
  // Count valid/invalid stages and collect issues
  collectedData.forEach(flow => {
    flow.stages.forEach(stage => {
      if (stage.validation.valid) {
        report.summary.validStages++;
      } else {
        report.summary.invalidStages++;
        
        // Collect missing data points
        stage.validation.missing.forEach(field => {
          const dataPoint = `${flow.scenario} > ${stage.stage} > ${field}`;
          if (!report.summary.missingDataPoints.includes(dataPoint)) {
            report.summary.missingDataPoints.push(dataPoint);
          }
        });
        
        // Collect issues
        stage.validation.issues.forEach(issue => {
          const issuePoint = `${flow.scenario} > ${stage.stage}: ${issue}`;
          if (!report.summary.dataIssues.includes(issuePoint)) {
            report.summary.dataIssues.push(issuePoint);
          }
        });
      }
    });
  });
  
  // Generate recommendations
  if (report.summary.missingDataPoints.length > 0) {
    report.recommendations.push('Add missing data fields to API responses');
  }
  
  if (report.summary.dataIssues.length > 0) {
    report.recommendations.push('Fix data validation issues in API responses');
  }
  
  // Save report
  const reportPath = path.join(__dirname, `../../e2e-data-flow-report-${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  // Print summary
  console.log('\n📋 Data Flow Validation Summary:');
  console.log(`   Total Scenarios: ${report.summary.totalScenarios}`);
  console.log(`   Valid Stages: ${report.summary.validStages}/${report.summary.totalStages}`);
  console.log(`   Invalid Stages: ${report.summary.invalidStages}/${report.summary.totalStages}`);
  
  if (report.summary.missingDataPoints.length > 0) {
    console.log('\n❌ Missing Data Points:');
    report.summary.missingDataPoints.forEach(point => {
      console.log(`   - ${point}`);
    });
  }
  
  if (report.summary.dataIssues.length > 0) {
    console.log('\n⚠️  Data Issues:');
    report.summary.dataIssues.forEach(issue => {
      console.log(`   - ${issue}`);
    });
  }
  
  console.log(`\n📄 Full report saved to: ${reportPath}`);
}

// Main execution
async function main() {
  console.log('🚀 E2E Data Flow Validator');
  console.log('=========================');
  console.log(`API URL: ${API_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  // Validate different flows
  await validatePRAnalysisFlow();
  await validateVectorStorageFlow();
  
  // Generate report
  await generateDataFlowReport();
  
  console.log('\n✅ Data flow validation complete!');
}

// Run validation
main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});