#!/usr/bin/env node
/**
 * Script to combine all the enhanced-calibration parts into a single file
 */

const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname);
const outputFile = path.join(sourcePath, 'enhanced-calibration.js');

// Define parts in order
const partFiles = [
  'enhanced-calibration-part1.js',
  'enhanced-calibration-part2.js',
  'enhanced-calibration-part3.js',
  'enhanced-calibration-part4.js',
  'enhanced-calibration-part5.js',
  'enhanced-calibration-part6.js',
  'enhanced-calibration-part7.js',
  'enhanced-calibration-part8.js'
];

// Combine all parts
let combinedContent = '';
for (const partFile of partFiles) {
  const fullPath = path.join(sourcePath, partFile);
  
  try {
    console.log(`Reading ${partFile}...`);
    const content = fs.readFileSync(fullPath, 'utf8');
    combinedContent += content + '\n';
  } catch (error) {
    console.error(`Error reading ${partFile}: ${error.message}`);
    process.exit(1);
  }
}

// Write combined file
try {
  console.log(`Writing combined content to ${outputFile}...`);
  fs.writeFileSync(outputFile, combinedContent, 'utf8');
  fs.chmodSync(outputFile, '755'); // Make it executable
  console.log('Done! Enhanced calibration script has been created.');
} catch (error) {
  console.error(`Error writing combined file: ${error.message}`);
  process.exit(1);
}
