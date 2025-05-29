#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const fetch = require('node-fetch');

const execAsync = promisify(exec);

// Configuration
const config = {
  namespace: 'codequal-dev',
  podLabelSelector: 'app=deepwiki-fixed',
  podName: 'deepwiki-fixed-5b95f566b8-wh4h4',
  localPort: 8001
};

// Port-forward process
let portForwardProcess = null;

/**
 * Set up port-forwarding to the DeepWiki pod
 */
async function setupPortForward() {
  // Clean up any existing port-forward
  cleanupPortForward();
  
  console.log(`Setting up port-forward to pod ${config.podName} on port ${config.localPort}`);
  
  // Set up port-forwarding
  portForwardProcess = exec(
    `kubectl port-forward -n ${config.namespace} ${config.podName} ${config.localPort}:8000`,
    { maxBuffer: 1024 * 1024 * 10 }
  );
  
  // Log any errors
  portForwardProcess.stderr.on('data', (data) => {
    console.log(`Port-forward stderr: ${data}`);
  });
  
  // Wait for port-forward to be ready
  await new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    
    portForwardProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(`Port-forward stdout: ${data.toString().trim()}`);
      if (stdout.includes('Forwarding from')) {
        resolve();
      }
    });
    
    portForwardProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      if (stderr.includes('Forwarding from')) {
        resolve();
      }
    });
    
    portForwardProcess.on('error', (error) => {
      reject(error);
    });
    
    // Resolve after a timeout even if we don't see the expected output
    setTimeout(resolve, 3000);
  });
  
  // Give it a moment to stabilize
  await new Promise(resolve => setTimeout(resolve, 1000));
}

/**
 * Clean up port-forwarding
 */
function cleanupPortForward() {
  if (portForwardProcess) {
    try {
      portForwardProcess.kill();
      console.log('Port-forward process terminated');
    } catch (error) {
      console.warn(`Error killing port-forward process: ${error}`);
    }
    portForwardProcess = null;
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`======== DeepWiki REST API Integration Test ========`);
  console.log(`Namespace: ${config.namespace}`);
  console.log(`Pod Label Selector: ${config.podLabelSelector}`);
  console.log(`Direct Pod Name: ${config.podName}`);
  console.log(`Local Port: ${config.localPort}`);
  console.log('=================================================');
  
  try {
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
    
    // Set up port-forwarding
    await setupPortForward();
    
    // Check if server is running on port 8000 in the container
    console.log(`\nChecking if a server is running on port 8000 in the container...`);
    try {
      const { stdout } = await execAsync(
        `kubectl exec -n ${config.namespace} ${config.podName} -- netstat -tuln | grep 8000 || echo "No server on port 8000"`
      );
      console.log(`Server check result: ${stdout}`);
    } catch (error) {
      console.log(`Error checking server: ${error.message}`);
    }
    
    // Test basic connectivity to the API
    console.log(`\nTesting API connectivity...`);
    try {
      const response = await fetch(`http://localhost:${config.localPort}/`);
      console.log(`API root response status: ${response.status}`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log(`API root response: ${JSON.stringify(data, null, 2)}`);
        } else {
          const text = await response.text();
          console.log(`API root response: ${text.substring(0, 500)}...`);
        }
      }
    } catch (error) {
      console.log(`Error connecting to API root: ${error.message}`);
    }
    
    // Check for common API endpoints
    const endpoints = [
      '/api',
      '/api/health',
      '/api/version',
      '/api/analyze',
      '/ws/wiki'
    ];
    
    console.log(`\nChecking common API endpoints...`);
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`http://localhost:${config.localPort}${endpoint}`);
        console.log(`Endpoint ${endpoint}: ${response.status} ${response.statusText}`);
        if (response.ok) {
          try {
            const data = await response.json();
            console.log(`Response: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
          } catch (e) {
            const text = await response.text();
            console.log(`Response: ${text.substring(0, 200)}...`);
          }
        }
      } catch (error) {
        console.log(`Error connecting to ${endpoint}: ${error.message}`);
      }
    }
    
    // Try to find all available routes by checking documentation or server info
    console.log(`\nLooking for API documentation or route information...`);
    const docEndpoints = [
      '/docs',
      '/api/docs',
      '/swagger',
      '/openapi.json',
      '/api/routes'
    ];
    
    for (const endpoint of docEndpoints) {
      try {
        const response = await fetch(`http://localhost:${config.localPort}${endpoint}`);
        console.log(`Documentation endpoint ${endpoint}: ${response.status} ${response.statusText}`);
        if (response.ok) {
          try {
            const data = await response.json();
            console.log(`Response: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
          } catch (e) {
            const text = await response.text();
            console.log(`Response: ${text.substring(0, 200)}...`);
          }
        }
      } catch (error) {
        console.log(`Error connecting to ${endpoint}: ${error.message}`);
      }
    }
    
    // Check what port 8000 is serving inside the container
    console.log(`\nChecking what's running on port 8000 inside the container...`);
    try {
      const { stdout } = await execAsync(
        `kubectl exec -n ${config.namespace} ${config.podName} -- curl -s http://localhost:8000/ || echo "Could not connect to localhost:8000"`
      );
      console.log(`Container localhost:8000 response: ${stdout.substring(0, 500)}...`);
    } catch (error) {
      console.log(`Error checking container port: ${error.message}`);
    }
    
    // Examine what API server is running
    console.log(`\nExamining server details...`);
    try {
      const { stdout } = await execAsync(
        `kubectl exec -n ${config.namespace} ${config.podName} -- find / -name "server.js" -o -name "app.js" 2>/dev/null | xargs cat 2>/dev/null | grep -A 10 "listen\\|route\\|app\\.get" || echo "No server.js or app.js found"`
      );
      console.log(`Server implementation: ${stdout.substring(0, 500)}...`);
    } catch (error) {
      console.log(`Error examining server: ${error.message}`);
    }
    
  } catch (error) {
    console.error(`❌ General error: ${error.message}`);
  } finally {
    // Clean up port-forwarding
    cleanupPortForward();
  }
}

// Set up cleanup on exit
process.on('exit', () => {
  cleanupPortForward();
});

// Handle unexpected shutdowns
process.on('SIGINT', () => {
  cleanupPortForward();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanupPortForward();
  process.exit(0);
});

// Run the main function
main().catch(console.error);
