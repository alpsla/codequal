#!/usr/bin/env tsx

/**
 * Script to inject real PR data and monitor the data flow
 * This bypasses the mock DeepWiki and uses real GitHub data
 */

import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';

// Configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const MONITOR_DIR = `monitoring-results/${new Date().toISOString().replace(/[:.]/g, '-')}`;

// Ensure monitoring directory exists
fs.mkdirSync(MONITOR_DIR, { recursive: true });

// Initialize GitHub client
const octokit = new Octokit({
  auth: GITHUB_TOKEN
});

async function fetchRealPRData(owner: string, repo: string, prNumber: number) {
  console.log(`\n🔍 Fetching real PR data from GitHub...`);
  console.log(`Repository: ${owner}/${repo}`);
  console.log(`PR Number: ${prNumber}`);
  
  try {
    // 1. Get PR details
    console.log('\n📋 Fetching PR details...');
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });
    
    console.log(`✓ PR Title: ${pr.title}`);
    console.log(`✓ PR Branch: ${pr.head.ref} -> ${pr.base.ref}`);
    console.log(`✓ Changed files: ${pr.changed_files}`);
    
    fs.writeFileSync(
      path.join(MONITOR_DIR, 'pr-details.json'),
      JSON.stringify(pr, null, 2)
    );
    
    // 2. Get PR files
    console.log('\n📁 Fetching PR files...');
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100
    });
    
    console.log(`✓ Found ${files.length} changed files`);
    
    fs.writeFileSync(
      path.join(MONITOR_DIR, 'pr-files.json'),
      JSON.stringify(files, null, 2)
    );
    
    // 3. Get file contents from PR branch
    console.log('\n📄 Fetching file contents from PR branch...');
    const fileContents = [];
    
    for (const file of files.slice(0, 10)) { // Limit to first 10 files for demo
      if (file.status !== 'removed') {
        try {
          console.log(`  Fetching: ${file.filename}`);
          const { data: content } = await octokit.repos.getContent({
            owner,
            repo,
            path: file.filename,
            ref: pr.head.sha
          });
          
          if ('content' in content && typeof content.content === 'string') {
            fileContents.push({
              path: file.filename,
              content: Buffer.from(content.content, 'base64').toString('utf-8'),
              patch: file.patch,
              status: file.status,
              additions: file.additions,
              deletions: file.deletions
            });
          }
        } catch (err) {
          console.log(`  ⚠️  Could not fetch: ${file.filename}`);
        }
      }
    }
    
    console.log(`✓ Fetched content for ${fileContents.length} files`);
    
    fs.writeFileSync(
      path.join(MONITOR_DIR, 'pr-file-contents.json'),
      JSON.stringify(fileContents, null, 2)
    );
    
    // 4. Create analysis payload
    const analysisPayload = {
      repositoryUrl: `https://github.com/${owner}/${repo}`,
      prNumber: prNumber,
      prBranch: pr.head.ref,
      baseBranch: pr.base.ref,
      prDetails: {
        title: pr.title,
        body: pr.body,
        user: pr.user,
        head: pr.head,
        base: pr.base,
        changed_files: pr.changed_files,
        additions: pr.additions,
        deletions: pr.deletions
      },
      files: fileContents,
      metadata: {
        fetchedAt: new Date().toISOString(),
        commitSha: pr.head.sha,
        state: pr.state
      }
    };
    
    fs.writeFileSync(
      path.join(MONITOR_DIR, 'analysis-payload.json'),
      JSON.stringify(analysisPayload, null, 2)
    );
    
    // 5. Generate monitoring report
    generateMonitoringReport(analysisPayload);
    
    return analysisPayload;
    
  } catch (error) {
    console.error('❌ Error fetching PR data:', error);
    throw error;
  }
}

function generateMonitoringReport(payload: any) {
  const report = `# PR Analysis - Real Data Monitoring Report
Generated: ${new Date().toISOString()}

## PR Information
- Repository: ${payload.repositoryUrl}
- PR Number: ${payload.prNumber}
- PR Branch: ${payload.prBranch}
- Base Branch: ${payload.baseBranch}
- Title: ${payload.prDetails.title}
- Changed Files: ${payload.prDetails.changed_files}

## Data Flow Checkpoints

### 1. PR Context ✓
- Successfully fetched PR details from GitHub
- Branch information: ${payload.prBranch} -> ${payload.baseBranch}
- Commit SHA: ${payload.metadata.commitSha}

### 2. File Contents ✓
- Fetched ${payload.files.length} files from PR branch
- Files include actual content from commit ${payload.metadata.commitSha}

### 3. Changed Files
${payload.files.map(f => `- ${f.path} (${f.status}, +${f.additions}/-${f.deletions})`).join('\n')}

### 4. Next Steps
1. This data should flow to DeepWiki with branch: "${payload.prBranch}"
2. DeepWiki should analyze files from this branch (not main)
3. MCP tools should receive these file contents
4. Agents should analyze the actual changes

## Monitoring Files
- PR Details: pr-details.json
- PR Files: pr-files.json
- File Contents: pr-file-contents.json
- Analysis Payload: analysis-payload.json
`;

  fs.writeFileSync(
    path.join(MONITOR_DIR, 'monitoring-report.md'),
    report
  );
  
  console.log(`\n📊 Monitoring report saved to: ${MONITOR_DIR}/monitoring-report.md`);
}

// Example usage
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: tsx inject-real-pr-data.ts <owner> <repo> <pr-number>');
    console.log('Example: tsx inject-real-pr-data.ts facebook react 28298');
    process.exit(1);
  }
  
  const [owner, repo, prNumber] = args;
  
  if (!GITHUB_TOKEN) {
    console.log('⚠️  Warning: No GITHUB_TOKEN set. Rate limits may apply.');
    console.log('Set GITHUB_TOKEN environment variable for better rate limits.');
  }
  
  try {
    const data = await fetchRealPRData(owner, repo, parseInt(prNumber));
    console.log('\n✅ Successfully fetched real PR data!');
    console.log(`📁 Results saved to: ${MONITOR_DIR}`);
    console.log('\n🔍 You can now monitor how this real data flows through the system.');
  } catch (error) {
    console.error('Failed to fetch PR data:', error);
    process.exit(1);
  }
}

main();