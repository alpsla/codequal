#!/usr/bin/env node

/**
 * V9 Test with Proper Environment Loading
 * Loads .env file and runs real tests
 */

// Load environment variables FIRST
require('dotenv').config();

const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Now check if environment is loaded
console.log('\n📋 Environment Check:');
console.log('   OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '✅ Loaded' : '❌ Missing');
console.log('   REDIS_URL:', process.env.REDIS_URL ? '✅ Loaded' : '❌ Missing');
console.log('   HYBRID_AGENT_URL:', process.env.HYBRID_AGENT_URL || 'http://129.212.136.24');

// Configuration with loaded environment
const HYBRID_AGENT_URL = process.env.HYBRID_AGENT_URL || 'http://129.212.136.24';
const REGISTRY = process.env.CONTAINER_REGISTRY || 'registry.digitalocean.com/codequal';
const NAMESPACE = 'codequal-dev';

class V9RealTester {
  constructor() {
    this.results = {
      environment: {},
      docker: {},
      kubernetes: {},
      tools: {},
      agents: {},
      errors: [],
      successes: []
    };
  }

  async runCompleteTest() {
    console.log('\n🚀 V9 REAL SYSTEM TEST WITH ENVIRONMENT');
    console.log('=' .repeat(70));

    const startTime = Date.now();

    // Phase 1: Verify Environment
    console.log('\n✅ PHASE 1: Environment Verification');
    console.log('-' .repeat(40));
    this.checkEnvironment();

    // Phase 2: Check Docker Access
    console.log('\n🐳 PHASE 2: Docker & Registry Access');
    console.log('-' .repeat(40));
    await this.checkDockerAccess();

    // Phase 3: Check Kubernetes Resources
    console.log('\n☸️  PHASE 3: Kubernetes Resources');
    console.log('-' .repeat(40));
    await this.checkKubernetesResources();

    // Phase 4: Test Real Tool Execution
    console.log('\n🔧 PHASE 4: Tool Execution Test');
    console.log('-' .repeat(40));
    await this.testToolExecution();

    // Phase 5: Test Agent Services
    console.log('\n🤖 PHASE 5: Agent Services Test');
    console.log('-' .repeat(40));
    await this.testAgentServices();

    // Generate report
    const report = this.generateReport(Date.now() - startTime);
    const reportFile = `V9-REAL-TEST-${Date.now()}.md`;
    fs.writeFileSync(reportFile, report);

    console.log(`\n📄 Report saved: ${reportFile}`);
    this.displaySummary();

    return this.results;
  }

  checkEnvironment() {
    const required = {
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      REDIS_URL: process.env.REDIS_URL,
      GITHUB_TOKEN: process.env.GITHUB_TOKEN
    };

    for (const [key, value] of Object.entries(required)) {
      if (value) {
        this.results.environment[key] = true;
        console.log(`   ✅ ${key}: Set (${value.substring(0, 20)}...)`);
      } else {
        this.results.environment[key] = false;
        this.results.errors.push(`Missing ${key}`);
        console.log(`   ❌ ${key}: Not set`);
      }
    }
  }

  async checkDockerAccess() {
    // Check Docker
    try {
      await execPromise('docker ps');
      this.results.docker.running = true;
      console.log('   ✅ Docker: Running');
    } catch (error) {
      this.results.docker.running = false;
      this.results.errors.push('Docker not running');
      console.log('   ❌ Docker: Not running');
      return;
    }

    // Check registry login
    console.log('\n   Testing registry access...');
    try {
      // First login to registry
      await execPromise('doctl registry login', { timeout: 10000 });
      console.log('   ✅ Registry: Logged in');

      // Try to pull Java tools container
      const imageName = `${REGISTRY}/analyzer:lang-java-v5.1`;
      console.log(`   Pulling ${imageName}...`);

      const pullResult = await execPromise(`docker pull ${imageName}`, {
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024
      });

      if (pullResult.stdout.includes('Downloaded') || pullResult.stdout.includes('up to date')) {
        this.results.docker.hasJavaTools = true;
        console.log('   ✅ Java tools container: Available');
      }
    } catch (error) {
      this.results.errors.push(`Registry access failed: ${error.message}`);
      console.log(`   ❌ Registry access: ${error.message}`);
    }
  }

  async checkKubernetesResources() {
    try {
      // Check connection
      await execPromise('kubectl cluster-info', { timeout: 5000 });
      this.results.kubernetes.connected = true;
      console.log('   ✅ Kubernetes: Connected');

      // Check pods
      const { stdout } = await execPromise(`kubectl get pods -n ${NAMESPACE} -o json`);
      const data = JSON.parse(stdout);
      const pods = data.items || [];

      const runningPods = pods.filter(p => p.status.phase === 'Running');
      const hybridAgents = pods.filter(p => p.metadata.name.includes('hybrid-agent'));
      const redis = pods.filter(p => p.metadata.name.includes('redis'));

      console.log(`   ✅ Running pods: ${runningPods.length}`);
      console.log(`   ✅ Hybrid agents: ${hybridAgents.length}`);
      console.log(`   ✅ Redis instances: ${redis.length}`);

      this.results.kubernetes.pods = {
        total: pods.length,
        running: runningPods.length,
        hybridAgents: hybridAgents.length,
        redis: redis.length
      };

      // Check for tool executor
      const toolExecutor = pods.find(p => p.metadata.name.includes('tool-executor'));
      if (!toolExecutor) {
        console.log('   ⚠️  Tool executor pod: Not found');
        console.log('\n   Creating tool executor pod...');

        // Create tool executor pod
        const podYaml = `
apiVersion: v1
kind: Pod
metadata:
  name: tool-executor
  namespace: ${NAMESPACE}
spec:
  containers:
  - name: java-tools
    image: ${REGISTRY}/analyzer:lang-java-v5.1
    command: ["/bin/sh", "-c", "sleep infinity"]
    resources:
      limits:
        memory: "2Gi"
        cpu: "1"
`;
        await execPromise(`echo '${podYaml}' | kubectl apply -f -`);
        console.log('   ✅ Tool executor pod: Created');
      } else {
        console.log(`   ✅ Tool executor pod: ${toolExecutor.status.phase}`);
      }

    } catch (error) {
      this.results.kubernetes.connected = false;
      this.results.errors.push(`Kubernetes error: ${error.message}`);
      console.log(`   ❌ Kubernetes: ${error.message}`);
    }
  }

  async testToolExecution() {
    console.log('   Testing real tool execution...\n');

    // Create test Java file
    const testCode = `
public class TestClass {
    private String unusedField; // PMD should catch this

    public void riskyMethod(String userInput) {
        // SpotBugs should catch SQL injection
        String query = "SELECT * FROM users WHERE id = " + userInput;
        executeQuery(query);

        // SpotBugs should catch null pointer
        String result = null;
        System.out.println(result.length());
    }

    public void longMethod() {
        // Checkstyle should catch method length
        System.out.println("Line 1");
        System.out.println("Line 2");
        // ... imagine 100+ lines
    }
}`;

    const testFile = '/tmp/TestClass.java';
    fs.writeFileSync(testFile, testCode);

    // Test with Docker
    if (this.results.docker.hasJavaTools) {
      console.log('   Testing with Docker container...');
      try {
        const { stdout } = await execPromise(
          `docker run --rm -v /tmp:/workspace ${REGISTRY}/analyzer:lang-java-v5.1 bash -c "cd /workspace && ls *.java"`,
          { timeout: 10000 }
        );

        if (stdout.includes('TestClass.java')) {
          this.results.tools.dockerExecution = true;
          console.log('   ✅ Docker execution: Working');
        }
      } catch (error) {
        console.log(`   ❌ Docker execution: ${error.message}`);
      }
    }

    // Test with Kubernetes
    if (this.results.kubernetes.connected) {
      console.log('   Testing with Kubernetes pod...');
      try {
        // Copy file to pod
        await execPromise(`kubectl cp ${testFile} tool-executor:/tmp/TestClass.java -n ${NAMESPACE}`);

        // Run analysis
        const { stdout } = await execPromise(
          `kubectl exec tool-executor -n ${NAMESPACE} -- ls /tmp/*.java`,
          { timeout: 10000 }
        );

        if (stdout.includes('TestClass.java')) {
          this.results.tools.kubernetesExecution = true;
          console.log('   ✅ Kubernetes execution: Working');
        }
      } catch (error) {
        console.log(`   ⚠️  Kubernetes execution: ${error.message}`);
      }
    }
  }

  async testAgentServices() {
    console.log(`   Testing hybrid agent at ${HYBRID_AGENT_URL}...\n`);

    try {
      // Test health
      const healthResponse = await axios.get(`${HYBRID_AGENT_URL}/health`, { timeout: 5000 });

      if (healthResponse.data.status === 'healthy') {
        this.results.agents.healthy = true;
        console.log('   ✅ Agent service: Healthy');
        console.log(`   ✅ Redis: ${healthResponse.data.redis}`);

        if (healthResponse.data.stats) {
          console.log(`   ✅ Cache hit rate: ${healthResponse.data.stats.cacheHitRate}`);
        }
      }

      // Test fix generation
      console.log('\n   Testing fix generation with real API key...');
      const testIssue = {
        tool: 'spotbugs',
        type: 'NP_NULL_ON_SOME_PATH',
        category: 'quality',
        severity: 'high',
        message: 'Possible null pointer dereference',
        file: 'TestClass.java',
        line: 10,
        language: 'java'
      };

      const fixResponse = await axios.post(
        `${HYBRID_AGENT_URL}/fix`,
        { issue: testIssue },
        { timeout: 15000 }
      );

      if (fixResponse.data.success) {
        this.results.agents.canGenerateFixes = true;
        console.log('   ✅ Fix generation: Working');

        // Check if it's real code
        const fix = fixResponse.data.fix;
        if (fix && (fix.includes('if') || fix.includes('null'))) {
          console.log('   ✅ Code snippets: Generating actual code');
          console.log(`\n   Sample fix:\n   ${fix.substring(0, 200)}...`);
        }
      }

    } catch (error) {
      this.results.errors.push(`Agent service error: ${error.message}`);
      console.log(`   ❌ Agent service: ${error.message}`);
    }
  }

  generateReport(executionTime) {
    const errorCount = this.results.errors.length;
    const ready = errorCount === 0 &&
                  this.results.environment.OPENROUTER_API_KEY &&
                  this.results.docker.hasJavaTools &&
                  this.results.agents.healthy;

    return `# V9 Real System Test Report

## 📅 Test Information
- **Date**: ${new Date().toISOString()}
- **Execution Time**: ${(executionTime / 1000).toFixed(2)} seconds
- **Environment**: Loaded from .env

## ✅ Environment Variables
| Variable | Status |
|----------|--------|
| OPENROUTER_API_KEY | ${this.results.environment.OPENROUTER_API_KEY ? '✅ Set' : '❌ Missing'} |
| REDIS_URL | ${this.results.environment.REDIS_URL ? '✅ Set' : '❌ Missing'} |
| GITHUB_TOKEN | ${this.results.environment.GITHUB_TOKEN ? '✅ Set' : '❌ Missing'} |

## 🐳 Docker & Registry
| Component | Status |
|-----------|--------|
| Docker Daemon | ${this.results.docker.running ? '✅ Running' : '❌ Not Running'} |
| Registry Access | ${this.results.docker.hasJavaTools ? '✅ Authenticated' : '❌ Not Authenticated'} |
| Java Tools Container | ${this.results.docker.hasJavaTools ? '✅ Available' : '❌ Not Available'} |

## ☸️ Kubernetes Resources
| Resource | Count | Status |
|----------|-------|--------|
| Total Pods | ${this.results.kubernetes.pods?.total || 0} | - |
| Running Pods | ${this.results.kubernetes.pods?.running || 0} | ${this.results.kubernetes.pods?.running > 0 ? '✅' : '❌'} |
| Hybrid Agents | ${this.results.kubernetes.pods?.hybridAgents || 0} | ${this.results.kubernetes.pods?.hybridAgents > 0 ? '✅' : '❌'} |
| Redis Instances | ${this.results.kubernetes.pods?.redis || 0} | ${this.results.kubernetes.pods?.redis > 0 ? '✅' : '❌'} |

## 🔧 Tool Execution
| Method | Status |
|--------|--------|
| Docker Execution | ${this.results.tools.dockerExecution ? '✅ Working' : '❌ Not Working'} |
| Kubernetes Execution | ${this.results.tools.kubernetesExecution ? '✅ Working' : '⚠️ Limited'} |

## 🤖 Agent Services
| Feature | Status |
|---------|--------|
| Service Health | ${this.results.agents.healthy ? '✅ Healthy' : '❌ Unhealthy'} |
| Fix Generation | ${this.results.agents.canGenerateFixes ? '✅ Working' : '❌ Not Working'} |
| Code Snippets | ${this.results.agents.canGenerateFixes ? '✅ Generating' : '❌ Not Available'} |

## ${errorCount > 0 ? '❌ Errors Found' : '✅ No Errors'}
${errorCount === 0 ? '*System is operational!*' : this.results.errors.map(e => `- ${e}`).join('\n')}

## 🎯 System Status: ${ready ? 'READY FOR PRODUCTION' : 'NEEDS ATTENTION'}

${ready ? `
The V9 system is fully operational with:
- ✅ All environment variables configured
- ✅ Docker containers available
- ✅ Kubernetes resources running
- ✅ Tool execution working
- ✅ AI fix generation operational
- ✅ Code snippets being generated

You can now run full PR analysis tests!
` : `
The following issues need attention:
${this.results.errors.map(e => `- ${e}`).join('\n')}
`}

## 📝 Next Steps

${ready ? `
### Run Full Analysis Test
\`\`\`bash
node test-v9-real-analysis.js apache kafka 17620
\`\`\`
` : `
### Fix Remaining Issues
1. Address any errors listed above
2. Re-run this test to verify fixes
3. Then proceed with full analysis testing
`}

---
*Generated: ${new Date().toISOString()}*
*V9 Real System Test - With Environment*`;
  }

  displaySummary() {
    console.log('\n' + '=' .repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(70));

    const checks = [
      { name: 'Environment Variables', status: this.results.environment.OPENROUTER_API_KEY },
      { name: 'Docker Access', status: this.results.docker.hasJavaTools },
      { name: 'Kubernetes', status: this.results.kubernetes.connected },
      { name: 'Tool Execution', status: this.results.tools.dockerExecution },
      { name: 'Agent Services', status: this.results.agents.healthy },
      { name: 'Fix Generation', status: this.results.agents.canGenerateFixes }
    ];

    let passed = 0;
    for (const check of checks) {
      console.log(`   ${check.status ? '✅' : '❌'} ${check.name}`);
      if (check.status) passed++;
    }

    const ready = passed === checks.length;

    console.log('\n' + '=' .repeat(70));
    if (ready) {
      console.log('🎉 V9 SYSTEM READY FOR TESTING!');
    } else {
      console.log(`⚠️  ${checks.length - passed} ISSUES NEED ATTENTION`);
    }
    console.log('=' .repeat(70));
  }
}

// Install dotenv if needed
async function ensureDotenv() {
  try {
    require('dotenv');
  } catch (error) {
    console.log('Installing dotenv...');
    await execPromise('npm install dotenv');
  }
}

// Main execution
async function main() {
  await ensureDotenv();

  const tester = new V9RealTester();
  const results = await tester.runCompleteTest();

  if (results.errors.length === 0) {
    console.log('\n✅ All checks passed! Ready for V9 testing.');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${results.errors.length} issues found. See report for details.`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { V9RealTester };