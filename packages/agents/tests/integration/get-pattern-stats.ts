/**
 * Get Fix Pattern Statistics from Supabase
 */
import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { createClient } from '@supabase/supabase-js';

async function getStats() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get total patterns
  const { count: totalPatterns } = await supabase
    .from('fix_patterns')
    .select('*', { count: 'exact', head: true });

  // Get all patterns for analysis
  const { data: allPatterns } = await supabase
    .from('fix_patterns')
    .select('tool, tags, file_types, source, created_by');

  const toolCounts: Record<string, number> = {};
  const langCounts: Record<string, number> = {};
  let aiGenerated = 0;
  let calibrationPatterns = 0;

  allPatterns?.forEach(p => {
    // Count by tool
    toolCounts[p.tool] = (toolCounts[p.tool] || 0) + 1;

    // Count AI-generated
    if (p.source === 'ai_generated') aiGenerated++;
    if (p.created_by === 'pattern-calibration') calibrationPatterns++;

    // Count by language
    const tags = p.tags || [];
    const fileTypes = p.file_types || [];

    if (tags.includes('java') || fileTypes.includes('java')) {
      langCounts['java'] = (langCounts['java'] || 0) + 1;
    } else if (tags.includes('python') || fileTypes.includes('.py')) {
      langCounts['python'] = (langCounts['python'] || 0) + 1;
    } else if (tags.includes('typescript') || tags.includes('javascript') ||
               fileTypes.includes('ts') || fileTypes.includes('tsx') ||
               fileTypes.includes('js') || fileTypes.includes('jsx')) {
      langCounts['typescript/js'] = (langCounts['typescript/js'] || 0) + 1;
    } else if (fileTypes.includes('.yml') || fileTypes.includes('.yaml')) {
      langCounts['yaml'] = (langCounts['yaml'] || 0) + 1;
    } else if (fileTypes.includes('Dockerfile')) {
      langCounts['dockerfile'] = (langCounts['dockerfile'] || 0) + 1;
    } else {
      langCounts['other'] = (langCounts['other'] || 0) + 1;
    }
  });

  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    FIX PATTERNS DATABASE STATISTICS                          ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║  TOTAL PATTERNS:      ${totalPatterns?.toString().padEnd(53)}║`);
  console.log(`║  AI-Generated:        ${aiGenerated.toString().padEnd(53)}║`);
  console.log(`║  From Calibration:    ${calibrationPatterns.toString().padEnd(53)}║`);
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log('║  BY LANGUAGE:                                                                ║');
  Object.entries(langCounts).sort((a, b) => b[1] - a[1]).forEach(([lang, count]) => {
    console.log(`║    ${(lang + ':').padEnd(20)}${count.toString().padEnd(52)}║`);
  });
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log('║  BY TOOL:                                                                    ║');
  Object.entries(toolCounts).sort((a, b) => b[1] - a[1]).forEach(([tool, count]) => {
    console.log(`║    ${(tool + ':').padEnd(25)}${count.toString().padEnd(47)}║`);
  });
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
}

getStats().catch(console.error);
