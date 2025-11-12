/**
 * Test Git Patch Generation
 *
 * Tests the universal Git patch solution with real Spring PetClinic data
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateSimplePatch } from '../../src/two-branch/utils/git-patch-generator';
import type { EnrichedIssue } from '../../src/two-branch/analyzers/v9-grouped-report-formatter';

async function testPatchGeneration() {
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('       Git Patch Generation Test\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Load the manifest
  const manifestPath = path.join(__dirname, 'test-outputs/spring-petclinic-pr-#950-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  console.log(`📋 Source: ${manifest.metadata.repository}`);
  console.log(`📊 Total Issues: ${manifest.metadata.total_issues}\n`);

  // Load fix files and convert to EnrichedIssue format
  const allIssues: EnrichedIssue[] = [];

  const allFiles = [
    ...manifest.files.critical,
    ...manifest.files.high,
    ...manifest.files.medium,
    ...manifest.files.low
  ];

  for (const fileInfo of allFiles) {
    const fixFilePath = path.join(__dirname, 'test-outputs', fileInfo.fallback_path);

    if (!fs.existsSync(fixFilePath)) {
      console.warn(`⚠️  Fix file not found: ${fixFilePath}`);
      continue;
    }

    console.log(`📄 Loading: ${fileInfo.filename}`);

    const fixContent = JSON.parse(fs.readFileSync(fixFilePath, 'utf-8'));

    // Convert locations to EnrichedIssue
    if (fixContent.locations && fixContent.locations.length > 0) {
      for (const location of fixContent.locations) {
        const issue: EnrichedIssue = {
          file: location.file,
          line: location.line,
          column: location.column || 0,
          rule: fileInfo.rule,
          tool: fixContent.tool || 'semgrep',
          severity: fileInfo.severity as any,
          message: fixContent.description || fileInfo.description,
          category: location.category || 'NEW',
          detectedCategory: fileInfo.category,
          snippet: location.snippet || ''
        };

        // Add fix suggestion
        if (fixContent.fix_pattern?.example?.after) {
          issue.fixSuggestion = {
            fix: fixContent.fix_pattern.instructions || fixContent.description,
            correctedCode: fixContent.fix_pattern.example.after,
            explanation: fixContent.fix_pattern.instructions || ''
          };
        }

        allIssues.push(issue);
      }
    }
  }

  console.log(`\n✅ Loaded ${allIssues.length} issues with fixes\n`);

  // Generate patch
  console.log('🔧 Generating Git Patch...\n');

  const patch = generateSimplePatch(allIssues, {
    repository: manifest.metadata.repository,
    prNumber: 950,
    branch: 'main'
  });

  // Save patch
  const outputDir = path.join(__dirname, 'test-outputs/patches');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const patchPath = path.join(outputDir, 'codequal-fixes-pr950.patch');
  fs.writeFileSync(patchPath, patch);

  console.log(`✅ Patch generated: ${patchPath}`);
  console.log(`📏 Patch size: ${(patch.length / 1024).toFixed(2)} KB\n`);

  // Show patch preview
  console.log('📄 Patch Preview (first 50 lines):\n');
  console.log('─'.repeat(60));
  const patchLines = patch.split('\n');
  console.log(patchLines.slice(0, 50).join('\n'));
  if (patchLines.length > 50) {
    console.log(`\n... (${patchLines.length - 50} more lines)`);
  }
  console.log('─'.repeat(60));

  // Show usage instructions
  console.log('\n\n🎯 How to Use This Patch:\n');
  console.log('1️⃣  Clone Spring PetClinic:');
  console.log('   git clone https://github.com/spring-projects/spring-petclinic.git');
  console.log('   cd spring-petclinic\n');

  console.log('2️⃣  Check if patch applies (dry run):');
  console.log(`   git apply --check ${patchPath}\n`);

  console.log('3️⃣  Apply the patch:');
  console.log(`   git apply ${patchPath}\n`);

  console.log('4️⃣  Review changes:');
  console.log('   git diff\n');

  console.log('5️⃣  Commit (if satisfied):');
  console.log('   git commit -am "Apply CodeQual fixes (2 issues)"\n');

  // Show statistics
  console.log('\n📊 Patch Statistics:\n');

  const fileCount = new Set(allIssues.map(i => i.file)).size;
  const severityCounts = {
    critical: allIssues.filter(i => i.severity === 'critical').length,
    high: allIssues.filter(i => i.severity === 'high').length,
    medium: allIssues.filter(i => i.severity === 'medium').length,
    low: allIssues.filter(i => i.severity === 'low').length
  };

  console.log(`   Files affected: ${fileCount}`);
  console.log(`   Total fixes: ${allIssues.length}`);
  console.log(`   └─ Critical: ${severityCounts.critical}`);
  console.log(`   └─ High: ${severityCounts.high}`);
  console.log(`   └─ Medium: ${severityCounts.medium}`);
  console.log(`   └─ Low: ${severityCounts.low}\n`);

  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('✅ TEST COMPLETE\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('🚀 Next Steps:\n');
  console.log('1. Test patch application on real Spring PetClinic repository');
  console.log('2. Integrate patch generation into V9GroupedReportFormatter');
  console.log('3. Upload patches to Supabase alongside reports');
  console.log('4. Update report footer with patch download link\n');

  return patchPath;
}

// Run test
testPatchGeneration()
  .then((patchPath) => {
    console.log(`✅ Patch ready: ${patchPath}\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ ERROR:', error);
    process.exit(1);
  });
