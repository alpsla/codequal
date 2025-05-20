#!/usr/bin/env node
/**
 * Combine the enhanced calibration script parts into a single file
 */

const fs = require('fs');
const path = require('path');

// Paths for split files and output
const CALIBRATION_DIR = path.join(__dirname, 'calibration');
const PARTS = [
  path.join(CALIBRATION_DIR, 'enhanced-calibration-part1.js'),
  path.join(CALIBRATION_DIR, 'enhanced-calibration-part2.js'),
  path.join(CALIBRATION_DIR, 'enhanced-calibration-part3.js'),
  path.join(CALIBRATION_DIR, 'enhanced-calibration-part4.js'),
  path.join(CALIBRATION_DIR, 'enhanced-calibration-part5.js'),
  path.join(CALIBRATION_DIR, 'enhanced-calibration-part6.js')
];
const OUTPUT = path.join(__dirname, 'enhanced-calibration.js');

// Read all parts
let combinedContent = '';
for (const partPath of PARTS) {
  console.log(`Reading ${partPath}...`);
  const content = fs.readFileSync(partPath, 'utf8');
  combinedContent += content + '\n';
}

// Write combined content
console.log(`Writing to ${OUTPUT}...`);
fs.writeFileSync(OUTPUT, combinedContent);

console.log('Done! Enhanced calibration script has been combined.');
