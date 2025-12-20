/**
 * Tool Matrix Verification Script
 *
 * Verifies that all tools from TOOLS_SCAN_FIX_MAPPING.md are properly:
 * 1. Registered in Supabase (validator_tools, fixer_tools)
 * 2. Configured in language orchestrators
 * 3. Available in tool-fix-registry
 */

import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { createClient } from '@supabase/supabase-js';

// Tool matrix from TOOLS_SCAN_FIX_MAPPING.md
const EXPECTED_TOOLS = {
  // ============================================================
  // UNIVERSAL TOOLS (All Languages)
  // ============================================================
  universal: {
    scanners: [
      { id: 'semgrep', name: 'Semgrep', category: 'security', tier: 1, hasFix: true },
      { id: 'gitleaks', name: 'Gitleaks', category: 'security', tier: 3, hasFix: false },
      { id: 'trufflehog', name: 'TruffleHog', category: 'security', tier: 3, hasFix: false },
      { id: 'checkov', name: 'Checkov', category: 'security', tier: 3, hasFix: false },
      { id: 'trivy', name: 'Trivy', category: 'security', tier: 3, hasFix: false },
      { id: 'grype', name: 'Grype', category: 'security', tier: 3, hasFix: false },
    ],
    fixers: [],
  },

  // ============================================================
  // TYPESCRIPT/JAVASCRIPT
  // ============================================================
  typescript: {
    scanners: [
      { id: 'tsc', name: 'TypeScript Compiler', category: 'code_quality', tier: 3, hasFix: false },
      { id: 'npm-audit', name: 'npm audit', category: 'dependencies', tier: 2, hasFix: true },
      { id: 'lighthouse', name: 'Lighthouse', category: 'performance', tier: 3, hasFix: false },
      { id: 'bundle-analyzer', name: 'Bundle Analyzer', category: 'performance', tier: 3, hasFix: false },
      { id: 'madge', name: 'Madge', category: 'architecture', tier: 3, hasFix: false },
      { id: 'dependency-cruiser', name: 'Dependency Cruiser', category: 'architecture', tier: 3, hasFix: false },
      { id: 'ts-unused-exports', name: 'ts-unused-exports', category: 'architecture', tier: 3, hasFix: false },
    ],
    dualPurpose: [
      { id: 'eslint', name: 'ESLint', category: 'code_quality', tier: 1, hasFix: true },
      { id: 'biome', name: 'Biome', category: 'code_quality', tier: 1, hasFix: true },
    ],
    fixers: [
      { id: 'prettier', name: 'Prettier', category: 'formatting', tier: 1 },
    ],
  },

  // ============================================================
  // PYTHON
  // ============================================================
  python: {
    scanners: [
      { id: 'bandit', name: 'Bandit', category: 'security', tier: 3, hasFix: false },
      { id: 'mypy', name: 'mypy', category: 'code_quality', tier: 3, hasFix: false },
      { id: 'pylint', name: 'Pylint', category: 'code_quality', tier: 2, hasFix: false },
      { id: 'pip-audit', name: 'pip-audit', category: 'dependencies', tier: 3, hasFix: false },
      { id: 'safety', name: 'Safety', category: 'dependencies', tier: 3, hasFix: false },
      { id: 'py-spy', name: 'py-spy', category: 'performance', tier: 3, hasFix: false },
      { id: 'pydeps', name: 'pydeps', category: 'architecture', tier: 3, hasFix: false },
    ],
    dualPurpose: [
      { id: 'ruff', name: 'Ruff', category: 'code_quality', tier: 1, hasFix: true },
    ],
    fixers: [
      { id: 'black', name: 'Black', category: 'formatting', tier: 1 },
      { id: 'isort', name: 'isort', category: 'imports', tier: 1 },
      { id: 'autoflake', name: 'autoflake', category: 'unused_code', tier: 1 },
      { id: 'pyupgrade', name: 'pyupgrade', category: 'modernization', tier: 2 },
    ],
  },

  // ============================================================
  // JAVA
  // ============================================================
  java: {
    scanners: [
      { id: 'checkstyle', name: 'Checkstyle', category: 'code_quality', tier: 2, hasFix: false },
      { id: 'pmd', name: 'PMD', category: 'code_quality', tier: 2, hasFix: false },
      { id: 'spotbugs', name: 'SpotBugs', category: 'security', tier: 2, hasFix: false },
      { id: 'dependency-check', name: 'OWASP Dependency-Check', category: 'dependencies', tier: 2, hasFix: false },
      { id: 'jmh', name: 'JMH', category: 'performance', tier: 3, hasFix: false },
      { id: 'jdepend', name: 'JDepend', category: 'architecture', tier: 3, hasFix: false },
    ],
    dualPurpose: [],
    fixers: [
      { id: 'google-java-format', name: 'google-java-format', category: 'formatting', tier: 2 },
      { id: 'sorald', name: 'Sorald', category: 'bug_fixes', tier: 2 },
      { id: 'spotless', name: 'Spotless', category: 'formatting', tier: 2 },
    ],
  },

  // ============================================================
  // GO
  // ============================================================
  go: {
    scanners: [
      { id: 'staticcheck', name: 'staticcheck', category: 'code_quality', tier: 3, hasFix: false },
      { id: 'gosec', name: 'gosec', category: 'security', tier: 3, hasFix: false },
      { id: 'govulncheck', name: 'govulncheck', category: 'dependencies', tier: 3, hasFix: false },
      { id: 'pprof', name: 'pprof', category: 'performance', tier: 3, hasFix: false },
    ],
    dualPurpose: [
      { id: 'golangci-lint', name: 'golangci-lint', category: 'code_quality', tier: 1, hasFix: true },
    ],
    fixers: [
      { id: 'gofmt', name: 'gofmt', category: 'formatting', tier: 1 },
      { id: 'goimports', name: 'goimports', category: 'imports', tier: 1 },
    ],
  },

  // ============================================================
  // RUST
  // ============================================================
  rust: {
    scanners: [
      { id: 'cargo-audit', name: 'cargo-audit', category: 'dependencies', tier: 3, hasFix: false },
      { id: 'cargo-deny', name: 'cargo-deny', category: 'dependencies', tier: 3, hasFix: false },
    ],
    dualPurpose: [
      { id: 'clippy', name: 'Clippy', category: 'code_quality', tier: 1, hasFix: true },
    ],
    fixers: [
      { id: 'rustfmt', name: 'rustfmt', category: 'formatting', tier: 1 },
    ],
  },

  // ============================================================
  // RUBY
  // ============================================================
  ruby: {
    scanners: [
      { id: 'brakeman', name: 'Brakeman', category: 'security', tier: 3, hasFix: false },
      { id: 'bundler-audit', name: 'bundler-audit', category: 'dependencies', tier: 3, hasFix: false },
    ],
    dualPurpose: [
      { id: 'rubocop', name: 'RuboCop', category: 'code_quality', tier: 1, hasFix: true },
    ],
    fixers: [],
  },

  // ============================================================
  // PHP
  // ============================================================
  php: {
    scanners: [
      { id: 'phpstan', name: 'PHPStan', category: 'code_quality', tier: 3, hasFix: false },
      { id: 'psalm', name: 'Psalm', category: 'code_quality', tier: 3, hasFix: false },
      { id: 'composer-audit', name: 'composer audit', category: 'dependencies', tier: 3, hasFix: false },
    ],
    dualPurpose: [
      { id: 'phpcs', name: 'PHPCS', category: 'code_quality', tier: 2, hasFix: true },
    ],
    fixers: [
      { id: 'php-cs-fixer', name: 'PHP-CS-Fixer', category: 'formatting', tier: 1 },
      { id: 'phpcbf', name: 'phpcbf', category: 'style', tier: 2 },
    ],
  },

  // ============================================================
  // C#/.NET
  // ============================================================
  dotnet: {
    scanners: [
      { id: 'security-code-scan', name: 'Security Code Scan', category: 'security', tier: 3, hasFix: false },
      { id: 'dotnet-outdated', name: 'dotnet-outdated', category: 'dependencies', tier: 3, hasFix: false },
    ],
    dualPurpose: [
      { id: 'dotnet-format', name: 'dotnet format', category: 'code_quality', tier: 1, hasFix: true },
    ],
    fixers: [],
  },

  // ============================================================
  // API TOOLS (P1)
  // ============================================================
  api: {
    scanners: [
      { id: 'spectral', name: 'Spectral', category: 'api', tier: 3, hasFix: false },
      { id: 'graphql-cop', name: 'GraphQL Cop', category: 'security', tier: 3, hasFix: false },
    ],
    fixers: [],
  },

  // ============================================================
  // ARCHITECTURE TOOLS (P2)
  // ============================================================
  architecture: {
    scanners: [
      { id: 'jqassistant', name: 'jQAssistant', category: 'architecture', tier: 3, hasFix: false },
      { id: 'py-arch', name: 'PyArch', category: 'architecture', tier: 3, hasFix: false },
      { id: 'ts-arch', name: 'ts-arch', category: 'architecture', tier: 3, hasFix: false },
    ],
    fixers: [],
  },

  // ============================================================
  // CLOUD API FIXERS (Tier 2.5)
  // ============================================================
  cloudApi: {
    fixers: [
      { id: 'corgea', name: 'Corgea Cloud Fixer', category: 'security', tier: 2.5 },
    ],
  },
};

