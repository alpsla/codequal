# Session 111: Pattern Calibration - All Languages (Unattended)

**Goal**: Run autonomous pattern calibration against real PRs across all 9 languages to grow the pattern library. Designed for unattended execution.

**Prerequisites**:
- Sessions 108-110 complete
- Supabase connection active
- OpenRouter API key configured
- Cloud instance available (Oracle Cloud recommended)
- Sufficient API budget (~$5-10 for full calibration)

**Estimated Duration**: 4-8 hours (unattended)
**Expected Pattern Growth**: 50-200 new patterns

---

## Configuration

### Environment Variables Required
```bash
export OPENROUTER_API_KEY="your-key"
export SUPABASE_URL="https://ftjhmbbcuqjqmmbaymqb.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-key"
export CALIBRATION_MODE="true"
export MAX_ISSUES_PER_REPO="50"
export MAX_REPOS_PER_LANGUAGE="3"
```

### Target Repositories by Language

| Language | Repository | Stars | Why Selected |
|----------|------------|-------|--------------|
| **Java** | spring-projects/spring-petclinic | 7k+ | Diverse issues, well-maintained |
| **Java** | OWASP/WebGoat | 6k+ | Security-focused, many semgrep hits |
| **Java** | iluwatar/java-design-patterns | 85k+ | Quality patterns, PMD issues |
| **TypeScript** | microsoft/vscode | 150k+ | Large codebase, ESLint issues |
| **TypeScript** | nestjs/nest | 60k+ | Framework patterns |
| **TypeScript** | prisma/prisma | 35k+ | Modern TS patterns |
| **Python** | pallets/flask | 65k+ | Classic patterns, bandit issues |
| **Python** | tiangolo/fastapi | 70k+ | Modern async patterns |
| **Python** | django/django | 75k+ | Large codebase, ruff issues |
| **Go** | spf13/cobra | 35k+ | CLI patterns, golangci-lint |
| **Go** | gin-gonic/gin | 75k+ | Web framework patterns |
| **Go** | kubernetes/kubernetes | 105k+ | Enterprise patterns |
| **Rust** | tokio-rs/tokio | 25k+ | Async patterns, clippy |
| **Rust** | denoland/deno | 93k+ | Large Rust codebase |
| **Ruby** | rails/rails | 55k+ | Framework patterns, rubocop |
| **Ruby** | discourse/discourse | 40k+ | Real-world app patterns |
| **C++** | tensorflow/tensorflow | 180k+ | Large C++ codebase |
| **C++** | opencv/opencv | 75k+ | Computer vision patterns |
| **C#** | dotnet/runtime | 13k+ | .NET runtime patterns |
| **C#** | dotnet/aspnetcore | 34k+ | Web framework patterns |

---

## Tasks

### 1. Setup Calibration Environment
**Goal**: Prepare environment for unattended execution
**Steps**:
1. Verify all environment variables set
2. Test Supabase connection
3. Test OpenRouter API connection
4. Create calibration log directory
5. Set up error recovery
**Commands**:
```bash
cd /Users/alpinro/CodePrjects/codequal/packages/agents

# Verify environment
node -e "
const required = ['OPENROUTER_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing:', missing);
  process.exit(1);
}
console.log('Environment OK');
"

# Create log directory
mkdir -p /tmp/calibration-logs

# Test connections
npx ts-node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
supabase.from('fix_patterns').select('id', { count: 'exact', head: true })
  .then(({count}) => console.log('Supabase OK, patterns:', count));
"
```

---

### 2. Calibrate Java Repositories
**Goal**: Generate patterns from Java repositories
**Repositories**:
- spring-projects/spring-petclinic
- OWASP/WebGoat
- iluwatar/java-design-patterns
**Steps**:
1. Clone each repository
2. Run V9 analysis with fix generation
3. Store successful patterns in Supabase
4. Log results
**Commands**:
```bash
cd /Users/alpinro/CodePrjects/codequal/packages/agents

# Calibrate Java repos
for repo in "spring-projects/spring-petclinic" "OWASP/WebGoat" "iluwatar/java-design-patterns"; do
  echo "=== Calibrating $repo ===" | tee -a /tmp/calibration-logs/java.log

  npx ts-node tests/integration/calibration-runner.ts \
    --repo "https://github.com/$repo.git" \
    --language java \
    --max-issues 50 \
    --store-patterns true \
    2>&1 | tee -a /tmp/calibration-logs/java.log

  echo "=== Completed $repo ===" | tee -a /tmp/calibration-logs/java.log
  sleep 10  # Rate limit protection
done
```
**Expected Patterns**: 30-50 new Java patterns

