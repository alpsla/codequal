#!/usr/bin/env node

/**
 * Test script for DeepWiki WebSocket connection
 * 
 * This script tests the WebSocket connection to a DeepWiki pod in Kubernetes.
 * It implements multiple authentication methods and helps debug connection issues.
 */

const WebSocket = require('ws');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const config = {
  namespace: 'codequal-dev',  // Updated to the correct namespace
  podLabelSelector: 'app=deepwiki-fixed',  // Try with this label selector
  podName: 'deepwiki-fixed-5b95f566b8-wh4h4', // Direct pod name as fallback
  localPort: 8001,
  authToken: process.env.DEEPWIKI_AUTH_TOKEN || null,
  connectRetries: 3,
  connectionTimeout: 15000, // 15 seconds
};

// Connection methods to try
const connectionMethods = [
  { name: 'Query Parameter Auth', fn: connectWithQueryAuth },
  { name: 'Cookie-Based Auth', fn: connectWithCookieAuth },
  { name: 'First Message Auth', fn: connectWithFirstMessageAuth },
];

/**
 * Main function
 */
async function main() {
  console.log(`======== DeepWiki WebSocket Connection Test ========`);
  console.log(`Namespace: ${config.namespace}`);
  console.log(`Pod Label Selector: ${config.podLabelSelector}`);
  console.log(`Direct Pod Name: ${config.podName}`);
  console.log(`Local Port: ${config.localPort}`);
  console.log(`Auth Token: ${config.authToken ? '****' : 'Not set'}`);
  console.log(`Connect Retries: ${config.connectRetries}`);
  console.log(`Connection Timeout: ${config.connectionTimeout}ms`);
  console.log('=================================================');
  
  // Try to find pod by label first
  let podName = null;
  try {
    console.log(`Finding available DeepWiki pods with selector: ${config.podLabelSelector}...`);
    
    // Try with the label selector
    try {
      podName = await findAvailablePod(config.namespace, config.podLabelSelector);
      console.log(`Found pod with label selector: ${podName}`);
    } catch (error) {
      console.log(`No pods found with label selector: ${config.podLabelSelector}`);
      console.log('Trying to find the pod labels...');
      
      // If label selector fails, check for the specific pod name
      console.log(`Checking if pod ${config.podName} exists...`);
      const podExists = await checkPodExists(config.namespace, config.podName);
      
      if (podExists) {
        console.log(`Pod ${config.podName} exists, using it directly`);
        podName = config.podName;
        
        // Try to get the actual labels of this pod
        try {
          const labels = await getPodLabels(config.namespace, config.podName);
          console.log('Pod labels:', labels);
          console.log('For future reference, update your podLabelSelector to match these labels');
        } catch (e) {
          console.log(`Could not retrieve pod labels: ${e.message}`);
        }
      } else {
        throw new Error(`Pod ${config.podName} not found`);
      }
    }
  } catch (error) {
    console.error(`Error finding pods: ${error.message}`);
    console.log('\nListing all pods in namespace for debugging:');
    try {
      const { stdout } = await execAsync(`kubectl get pods -n ${config.namespace}`);
      console.log(stdout);
    } catch (e) {
      console.error(`Error listing pods: ${e.message}`);
    }
    process.exit(1);
  }
  
  // Create port-forward
  let portForward = null;
  
  try {
    console.log(`Creating port-forward to pod ${podName}...`);
    portForward = await createPortForward(podName, config.localPort);
    console.log(`Port-forward created successfully on port ${config.localPort}`);
    
    // Wait a moment for port-forward to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test port with curl before trying websocket
    try {
      console.log('Testing connection with curl...');
      const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${config.localPort}/api/health`);
      console.log(`Curl test result: ${stdout}`);
    } catch (error) {
      console.warn(`Curl test failed: ${error.message}`);
    }
    
    // Test each connection method
    let connected = false;
    for (let i = 0; i < connectionMethods.length && !connected; i++) {
      const method = connectionMethods[i];
      console.log(`\nTrying ${method.name}...`);
      
      try {
        const ws = await method.fn(config);
        console.log(`✅ Connection successful with ${method.name}!`);
        
        // Send a ping message
        console.log('Sending ping message...');
        ws.send(JSON.stringify({ type: 'ping', id: 'test' }));
        
        // Wait for response or timeout
        const response = await waitForResponse(ws);
        console.log(`Received response: ${JSON.stringify(response)}`);
        
        // Close connection
        ws.close();
        connected = true;
      } catch (error) {
        console.log(`❌ ${method.name} failed: ${error.message}`);
      }
    }
    
    if (!connected) {
      console.log('\n❌ All connection methods failed');
      console.log('\nDebug information:');
      
      // Check if the WebSocket endpoint exists
      console.log('\nChecking WebSocket endpoint...');
      try {
        const { stdout } = await execAsync(`curl -s http://localhost:${config.localPort}/api/health`);
        console.log(`Health endpoint response: ${stdout}`);
      } catch (error) {
        console.log(`Health endpoint error: ${error.message}`);
      }
      
      // Check WebSocket headers
      console.log('\nChecking WebSocket headers...');
      try {
        const { stdout } = await execAsync(`curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" -H "Origin: http://localhost:${config.localPort}" "http://localhost:${config.localPort}/ws/wiki"`);
        console.log(`WebSocket headers response: ${stdout}`);
      } catch (error) {
        console.log(`WebSocket headers error: ${error.message}`);
      }
      
      // Check container logs
      console.log('\nChecking container logs...');
      try {
        const { stdout } = await execAsync(`kubectl logs -n ${config.namespace} ${podName} --tail=20`);
        console.log(`Container logs: ${stdout}`);
      } catch (error) {
        console.log(`Container logs error: ${error.message}`);
      }
      
      // Check available endpoints
      console.log('\nChecking available endpoints in the pod...');
      try {
        const { stdout } = await execAsync(`kubectl exec -n ${config.namespace} ${podName} -- ls -la /app || echo "No /app directory"`);
        console.log(`Pod file listing: ${stdout}`);
      } catch (error) {
        console.log(`Pod file listing error: ${error.message}`);
      }
      
      // Check if pod actually has websocket
      console.log('\nChecking if pod has WebSocket support...');
      try {
        const { stdout } = await execAsync(`kubectl exec -n ${config.namespace} ${podName} -- grep -r "websocket" /app || echo "No WebSocket references found"`);
        console.log(`WebSocket references: ${stdout}`);
      } catch (error) {
        console.log(`WebSocket references error: ${error.message}`);
      }
      
      // List open ports
      console.log('\nChecking open ports...');
      try {
        const { stdout } = await execAsync('lsof -i -P -n | grep LISTEN');
        console.log(`Open ports: ${stdout}`);
      } catch (error) {
        console.log(`Open ports error: ${error.message}`);
      }
    } else {
      console.log('\n✅ Successfully connected to DeepWiki WebSocket!');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  } finally {
    // Clean up port-forward
    if (portForward && portForward.process) {
      console.log('Cleaning up port-forward...');
      portForward.process.kill();
    }
  }
}

