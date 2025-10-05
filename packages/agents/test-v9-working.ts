import { JavaToolOrchestrator } from "./src/two-branch/tools/java/java-tool-orchestrator";
import type { OrchestrationResult, RawIssue } from "./src/two-branch/tools/java/java-tool-orchestrator";
import { detectDefaultBranch, getModifiedFilesBetweenBranches } from "./src/two-branch/utils/git-utils";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const KAFKA_REPO = "/tmp/kafka-repo";
const KAFKA_URL = "https://github.com/apache/kafka.git";
const OUTPUT_DIR = "/tmp/v9-reports";

async function test() {
  console.log("V9 Two-Branch Test\n");

  // Clone repository if not cached (detect default branch automatically)
  let mainBranch: string;

  if (!fs.existsSync(KAFKA_REPO)) {
    console.log("Cloning Apache Kafka repository...");
    execSync(`git clone ${KAFKA_URL} ${KAFKA_REPO}`, { stdio: "inherit" });
    console.log("Clone complete");

    // Detect the default branch
    mainBranch = detectDefaultBranch(KAFKA_REPO);
    console.log(`Detected default branch: ${mainBranch}`);

    // Cache and index (simulated - full V9 would use Redis/Supabase)
    console.log("Repository cached and indexed\n");
  } else {
    console.log("Using cached repo at " + KAFKA_REPO);
    mainBranch = detectDefaultBranch(KAFKA_REPO);
    console.log(`Detected default branch: ${mainBranch}`);
    console.log("Cache and index already available\n");
  }

  // Ensure remote exists (in case repo was moved/copied)
  try {
    execSync("git remote get-url origin", { cwd: KAFKA_REPO, stdio: "ignore" });
  } catch {
    console.log("Re-adding remote origin...");
    execSync(`git remote add origin ${KAFKA_URL}`, { cwd: KAFKA_REPO, stdio: "ignore" });
  }

  // Create PR branch from main (using git, not cloning again)
  try {
    execSync("git rev-parse --verify pr-17620", { cwd: KAFKA_REPO, stdio: "ignore" });
    console.log("PR branch pr-17620 already exists\n");
  } catch {
    console.log("Creating PR branch from main...");
    execSync("git fetch origin pull/17620/head:pr-17620", { cwd: KAFKA_REPO, stdio: "inherit" });
    console.log("PR branch created from cached main\n");
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  const orchestrator = new JavaToolOrchestrator({
    pmd: { enabled: true, minimumPriority: 2, rulesets: ["category/java/errorprone.xml"], parallel: 2, threads: 2, memory: "3g" },
    semgrep: { enabled: true, rulesets: ["auto"], parallel: 2, smartSelection: false, memory: "2g" },
    checkstyle: { enabled: true, configFile: "google_checks.xml", parallel: 2, memory: "2g", changedFilesOnly: false },
    dependencyCheck: {
      enabled: true,
      failOnCVSS: 11,
      timeout: 600,
      postgres: {
        enabled: true,
        connectionString: process.env.ORACLE_DEPCHECK_DB_URL || 'jdbc:postgresql://localhost:5432/depcheck',
        dbUser: process.env.ORACLE_DEPCHECK_DB_USER || 'depcheck_scanner',
        dbPassword: process.env.ORACLE_DEPCHECK_DB_PASSWORD || 'postgres123',
        dbDriver: '/tmp/jdbc-drivers/postgresql-42.7.1.jar'
      },
      ossIndex: {
        enabled: !!(process.env.OSS_INDEX_USERNAME && process.env.OSS_INDEX_API_TOKEN),
        username: process.env.OSS_INDEX_USERNAME || '',
        apiToken: process.env.OSS_INDEX_API_TOKEN || ''
      }
    },
    spotbugs: {
      enabled: true,                        // Enable with auto-detection
      priority: 'high',                     // High priority issues only
      effort: 'default',                    // Default analysis effort
      autoDetectBuildSystem: true,          // Auto-detect Gradle/Maven
      supportedBuildSystems: ['gradle', 'maven'],  // Supported build systems
      memory: '2g'                          // Memory allocation
    }
  });
  
  // Ensure main branch exists locally
  try {
    execSync(`git rev-parse --verify ${mainBranch}`, { cwd: KAFKA_REPO, stdio: "ignore" });
  } catch {
    console.log(`Creating local ${mainBranch} branch...`);
    execSync(`git checkout -b ${mainBranch} origin/${mainBranch}`, { cwd: KAFKA_REPO, stdio: "ignore" });
  }

  // Get modified files between main and PR using git-utils
  console.log("Getting modified files...");
  execSync("git checkout pr-17620", { cwd: KAFKA_REPO, stdio: "ignore" });
  const modifiedFiles = new Set(getModifiedFilesBetweenBranches(KAFKA_REPO, mainBranch, "pr-17620"));
  console.log(`Found ${modifiedFiles.size} modified files\n`);

  console.log("Analyzing PR branch...");
  const pr: OrchestrationResult = await orchestrator.orchestrate(KAFKA_REPO, "pr");
  const prIssues: RawIssue[] = pr.toolResults.flatMap(t => t.issues);

  console.log(`Analyzing ${mainBranch} branch...`);
  execSync(`git checkout ${mainBranch}`, { cwd: KAFKA_REPO, stdio: "ignore" });
  // Use "base" to let orchestrator auto-detect the default branch (trunk, main, master, etc.)
  const main: OrchestrationResult = await orchestrator.orchestrate(KAFKA_REPO, "base");
  const mainIssues: RawIssue[] = main.toolResults.flatMap(t => t.issues);

  // Categorize issues (4 categories)
  const getSig = (i: RawIssue) => i.file + ":" + i.line + ":" + i.rule;
  const mainSigs = new Set(mainIssues.map(getSig));
  const prSigs = new Set(prIssues.map(getSig));

  // 1. NEW: In PR but not in main
  const newIssues = prIssues.filter(i => !mainSigs.has(getSig(i)));

  // 2. EXISTING_MODIFIED: In both, but in modified files
  const existingModified = prIssues.filter(i =>
    mainSigs.has(getSig(i)) && modifiedFiles.has(i.file)
  );

  // 3. RESOLVED: In main but not in PR
  const resolvedIssues = mainIssues.filter(i => !prSigs.has(getSig(i)));

  // 4. EXISTING_REST: In both, in unmodified files
  const existingRest = prIssues.filter(i =>
    mainSigs.has(getSig(i)) && !modifiedFiles.has(i.file)
  );

  // Check for blocking issues (critical/high in NEW or EXISTING_MODIFIED)
  const blockingIssues = [...newIssues, ...existingModified].filter(
    i => i.severity === 'critical' || i.severity === 'high'
  );
  const decision = blockingIssues.length > 0 ? 'DECLINED' : 'APPROVED';

  console.log("\n=== Results ===");
  console.log(`NEW: ${newIssues.length}`);
  console.log(`EXISTING (Modified Files): ${existingModified.length}`);
  console.log(`RESOLVED: ${resolvedIssues.length}`);
  console.log(`EXISTING (Rest): ${existingRest.length}`);
  console.log(`Decision: ${decision} (${blockingIssues.length} blocking issues)`);

  const report = `# V9 Report

## Decision: ${decision}

### Issue Categories
- **NEW**: ${newIssues.length}
- **EXISTING (Modified Files)**: ${existingModified.length}
- **RESOLVED**: ${resolvedIssues.length}
- **EXISTING (Rest)**: ${existingRest.length}

### Blocking Issues
${blockingIssues.length} critical/high severity issues in NEW or modified files
${blockingIssues.length > 0 ? '\n**PR must be DECLINED until these are resolved**' : '\n**PR can be APPROVED**'}
`;

  const reportPath = path.join(OUTPUT_DIR, "v9-report-" + Date.now() + ".md");
  fs.writeFileSync(reportPath, report);
  console.log("\nReport: " + reportPath);
}

test().catch(console.error);
