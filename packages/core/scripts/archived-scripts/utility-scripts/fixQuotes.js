#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'calibration-results', 'comprehensive-model-config.ts');
console.log(`Fixing quotes in ${filePath}`);

let content = fs.readFileSync(filePath, 'utf8');

// Replace all double quotes with single quotes
content = content.replace(/([a-zA-Z0-9_.-]+):\s*"/g, '$1: \'');
content = content.replace(/",/g, '\',');
content = content.replace(/"$/mg, '\'');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Quotes fixed!');