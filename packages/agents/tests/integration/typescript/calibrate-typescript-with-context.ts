/**
 * TypeScript Pattern Calibration WITH CODE CONTEXT
 *
 * Properly reads code snippets from files before sending to AI fixer.
 * This ensures patterns have actual code, not "please provide code" errors.
 *
 * Usage:
 *   TS_TEST_REPO=microsoft/TypeScript MAX_ISSUES=50 npx ts-node tests/integration/typescript/calibrate-typescript-with-context.ts
 */

import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../../../.env') });

import { TypeScriptToolOrchestrator } from '../../../src/two-branch/tools/typescript/typescript-tool-orchestrator';
import { SimpleOpenRouterClient } from '../../../src/two-branch/services/simple-openrouter-client';
import { ModelConfigResolver } from '../../../src/standard/orchestrator/model-config-resolver';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const TEST_REPO = process.env.TS_TEST_REPO || 'microsoft/vscode';
const MAX_ISSUES = parseInt(process.env.MAX_ISSUES || '50', 10);

// Dynamic model configuration - retrieved from Supabase
let calibrationModel: string | null = null;

async function getCalibrationModel(): Promise<string> {
  if (calibrationModel) return calibrationModel;

  try {
    const resolver = new ModelConfigResolver();
    // Try typescript-specific config first, fall back to python config
    try {
      const config = await resolver.getModelConfiguration('ai_fixer', 'typescript', 'any');
      calibrationModel = config.primary_model;
    } catch {
      // Fall back to python config if typescript not configured
      const config = await resolver.getModelConfiguration('ai_fixer', 'python', 'any');
      calibrationModel = config.primary_model;
    }
    console.log(`[Model] Using dynamic model from Supabase: ${calibrationModel}`);
    return calibrationModel;
  } catch (error) {
    // Fallback to config from environment or default
    calibrationModel = process.env.CALIBRATION_MODEL || 'anthropic/claude-sonnet-4.5';
    console.log(`[Model] Using fallback model: ${calibrationModel}`);
    return calibrationModel;
  }
}

interface IssueWithContext {
  file: string;
  line: number;
  rule: string;
  tool: string;
  message: string;
  severity: string;
  codeSnippet: string;
}

// Global variable to store repo path for relative file resolution
let globalRepoPath = '';

/**
 * Extract code snippet from file (10 lines around the issue)
 * Handles macOS /private prefix, relative paths, Docker /workspace paths
 */
