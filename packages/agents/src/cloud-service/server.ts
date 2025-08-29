/**
 * Cloud Analysis Service
 * Runs on DigitalOcean/AWS to execute code analysis tools
 */

import express from 'express';
import cors from 'cors';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Redis for caching
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
});

// Repository cache directory
const REPO_CACHE_DIR = '/tmp/repos';
const ANALYSIS_TIMEOUT = 300000; // 5 minutes

interface AnalysisJob {
  id: string;
  tool: string;
  repository: string;
  branch?: string;
  prNumber?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: any;
  error?: string;
  startTime: Date;
  endTime?: Date;
}

// In-memory job tracking (could be moved to Redis)
const jobs = new Map<string, AnalysisJob>();

/**
 * Clone or update repository
 */
async function ensureRepository(
  repoUrl: string,
  branch?: string
): Promise<string> {
  let gitUrl = repoUrl;
  
  // Add authentication if tokens are available
  if (repoUrl.startsWith('https://github.com/') && process.env.GITHUB_TOKEN) {
    const match = repoUrl.match(/https:\/\/github\.com\/(.+)/);
    if (match) {
      gitUrl = `https://${process.env.GITHUB_TOKEN}@github.com/${match[1]}`;
    }
  } else if (repoUrl.includes('gitlab.com') && process.env.GITLAB_TOKEN) {
    const match = repoUrl.match(/https:\/\/gitlab\.com\/(.+)/);
    if (match) {
      gitUrl = `https://oauth2:${process.env.GITLAB_TOKEN}@gitlab.com/${match[1]}`;
    }
  }
  
  // Extract repo name from various URL formats
  const repoName = repoUrl
    .replace(/https?:\/\//, '')
    .replace('git://', '')
    .replace(/github\.com\//, '')
    .replace(/gitlab\.com\//, '')
    .replace('.git', '');
    
  const repoPath = path.join(REPO_CACHE_DIR, repoName);
  
  // Check if repo exists
  try {
    await fs.access(repoPath);
    // Update existing repo
    console.log(`Updating existing repo: ${repoPath}`);
    await execAsync(`cd ${repoPath} && git fetch --all && git reset --hard origin/${branch || 'main'}`, {
      timeout: 60000
    });
  } catch {
    // Clone new repo
    console.log(`Cloning new repo (authenticated: ${!!process.env.GITHUB_TOKEN || !!process.env.GITLAB_TOKEN})`);
    await fs.mkdir(path.dirname(repoPath), { recursive: true });
    
    // Try authenticated clone first, fall back to public
    try {
      await execAsync(`git clone --depth 1 --branch ${branch || 'main'} ${gitUrl} ${repoPath}`, {
        timeout: 120000
      });
    } catch (error) {
      console.log('Authenticated clone failed, trying public clone...');
      // Fallback to public clone without auth
      await execAsync(`git clone --depth 1 --branch ${branch || 'main'} ${repoUrl} ${repoPath}`, {
        timeout: 120000
      });
    }
  }
  
  return repoPath;
}

/**
 * Execute ESLint analysis
 */
async function runESLint(repoPath: string): Promise<any> {
  try {
    // Check if eslint config exists
    const configs = ['.eslintrc.js', '.eslintrc.json', '.eslintrc.yml', 'eslint.config.js'];
    let hasConfig = false;
    for (const config of configs) {
      try {
        await fs.access(path.join(repoPath, config));
        hasConfig = true;
        break;
      } catch {
        // Config file doesn't exist, continue checking
      }
    }

    if (!hasConfig) {
      // Use default config
      const defaultConfig = {
        env: { es2021: true, node: true },
        extends: ['eslint:recommended'],
        parserOptions: { ecmaVersion: 12, sourceType: 'module' }
      };
      await fs.writeFile(
        path.join(repoPath, '.eslintrc.json'),
        JSON.stringify(defaultConfig)
      );
    }

    const { stdout } = await execAsync(
      `cd ${repoPath} && npx eslint . --format json --no-error-on-unmatched-pattern`,
      { timeout: 120000 }
    );
    
    return JSON.parse(stdout || '[]');
  } catch (error: any) {
    console.error('ESLint error:', error);
    // Try to parse partial output
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch {
        // Config file doesn't exist, continue checking
      }
    }
    return { error: error.message };
  }
}

/**
 * Execute Semgrep analysis
 */
async function runSemgrep(repoPath: string): Promise<any> {
  try {
    const { stdout } = await execAsync(
      `cd ${repoPath} && semgrep --config=auto --json --max-target-bytes=10000000`,
      { timeout: 180000 }
    );
    
    return JSON.parse(stdout || '{}');
  } catch (error: any) {
    console.error('Semgrep error:', error);
    return { error: error.message };
  }
}

/**
 * Execute Bandit analysis (Python)
 */
async function runBandit(repoPath: string): Promise<any> {
  try {
    const { stdout } = await execAsync(
      `cd ${repoPath} && bandit -r . -f json`,
      { timeout: 120000 }
    );
    
    return JSON.parse(stdout || '{}');
  } catch (error: any) {
    console.error('Bandit error:', error);
    return { error: error.message };
  }
}

/**
 * Execute npm audit
 */
async function runNpmAudit(repoPath: string): Promise<any> {
  try {
    // Check if package.json exists
    await fs.access(path.join(repoPath, 'package.json'));
    
    // Install dependencies first
    await execAsync(`cd ${repoPath} && npm install --package-lock-only`, {
      timeout: 60000
    });
    
    const { stdout } = await execAsync(
      `cd ${repoPath} && npm audit --json`,
      { timeout: 60000 }
    );
    
    return JSON.parse(stdout || '{}');
  } catch (error: any) {
    console.error('npm audit error:', error);
    // npm audit returns non-zero exit code when vulnerabilities found
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch {
        // Config file doesn't exist, continue checking
      }
    }
    return { error: error.message };
  }
}

/**
 * Execute TypeScript compiler check
 */
async function runTSC(repoPath: string): Promise<any> {
  try {
    // Check if tsconfig.json exists
    await fs.access(path.join(repoPath, 'tsconfig.json'));
    
    const { stdout, stderr } = await execAsync(
      `cd ${repoPath} && npx tsc --noEmit --pretty false`,
      { timeout: 120000 }
    );
    
    // Parse TypeScript errors
    const errors = stderr.split('\n').filter(line => line.includes('error TS'));
    return { errors, count: errors.length };
  } catch (error: any) {
    console.error('TSC error:', error);
    return { error: error.message };
  }
}

/**
 * Execute Pylint analysis (Python)
 */
async function runPylint(repoPath: string): Promise<any> {
  try {
    const { stdout } = await execAsync(
      `cd ${repoPath} && pylint **/*.py --output-format=json --exit-zero`,
      { timeout: 120000 }
    );
    
    return JSON.parse(stdout || '[]');
  } catch (error: any) {
    console.error('Pylint error:', error);
    return { error: error.message };
  }
}

/**
 * Execute MyPy type checking (Python)
 */
async function runMyPy(repoPath: string): Promise<any> {
  try {
    const { stdout } = await execAsync(
      `cd ${repoPath} && mypy . --json-report mypy-report --no-error-summary`,
      { timeout: 120000 }
    );
    
    // Read the JSON report
    const reportPath = path.join(repoPath, 'mypy-report', 'index.json');
    const report = await fs.readFile(reportPath, 'utf-8');
    return JSON.parse(report);
  } catch (error: any) {
    console.error('MyPy error:', error);
    return { error: error.message };
  }
}

/**
 * Execute Safety vulnerability check (Python)
 */
async function runSafety(repoPath: string): Promise<any> {
  try {
    // Check if requirements.txt exists
    await fs.access(path.join(repoPath, 'requirements.txt'));
    
    const { stdout } = await execAsync(
      `cd ${repoPath} && safety check --json`,
      { timeout: 60000 }
    );
    
    return JSON.parse(stdout || '{}');
  } catch (error: any) {
    console.error('Safety error:', error);
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch {
        // Config file doesn't exist, continue checking
      }
    }
    return { error: error.message };
  }
}