/**
 * Find an available DeepWiki pod
 */
async function findAvailablePod(namespace, selector) {
  const { stdout } = await execAsync(`kubectl get pods -n ${namespace} -l ${selector} -o jsonpath='{.items[0].metadata.name}'`);
  
  if (!stdout) {
    throw new Error(`No pods found with selector: ${selector}`);
  }
  
  return stdout.trim();
}

/**
 * Check if a specific pod exists
 */
async function checkPodExists(namespace, podName) {
  try {
    const { stdout } = await execAsync(`kubectl get pod -n ${namespace} ${podName} -o name`);
    return !!stdout.trim();
  } catch (error) {
    return false;
  }
}

/**
 * Get pod labels
 */
async function getPodLabels(namespace, podName) {
  const { stdout } = await execAsync(`kubectl get pod -n ${namespace} ${podName} -o jsonpath='{.metadata.labels}'`);
  return stdout.trim();
}

/**
 * Create a port-forward to a DeepWiki pod
 */
async function createPortForward(podName, localPort) {
  // Use kubectl for port-forwarding
  const process = exec(
    `kubectl port-forward -n ${config.namespace} ${podName} ${localPort}:8000`,
    { maxBuffer: 1024 * 1024 * 10 } // 10MB buffer
  );
  
  // Wait for port-forward to be ready
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let hasError = false;
    
    if (process.stdout) {
      process.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(`[Port-forward stdout] ${data.toString().trim()}`);
        if (stdout.includes('Forwarding from')) {
          resolve({ process, port: localPort });
        }
      });
    }
    
    if (process.stderr) {
      process.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log(`[Port-forward stderr] ${data.toString().trim()}`);
        
        // Check for error conditions
        if (data.toString().includes('Error from server') || 
            data.toString().includes('error:') ||
            data.toString().includes('Unable to connect to the server')) {
          hasError = true;
          process.kill();
          reject(new Error(`Port-forward failed: ${data.toString().trim()}`));
        }
        
        if (stderr.includes('Forwarding from')) {
          resolve({ process, port: localPort });
        }
      });
    }
    
    process.on('error', (error) => {
      reject(error);
    });
    
    process.on('close', (code) => {
      if (!hasError && code !== 0) {
        reject(new Error(`Port-forward process exited with code ${code}`));
      }
    });
    
    // Resolve after a timeout even if we don't see the expected output
    setTimeout(() => {
      if (!hasError) {
        resolve({ process, port: localPort });
      }
    }, 5000);
  });
}

/**
 * Connect with query parameter authentication
 */