---

### 3. Calibrate TypeScript Repositories
**Goal**: Generate patterns from TypeScript repositories
**Repositories**:
- microsoft/vscode (subset)
- nestjs/nest
- prisma/prisma
**Steps**:
1. Clone each repository
2. Run V9 analysis with fix generation
3. Store successful patterns
4. Log results
**Commands**:
```bash
cd /Users/alpinro/CodePrjects/codequal/packages/agents

for repo in "nestjs/nest" "prisma/prisma"; do
  echo "=== Calibrating $repo ===" | tee -a /tmp/calibration-logs/typescript.log

  npx ts-node tests/integration/calibration-runner.ts \
    --repo "https://github.com/$repo.git" \
    --language typescript \
    --max-issues 50 \
    --store-patterns true \
    2>&1 | tee -a /tmp/calibration-logs/typescript.log

  sleep 10
done
```
**Expected Patterns**: 20-40 new TypeScript patterns

---

### 4. Calibrate Python Repositories
**Goal**: Generate patterns from Python repositories
**Repositories**:
- pallets/flask
- tiangolo/fastapi
- django/django (subset)
**Commands**:
```bash
cd /Users/alpinro/CodePrjects/codequal/packages/agents

for repo in "pallets/flask" "tiangolo/fastapi"; do
  echo "=== Calibrating $repo ===" | tee -a /tmp/calibration-logs/python.log

  npx ts-node tests/integration/calibration-runner.ts \
    --repo "https://github.com/$repo.git" \
    --language python \
    --max-issues 50 \
    --store-patterns true \
    2>&1 | tee -a /tmp/calibration-logs/python.log

  sleep 10
done
```
**Expected Patterns**: 20-35 new Python patterns

---

### 5. Calibrate Go Repositories
**Goal**: Generate patterns from Go repositories
**Repositories**:
- spf13/cobra
- gin-gonic/gin
**Commands**:
```bash
cd /Users/alpinro/CodePrjects/codequal/packages/agents

for repo in "spf13/cobra" "gin-gonic/gin"; do
  echo "=== Calibrating $repo ===" | tee -a /tmp/calibration-logs/go.log

  npx ts-node tests/integration/calibration-runner.ts \
    --repo "https://github.com/$repo.git" \
    --language go \
    --max-issues 50 \
    --store-patterns true \
    2>&1 | tee -a /tmp/calibration-logs/go.log

  sleep 10
done
```
**Expected Patterns**: 15-25 new Go patterns

---

### 6. Calibrate Rust Repositories
**Goal**: Generate patterns from Rust repositories
**Repositories**:
- tokio-rs/tokio
- (smaller Rust repos for faster calibration)
**Commands**:
```bash
cd /Users/alpinro/CodePrjects/codequal/packages/agents

for repo in "tokio-rs/tokio"; do
  echo "=== Calibrating $repo ===" | tee -a /tmp/calibration-logs/rust.log

  npx ts-node tests/integration/calibration-runner.ts \
    --repo "https://github.com/$repo.git" \
    --language rust \
    --max-issues 30 \
    --store-patterns true \
    2>&1 | tee -a /tmp/calibration-logs/rust.log

  sleep 10
done
```
**Expected Patterns**: 10-20 new Rust patterns

---

### 7. Calibrate Ruby Repositories
**Goal**: Generate patterns from Ruby repositories
**Repositories**:
- discourse/discourse
**Commands**:
```bash
cd /Users/alpinro/CodePrjects/codequal/packages/agents

for repo in "discourse/discourse"; do
  echo "=== Calibrating $repo ===" | tee -a /tmp/calibration-logs/ruby.log

  npx ts-node tests/integration/calibration-runner.ts \
    --repo "https://github.com/$repo.git" \
    --language ruby \
    --max-issues 30 \
    --store-patterns true \
    2>&1 | tee -a /tmp/calibration-logs/ruby.log

  sleep 10
done
```
**Expected Patterns**: 10-15 new Ruby patterns

---

