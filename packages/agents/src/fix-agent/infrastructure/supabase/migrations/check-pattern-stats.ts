/**
 * Check pattern statistics in Supabase
 * Run: npx ts-node --transpile-only src/fix-agent/infrastructure/supabase/migrations/check-pattern-stats.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

interface Pattern {
  tool: string;
  rule_id: string;
  source: string;
  status: string;
}

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get total count
  const { count: total } = await supabase
    .from('fix_patterns')
    .select('*', { count: 'exact', head: true });

  // Get patterns
  const { data: patterns, error } = await supabase
    .from('fix_patterns')
    .select('tool, rule_id, source, status')
    .limit(1000);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (!patterns || patterns.length === 0) {
    console.log('No patterns found');
    return;
  }

  // Aggregate by tool
  const byTool: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const uniqueRules = new Set<string>();
  const pythonTools = ['bandit', 'safety', 'pip-audit', 'pylint', 'mypy', 'ruff'];
  let pythonCount = 0;

  for (const p of patterns as Pattern[]) {
    byTool[p.tool] = (byTool[p.tool] || 0) + 1;
    bySource[p.source] = (bySource[p.source] || 0) + 1;
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    uniqueRules.add(p.rule_id);
    if (pythonTools.includes(p.tool) || p.rule_id?.includes('python')) {
      pythonCount++;
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('           SUPABASE FIX PATTERNS STATISTICS            ');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📊 TOTAL PATTERNS:', total);
  console.log('\nBY TOOL:');
  Object.entries(byTool).sort((a, b) => b[1] - a[1]).forEach(([tool, count]) => {
    console.log('  ', tool.padEnd(20), count);
  });
  console.log('\nBY SOURCE:');
  Object.entries(bySource).forEach(([source, count]) => {
    console.log('  ', source.padEnd(20), count);
  });
  console.log('\nBY STATUS:');
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log('  ', status.padEnd(20), count);
  });
  console.log('\n📝 UNIQUE RULE IDS:', uniqueRules.size);
  console.log('🐍 PYTHON-RELATED:', pythonCount);
}

main().catch(console.error);