async function connectWithQueryAuth(config) {
  return new Promise((resolve, reject) => {
    try {
      // Create WebSocket connection with token in query parameter
      const authParam = config.authToken ? `?token=${config.authToken}` : '';
      const wsUrl = `ws://localhost:${config.localPort}/ws/wiki${authParam}`;
      
      console.log(`Connecting to WebSocket with query auth: ${wsUrl}`);
      
      const headers = {
        'Origin': `http://localhost:${config.localPort}`,
        'User-Agent': 'DeepWikiTestClient',
        'Host': `localhost:${config.localPort}`,
        'Sec-WebSocket-Version': '13',
        'Connection': 'Upgrade',
        'Upgrade': 'websocket'
      };
      
      const ws = new WebSocket(wsUrl, {
        headers,
        rejectUnauthorized: false
      });
      
      setupWebSocketEventHandlers(ws, resolve, reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Connect with cookie-based authentication
 */
async function connectWithCookieAuth(config) {
  if (config.authToken) {
    try {
      // Use curl to get cookie
      const cookieFile = `/tmp/deepwiki_cookies_${Date.now()}.txt`;
      await execAsync(`curl -c ${cookieFile} -X POST -H "Authorization: Bearer ${config.authToken}" http://localhost:${config.localPort}/api/auth/session`);
      
      // Now connect with the cookie
      return new Promise((resolve, reject) => {
        try {
          const wsUrl = `ws://localhost:${config.localPort}/ws/wiki`;
          console.log(`Connecting to WebSocket with cookie auth: ${wsUrl}`);
          
          // Extract cookie from file
          let cookieContent = '';
          try {
            const { stdout } = execAsync(`cat ${cookieFile}`);
            cookieContent = stdout;
            console.log(`Cookie file content: ${cookieContent}`);
          } catch (e) {
            console.warn(`Failed to read cookie file: ${e.message}`);
          }
          
          const headers = {
            'Origin': `http://localhost:${config.localPort}`,
            'User-Agent': 'DeepWikiTestClient',
            'Host': `localhost:${config.localPort}`,
            'Sec-WebSocket-Version': '13',
            'Connection': 'Upgrade',
            'Upgrade': 'websocket',
            'Cookie': `session_id=${config.authToken}`  // Simplified - would be extracted from cookie file in production
          };
          
          const ws = new WebSocket(wsUrl, {
            headers,
            rejectUnauthorized: false
          });
          
          setupWebSocketEventHandlers(ws, resolve, reject);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      throw error;
    }
  } else {
    throw new Error('Auth token required for cookie authentication');
  }
}

/**
 * Connect with first message authentication
 */
async function connectWithFirstMessageAuth(config) {
  return new Promise((resolve, reject) => {
    try {
      // Connect without authentication first
      const wsUrl = `ws://localhost:${config.localPort}/ws/wiki`;
      console.log(`Connecting to WebSocket with first message auth: ${wsUrl}`);
      
      const headers = {
        'Origin': `http://localhost:${config.localPort}`,
        'User-Agent': 'DeepWikiTestClient',
        'Host': `localhost:${config.localPort}`,
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': Buffer.from(Math.random().toString(36).substring(2, 15)).toString('base64'),
        'Connection': 'Upgrade',
        'Upgrade': 'websocket'
      };
      
      const ws = new WebSocket(wsUrl, {
        headers,
        rejectUnauthorized: false
      });
      
      ws.on('open', () => {
        console.log('WebSocket connected, sending auth message');
        
        // Send authentication message
        const authMessage = {
          type: 'authenticate',
          token: config.authToken || 'anonymous'
        };
        
        ws.send(JSON.stringify(authMessage));
        
        // Resolve with the authenticated connection
        resolve(ws);
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket connection error', error);
        reject(error);
      });
      
      // Set a timeout
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.terminate();
          reject(new Error('WebSocket connection timeout'));
        }
      }, config.connectionTimeout);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Set up common WebSocket event handlers
 */
function setupWebSocketEventHandlers(ws, resolve, reject) {
  ws.on('open', () => {
    console.log('WebSocket connection established');
    resolve(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket connection error', error);
    reject(error);
  });

  // Set a timeout
  setTimeout(() => {
    if (ws.readyState !== WebSocket.OPEN) {
      ws.terminate();
      reject(new Error('WebSocket connection timeout'));
    }
  }, config.connectionTimeout);
}

/**
 * Wait for a response from the WebSocket
 */
function waitForResponse(ws) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Response timeout'));
    }, 5000);
    
    ws.on('message', (data) => {
      clearTimeout(timeout);
      try {
        const message = JSON.parse(data.toString());
        resolve(message);
      } catch (error) {
        resolve(data.toString());
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    
    ws.on('close', () => {
      clearTimeout(timeout);
      reject(new Error('WebSocket closed before receiving a response'));
    });
  });
}

// Run the main function
main().catch(console.error);
