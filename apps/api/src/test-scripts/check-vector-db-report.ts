#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';
import { VectorContextService, createVectorContextService } from '@codequal/agents/multi-agent/vector-context-service';
import { AuthenticatedUser } from '../middleware/auth-middleware';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

async function checkVectorDBReport(repositoryUrl: string) {
  console.log(chalk.cyan(`\n🔍 Checking Vector DB for repository: ${repositoryUrl}\n`));
  
  try {
    // Create a test authenticated user
    const authenticatedUser: any = {
      id: 'test-user-id',
      email: 'test@codequal.dev',
      organizationId: 'test-org-id',
      organizationRole: 'admin',
      permissions: ['admin'],
      createdAt: new Date(),
      status: 'active'
    };
    
    // Create vector context service
    const vectorService = createVectorContextService(authenticatedUser);
    
    console.log(chalk.blue('1️⃣ Checking for analysis results in Vector DB...'));
    
    try {
      // Try to get repository context
      const context: any = await vectorService.getRepositoryContext(
        repositoryUrl,
        'security' as any, // Use a valid agent role
        authenticatedUser
      );
      
      if (context) {
        console.log(chalk.green('   ✓ Found context in Vector DB!'));
        console.log('   Context keys:', Object.keys(context));
        
        // Check different possible structures
        const analysisData = context.analysisData || context.analysis || context.results || [];
        
        if (Array.isArray(analysisData) && analysisData.length > 0) {
          console.log(`   Analysis entries: ${analysisData.length}`);
          
          // Check for reports
          const reports = analysisData.filter((data: any) => 
            data.analysis && (data.analysis.reportId || data.analysis.report)
          );
          
          if (reports.length > 0) {
            console.log(chalk.green(`   ✓ Found ${reports.length} report(s) in Vector DB`));
            reports.forEach((report: any, index: number) => {
              console.log(`\n   Report ${index + 1}:`);
              console.log(`     - Report ID: ${report.analysis.reportId || 'N/A'}`);
              console.log(`     - PR Number: ${report.analysis.prNumber || 'N/A'}`);
              console.log(`     - Timestamp: ${report.metadata?.analyzedAt || 'N/A'}`);
              console.log(`     - Has full report: ${!!report.analysis.report}`);
            });
          } else {
            console.log(chalk.yellow('   ⚠️  No reports found in analysis data'));
          }
        } else {
          console.log(chalk.yellow('   ⚠️  No analysis data array found'));
          console.log('   Context structure:', JSON.stringify(context, null, 2).substring(0, 500) + '...');
        }
      } else {
        console.log(chalk.red('   ❌ No context found in Vector DB'));
      }
    } catch (error) {
      console.log(chalk.red('   ❌ Error retrieving from Vector DB:'), error);
    }
    
    console.log();
    console.log(chalk.blue('2️⃣ Checking temporary report storage...'));
    
    // Check temporary storage
    try {
      const analysisReports = await import('../routes/analysis-reports.js');
      // Access the map directly from the module
      const temporaryStorage = (analysisReports as any).temporaryReportStorage || new Map();
      console.log(`   Temporary storage size: ${temporaryStorage.size} reports`);
      
      if (temporaryStorage.size > 0) {
        console.log('   Reports in temporary storage:');
        temporaryStorage.forEach((report: any, id: string) => {
          console.log(`     - ${id}: ${report.repositoryUrl} (PR #${report.prNumber})`);
        });
      }
    } catch (error) {
      console.log('   Could not check temporary storage:', error);
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Check failed:'), error);
  }
}

// Get repository URL from command line or use default
const repositoryUrl = process.argv[2] || 'https://github.com/expressjs/cors';

checkVectorDBReport(repositoryUrl)
  .then(() => {
    console.log(chalk.green('\n✅ Vector DB check completed'));
    process.exit(0);
  })
  .catch(error => {
    console.error(chalk.red('\n💥 Fatal error:'), error);
    process.exit(1);
  });