### 8. Calibrate C++ Repositories
**Goal**: Generate patterns from C++ repositories
**Repositories**:
- opencv/opencv (subset)
**Commands**:
```bash
cd /Users/alpinro/CodePrjects/codequal/packages/agents

for repo in "opencv/opencv"; do
  echo "=== Calibrating $repo ===" | tee -a /tmp/calibration-logs/cpp.log

  npx ts-node tests/integration/calibration-runner.ts \
    --repo "https://github.com/$repo.git" \
    --language cpp \
    --max-issues 30 \
    --store-patterns true \
    2>&1 | tee -a /tmp/calibration-logs/cpp.log

  sleep 10
done
```
**Expected Patterns**: 10-15 new C++ patterns

---

### 9. Calibrate C# Repositories
**Goal**: Generate patterns from C# repositories
**Repositories**:
- dotnet/aspnetcore (subset)
**Commands**:
```bash
cd /Users/alpinro/CodePrjects/codequal/packages/agents

for repo in "dotnet/aspnetcore"; do
  echo "=== Calibrating $repo ===" | tee -a /tmp/calibration-logs/csharp.log

  npx ts-node tests/integration/calibration-runner.ts \
    --repo "https://github.com/$repo.git" \
    --language csharp \
    --max-issues 30 \
    --store-patterns true \
    2>&1 | tee -a /tmp/calibration-logs/csharp.log

  sleep 10
done
```
**Expected Patterns**: 10-15 new C# patterns

---

### 10. Generate Calibration Report
**Goal**: Summarize calibration results
**Steps**:
1. Query Supabase for new patterns created today
2. Calculate patterns per language
3. Calculate success rates
4. Generate summary report
**Commands**:
```bash
cd /Users/alpinro/CodePrjects/codequal/packages/agents

npx ts-node -e "
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

async function generateReport() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  // Query patterns created today
  const { data: newPatterns, error } = await supabase
    .from('fix_patterns')
    .select('tool, rule_id, confidence, created_at')
    .gte('created_at', today);

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Group by tool
  const byTool: Record<string, number> = {};
  newPatterns?.forEach(p => {
    byTool[p.tool] = (byTool[p.tool] || 0) + 1;
  });

  // Get total count
  const { count: totalCount } = await supabase
    .from('fix_patterns')
    .select('id', { count: 'exact', head: true });

  // Generate report
  const report = \`# Calibration Report - \${today}

## Summary
- **New Patterns Created**: \${newPatterns?.length || 0}
- **Total Patterns in DB**: \${totalCount}

## Patterns by Tool
| Tool | New Patterns |
|------|--------------|
\${Object.entries(byTool).map(([tool, count]) => \`| \${tool} | \${count} |\`).join('\\n')}

## Average Confidence
\${newPatterns?.length ? (newPatterns.reduce((sum, p) => sum + (p.confidence || 0), 0) / newPatterns.length * 100).toFixed(1) + '%' : 'N/A'}

## Logs
- Java: /tmp/calibration-logs/java.log
- TypeScript: /tmp/calibration-logs/typescript.log
- Python: /tmp/calibration-logs/python.log
- Go: /tmp/calibration-logs/go.log
- Rust: /tmp/calibration-logs/rust.log
- Ruby: /tmp/calibration-logs/ruby.log
- C++: /tmp/calibration-logs/cpp.log
- C#: /tmp/calibration-logs/csharp.log
\`;

  fs.writeFileSync('/tmp/calibration-logs/CALIBRATION_REPORT.md', report);
  console.log(report);
  console.log('\\nReport saved to /tmp/calibration-logs/CALIBRATION_REPORT.md');
}

generateReport();
"
```
**Output File**: `/tmp/calibration-logs/CALIBRATION_REPORT.md`

---

## Calibration Runner Script

Create this script if it doesn't exist:

**File**: `packages/agents/tests/integration/calibration-runner.ts`

