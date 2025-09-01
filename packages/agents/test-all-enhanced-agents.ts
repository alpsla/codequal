#!/usr/bin/env ts-node

/**
 * Comprehensive Test of All Enhanced Agents
 * Demonstrates Security, Code Quality, Performance, and Educator agents
 * working together to provide complete analysis with actionable recommendations
 */

import { EnhancedSecurityAgent } from './src/specialized/enhanced-security-agent';
import { EnhancedCodeQualityAgent } from './src/specialized/enhanced-code-quality-agent';
import { EnhancedPerformanceAgent } from './src/specialized/enhanced-performance-agent';
import { EducatorAgent } from './src/specialized/educator-agent';
import * as fs from 'fs';

// Mock issues from MCP tools (representing real analysis results)
const mockIssues = {
  security: [
    {
      id: 'sec-001',
      type: 'security',
      severity: 'critical',
      category: 'sql-injection',
      title: 'SQL Injection Vulnerability',
      description: 'User input directly concatenated into SQL query',
      location: { file: 'src/api/users.controller.ts', line: 45 },
      evidence: { codeSnippet: 'const query = "SELECT * FROM users WHERE id = " + req.params.id;' }
    },
    {
      id: 'sec-002',
      type: 'security',
      severity: 'high',
      category: 'xss',
      title: 'Cross-Site Scripting (XSS)',
      description: 'Unescaped user input rendered in HTML',
      location: { file: 'src/components/Comment.tsx', line: 23 },
      evidence: { codeSnippet: '<div dangerouslySetInnerHTML={{ __html: userComment }} />' }
    }
  ],
  codeQuality: [
    {
      id: 'cq-001',
      type: 'code-quality',
      severity: 'high',
      category: 'complex-function',
      title: 'Overly Complex Function',
      description: 'Function has cyclomatic complexity of 15',
      location: { file: 'src/services/data-processor.ts', line: 120 },
      evidence: { codeSnippet: 'function processUserData(userData) { /* 100+ lines */ }' }
    },
    {
      id: 'cq-002',
      type: 'code-quality',
      severity: 'medium',
      category: 'duplicate-code',
      title: 'Code Duplication Detected',
      description: 'Similar code found in 3 locations',
      location: { file: 'src/controllers/base.controller.ts', line: 45 },
      evidence: { codeSnippet: '// Validation logic repeated' }
    }
  ],
  performance: [
    {
      id: 'perf-001',
      type: 'performance',
      severity: 'high',
      category: 'n-plus-one-query',
      title: 'N+1 Query Problem',
      description: 'Database queries in loop causing performance degradation',
      location: { file: 'src/repositories/post.repository.ts', line: 67 },
      evidence: { codeSnippet: 'for (const user of users) { user.posts = await getPosts(user.id); }' }
    },
    {
      id: 'perf-002',
      type: 'performance',
      severity: 'medium',
      category: 'large-bundle',
      title: 'Large JavaScript Bundle',
      description: 'Main bundle size is 2.5MB',
      location: { file: 'webpack.config.js', line: 10 },
      evidence: { codeSnippet: 'entry: "./src/main.js"' }
    }
  ]
};

