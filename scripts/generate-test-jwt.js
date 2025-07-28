#!/usr/bin/env node

const jwt = require('jsonwebtoken');

// Generate a test JWT token
const payload = {
  id: 'test-user-123',
  email: 'dashboard@example.com',
  name: 'Dashboard User',
  role: 'user'
};

// Use a test secret (in production this would come from env)
const secret = process.env.JWT_SECRET || 'test-secret-for-monitoring-dashboard';

const token = jwt.sign(payload, secret, {
  expiresIn: '24h'
});

console.log('🔑 Generated JWT Token for Dashboard:\n');
console.log(token);
console.log('\n📋 Instructions:');
console.log('1. Copy the token above');
console.log('2. Open http://localhost:3001/deepwiki-dashboard.html');
console.log('3. When prompted, paste the token');
console.log('4. The dashboard will save it and use it for API calls\n');