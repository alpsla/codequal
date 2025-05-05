// Simple script to verify the build works
const { exec } = require('child_process');

console.log('Running TypeScript compiler to check for errors...');

// Run tsc --noEmit to check for errors without generating output files
exec('npx tsc --noEmit', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    console.log('Build check failed! See errors above.');
    process.exit(1);
  }
  
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    