/**
 * Execute JSHint analysis (JavaScript)
 */
async function runJSHint(repoPath: string): Promise<any> {
  try {
    const { stdout } = await execAsync(
      `cd ${repoPath} && jshint . --reporter=jslint --exclude=node_modules`,
      { timeout: 60000 }
    );
    
    // Parse JSHint XML output
    return { raw: stdout };
  } catch (error: any) {
    console.error('JSHint error:', error);
    return { error: error.message };
  }
}

/**
 * Execute JSCPD duplicate code detection
 */
async function runJSCPD(repoPath: string): Promise<any> {
  try {
    const { stdout } = await execAsync(
      `cd ${repoPath} && jscpd . --reporters json --output /tmp/jscpd-report`,
      { timeout: 120000 }
    );
    
    // Read the JSON report
    const reportPath = '/tmp/jscpd-report/jscpd-report.json';
    const report = await fs.readFile(reportPath, 'utf-8');
    return JSON.parse(report);
  } catch (error: any) {
    console.error('JSCPD error:', error);
    return { error: error.message };
  }
}

/**
 * Execute Madge circular dependency detection
 */
async function runMadge(repoPath: string): Promise<any> {
  try {
    const { stdout } = await execAsync(
      `cd ${repoPath} && madge --circular --json .`,
      { timeout: 60000 }
    );
    
    return JSON.parse(stdout || '[]');
  } catch (error: any) {
    console.error('Madge error:', error);
    return { error: error.message };
  }
}

