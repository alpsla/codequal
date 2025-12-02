/**
 * Generate Seed Data SQL for Supabase
 *
 * This script generates SQL INSERT statements from our TypeScript SEED_TOOLS
 * for migration to Supabase. Run with: npx ts-node generate-seed-data.ts > seed-data.sql
 */

import { SEED_TOOLS, SEED_FIXER_MAPPINGS } from '../../schemas/tool-database-schema';

function escapeSQL(str: string | undefined): string {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

function generateToolsSQL(): string {
  const lines: string[] = [];

  lines.push('-- =============================================================================');
  lines.push('-- SEED DATA: Tools');
  lines.push('-- Generated from TypeScript SEED_TOOLS on ' + new Date().toISOString());
  lines.push('-- =============================================================================');
  lines.push('');

  for (const tool of SEED_TOOLS) {
    // Insert tool
    lines.push(`-- Tool: ${tool.name}`);
    lines.push(`INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)`);
    lines.push(`VALUES (`);
    lines.push(`  ${escapeSQL(tool.id)},`);
    lines.push(`  ${escapeSQL(tool.name)},`);
    lines.push(`  ${escapeSQL(tool.type)}::tool_type,`);
    lines.push(`  ${escapeSQL(tool.command)},`);
    lines.push(`  ${escapeSQL(tool.outputFormat)}::output_format,`);
    lines.push(`  ${tool.hasNativeFix},`);
    lines.push(`  ${escapeSQL(tool.nativeFixCommand)},`);
    lines.push(`  ${escapeSQL(tool.version)},`);
    lines.push(`  ${escapeSQL(tool.documentationUrl)},`);
    lines.push(`  ${escapeSQL(tool.ruleDocUrlPattern)},`);
    lines.push(`  ${tool.isEnabled}`);
    lines.push(`) ON CONFLICT (id) DO UPDATE SET`);
    lines.push(`  name = EXCLUDED.name,`);
    lines.push(`  type = EXCLUDED.type,`);
    lines.push(`  command = EXCLUDED.command,`);
    lines.push(`  output_format = EXCLUDED.output_format,`);
    lines.push(`  has_native_fix = EXCLUDED.has_native_fix,`);
    lines.push(`  native_fix_command = EXCLUDED.native_fix_command,`);
    lines.push(`  version = EXCLUDED.version,`);
    lines.push(`  documentation_url = EXCLUDED.documentation_url,`);
    lines.push(`  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,`);
    lines.push(`  is_enabled = EXCLUDED.is_enabled,`);
    lines.push(`  updated_at = NOW();`);
    lines.push('');

    // Insert languages
    for (const lang of tool.languages) {
      lines.push(`INSERT INTO tool_languages (tool_id, language) VALUES (${escapeSQL(tool.id)}, ${escapeSQL(lang)}::programming_language) ON CONFLICT DO NOTHING;`);
    }

    // Insert categories
    for (const cat of tool.categories) {
      lines.push(`INSERT INTO tool_categories (tool_id, category) VALUES (${escapeSQL(tool.id)}, ${escapeSQL(cat)}::tool_category) ON CONFLICT DO NOTHING;`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

function generateFixerMappingsSQL(): string {
  const lines: string[] = [];

  lines.push('-- =============================================================================');
  lines.push('-- SEED DATA: Fixer Mappings');
  lines.push('-- =============================================================================');
  lines.push('');

  for (const mapping of SEED_FIXER_MAPPINGS) {
    lines.push(`INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)`);
    lines.push(`VALUES (`);
    lines.push(`  ${escapeSQL(mapping.analyzerToolId)},`);
    lines.push(`  ${escapeSQL(mapping.rulePattern)},`);
    lines.push(`  ${escapeSQL(mapping.fixerToolId)},`);
    lines.push(`  ${escapeSQL(String(mapping.fixTier))}::fix_tier,`);
    lines.push(`  ${mapping.confidence},`);
    lines.push(`  ${escapeSQL(mapping.notes)}`);
    lines.push(`) ON CONFLICT DO NOTHING;`);
    lines.push('');
  }

  return lines.join('\n');
}

function generateSummary(): string {
  const enabledTools = SEED_TOOLS.filter(t => t.isEnabled);
  const disabledTools = SEED_TOOLS.filter(t => !t.isEnabled);

  const languages = new Set<string>();
  const categories = new Set<string>();

  for (const tool of SEED_TOOLS) {
    tool.languages.forEach(l => languages.add(l));
    tool.categories.forEach(c => categories.add(c));
  }

  const lines: string[] = [];
  lines.push('-- =============================================================================');
  lines.push('-- SUMMARY');
  lines.push('-- =============================================================================');
  lines.push(`-- Total tools: ${SEED_TOOLS.length}`);
  lines.push(`-- Enabled tools: ${enabledTools.length}`);
  lines.push(`-- Disabled tools: ${disabledTools.length} (${disabledTools.map(t => t.id).join(', ')})`);
  lines.push(`-- Languages covered: ${languages.size} (${Array.from(languages).sort().join(', ')})`);
  lines.push(`-- Categories covered: ${categories.size} (${Array.from(categories).sort().join(', ')})`);
  lines.push(`-- Fixer mappings: ${SEED_FIXER_MAPPINGS.length}`);
  lines.push('-- =============================================================================');
  lines.push('');

  return lines.join('\n');
}

// Generate and output
const output = [
  '-- ================================================================================',
  '-- CodeQual Tool Database - Seed Data',
  '-- Generated: ' + new Date().toISOString(),
  '-- ================================================================================',
  '',
  '-- Run this AFTER the schema migration (tool-database-schema.sql)',
  '',
  'BEGIN;',
  '',
  generateSummary(),
  generateToolsSQL(),
  generateFixerMappingsSQL(),
  '-- Verify counts',
  'SELECT',
  "  (SELECT COUNT(*) FROM tools) as tools_count,",
  "  (SELECT COUNT(*) FROM tool_languages) as tool_languages_count,",
  "  (SELECT COUNT(*) FROM tool_categories) as tool_categories_count,",
  "  (SELECT COUNT(*) FROM fixer_mappings) as fixer_mappings_count;",
  '',
  'COMMIT;',
  '',
].join('\n');

console.log(output);
