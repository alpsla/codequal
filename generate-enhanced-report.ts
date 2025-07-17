#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { populateEnhancedReport } from './apps/api/src/services/populate-enhanced-report';

// Read the analysis result
const analysisResultPath = path.join(__dirname, 'final_report.json');
const reportData = JSON.parse(fs.readFileSync(analysisResultPath, 'utf-8'));

// Create a proper structure for the template
const enhancedReportData = {
  analysisId: 'analysis_1752424246703_ojx63st5n',
  repository: {
    name: 'facebook/react',
    primaryLanguage: 'JavaScript'
  },
  pr: {
    number: 25000,
    title: 'Create aeis.god',
    changedFiles: 1,
    additions: 1,
    deletions: 0
  },
  report: {
    fullReport: reportData
  },
  findings: reportData.modules?.findings?.categories || {},
  analysis: {
    mode: 'comprehensive',
    processingTime: 20730
  }
};

// Generate the enhanced HTML report
const enhancedHtml = populateEnhancedReport(enhancedReportData);

// Save the report
const outputPath = path.join(__dirname, 'enhanced-report-output.html');
fs.writeFileSync(outputPath, enhancedHtml);

console.log(`Enhanced report generated successfully at: ${outputPath}`);

// Also copy required assets
const publicDir = path.join(__dirname, 'apps/api/public');
const assetsDir = path.join(publicDir, 'assets');
const reportsDir = path.join(publicDir, 'reports');

// Ensure directories exist
if (!fs.existsSync(path.join(__dirname, 'reports'))) {
  fs.mkdirSync(path.join(__dirname, 'reports'));
}

// Copy CSS if exists
const cssPath = path.join(reportsDir, 'enhanced-styles.css');
if (fs.existsSync(cssPath)) {
  fs.copyFileSync(cssPath, path.join(__dirname, 'reports', 'enhanced-styles.css'));
  console.log('Copied enhanced styles');
}

// Copy logo if exists  
const logoPath = path.join(reportsDir, 'codequal-logo.svg');
if (fs.existsSync(logoPath)) {
  fs.copyFileSync(logoPath, path.join(__dirname, 'reports', 'codequal-logo.svg'));
  console.log('Copied logo');
}

console.log('\nTo view the report, open enhanced-report-output.html in your browser');