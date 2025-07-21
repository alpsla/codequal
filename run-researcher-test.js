#!/usr/bin/env node

// Set environment variables
process.env.OPENROUTER_API_KEY = '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';

// Load environment from .env file
require('dotenv').config();

// Simple test to see if we can load the researcher
console.log('Testing researcher execution...');
console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? 'Set' : 'Not set');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set');

// Try to require the production researcher service directly
try {
  const path = require('path');
  const researcherPath = path.join(__dirname, 'packages/agents/src/researcher/production-researcher-service.ts');
  console.log('Looking for researcher at:', researcherPath);
  
  // For now, just check if the file exists
  const fs = require('fs');
  if (fs.existsSync(researcherPath)) {
    console.log('✓ Researcher service file found');
    
    // Create a minimal test user
    const testUser = {
      id: 'system-researcher-001',
      email: 'system@codequal.com',
      isSystemUser: true
    };
    
    console.log('\nReady to run researcher with system user:', testUser);
    console.log('\nTo execute the researcher manually, you need to:');
    console.log('1. Ensure all TypeScript files are compiled');
    console.log('2. Fix the auth/system-auth export in @codequal/core');
    console.log('3. Run: npm run build');
    console.log('4. Then run the compiled version');
  } else {
    console.log('✗ Researcher service file not found');
  }
} catch (error) {
  console.error('Error:', error.message);
}