#!/usr/bin/env node

/**
 * Clear dashboard token from browser localStorage
 * Run this if you're having issues with the monitoring dashboard
 */

console.log(`
To clear the dashboard token, open your browser console and run:

localStorage.removeItem('jwt_token');
location.reload();

Or to see what's stored:

console.log('Current token:', localStorage.getItem('jwt_token'));
console.log('Token length:', localStorage.getItem('jwt_token')?.length);

Then use the "Update Token" button to add a new token.
`);