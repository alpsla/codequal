#!/usr/bin/env npx ts-node
/**
 * Test DeepWiki data quality and what we're actually getting
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function testDeepWikiDataQuality() {
  console.log('🔍 DeepWiki Data Quality Analysis\n');
  console.log('=' .repeat(70) + '\n');
  
  const repoPath = '/tmp/codequal-repos/sinatra-sinatra-main';
  
  // Check if repo exists
  if (!fs.existsSync(repoPath)) {
    console.log('❌ Repository not found. Cloning...\n');
    execSync('git clone https://github.com/sinatra/sinatra /tmp/codequal-repos/sinatra-sinatra-main');
  }
  
  console.log('📁 Repository Structure:\n');
  
  // Check actual structure of sinatra repo
  const checkPaths = [
    'lib/sinatra.rb',
    'lib/sinatra/base.rb',
    'lib/sinatra/activerecord.rb',  // This probably doesn't exist
    'lib/sinatra/template.rb',
    'lib/sinatra/middleware.rb',
    'lib/sinatra/file_upload.rb',
    'Gemfile',
    'Gemfile.lock',
    'config.ru',
    'test/',
    'spec/'
  ];
  
  checkPaths.forEach(checkPath => {
    const fullPath = path.join(repoPath, checkPath);
    const exists = fs.existsSync(fullPath);
    console.log(`  ${exists ? '✅' : '❌'} ${checkPath}`);
    
    if (exists && fs.statSync(fullPath).isFile()) {
      // Check file size and first line
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      const firstLine = lines[0].substring(0, 50);
      console.log(`      Size: ${content.length} bytes, First line: "${firstLine}..."`);
    }
  });
  
  console.log('\n📂 Actual lib/sinatra contents:\n');
  
  try {
    const sinatraLibFiles = fs.readdirSync(path.join(repoPath, 'lib/sinatra'));
    sinatraLibFiles.slice(0, 10).forEach(file => {
      console.log(`  - lib/sinatra/${file}`);
    });
  } catch (error) {
    console.log('  ❌ lib/sinatra directory not found or not accessible');
  }
  
  console.log('\n🔍 DeepWiki Mock Data Analysis:\n');
  
  // Typical DeepWiki mock response issues
  const mockIssues = [
    {
      title: "Incompatible change in routing behavior due to refactoring.",
      file: "lib/sinatra/base.rb",
      line: 102
    },
    {
      title: "Dependency on an outdated version of Rack with known vulnerabilities.",
      file: "Gemfile.lock",
      line: null  // Gemfile.lock doesn't have specific line numbers
    },
    {
      title: "Potential SQL injection in dynamic query generation.",
      file: "lib/sinatra/activerecord.rb",  // This file doesn't exist!
      line: 45
    }
  ];
  
  console.log('📋 Checking DeepWiki mock issue locations:\n');
  
  mockIssues.forEach((issue, idx) => {
    console.log(`Issue ${idx + 1}: ${issue.title}`);
    console.log(`  Location: ${issue.file}${issue.line ? ':' + issue.line : ''}`);
    
    const fullPath = path.join(repoPath, issue.file);
    const exists = fs.existsSync(fullPath);
    
    if (exists) {
      console.log(`  ✅ File exists`);
      
      if (issue.line) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        
        if (issue.line <= lines.length) {
          const codeLine = lines[issue.line - 1];
          console.log(`  📝 Line ${issue.line}: "${codeLine.substring(0, 50).trim()}..."`);
        } else {
          console.log(`  ❌ Line ${issue.line} doesn't exist (file has ${lines.length} lines)`);
        }
      }
    } else {
      console.log(`  ❌ FILE DOES NOT EXIST!`);
      
      // Try to find similar files
      const baseName = path.basename(issue.file);
      try {
        const searchResult = execSync(
          `find "${repoPath}" -name "*${baseName.replace('.rb', '')}*" -type f | head -5`,
          { encoding: 'utf-8' }
        ).trim();
        
        if (searchResult) {
          console.log(`  💡 Similar files found:`);
          searchResult.split('\n').forEach(f => {
            console.log(`     - ${f.replace(repoPath + '/', '')}`);
          });
        }
      } catch {}
    }
    
    console.log('');
  });
  
  console.log('=' .repeat(70));
  console.log('\n🎯 FINDINGS:\n');
  
  console.log('1. ❌ DeepWiki is returning file paths that don\'t exist');
  console.log('   - lib/sinatra/activerecord.rb is not part of the sinatra core repo');
  console.log('   - It\'s a separate gem (sinatra-activerecord)\n');
  
  console.log('2. ⚠️  Line numbers may be incorrect or outdated');
  console.log('   - Even when files exist, line numbers might not match the issue\n');
  
  console.log('3. 🔄 Mock data is generic and not repo-specific');
  console.log('   - Issues seem to be generic security/quality issues');
  console.log('   - Not based on actual code analysis\n');
  
  console.log('📊 RECOMMENDATION:\n');
  console.log('We need to either:');
  console.log('1. Use REAL DeepWiki API to get actual analysis results');
  console.log('2. Create better mocks that reflect real file structure');
  console.log('3. Add validation to check if files exist before trying to extract code');
  console.log('4. Implement fallback strategies when files don\'t exist');
}

testDeepWikiDataQuality().catch(console.error);