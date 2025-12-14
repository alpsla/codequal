/**
 * Seed NestJS Patterns to Supabase
 *
 * This script takes the local NestJS patterns from nestjs-patterns.ts
 * and stores them in Supabase for cross-session reuse.
 *
 * Pattern Flywheel Economics:
 * - Local patterns: Fast lookup, session-only
 * - Supabase patterns: Cross-session reuse, usage tracking
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { NESTJS_PATTERNS } from '../../src/fix-agent/patterns/nestjs-patterns';
import {
  FrameworkPatternStorage,
  getFrameworkPatternStorage,
} from '../../src/fix-agent/infrastructure/supabase/framework-pattern-storage';
import type { FrameworkPattern } from '../../src/fix-agent/types/framework-issue-types';

interface SeedResult {
  success: boolean;
  patternsSeeded: number;
  patternsFailed: number;
  details: Array<{
    patternId: string;
    ruleId: string;
    success: boolean;
    error?: string;
  }>;
}

async function seedNestJSPatterns(): Promise<SeedResult> {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  SEEDING NESTJS PATTERNS TO SUPABASE                                 ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Local Patterns: ${NESTJS_PATTERNS.length.toString().padEnd(45)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const storage = getFrameworkPatternStorage();
  const result: SeedResult = {
    success: true,
    patternsSeeded: 0,
    patternsFailed: 0,
    details: [],
  };

  for (const pattern of NESTJS_PATTERNS) {
    console.log(`\n🔄 Processing: ${pattern.id}`);
    console.log(`   Rule: ${pattern.ruleId} | Tool: ${pattern.tool}`);
    console.log(`   Confidence: ${pattern.fixConfidence}%`);

    try {
      const storeResult = await storage.storePattern({
        ruleId: pattern.ruleId,
        tool: pattern.tool,
        framework: pattern.framework,
        name: pattern.id,
        description: getPatternDescription(pattern),
        transformationType: getTransformationType(pattern),
        fileTypes: getFileTypes(pattern),
        detection: {
          regex: pattern.codePattern,
          codePattern: pattern.codePattern,
        },
        fixTemplate: {
          template: pattern.fixTemplate,
          requiredImports: pattern.requiresImport,
        },
        examples: generateExamples(pattern),
        aiModel: 'manual-codequal-team',
        tags: [
          pattern.framework,
          pattern.tool,
          pattern.frameworkVersion || 'nestjs@10.x',
          `confidence:${pattern.fixConfidence}`,
        ],
      });

      if (storeResult.success) {
        console.log(`   ✅ Stored successfully (ID: ${storeResult.patternId?.substring(0, 8)}...)`);
        result.patternsSeeded++;
        result.details.push({
          patternId: storeResult.patternId || pattern.id,
          ruleId: pattern.ruleId,
          success: true,
        });
      } else {
        console.log(`   ❌ Failed: ${storeResult.error}`);
        result.patternsFailed++;
        result.details.push({
          patternId: pattern.id,
          ruleId: pattern.ruleId,
          success: false,
          error: storeResult.error,
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`   ❌ Exception: ${errorMsg}`);
      result.patternsFailed++;
      result.details.push({
        patternId: pattern.id,
        ruleId: pattern.ruleId,
        success: false,
        error: errorMsg,
      });
    }
  }

  result.success = result.patternsFailed === 0;

  // Print summary
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  SEED SUMMARY                                                        ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Patterns Seeded:  ${result.patternsSeeded.toString().padEnd(48)}║`);
  console.log(`║  Patterns Failed:  ${result.patternsFailed.toString().padEnd(48)}║`);
  console.log(`║  Success Rate:     ${((result.patternsSeeded / NESTJS_PATTERNS.length) * 100).toFixed(1)}%${' '.repeat(45)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Get updated stats
  try {
    const stats = await storage.getStatistics();
    console.log('┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│  SUPABASE PATTERN STORAGE STATS                                    │');
    console.log('├─────────────────────────────────────────────────────────────────────┤');
    console.log(`│  Total Patterns:     ${stats.totalPatterns.toString().padEnd(46)}│`);
    console.log(`│  Active Patterns:    ${stats.activePatterns.toString().padEnd(46)}│`);
    console.log(`│  Avg Confidence:     ${stats.avgConfidence.toFixed(1)}%${' '.repeat(43)}│`);
    console.log('│                                                                     │');
    console.log('│  By Framework:                                                      │');
    for (const [fw, count] of Object.entries(stats.byFramework)) {
      console.log(`│    ${fw.padEnd(15)} ${count.toString().padEnd(48)}│`);
    }
    console.log('│                                                                     │');
    console.log('│  By Tool:                                                           │');
    for (const [tool, count] of Object.entries(stats.byTool)) {
      console.log(`│    ${tool.padEnd(15)} ${count.toString().padEnd(48)}│`);
    }
    console.log('└─────────────────────────────────────────────────────────────────────┘');
  } catch (error) {
    console.log('⚠️ Could not fetch storage stats:', error);
  }

  return result;
}

// Helper functions
function getPatternDescription(pattern: FrameworkPattern): string {
  const descriptions: Record<string, string> = {
    'TS2339': 'TypeScript cannot find property on Reflect object - needs reflect-metadata setup',
    'TS2304': 'TypeScript cannot find CommonJS globals in ESM context - needs ESM-compatible approach',
    'TS2322': 'TypeScript strict null check failure - value might be undefined',
    'TS2503': 'TypeScript cannot find NodeJS namespace - needs @types/node',
    'TS2688': 'TypeScript cannot find type definition file - needs @types installation',
    'dependency-vulnerability': 'npm audit found vulnerable package versions',
  };
  return descriptions[pattern.ruleId] || `Fix pattern for ${pattern.ruleId}`;
}

function getTransformationType(pattern: FrameworkPattern): 'replace' | 'wrap' | 'inject' | 'remove' | 'restructure' | 'refactor' {
  // Most TypeScript errors are configuration/import issues
  if (pattern.tool === 'typescript') {
    return 'inject'; // Usually need to inject imports or config
  }
  if (pattern.ruleId === 'dependency-vulnerability') {
    return 'refactor'; // Package updates
  }
  return 'replace';
}

function getFileTypes(pattern: FrameworkPattern): string[] {
  if (pattern.tool === 'typescript') {
    return ['ts', 'tsx'];
  }
  if (pattern.tool === 'npm-audit') {
    return ['json']; // package.json
  }
  return ['ts', 'tsx', 'js', 'jsx'];
}

function generateExamples(pattern: FrameworkPattern): Array<{
  description: string;
  before: string;
  after: string;
}> {
  // Generate examples based on the pattern
  const examples = [];

  if (pattern.ruleId === 'TS2339') {
    examples.push({
      description: 'Add reflect-metadata import to entry point',
      before: `// main.ts
import { NestFactory } from '@nestjs/core';`,
      after: `// main.ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';`,
    });
  }

  if (pattern.ruleId === 'TS2304') {
    examples.push({
      description: 'Use ESM-compatible __dirname replacement',
      before: `const schemaPath = path.join(__dirname, 'schema.graphql');`,
      after: `import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const schemaPath = path.join(__dirname, 'schema.graphql');`,
    });
  }

  if (pattern.ruleId === 'TS2322') {
    examples.push({
      description: 'Add null check or nullish coalescing',
      before: `target = value;  // value might be undefined`,
      after: `target = value ?? defaultValue;`,
    });
  }

  if (pattern.ruleId === 'TS2503' || pattern.ruleId === 'TS2688') {
    examples.push({
      description: 'Install and configure @types/node',
      before: `// Error: Cannot find namespace 'NodeJS'
const timeout: NodeJS.Timeout = setTimeout(...);`,
      after: `// After: npm install --save-dev @types/node
// tsconfig.json: { "types": ["node"] }
const timeout: NodeJS.Timeout = setTimeout(...);`,
    });
  }

  if (pattern.ruleId === 'dependency-vulnerability') {
    examples.push({
      description: 'Run npm audit fix',
      before: `// package.json
"dependencies": {
  "vulnerable-package": "1.0.0"
}`,
      after: `// After: npm audit fix
"dependencies": {
  "vulnerable-package": "1.0.1"  // Fixed version
}`,
    });
  }

  return examples.length > 0 ? examples : [{
    description: 'Apply fix template',
    before: '// Issue detected',
    after: pattern.fixTemplate.substring(0, 200),
  }];
}

// Main execution
async function main(): Promise<void> {
  console.log('\n🚀 Starting NestJS Pattern Seed...\n');

  // Check environment
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚠️ Supabase credentials not found in environment');
    console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
    console.log('\n   Patterns will still work locally but won\'t persist across sessions.');
    console.log('   To enable Supabase, set these environment variables.\n');
  }

  try {
    const result = await seedNestJSPatterns();

    if (result.success) {
      console.log('\n✅ All patterns seeded successfully!');
      console.log(`   ${result.patternsSeeded} patterns now available in Supabase`);
    } else {
      console.log('\n⚠️ Some patterns failed to seed');
      console.log(`   Seeded: ${result.patternsSeeded}`);
      console.log(`   Failed: ${result.patternsFailed}`);
      for (const detail of result.details.filter(d => !d.success)) {
        console.log(`   - ${detail.ruleId}: ${detail.error}`);
      }
    }
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

main();