/**
 * Execute Dependency Cruiser
 */
async function runDepCruiser(repoPath: string): Promise<any> {
  try {
    const { stdout } = await execAsync(
      `cd ${repoPath} && dependency-cruiser --output-type json src`,
      { timeout: 120000 }
    );
    
    return JSON.parse(stdout || '{}');
  } catch (error: any) {
    console.error('Dependency Cruiser error:', error);
    return { error: error.message };
  }
}

/**
 * Execute CppCheck (C/C++)
 */
async function runCppCheck(repoPath: string): Promise<any> {
  try {
    const { stdout } = await execAsync(
      `cd ${repoPath} && cppcheck --enable=all --xml --xml-version=2 . 2>&1`,
      { timeout: 120000 }
    );
    
    // Return raw XML for now
    return { xml: stdout };
  } catch (error: any) {
    console.error('CppCheck error:', error);
    return { error: error.message };
  }
}

/**
 * Execute CLOC (Count Lines of Code)
 */
async function runCLOC(repoPath: string): Promise<any> {
  try {
    const { stdout } = await execAsync(
      `cd ${repoPath} && cloc . --json`,
      { timeout: 60000 }
    );
    
    return JSON.parse(stdout || '{}');
  } catch (error: any) {
    console.error('CLOC error:', error);
    return { error: error.message };
  }
}

/**
 * Process analysis job
 */
async function processJob(job: AnalysisJob) {
  try {
    job.status = 'processing';
    
    // Clone/update repository
    const repoPath = await ensureRepository(job.repository, job.branch);
    
    // Execute tool
    let results;
    switch (job.tool) {
      case 'eslint':
        results = await runESLint(repoPath);
        break;
      case 'semgrep':
        results = await runSemgrep(repoPath);
        break;
      case 'bandit':
        results = await runBandit(repoPath);
        break;
      case 'npm-audit':
        results = await runNpmAudit(repoPath);
        break;
      case 'tsc':
        results = await runTSC(repoPath);
        break;
      case 'pylint':
        results = await runPylint(repoPath);
        break;
      case 'mypy':
        results = await runMyPy(repoPath);
        break;
      case 'safety':
        results = await runSafety(repoPath);
        break;
      case 'jshint':
        results = await runJSHint(repoPath);
        break;
      case 'jscpd':
        results = await runJSCPD(repoPath);
        break;
      case 'madge':
        results = await runMadge(repoPath);
        break;
      case 'dep-cruiser':
        results = await runDepCruiser(repoPath);
        break;
      case 'cppcheck':
        results = await runCppCheck(repoPath);
        break;
      case 'cloc':
        results = await runCLOC(repoPath);
        break;
      default:
        throw new Error(`Unknown tool: ${job.tool}`);
    }
    
    job.results = results;
    job.status = 'completed';
    job.endTime = new Date();
    
    // Cache results
    const cacheKey = `analysis:${job.tool}:${job.repository}:${job.branch || 'main'}`;
    await redis.setex(cacheKey, 3600, JSON.stringify(results)); // 1 hour cache
    
  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : String(error);
    job.endTime = new Date();
  }
}