function extractCodeSnippet(filePath: string, line: number): string {
  try {
    const pathsToTry = [
      filePath,
      filePath.replace('/private', ''),
      filePath.replace(/^\/private/, ''),
      path.join(globalRepoPath, filePath),
      path.join(globalRepoPath, filePath.replace(/^\.\//, '')),
      // Handle Docker /workspace/ prefix (ESLint, TSC may run in Docker)
      path.join(globalRepoPath, filePath.replace(/^\/workspace\//, '')),
      path.join(globalRepoPath, filePath.replace(/^\/workspace/, '')),
      filePath.replace(/^\/workspace\//, globalRepoPath + '/'),
      filePath.replace(/^\/workspace/, globalRepoPath),
    ];

    let actualPath = '';
    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        actualPath = p;
        break;
      }
    }

    if (!actualPath) {
      return '';
    }

    const content = fs.readFileSync(actualPath, 'utf8');
    const lines = content.split('\n');

    const startLine = Math.max(0, line - 6);
    const endLine = Math.min(lines.length, line + 5);

    const snippet = lines.slice(startLine, endLine)
      .map((l, i) => `${startLine + i + 1}: ${l}`)
      .join('\n');

    return snippet;
  } catch (error) {
    return '';
  }
}

let openRouterClient: SimpleOpenRouterClient | null = null;

function getOpenRouterClient(): SimpleOpenRouterClient {
  if (!openRouterClient) {
    openRouterClient = new SimpleOpenRouterClient();
  }
  return openRouterClient;
}

async function generatePatternWithContext(
  issue: IssueWithContext,
  supabase: any
): Promise<{ success: boolean; pattern?: any }> {
  if (!issue.codeSnippet) {
    console.log(`  ⚠️ Skipping ${issue.rule}: No code snippet available`);
    return { success: false };
  }

  const prompt = `Fix this ${issue.tool} issue in TypeScript/JavaScript code:

Rule: ${issue.rule}
Message: ${issue.message}
File: ${issue.file}
Line: ${issue.line}

CODE SNIPPET (with line numbers):
\`\`\`typescript
${issue.codeSnippet}
\`\`\`

Provide a JSON response with:
{
  "correctedCode": "The fixed version of the problematic line(s)",
  "explanation": "Brief explanation of the fix",
  "bestPractices": ["Practice 1", "Practice 2"]
}

IMPORTANT: Return ONLY valid JSON. The correctedCode must be actual TypeScript/JavaScript code, not an explanation.`;

  try {
    const client = getOpenRouterClient();
    const model = await getCalibrationModel();
    const response = await client.chat({
      systemPrompt: 'You are an expert TypeScript/JavaScript code fixer. Return only valid JSON.',
      userPrompt: prompt,
      model: model,
    });

    const content = response.content || '';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`  ⚠️ ${issue.rule}: No JSON in response`);
      return { success: false };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (parsed.correctedCode?.includes("haven't provided") ||
        parsed.correctedCode?.includes("please share") ||
        parsed.correctedCode?.length < 5) {
      console.log(`  ⚠️ ${issue.rule}: AI returned error instead of code`);
      return { success: false };
    }

    const pattern = {
      rule_id: issue.rule,
      tool: issue.tool,
      name: `${issue.tool}: ${issue.rule}`,
      description: issue.message.substring(0, 500),
      transformation_type: 'replace',
      file_types: ['ts', 'tsx', 'js', 'jsx'],  // TypeScript and JavaScript
      detection: {
        rules: [issue.rule],
        patterns: [],
      },
      fix_template: {
        template: parsed.correctedCode,
        indentation: 'preserve',
        requiredVariables: [],
      },
      examples: [{
        before: issue.codeSnippet,
        after: parsed.correctedCode,
        fileName: issue.file,
        description: parsed.explanation || 'AI-generated fix with code context',
        variables: {},
      }],
      confidence: 90,
      safe_for_auto_apply: false,
      status: 'active',
      created_by: 'pattern-calibration',
      source: 'ai_generated',
      ai_model: model,
      ai_confidence: 90,
      verified: false,
      apply_count: 0,
      success_count: 0,
      revert_count: 0,
      tags: ['typescript', 'javascript', 'ai-generated', 'calibration'],
    };

    const { data: existing } = await supabase
      .from('fix_patterns')
      .select('id')
      .eq('rule_id', issue.rule)
      .eq('tool', issue.tool)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('fix_patterns')
        .update({
          fix_template: pattern.fix_template,
          examples: pattern.examples,
          confidence: pattern.confidence,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        console.log(`  ❌ ${issue.rule}: Supabase update error: ${error.message}`);
        return { success: false };
      }
    } else {
      const { error } = await supabase
        .from('fix_patterns')
        .insert(pattern);

      if (error) {
        console.log(`  ❌ ${issue.rule}: Supabase insert error: ${error.message}`);
        return { success: false };
      }
    }

    console.log(`  ✅ ${issue.rule}: Pattern saved`);
    return { success: true, pattern };

  } catch (error) {
    console.log(`  ❌ ${issue.rule}: ${(error as Error).message}`);
    return { success: false };
  }
}

async function calibrate() {
  const startTime = Date.now();
  const repoUrl = `https://github.com/${TEST_REPO}`;
  const testDir = `/tmp/ts-calibrate-ctx-${Date.now()}`;
  const repoPath = `${testDir}/repo`;

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║          TYPESCRIPT PATTERN CALIBRATION WITH CODE CONTEXT                    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Repository: ${TEST_REPO.padEnd(62)}║
║  Max Issues: ${MAX_ISSUES.toString().padEnd(62)}║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    console.log('📦 Step 1: Cloning repository...');
    fs.mkdirSync(testDir, { recursive: true });
    execSync(`git clone --depth 1 ${repoUrl} ${repoPath}`, {
      stdio: 'pipe',
      timeout: 300000,
    });
    globalRepoPath = repoPath;
    console.log('   ✅ Repository cloned\n');

    console.log('🔍 Step 2: Running TypeScript security analysis...');
    const orchestrator = new TypeScriptToolOrchestrator();
    const scanResults = await orchestrator.orchestrate(repoPath, 'base', { analysisMode: 'complete' });

    const allIssues = scanResults.toolResults?.flatMap(tr => tr.issues || []) || [];
    console.log(`   ✅ Found ${allIssues.length} issues\n`);

    const seenRules = new Set<string>();
    const uniqueIssues: any[] = [];

    for (const issue of allIssues) {
      const key = `${issue.tool}:${issue.rule}`;
      if (!seenRules.has(key)) {
        seenRules.add(key);
        uniqueIssues.push(issue);
      }
    }

    console.log(`   📊 ${uniqueIssues.length} unique rules to calibrate\n`);

    const issuesToProcess = uniqueIssues.slice(0, MAX_ISSUES);

    console.log('📄 Step 3: Extracting code context...');
    const issuesWithContext: IssueWithContext[] = issuesToProcess.map(issue => ({
      file: issue.file,
      line: issue.line,
      rule: issue.rule || 'unknown',
      tool: issue.tool,
      message: issue.message,
      severity: issue.severity || 'medium',
      codeSnippet: extractCodeSnippet(issue.file, issue.line),
    }));

    const withContext = issuesWithContext.filter(i => i.codeSnippet.length > 0);
    const withoutContext = issuesWithContext.filter(i => i.codeSnippet.length === 0);

    console.log(`   ✅ ${withContext.length}/${issuesToProcess.length} have code context\n`);

    const contextByTool = new Map<string, { with: number; without: number }>();
    for (const issue of issuesWithContext) {
      const stats = contextByTool.get(issue.tool) || { with: 0, without: 0 };
      if (issue.codeSnippet) {
        stats.with++;
      } else {
        stats.without++;
      }
      contextByTool.set(issue.tool, stats);
    }

    console.log('   📊 Context by tool:');
    for (const [tool, stats] of contextByTool) {
      console.log(`      ${tool}: ${stats.with} with context, ${stats.without} missing`);
    }

    if (withoutContext.length > 0) {
      console.log('\n   ⚠️ Sample files missing context:');
      for (const issue of withoutContext.slice(0, 3)) {
        console.log(`      - ${issue.tool}:${issue.rule} → ${issue.file}:${issue.line}`);
      }
    }
    console.log();

    console.log('🔧 Step 4: Generating patterns with AI...');
    let successCount = 0;

    for (const issue of withContext) {
      process.stdout.write(`   Processing ${issue.tool}:${issue.rule}...`);
      const result = await generatePatternWithContext(issue, supabase);
      if (result.success) successCount++;

      await new Promise(r => setTimeout(r, 1000));
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                         CALIBRATION COMPLETE                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Repository:       ${TEST_REPO.padEnd(56)}║
║  Unique Rules:     ${uniqueIssues.length.toString().padEnd(56)}║
║  With Context:     ${withContext.length.toString().padEnd(56)}║
║  Patterns Created: ${successCount.toString().padEnd(56)}║
║  Duration:         ${duration.toFixed(1)}s${' '.repeat(53)}║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  } finally {
    try {
      execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
    } catch {}
  }
}

calibrate().catch(console.error);