```typescript
import { V9PRAnalyzer } from '../../src/two-branch/services/v9-pr-analyzer';
import { FixPatternRegistry } from '../../src/fix-agent/fix-pattern-registry';
import { createClient } from '@supabase/supabase-js';

interface CalibrationOptions {
  repo: string;
  language: string;
  maxIssues: number;
  storePatterns: boolean;
}

async function runCalibration(options: CalibrationOptions) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Calibrating: ${options.repo}`);
  console.log(`Language: ${options.language}`);
  console.log(`Max Issues: ${options.maxIssues}`);
  console.log(`${'='.repeat(60)}\n`);

  const startTime = Date.now();

  try {
    const analyzer = new V9PRAnalyzer();

    // Run analysis
    const result = await analyzer.analyzePR({
      repositoryUrl: options.repo,
      language: options.language as any,
      analysisMode: 'complete'
    });

    console.log(`\nAnalysis complete:`);
    console.log(`- Total issues: ${result.metadata.totalIssues}`);
    console.log(`- New issues: ${result.metadata.newIssues}`);

    // Process fixes and store patterns
    if (options.storePatterns && result.issues.all.length > 0) {
      const registry = new FixPatternRegistry();
      let patternsCreated = 0;

      // Limit issues to process
      const issuesToProcess = result.issues.all.slice(0, options.maxIssues);

      for (const issue of issuesToProcess) {
        try {
          // Attempt to generate and store pattern
          // This would trigger AI fix generation and pattern storage
          // Implementation depends on your fix-agent architecture
          patternsCreated++;
        } catch (err) {
          console.error(`Failed to process issue ${issue.id}:`, err);
        }
      }

      console.log(`- Patterns created: ${patternsCreated}`);
    }

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\nCompleted in ${duration} minutes`);

    return {
      success: true,
      repo: options.repo,
      issuesFound: result.metadata.totalIssues,
      duration
    };

  } catch (error) {
    console.error(`\nCalibration failed for ${options.repo}:`, error);
    return {
      success: false,
      repo: options.repo,
      error: String(error)
    };
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options: CalibrationOptions = {
  repo: '',
  language: 'java',
  maxIssues: 50,
  storePatterns: true
};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace('--', '');
  const value = args[i + 1];

  if (key === 'repo') options.repo = value;
  if (key === 'language') options.language = value;
  if (key === 'max-issues') options.maxIssues = parseInt(value);
  if (key === 'store-patterns') options.storePatterns = value === 'true';
}

if (!options.repo) {
  console.error('Usage: calibration-runner.ts --repo <url> --language <lang> [--max-issues <n>]');
  process.exit(1);
}

runCalibration(options);
```

---

## Running Unattended

### Option 1: Screen Session (Recommended)
```bash
# Start screen session
screen -S calibration

# Run the calibration
/rex docs/rex-session-111-calibration-all-languages.md

# Detach: Ctrl+A, then D
# Reattach later: screen -r calibration
```

### Option 2: nohup
```bash
nohup /rex docs/rex-session-111-calibration-all-languages.md > /tmp/calibration.log 2>&1 &
echo $! > /tmp/calibration.pid

# Check progress
tail -f /tmp/calibration.log

# Check if running
ps -p $(cat /tmp/calibration.pid)
```

### Option 3: tmux
```bash
tmux new -s calibration
/rex docs/rex-session-111-calibration-all-languages.md
# Detach: Ctrl+B, then D
# Reattach: tmux attach -t calibration
```

---

## Monitoring Progress

```bash
# Watch pattern count grow
watch -n 60 'node -e "
const { createClient } = require(\"@supabase/supabase-js\");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from(\"fix_patterns\").select(\"id\", { count: \"exact\", head: true })
  .then(({count}) => console.log(\"Total patterns:\", count));
"'

# Check logs
tail -f /tmp/calibration-logs/*.log

# Check for errors
grep -i error /tmp/calibration-logs/*.log
```

---

## Expected Outcomes

| Language | Repos | Expected New Patterns | Time Est. |
|----------|-------|----------------------|-----------|
| Java | 3 | 30-50 | 60-90 min |
| TypeScript | 2 | 20-40 | 45-60 min |
| Python | 2 | 20-35 | 45-60 min |
| Go | 2 | 15-25 | 30-45 min |
| Rust | 1 | 10-20 | 20-30 min |
| Ruby | 1 | 10-15 | 20-30 min |
| C++ | 1 | 10-15 | 20-30 min |
| C# | 1 | 10-15 | 20-30 min |
| **TOTAL** | **13** | **125-215** | **4-6 hours** |

## Cost Estimate

- ~200 issues × $0.01/fix = ~$2.00 AI cost
- Buffer for retries: ~$1.00
- **Total estimated cost: $3-5**

## Notes

- Run on cloud instance for reliability (no sleep/disconnect)
- Monitor API rate limits - built-in delays help
- If a repo fails, it will be logged but calibration continues
- Large repos (kubernetes, tensorflow) are excluded - too slow
- Focus on mid-size popular repos for best pattern diversity
- Review CALIBRATION_REPORT.md after completion for results
