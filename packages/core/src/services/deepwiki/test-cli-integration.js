#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const config = {
  namespace: 'codequal-dev',
  podLabelSelector: 'app=deepwiki-fixed',
  podName: 'deepwiki-fixed-5b95f566b8-wh4h4'
};

/**
 * Main function
 */
async function main() {
  console.log(`======== DeepWiki CLI Integration Test ========`);
  console.log(`Namespace: ${config.namespace}`);
  console.log(`Pod Label Selector: ${config.podLabelSelector}`);
  console.log(`Direct Pod Name: ${config.podName}`);
  console.log('=================================================');
  
  // Verify pod exists
  try {
    const { stdout } = await execAsync(`kubectl get pod -n ${config.namespace} ${config.podName} -o name`);
    if (stdout.trim()) {
      console.log(`✅ Found pod: ${stdout.trim()}`);
    } else {
      console.log(`❌ Pod not found`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error checking pod: ${error.message}`);
    process.exit(1);
  }
  
  // Check available commands
  try {
    console.log(`\nChecking if 'deepwiki' command exists...`);
    
    // Try to get help output
    try {
      const { stdout, stderr } = await execAsync(
        `kubectl exec -n ${config.namespace} ${config.podName} -- bash -c "which deepwiki || echo 'Command not found'"`
      );
      
      if (stdout.includes('Command not found')) {
        console.log(`❌ 'deepwiki' command not found`);
        
        // Check if there's a different command or script
        console.log(`\nChecking for alternative commands...`);
        const { stdout: binOutput } = await execAsync(
          `kubectl exec -n ${config.namespace} ${config.podName} -- ls -la /usr/local/bin/ /app/bin/ /bin/ 2>/dev/null || echo "No bin directories"`
        );
        console.log(`Available binaries:\n${binOutput}`);
      } else {
        console.log(`✅ Found 'deepwiki' command: ${stdout.trim()}`);
        
        // Try to get help output
        try {
          const { stdout: helpOutput } = await execAsync(
            `kubectl exec -n ${config.namespace} ${config.podName} -- deepwiki --help`
          );
          console.log(`\nDeepWiki help output:\n${helpOutput}`);
        } catch (error) {
          console.error(`❌ Error getting help: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error checking for deepwiki command: ${error.message}`);
    }
    
    // Check what's available in the app directory
    console.log(`\nChecking app directory contents...`);
    const { stdout: appDirOutput } = await execAsync(
      `kubectl exec -n ${config.namespace} ${config.podName} -- ls -la /app/ || echo "No /app directory"`
    );
    console.log(`App directory contents:\n${appDirOutput}`);
    
    // Check for any Python scripts or Node.js scripts
    console.log(`\nChecking for Python or Node.js scripts...`);
    const { stdout: scriptsOutput } = await execAsync(
      `kubectl exec -n ${config.namespace} ${config.podName} -- find /app -name "*.py" -o -name "*.js" | grep -v "node_modules" || echo "No scripts found"`
    );
    console.log(`Available scripts:\n${scriptsOutput}`);
    
    // Check for package.json to determine what we're working with
    console.log(`\nChecking for package.json...`);
    try {
      const { stdout: packageOutput } = await execAsync(
        `kubectl exec -n ${config.namespace} ${config.podName} -- cat /app/package.json`
      );
      console.log(`Found package.json:\n${packageOutput.substring(0, 500)}...`);
      
      // Try to determine the main entry point
      const packageJson = JSON.parse(packageOutput);
      if (packageJson.main) {
        console.log(`\nMain entry point: ${packageJson.main}`);
      }
      if (packageJson.scripts) {
        console.log(`\nAvailable scripts:`);
        Object.entries(packageJson.scripts).forEach(([key, value]) => {
          console.log(`- ${key}: ${value}`);
        });
      }
    } catch (error) {
      console.log(`No package.json found or error parsing it: ${error.message}`);
    }
    
    // Check for a server process
    console.log(`\nChecking running processes...`);
    try {
      const { stdout: processOutput } = await execAsync(
        `kubectl exec -n ${config.namespace} ${config.podName} -- ps aux || echo "ps command not available"`
      );
      console.log(`Running processes:\n${processOutput}`);
    } catch (error) {
      console.log(`Error checking processes: ${error.message}`);
    }
    
    // Try to find a way to get repository analysis
    console.log(`\nLooking for repository analysis capabilities...`);
    // Check for API endpoints
    try {
      const { stdout: curlOutput } = await execAsync(
        `kubectl exec -n ${config.namespace} ${config.podName} -- curl -s http://localhost:8000/api || echo "No API endpoint"`
      );
      console.log(`API endpoint response:\n${curlOutput}`);
    } catch (error) {
      console.log(`Error checking API: ${error.message}`);
    }
    
  } catch (error) {
    console.error(`❌ Error exploring pod: ${error.message}`);
  }
}

// Run the main function
main().catch(console.error);
