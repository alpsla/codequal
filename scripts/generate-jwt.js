const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

const secret = process.env.SUPABASE_JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log('Using JWT secret:', secret ? 'Found' : 'Not found');

if (!secret) {
  console.error('Error: No JWT secret found in environment variables');
  process.exit(1);
}

// Generate a service role token
const token = jwt.sign(
  { 
    role: 'service_role',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  },
  secret,
  { algorithm: 'HS256' }
);

console.log('Generated JWT Token:');
console.log(token);
console.log('\nUse this token in the dashboard or API calls');
console.log('\nDashboard URL: http://localhost:3001/deepwiki-dashboard.html');