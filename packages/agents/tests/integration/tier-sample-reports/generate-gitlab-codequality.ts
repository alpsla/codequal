/**
 * Generate GitLab Code Quality from existing manifest
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const manifestPath = path.join(__dirname, '../test-outputs/spring-petclinic-pr-#950---java-pattern-calibration-manifest.json');
const outputPath = path.join(__dirname, 'codequal-gitlab-codequality.json');

interface ManifestFile {
  filename: string;
  severity: string;
  category: string;
  rule: string;
  title: string;
  description: string;
  occurrences: number;
}

interface Manifest {
  files: {
    critical: ManifestFile[];
    high: ManifestFile[];
    medium: ManifestFile[];
    low: ManifestFile[];
  };
}

type GitLabSeverity = 'blocker' | 'critical' | 'major' | 'minor' | 'info';

interface GitLabCodeQualityIssue {
  type: 'issue';
  check_name: string;
  description: string;
  content: { body: string };
  categories: string[];
  severity: GitLabSeverity;
  fingerprint: string;
  location: {
    path: string;
    lines: { begin: number };
  };
}

function mapSeverity(severity: string): GitLabSeverity {
  switch (severity.toLowerCase()) {
    case 'critical': return 'blocker';
    case 'high': return 'critical';
    case 'medium': return 'major';
    case 'low': return 'minor';
    default: return 'info';
  }
}

function mapCategory(category: string): string[] {
  switch (category.toLowerCase()) {
    case 'security': return ['Security', 'Bug Risk'];
    case 'performance': return ['Performance'];
    case 'code quality': return ['Bug Risk', 'Clarity'];
    case 'architecture': return ['Complexity', 'Clarity'];
    default: return ['Bug Risk'];
  }
}

// Read manifest
const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

// Convert to GitLab Code Quality format
const issues: GitLabCodeQualityIssue[] = [];
let issueId = 0;

for (const [severity, files] of Object.entries(manifest.files)) {
  for (const file of files as ManifestFile[]) {
    const fingerprint = crypto.createHash('md5')
      .update(`${file.filename}:${file.rule}:${issueId++}`)
      .digest('hex');

    issues.push({
      type: 'issue',
      check_name: `codequal/${file.rule}`,
      description: file.title,
      content: {
        body: `${file.description}\n\n**Rule:** ${file.rule}\n**Occurrences:** ${file.occurrences}`
      },
      categories: mapCategory(file.category),
      severity: mapSeverity(severity),
      fingerprint,
      location: {
        path: file.filename.replace(/^.*?\//, ''),
        lines: { begin: 1 }
      }
    });
  }
}

fs.writeFileSync(outputPath, JSON.stringify(issues, null, 2));
console.log(`✅ Generated GitLab Code Quality report with ${issues.length} issues`);
console.log(`📄 Output: ${outputPath}`);