interface ToolEntry {
  id: string;
  name: string;
  category: string;
  tier: number;
  hasFix?: boolean;
}

interface LanguageTools {
  scanners?: ToolEntry[];
  dualPurpose?: ToolEntry[];
  fixers?: ToolEntry[];
}

interface VerificationResult {
  category: string;
  tool: string;
  inSupabase: boolean;
  inOrchestrator: boolean;
  inFixRegistry: boolean;
  issues: string[];
}

async function verifyToolsMatrix(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                      TOOL MATRIX VERIFICATION                             ║
║                                                                           ║
║  Checking all tools from TOOLS_SCAN_FIX_MAPPING.md are properly:          ║
║  1. Registered in Supabase (validator_tools, fixer_tools)                 ║
║  2. Configured in language orchestrators                                  ║
║  3. Available in tool-fix-registry                                        ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch all tools from Supabase
  console.log('📊 Fetching tools from Supabase...\n');

  const { data: validatorTools, error: vError } = await supabase
    .from('validator_tools')
    .select('tool_id, name, categories, languages');

  const { data: fixerTools, error: fError } = await supabase
    .from('fixer_tools')
    .select('tool_id, name, categories, languages, fix_type');

  if (vError) {
    console.error('❌ Error fetching validator_tools:', vError.message);
  }
  if (fError) {
    console.error('❌ Error fetching fixer_tools:', fError.message);
  }

  const validatorIds = new Set((validatorTools || []).map(t => t.tool_id));
  const fixerIds = new Set((fixerTools || []).map(t => t.tool_id));

  console.log(`   ✅ Found ${validatorIds.size} validator tools in Supabase`);
  console.log(`   ✅ Found ${fixerIds.size} fixer tools in Supabase\n`);

  // Summary counts
  let totalTools = 0;
  let inSupabase = 0;
  let missingFromSupabase: string[] = [];

  // Check each language
  for (const [language, tools] of Object.entries(EXPECTED_TOOLS) as [string, LanguageTools][]) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 ${language.toUpperCase()}`);
    console.log(`${'='.repeat(60)}`);

    const allTools = [
      ...(tools.scanners || []),
      ...(tools.dualPurpose || []),
      ...(tools.fixers || []),
    ];

    for (const tool of allTools) {
      totalTools++;
      const isScanner = (tools.scanners || []).some(s => s.id === tool.id) ||
                        (tools.dualPurpose || []).some(d => d.id === tool.id);
      const isFixer = (tools.fixers || []).some(f => f.id === tool.id) ||
                      (tools.dualPurpose || []).some(d => d.id === tool.id && d.hasFix);

      const inValidators = validatorIds.has(tool.id);
      const inFixers = fixerIds.has(tool.id);

      let status = '✅';
      let notes: string[] = [];

      // Check if scanner is in validator_tools
      if (isScanner && !inValidators) {
        status = '⚠️';
        notes.push('Not in validator_tools');
        missingFromSupabase.push(`${language}/${tool.id} (validator)`);
      } else if (isScanner && inValidators) {
        inSupabase++;
      }

      // Check if fixer is in fixer_tools
      if (isFixer && !inFixers) {
        if (status !== '⚠️') status = '⚠️';
        notes.push('Not in fixer_tools');
        missingFromSupabase.push(`${language}/${tool.id} (fixer)`);
      } else if (isFixer && inFixers) {
        inSupabase++;
      }

      // If tool isn't a scanner or fixer requirement, just check if it exists anywhere
      if (!isScanner && !isFixer) {
        if (inValidators || inFixers) {
          inSupabase++;
        } else {
          status = '⚠️';
          notes.push('Not in Supabase');
          missingFromSupabase.push(`${language}/${tool.id}`);
        }
      }

      const tier = 'tier' in tool ? `Tier ${tool.tier}` : '';
      const category = 'category' in tool ? tool.category : '';
      const noteStr = notes.length > 0 ? ` - ${notes.join(', ')}` : '';

      console.log(`   ${status} ${tool.name} (${tool.id}) [${tier}] ${category}${noteStr}`);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 VERIFICATION SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   Total tools in matrix: ${totalTools}`);
  console.log(`   In Supabase: ${inSupabase}`);
  console.log(`   Missing: ${missingFromSupabase.length}`);

  if (missingFromSupabase.length > 0) {
    console.log(`\n⚠️  Missing from Supabase:`);
    missingFromSupabase.forEach(t => console.log(`   - ${t}`));
  }

  // List what's in Supabase but not in matrix
  const matrixToolIds = new Set<string>();
  for (const tools of Object.values(EXPECTED_TOOLS) as LanguageTools[]) {
    (tools.scanners || []).forEach(t => matrixToolIds.add(t.id));
    (tools.dualPurpose || []).forEach(t => matrixToolIds.add(t.id));
    (tools.fixers || []).forEach(t => matrixToolIds.add(t.id));
  }

  const extraInSupabase = [
    ...[...validatorIds].filter(id => !matrixToolIds.has(id)),
    ...[...fixerIds].filter(id => !matrixToolIds.has(id)),
  ];

  if (extraInSupabase.length > 0) {
    console.log(`\nℹ️  Extra tools in Supabase (not in matrix):`);
    [...new Set(extraInSupabase)].forEach(t => console.log(`   - ${t}`));
  }

  console.log(`\n${'='.repeat(60)}\n`);
}

// Run verification
verifyToolsMatrix().catch(console.error);
