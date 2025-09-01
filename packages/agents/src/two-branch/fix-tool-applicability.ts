#!/usr/bin/env npx ts-node
/**
 * Script to fix tool applicability issues in all agents
 * This updates the isApplicable functions to properly check language compatibility
 */

import * as fs from 'fs';
import * as path from 'path';

const fixes = [
  {
    file: 'agents/MultiToolArchitectureAgent.ts',
    fixes: [
      {
        tool: 'madge',
        old: `isApplicable: () => true`,
        new: `isApplicable: (lang?: string) => ['javascript', 'typescript'].includes(lang?.toLowerCase() || '')`
      },
      {
        tool: 'dependency-cruiser',
        old: `isApplicable: () => true`,
        new: `isApplicable: (lang?: string) => ['javascript', 'typescript'].includes(lang?.toLowerCase() || '')`
      },
      {
        tool: 'complexity-report',
        old: `isApplicable: () => true`,
        new: `isApplicable: (lang?: string) => ['javascript', 'typescript'].includes(lang?.toLowerCase() || '')`
      },
      {
        tool: 'eslint-plugin-sonarjs',
        old: `isApplicable: () => true`,
        new: `isApplicable: (lang?: string) => ['javascript', 'typescript'].includes(lang?.toLowerCase() || '')`
      }
    ]
  },
  {
    file: 'agents/MultiToolPerformanceAgent.ts',
    fixes: [
      {
        tool: 'lighthouse',
        old: `isApplicable: () => true`,
        new: `isApplicable: (lang?: string) => {
          // Only for web projects
          return ['javascript', 'typescript', 'html', 'css'].includes(lang?.toLowerCase() || '');
        }`
      },
      {
        tool: 'webpack-bundle-analyzer',
        old: `isApplicable: () => true`,
        new: `isApplicable: (lang?: string) => {
          // Only for JavaScript/TypeScript with webpack
          return ['javascript', 'typescript'].includes(lang?.toLowerCase() || '');
        }`
      }
    ]
  },
  {
    file: 'agents/MultiToolCodeQualityAgent.ts',
    fixes: [
      {
        tool: 'eslint',
        old: `isApplicable: () => true`,
        new: `isApplicable: (lang?: string) => ['javascript', 'typescript'].includes(lang?.toLowerCase() || '')`
      },
      {
        tool: 'sonarjs',
        old: `isApplicable: () => true`,
        new: `isApplicable: (lang?: string) => ['javascript', 'typescript'].includes(lang?.toLowerCase() || '')`
      },
      {
        tool: 'complexity',
        old: `isApplicable: () => true`,
        new: `isApplicable: (lang?: string) => ['javascript', 'typescript'].includes(lang?.toLowerCase() || '')`
      }
    ]
  },
  {
    file: 'agents/MultiToolDependencyAgent.ts',
    fixes: [
      {
        tool: 'yarn-audit',
        old: `isApplicable: (lang?: string) => ['javascript', 'typescript'].includes(lang?.toLowerCase() || '')`,
        new: `isApplicable: (lang?: string, targetPath?: string) => {
          if (!['javascript', 'typescript'].includes(lang?.toLowerCase() || '')) return false;
          // Check for yarn.lock
          if (targetPath && fs.existsSync(path.join(targetPath, 'yarn.lock'))) return true;
          return false;
        }`
      }
    ]
  }
];

console.log('🔧 Fixing Tool Applicability Issues\n');

// This is a dry run - showing what needs to be fixed
fixes.forEach(({ file, fixes: fileFixes }) => {
  console.log(`📁 ${file}:`);
  fileFixes.forEach(fix => {
    console.log(`   • ${fix.tool}: Update isApplicable function`);
  });
  console.log('');
});

console.log('⚠️  Note: This is a demonstration of what needs to be fixed.');
console.log('    The actual files need to be updated manually or with proper AST manipulation.');

// Summary of language-tool mapping after fixes
console.log('\n📊 Corrected Language-Tool Mapping:\n');

const languageToolMap = {
  'JavaScript/TypeScript': [
    'eslint', 'madge', 'dependency-cruiser', 'complexity-report',
    'npm-audit', 'yarn-audit', 'retire-js', 'depcheck', 'npm-check',
    'lighthouse', 'webpack-bundle-analyzer', 'jscpd', 'sonarjs'
  ],
  'Python': [
    'semgrep', 'pip-audit', 'safety', 'bandit', 'trivy', 'gitleaks'
  ],
  'Go': [
    'semgrep', 'nancy', 'gosec', 'trivy', 'gitleaks'
  ],
  'Ruby': [
    'semgrep', 'bundler-audit', 'brakeman', 'trivy', 'gitleaks'
  ],
  'Java': [
    'semgrep', 'trivy', 'gitleaks', 'owasp-dependency-check'
    // Phase 1D will add: SpotBugs, PMD, Checkstyle
  ],
  'PHP': [
    'semgrep', 'composer-audit', 'trivy', 'gitleaks'
  ],
  'C/C++': [
    'semgrep', 'trivy', 'gitleaks'
    // Phase 1E will add: Cppcheck, Clang Static Analyzer
  ],
  'Rust': [
    'semgrep', 'cargo-audit', 'clippy', 'trivy', 'gitleaks'
  ],
  'C#/.NET': [
    'semgrep', 'trivy', 'gitleaks'
    // Need to add: dotnet-security, roslyn analyzers
  ]
};

Object.entries(languageToolMap).forEach(([language, tools]) => {
  console.log(`${language}:`);
  console.log(`   ${tools.join(', ')}`);
  console.log('');
});

console.log('✅ Tool applicability configuration needs to be updated in the actual agent files.');
console.log('   The LanguageDetector is already properly integrated in the orchestrator.');