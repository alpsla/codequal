/**
 * IDE Integration Section Generator
 *
 * Generates the IDE integration section for BASIC tier reports.
 * Provides export formats (LSP, SARIF, GitLab) and IDE setup guidance.
 *
 * @see unified-report-types.ts for type definitions
 */

import type {
  IDEIntegration,
  IDEGuide,
  ExportFormatInfo,
  CIIntegrationSnippet,
  APIEndpointInfo,
  ExportFormat,
} from '../unified-report-types';

const API_BASE_URL = process.env.CODEQUAL_API_URL || 'https://api.codequal.dev/v1';

/**
 * Generate IDE integration section for BASIC tier
 */
export function generateIDEIntegrationSection(
  reportId: string,
  analysisId: string
): IDEIntegration {
  return {
    reportId,
    analysisId,
    ideGuides: generateIDEGuides(),
    exportFormats: generateExportFormats(reportId),
    ciIntegration: generateCIIntegrationSnippets(),
    apiEndpoints: generateAPIEndpoints(reportId),
  };
}

/**
 * Generate IDE setup guides
 */
function generateIDEGuides(): IDEGuide[] {
  return [
    {
      ide: 'vscode',
      displayName: 'VS Code',
      extensionUrl: 'https://marketplace.visualstudio.com/items?itemName=codequal.codequal',
      setupInstructions: 'Install CodeQual extension from VS Code Marketplace',
      applyFixCommand: 'Open Command Palette (Ctrl/Cmd+Shift+P) → "CodeQual: Apply Fixes"',
    },
    {
      ide: 'cursor',
      displayName: 'Cursor',
      setupInstructions: 'Native LSP support - no extension needed',
      applyFixCommand: 'Press Ctrl/Cmd + . on highlighted issues to see quick fixes',
    },
    {
      ide: 'jetbrains',
      displayName: 'JetBrains IDEs',
      pluginUrl: 'https://plugins.jetbrains.com/plugin/codequal',
      setupInstructions: 'Install CodeQual plugin from JetBrains Marketplace',
      applyFixCommand: 'Press Alt + Enter on issues → Select "Quick Fix"',
    },
    {
      ide: 'neovim',
      displayName: 'Neovim',
      setupInstructions: 'Configure LSP client to load CodeQual LSP actions',
      applyFixCommand: ':lua vim.lsp.buf.code_action()',
    },
  ];
}

/**
 * Generate export format information
 */
function generateExportFormats(reportId: string): ExportFormatInfo[] {
  return [
    {
      format: 'lsp',
      displayName: 'LSP (JSON)',
      description: 'Language Server Protocol code actions for IDE integration',
      useCase: 'VS Code, Cursor, Neovim - provides inline quick fixes',
      filename: 'codequal-lsp-actions.json',
      downloadUrl: `${API_BASE_URL}/reports/${reportId}/export/lsp`,
      contentType: 'application/json',
    },
    {
      format: 'sarif',
      displayName: 'SARIF 2.1.0',
      description: 'Static Analysis Results Interchange Format (industry standard)',
      useCase: 'GitHub Security tab, VS Code SARIF Viewer extension',
      filename: 'codequal-sarif-report.json',
      downloadUrl: `${API_BASE_URL}/reports/${reportId}/export/sarif`,
      contentType: 'application/json',
    },
    {
      format: 'gitlab',
      displayName: 'GitLab Code Quality',
      description: 'Code Climate format for GitLab Merge Request integration',
      useCase: 'GitLab CI/CD pipeline code quality reports',
      filename: 'codequal-gitlab-codequality.json',
      downloadUrl: `${API_BASE_URL}/reports/${reportId}/export/gitlab`,
      contentType: 'application/json',
    },
  ];
}

/**
 * Generate CI/CD integration snippets
 */
function generateCIIntegrationSnippets(): CIIntegrationSnippet[] {
  return [
    {
      platform: 'github',
      displayName: 'GitHub Actions',
      description: 'Upload SARIF to GitHub Security tab',
      language: 'yaml',
      codeSnippet: `- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: codequal-sarif-report.json`,
    },
    {
      platform: 'gitlab',
      displayName: 'GitLab CI',
      description: 'Add code quality report to merge requests',
      language: 'yaml',
      codeSnippet: `code_quality:
  stage: test
  artifacts:
    reports:
      codequality: codequal-gitlab-codequality.json`,
    },
  ];
}

/**
 * Generate API endpoint information
 */
function generateAPIEndpoints(reportId: string): APIEndpointInfo[] {
  return [
    {
      endpoint: `${API_BASE_URL}/reports/${reportId}/export/lsp`,
      method: 'GET',
      description: 'LSP Code Actions with workspace edits',
      format: 'lsp',
    },
    {
      endpoint: `${API_BASE_URL}/reports/${reportId}/export/sarif`,
      method: 'GET',
      description: 'SARIF 2.1.0 static analysis format',
      format: 'sarif',
    },
    {
      endpoint: `${API_BASE_URL}/reports/${reportId}/export/gitlab`,
      method: 'GET',
      description: 'GitLab Code Climate format',
      format: 'gitlab',
    },
  ];
}

/**
 * Generate IDE integration section as Markdown
 * Used for report rendering
 */
export function generateIDEIntegrationMarkdown(section: IDEIntegration): string {
  let md = `
---

## IDE Integration & Export Formats

Apply fixes directly in your IDE or integrate with your CI/CD pipeline.

### Quick Fix with IDE

| IDE | Integration | How to Apply |
|-----|-------------|--------------|
`;

  for (const guide of section.ideGuides) {
    const link = guide.extensionUrl
      ? `[${guide.displayName}](${guide.extensionUrl})`
      : guide.pluginUrl
        ? `[${guide.displayName}](${guide.pluginUrl})`
        : `**${guide.displayName}**`;
    md += `| ${link} | ${guide.setupInstructions} | ${guide.applyFixCommand} |\n`;
  }

  md += `
### Export Formats

Download analysis results in standard formats for integration:

| Format | Use Case | Download |
|--------|----------|----------|
`;

  for (const format of section.exportFormats) {
    md += `| **${format.displayName}** | ${format.useCase} | [\`${format.filename}\`](${format.downloadUrl}) |\n`;
  }

  md += `
### CI/CD Integration

`;

  for (const ci of section.ciIntegration) {
    md += `**${ci.displayName}:**
\`\`\`${ci.language}
${ci.codeSnippet}
\`\`\`

`;
  }

  md += `### API Endpoints

| Endpoint | Format | Response |
|----------|--------|----------|
`;

  for (const api of section.apiEndpoints) {
    md += `| \`${api.method} ${api.endpoint.replace(API_BASE_URL, '/api')}\` | ${api.format.toUpperCase()} | ${api.description} |\n`;
  }

  md += `
> **Tip:** Use LSP format with Cursor or VS Code for the best "Quick Fix" experience - issues appear inline with one-click fixes.
`;

  return md;
}