async function testAllEnhancedAgents() {
  console.log('🚀 Comprehensive Enhanced Agents Test\n');
  console.log('=' .repeat(80));
  
  // Initialize all agents
  const securityAgent = new EnhancedSecurityAgent();
  const codeQualityAgent = new EnhancedCodeQualityAgent();
  const performanceAgent = new EnhancedPerformanceAgent();
  const educatorAgent = new EducatorAgent();
  
  console.log('\n📊 Analysis Overview');
  console.log('─'.repeat(80));
  console.log(`Security Issues: ${mockIssues.security.length}`);
  console.log(`Code Quality Issues: ${mockIssues.codeQuality.length}`);
  console.log(`Performance Issues: ${mockIssues.performance.length}`);
  console.log(`Total Issues: ${Object.values(mockIssues).flat().length}`);
  
  // Process each category with enhanced agents
  console.log('\n\n🔒 SECURITY ANALYSIS WITH CODE FIXES');
  console.log('=' .repeat(80));
  
  const enhancedSecurityIssues = await securityAgent.analyzeWithCodeFixes(mockIssues.security);
  
  for (const issue of enhancedSecurityIssues) {
    console.log(`\n🔴 ${issue.severity.toUpperCase()}: ${issue.title}`);
    console.log(`📍 Location: ${issue.location?.file}:${issue.location?.line}`);
    console.log(`📝 ${issue.description}`);
    
    if (issue.codeFix) {
      console.log('\n✅ Recommended Fix:');
      console.log(`   ${issue.codeFix.description}`);
      console.log('\n   Before:');
      console.log('   ' + issue.codeFix.before.split('\n').slice(0, 3).join('\n   '));
      console.log('\n   After:');
      console.log('   ' + issue.codeFix.after.split('\n').slice(0, 3).join('\n   '));
      
      if (issue.codeFix.preventionTips && issue.codeFix.preventionTips.length > 0) {
        console.log('\n   Prevention Tips:');
        issue.codeFix.preventionTips.slice(0, 3).forEach(tip => {
          console.log(`   • ${tip}`);
        });
      }
    }
  }
  
  console.log('\n\n📐 CODE QUALITY ANALYSIS WITH REFACTORING');
  console.log('=' .repeat(80));
  
  const enhancedQualityIssues = await codeQualityAgent.analyzeWithRefactoring(mockIssues.codeQuality);
  
  for (const issue of enhancedQualityIssues) {
    console.log(`\n🟡 ${issue.severity.toUpperCase()}: ${issue.title}`);
    console.log(`📍 Location: ${issue.location?.file}:${issue.location?.line}`);
    console.log(`📝 ${issue.description}`);
    
    if (issue.refactoring) {
      console.log('\n♻️ Refactoring Recommendation:');
      console.log(`   ${issue.refactoring.description}`);
      console.log(`\n   💡 ${issue.refactoring.explanation}`);
      
      if (issue.refactoring.benefits && issue.refactoring.benefits.length > 0) {
        console.log('\n   Benefits:');
        issue.refactoring.benefits.slice(0, 3).forEach(benefit => {
          console.log(`   • ${benefit}`);
        });
      }
    }
  }
  
  console.log('\n\n⚡ PERFORMANCE ANALYSIS WITH OPTIMIZATIONS');
  console.log('=' .repeat(80));
  
  const enhancedPerformanceIssues = await performanceAgent.analyzeWithOptimizations(mockIssues.performance);
  
  for (const issue of enhancedPerformanceIssues) {
    console.log(`\n🟠 ${issue.severity.toUpperCase()}: ${issue.title}`);
    console.log(`📍 Location: ${issue.location?.file}:${issue.location?.line}`);
    console.log(`📝 ${issue.description}`);
    
    if (issue.optimization) {
      console.log('\n🚀 Optimization Recommendation:');
      console.log(`   ${issue.optimization.description}`);
      
      if (issue.optimization.metrics) {
        console.log(`\n   📈 Expected Improvement: ${issue.optimization.metrics.improvement}`);
        console.log(`   Before: ${issue.optimization.metrics.beforeMs}ms`);
        console.log(`   After: ${issue.optimization.metrics.afterMs}ms`);
      }
      
      if (issue.optimization.performanceGains && issue.optimization.performanceGains.length > 0) {
        console.log('\n   Performance Gains:');
        issue.optimization.performanceGains.slice(0, 3).forEach(gain => {
          console.log(`   • ${gain}`);
        });
      }
    }
  }
  
  console.log('\n\n📚 EDUCATIONAL CONTENT AND TRAINING MATERIALS');
  console.log('=' .repeat(80));
  
  // Generate learning plan based on all issues
  const allIssues = [...mockIssues.security, ...mockIssues.codeQuality, ...mockIssues.performance];
  const learningPlan = await educatorAgent.generateLearningPlan(allIssues);
  
  console.log(`\n📖 Personalized Learning Plan (${learningPlan.length} topics)`);
  console.log('─'.repeat(80));
  
  for (const content of learningPlan.slice(0, 3)) { // Show top 3 learning paths
    console.log(`\n📘 ${content.topic}`);
    console.log(`   Category: ${content.category} | Importance: ${content.importance.toUpperCase()}`);
    console.log(`   Estimated Time: ${content.trainingPath.estimatedTime}`);
    
    console.log('\n   Learning Objectives:');
    content.learningObjectives.slice(0, 3).forEach(obj => {
      console.log(`   • ${obj}`);
    });
    
    console.log('\n   Recommended Resources:');
    content.trainingPath.resources.slice(0, 3).forEach(resource => {
      console.log(`   • ${resource.title} (${resource.type}) - ${resource.duration}`);
      console.log(`     ${resource.free ? '✅ Free' : '💰 Paid'} | ${resource.provider}`);
    });
    
    if (content.quickTips && content.quickTips.length > 0) {
      console.log('\n   Quick Tips:');
      content.quickTips.slice(0, 3).forEach(tip => {
        console.log(`   • ${tip}`);
      });
    }
  }
  
  // Generate comprehensive HTML report
  const htmlReport = generateComprehensiveHTMLReport(
    enhancedSecurityIssues,
    enhancedQualityIssues,
    enhancedPerformanceIssues,
    learningPlan
  );
  
  const filename = `comprehensive-analysis-report-${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
  fs.writeFileSync(filename, htmlReport);
  
  console.log('\n\n📊 SUMMARY');
  console.log('=' .repeat(80));
  console.log('✅ Security Agent: Provided specific code fixes for vulnerabilities');
  console.log('✅ Code Quality Agent: Provided refactoring examples and patterns');
  console.log('✅ Performance Agent: Provided optimization strategies with metrics');
  console.log('✅ Educator Agent: Generated personalized learning paths');
  console.log(`\n📄 Comprehensive HTML report saved to: ${filename}`);
  
  console.log('\n🎯 KEY BENEFITS OF ENHANCED AGENTS:');
  console.log('   1. Actionable code fixes instead of generic advice');
  console.log('   2. Before/After examples developers can copy');
  console.log('   3. Performance metrics to justify changes');
  console.log('   4. Learning resources for skill improvement');
  console.log('   5. Prevention tips to avoid future issues');
}

function generateComprehensiveHTMLReport(
  securityIssues: any[],
  qualityIssues: any[],
  performanceIssues: any[],
  learningPlan: any[]
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Comprehensive Code Analysis Report</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .container { 
      max-width: 1400px; 
      margin: 40px auto; 
      background: white; 
      border-radius: 20px; 
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 2.5em;
      font-weight: 700;
    }
    .header p {
      margin: 10px 0 0;
      opacity: 0.9;
      font-size: 1.1em;
    }
    .content {
      padding: 40px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .metric-card {
      background: #f8f9fa;
      padding: 25px;
      border-radius: 12px;
      text-align: center;
      border: 2px solid transparent;
      transition: all 0.3s ease;
    }
    .metric-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      border-color: #667eea;
    }
    .metric-card .value {
      font-size: 2.5em;
      font-weight: bold;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .metric-card .label {
      color: #6c757d;
      margin-top: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 0.9em;
    }
    
    .section {
      margin: 40px 0;
    }
    
    .section h2 {
      color: #2c3e50;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
      margin-bottom: 20px;
      font-size: 1.8em;
    }
    
    .issue-card {
      margin: 20px 0;
      padding: 20px;
      border-radius: 10px;
      border: 1px solid #e0e0e0;
      transition: all 0.3s ease;
    }
    
    .issue-card:hover {
      box-shadow: 0 5px 20px rgba(0,0,0,0.1);
    }
    
    .critical { 
      background: linear-gradient(to right, #fff5f5, #white);
      border-left: 5px solid #dc3545; 
    }
    .high { 
      background: linear-gradient(to right, #fff8e1, white);
      border-left: 5px solid #ff9800; 
    }
    .medium { 
      background: linear-gradient(to right, #fff3e0, white);
      border-left: 5px solid #ffc107; 
    }
    
    .code-block {
      background: #2d3748;
      color: #e2e8f0;
      padding: 15px;
      border-radius: 8px;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      margin: 15px 0;
      overflow-x: auto;
      position: relative;
    }
    
    .code-before {
      background: linear-gradient(135deg, #ee5a6f, #f29263);
      color: white;
      padding: 15px;
      border-radius: 8px;
      margin: 10px 0;
      position: relative;
    }
    
    .code-after {
      background: linear-gradient(135deg, #0ba360, #3cba92);
      color: white;
      padding: 15px;
      border-radius: 8px;
      margin: 10px 0;
      position: relative;
    }
    
    .fix-section {
      background: linear-gradient(to right, #f0f9ff, white);
      border: 2px solid #0ea5e9;
      padding: 20px;
      border-radius: 10px;
      margin: 20px 0;
    }
    
    .prevention-tips {
      background: #e8f5e9;
      padding: 15px;
      border-radius: 8px;
      margin: 15px 0;
      border-left: 3px solid #4caf50;
    }
    
    .learning-card {
      background: linear-gradient(to right, #f3e5f5, white);
      border: 2px solid #9c27b0;
      padding: 20px;
      border-radius: 10px;
      margin: 20px 0;
    }
    
    .resource-list {
      list-style: none;
      padding: 0;
    }
    
    .resource-list li {
      padding: 10px;
      margin: 10px 0;
      background: #f5f5f5;
      border-radius: 8px;
      transition: all 0.3s ease;
    }
    
    .resource-list li:hover {
      background: #e8eaf6;
      transform: translateX(5px);
    }
    
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 600;
      margin-right: 5px;
    }
    
    .badge-critical { background: #dc3545; color: white; }
    .badge-high { background: #ff9800; color: white; }
    .badge-medium { background: #ffc107; color: white; }
    .badge-free { background: #4caf50; color: white; }
    .badge-paid { background: #f44336; color: white; }
    
    .footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #6c757d;
      border-top: 1px solid #dee2e6;
    }
    
    @media (max-width: 768px) {
      .container {
        margin: 20px;
        border-radius: 10px;
      }
      .content {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Comprehensive Code Analysis Report</h1>
      <p>Generated by Enhanced CodeQual Agents • ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="content">
      <div class="summary">
        <div class="metric-card">
          <div class="value">${securityIssues.length}</div>
          <div class="label">Security Issues</div>
        </div>
        <div class="metric-card">
          <div class="value">${qualityIssues.length}</div>
          <div class="label">Code Quality Issues</div>
        </div>
        <div class="metric-card">
          <div class="value">${performanceIssues.length}</div>
          <div class="label">Performance Issues</div>
        </div>
        <div class="metric-card">
          <div class="value">${learningPlan.length}</div>
          <div class="label">Learning Paths</div>
        </div>
      </div>
      
      <div class="section">
        <h2>🔒 Security Analysis</h2>
        ${securityIssues.map(issue => `
          <div class="issue-card ${issue.severity}">
            <h3>${issue.title} <span class="badge badge-${issue.severity}">${issue.severity.toUpperCase()}</span></h3>
            <p><strong>Location:</strong> ${issue.location?.file}:${issue.location?.line}</p>
            <p>${issue.description}</p>
            ${issue.codeFix ? `
              <div class="fix-section">
                <h4>✅ Recommended Fix: ${issue.codeFix.description}</h4>
                <p><em>${issue.codeFix.explanation}</em></p>
                ${issue.codeFix.preventionTips ? `
                  <div class="prevention-tips">
                    <strong>Prevention Tips:</strong>
                    <ul>
                      ${issue.codeFix.preventionTips.map(tip => `<li>${tip}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h2>📐 Code Quality Analysis</h2>
        ${qualityIssues.map(issue => `
          <div class="issue-card ${issue.severity}">
            <h3>${issue.title} <span class="badge badge-${issue.severity}">${issue.severity.toUpperCase()}</span></h3>
            <p><strong>Location:</strong> ${issue.location?.file}:${issue.location?.line}</p>
            <p>${issue.description}</p>
            ${issue.refactoring ? `
              <div class="fix-section">
                <h4>♻️ Refactoring: ${issue.refactoring.description}</h4>
                <p><em>${issue.refactoring.explanation}</em></p>
                ${issue.refactoring.benefits ? `
                  <strong>Benefits:</strong>
                  <ul>
                    ${issue.refactoring.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                  </ul>
                ` : ''}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h2>⚡ Performance Analysis</h2>
        ${performanceIssues.map(issue => `
          <div class="issue-card ${issue.severity}">
            <h3>${issue.title} <span class="badge badge-${issue.severity}">${issue.severity.toUpperCase()}</span></h3>
            <p><strong>Location:</strong> ${issue.location?.file}:${issue.location?.line}</p>
            <p>${issue.description}</p>
            ${issue.optimization ? `
              <div class="fix-section">
                <h4>🚀 Optimization: ${issue.optimization.description}</h4>
                ${issue.optimization.metrics ? `
                  <p><strong>Expected Improvement:</strong> ${issue.optimization.metrics.improvement}</p>
                ` : ''}
                ${issue.optimization.performanceGains ? `
                  <strong>Performance Gains:</strong>
                  <ul>
                    ${issue.optimization.performanceGains.map(gain => `<li>${gain}</li>`).join('')}
                  </ul>
                ` : ''}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h2>📚 Personalized Learning Plan</h2>
        ${learningPlan.map(content => `
          <div class="learning-card">
            <h3>📘 ${content.topic}</h3>
            <p><strong>Category:</strong> ${content.category} | <strong>Importance:</strong> ${content.importance.toUpperCase()}</p>
            <p><strong>Estimated Time:</strong> ${content.trainingPath.estimatedTime}</p>
            
            <h4>Learning Objectives:</h4>
            <ul>
              ${content.learningObjectives.map(obj => `<li>${obj}</li>`).join('')}
            </ul>
            
            <h4>Recommended Resources:</h4>
            <ul class="resource-list">
              ${content.trainingPath.resources.slice(0, 3).map(resource => `
                <li>
                  <strong>${resource.title}</strong> 
                  <span class="badge badge-${resource.free ? 'free' : 'paid'}">${resource.free ? 'FREE' : 'PAID'}</span>
                  <br>
                  <small>${resource.type} • ${resource.duration} • ${resource.provider}</small>
                </li>
              `).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="footer">
      <p><strong>CodeQual Enhanced Agents</strong></p>
      <p>Providing actionable code improvements and personalized learning paths</p>
    </div>
  </div>
</body>
</html>`;
}

// Run the comprehensive test
testAllEnhancedAgents().catch(console.error);