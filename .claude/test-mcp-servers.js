#!/usr/bin/env node

const { spawn } = require('child_process');

async function testMCPServer(name, command, args = [], env = {}) {
  console.log(`\nTesting ${name} MCP server...`);
  console.log(`Command: ${command} ${args.join(' ')}`);
  
  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Send initialization request
  const initRequest = {
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '1.0.0',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    },
    id: 1
  };

  child.stdin.write(JSON.stringify(initRequest) + '\n');

  return new Promise((resolve) => {
    let output = '';
    let error = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`[${name}] stdout:`, data.toString().trim());
    });

    child.stderr.on('data', (data) => {
      error += data.toString();
      console.log(`[${name}] stderr:`, data.toString().trim());
    });

    child.on('error', (err) => {
      console.error(`[${name}] Failed to start:`, err.message);
      resolve(false);
    });

    // Give it 5 seconds to respond
    setTimeout(() => {
      child.kill();
      const success = output.includes('"result"') || output.includes('initialize');
      console.log(`[${name}] Test ${success ? 'PASSED' : 'FAILED'}`);
      resolve(success);
    }, 5000);
  });
}

async function main() {
  console.log('Testing MCP Servers Configuration\n');

  // Test Semgrep
  await testMCPServer(
    'Semgrep',
    'node',
    ['/opt/homebrew/lib/node_modules/mcp-server-semgrep/build/index.js'],
    {
      SEMGREP_APP_TOKEN: 'ffb5ee37b5843c7e7eb12fbf04ff77450209db675eb1e4d2aa48998e1c67c88a',
      SEMGREP_PROJECT_PATH: '/Users/alpinro/Code Prjects/codequal'
    }
  );

  // Test ref-tools
  await testMCPServer(
    'ref-tools',
    'npx',
    ['ref-tools-mcp@latest'],
    {
      REF_API_KEY: 'ref-498218bce18e561f5cd0'
    }
  );

  // Test Serena
  await testMCPServer(
    'Serena',
    '/Users/alpinro/.local/bin/serena-mcp-server',
    []
  );
}

main().catch(console.error);