// === API Routes ===

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

/**
 * List available tools
 */
app.get('/tools', (req, res) => {
  res.json({
    tools: [
      // JavaScript/TypeScript
      { name: 'eslint', description: 'JavaScript/TypeScript linting', languages: ['javascript', 'typescript'] },
      { name: 'tsc', description: 'TypeScript type checking', languages: ['typescript'] },
      { name: 'jshint', description: 'JavaScript code quality', languages: ['javascript'] },
      { name: 'madge', description: 'Circular dependency detection', languages: ['javascript', 'typescript'] },
      { name: 'dep-cruiser', description: 'Dependency analysis', languages: ['javascript', 'typescript'] },
      
      // Python
      { name: 'bandit', description: 'Python security linting', languages: ['python'] },
      { name: 'pylint', description: 'Python code quality', languages: ['python'] },
      { name: 'mypy', description: 'Python type checking', languages: ['python'] },
      { name: 'safety', description: 'Python dependency vulnerabilities', languages: ['python'] },
      
      // Multi-language
      { name: 'semgrep', description: 'Security patterns detection', languages: ['multiple'] },
      { name: 'jscpd', description: 'Copy-paste detection', languages: ['multiple'] },
      { name: 'cloc', description: 'Lines of code counter', languages: ['all'] },
      
      // Package managers
      { name: 'npm-audit', description: 'NPM vulnerability scanner', languages: ['javascript'] },
      
      // C/C++
      { name: 'cppcheck', description: 'C/C++ static analysis', languages: ['c', 'cpp'] }
    ]
  });
});

/**
 * Submit analysis job
 */
app.post('/analyze', async (req, res) => {
  const { tool, repository, branch, prNumber, config } = req.body;
  
  if (!tool || !repository) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Check cache first
  const cacheKey = `analysis:${tool}:${repository}:${branch || 'main'}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log(`Cache hit for ${tool} on ${repository}`);
    return res.json({
      analysisId: 'cached',
      status: 'completed',
      results: JSON.parse(cached),
      cached: true
    });
  }
  
  // Create new job
  const job: AnalysisJob = {
    id: uuidv4(),
    tool,
    repository,
    branch,
    prNumber,
    status: 'pending',
    startTime: new Date()
  };
  
  jobs.set(job.id, job);
  
  // Process job asynchronously
  processJob(job).catch(console.error);
  
  res.json({
    analysisId: job.id,
    status: job.status
  });
});

/**
 * Get analysis results
 */
app.get('/analysis/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  
  if (!job) {
    return res.status(404).json({ error: 'Analysis not found' });
  }
  
  res.json({
    analysisId: job.id,
    status: job.status,
    results: job.results,
    error: job.error,
    executionTime: job.endTime ? 
      (job.endTime.getTime() - job.startTime.getTime()) : undefined
  });
});

/**
 * Get repository info
 */
app.get('/repository/info', async (req, res) => {
  const { url } = req.query;
  
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing repository URL' });
  }
  
  try {
    const repoPath = await ensureRepository(url);
    
    // Get basic repo stats
    const { stdout: fileCount } = await execAsync(`find ${repoPath} -type f | wc -l`);
    const { stdout: lineCount } = await execAsync(`find ${repoPath} -type f -exec wc -l {} + | tail -1`);
    const { stdout: languages } = await execAsync(`cd ${repoPath} && find . -type f -name "*.*" | sed 's/.*\\.//' | sort | uniq -c | sort -rn | head -10`);
    
    res.json({
      repository: url,
      files: parseInt(fileCount.trim()),
      lines: parseInt(lineCount.split(/\s+/)[0]),
      languages: languages.trim().split('\n').map(l => {
        const parts = l.trim().split(/\s+/);
        return { extension: parts[1], count: parseInt(parts[0]) };
      })
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Start server
const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  console.log(`Cloud Analysis Service running on port ${PORT}`);
  console.log(`Redis connected to ${process.env.REDIS_HOST || 'localhost'}`);
  console.log(`Repository cache directory: ${REPO_CACHE_DIR}`);
});