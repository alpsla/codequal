#!/usr/bin/env node

const fetch = require('node-fetch');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function getJWTToken() {
  console.log('🔑 Getting JWT token for dashboard...');
  
  // Try with existing test user
  let response = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'testpassword123'
    })
  });
  
  if (!response.ok) {
    // Try creating user
    console.log('Creating test user...');
    await fetch('http://localhost:3001/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123',
        name: 'Test User'
      })
    });
    
    // Login again
    response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      })
    });
  }
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Login failed: ${error}`);
  }
  
  const data = await response.json();
  console.log('Auth response:', JSON.stringify(data, null, 2));
  
  // Try different possible token field names
  const token = data.token || data.access_token || data.jwt || data.accessToken;
  if (!token) {
    throw new Error('No token found in response: ' + JSON.stringify(data));
  }
  return token;
}

async function main() {
  try {
    const token = await getJWTToken();
    console.log('\n✅ JWT Token obtained successfully!');
    console.log('\n📋 Token (copy this):');
    console.log(token);
    
    console.log('\n🌐 Opening dashboard...');
    console.log('When prompted, paste the token above.\n');
    
    // Open dashboard
    if (process.platform === 'darwin') {
      await execAsync('open http://localhost:3001/deepwiki-dashboard.html');
    } else if (process.platform === 'linux') {
      await execAsync('xdg-open http://localhost:3001/deepwiki-dashboard.html');
    } else {
      console.log('Please open: http://localhost:3001/deepwiki-dashboard.html');
    }
    
    console.log('Dashboard opened! The token has been copied above.');
    console.log('Paste it when the dashboard prompts for authentication.\n');
    
  } catch (error) {
    console.error('Failed:', error.message);
  }
}

main();