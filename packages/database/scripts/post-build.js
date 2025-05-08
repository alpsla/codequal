const fs = require('fs');
const path = require('path');

// Source and destination directories
const srcMigrationsDir = path.join(__dirname, '../src/migrations');
const destMigrationsDir = path.join(__dirname, '../dist/migrations');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destMigrationsDir)) {
  fs.mkdirSync(destMigrationsDir, { recursive: true });
  console.log(`Created directory: ${destMigrationsDir}`);
}

// Copy SQL files from source to destination
const sqlFiles = fs.readdirSync(srcMigrationsDir)
  .filter(file => file.endsWith('.sql'));

for (const file of sqlFiles) {
  const srcFile = path.join(srcMigrationsDir, file);
  const destFile = path.join(destMigrationsDir, file);
  
  fs.copyFileSync(srcFile, destFile);
  console.log(`Copied: ${srcFile} -> ${destFile}`);
}

console.log('Post-build script completed successfully.');
