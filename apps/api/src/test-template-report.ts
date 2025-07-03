#!/usr/bin/env ts-node

import { generateTestReport } from './services/template-based-report-generator';
import * as fs from 'fs/promises';
import * as path from 'path';

async function main() {
  try {
    console.log('Generating test report using the template...');
    
    const html = await generateTestReport();
    
    const outputPath = path.join(__dirname, '..', 'test-template-based-report.html');
    await fs.writeFile(outputPath, html, 'utf-8');
    
    console.log(`✅ Report generated successfully: ${outputPath}`);
    console.log('Open the file in a browser to view the report.');
  } catch (error) {
    console.error('❌ Failed to generate report:', error);
    process.exit(1);
  }
}

main();