/**
 * DeepWiki Tool Integration Module
 * 
 * This module should be integrated into the DeepWiki codebase
 * to enable tool execution during repository analysis.
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class DeepWikiToolIntegration {
  constructor(options = {}) {
    this.toolsEnabled = process.env.TOOLS_ENABLED === 'true';
    this.toolTimeout = parseInt(process.env.TOOLS_TIMEOUT || '60000');
    this.toolsParallel = process.env.TOOLS_PARALLEL !== 'false';
    this.toolExecutorPath = options.toolExecutorPath || '/tools/tool-executor.js';
  }

  /**
   * Run analysis tools on a repository
   * @param {string} repositoryPath - Path to the cloned repository
   * @param {string[]} enabledTools - List of tools to run
   * @returns {Promise<Object>} Tool execution results
   */
  async runTools(repositoryPath, enabledTools = null) {
    if (!this.toolsEnabled) {
      console.log('Tools are disabled');
      return null;
    }

    // Default tools if not specified
    if (!enabledTools) {
      enabledTools = [
        'npm-audit',
        'license-checker',
        'madge',
        'dependency-cruiser',
        'npm-outdated'
      ];
    }

    console.log(`Running tools for repository: ${repositoryPath}`);
    console.log(`Enabled tools: ${enabledTools.join(', ')}`);

    try {
      // Check if tool executor exists
      await fs.access(this.toolExecutorPath);
    } catch (error) {
      console.error('Tool executor not found:', this.toolExecutorPath);
      return null;
    }

    return new Promise((resolve, reject) => {
      const toolsArg = enabledTools.join(',');
      const command = `node ${this.toolExecutorPath} "${repositoryPath}" "${toolsArg}"`;

      const execOptions = {
        timeout: this.toolTimeout,
        maxBuffer: 20 * 1024 * 1024 // 20MB buffer for output
      };

      exec(command, execOptions, (error, stdout, stderr) => {
        if (error) {
          if (error.killed && error.signal === 'SIGTERM') {
            console.error('Tool execution timed out');
            resolve({
              error: 'Tool execution timed out',
              timeout: true
            });
          } else {
            console.error('Tool execution failed:', error.message);
            console.error('stderr:', stderr);
            resolve({
              error: error.message,
              stderr: stderr
            });
          }
          return;
        }

        try {
          const results = JSON.parse(stdout);
          console.log('Tool execution completed successfully');
          resolve(results);
        } catch (parseError) {
          console.error('Failed to parse tool output:', parseError);
          resolve({
            error: 'Failed to parse tool output',
            stdout: stdout
          });
        }
      });
    });
  }

  /**
   * Format tool results for storage
   * @param {Object} toolResults - Raw tool results
   * @returns {Object} Formatted results for Vector DB storage
   */
  formatToolResults(toolResults) {
    if (!toolResults || !toolResults.results) {
      return null;
    }

    const formatted = {
      timestamp: toolResults.timestamp,
      repository: toolResults.repository,
      tools: {}
    };

    // Format each tool's results
    Object.entries(toolResults.results).forEach(([toolName, result]) => {
      if (result.success) {
        formatted.tools[toolName] = {
          success: true,
          executionTime: result.executionTime,
          metadata: result.metadata || {},
          summary: this.generateToolSummary(toolName, result)
        };

        // Include key findings
        if (toolName === 'npm-audit' && result.metadata?.vulnerabilities) {
          formatted.tools[toolName].vulnerabilities = result.metadata.vulnerabilities;
        } else if (toolName === 'license-checker' && result.metadata) {
          formatted.tools[toolName].licenseInfo = {
            totalPackages: result.metadata.totalPackages,
            riskyLicenses: result.metadata.riskyLicenses
          };
        } else if (toolName === 'madge' && result.metadata) {
          formatted.tools[toolName].circularDependencies = result.metadata.circularDependencies;
        }
      } else {
        formatted.tools[toolName] = {
          success: false,
          error: result.error,
          executionTime: result.executionTime
        };
      }
    });

    return formatted;
  }

  /**
   * Generate a summary for a tool's results
   * @param {string} toolName - Name of the tool
   * @param {Object} result - Tool execution result
   * @returns {string} Summary text
   */
  generateToolSummary(toolName, result) {
    const metadata = result.metadata || {};

    switch (toolName) {
      case 'npm-audit':
        if (metadata.totalVulnerabilities === 0) {
          return 'No security vulnerabilities found';
        }
        return `Found ${metadata.totalVulnerabilities} vulnerabilities: ` +
               `${metadata.vulnerabilities?.critical || 0} critical, ` +
               `${metadata.vulnerabilities?.high || 0} high`;

      case 'license-checker':
        return `Analyzed ${metadata.totalPackages || 0} packages, ` +
               `found ${metadata.riskyLicenses || 0} risky licenses`;

      case 'madge':
        if (metadata.circularDependencies === 0) {
          return 'No circular dependencies detected';
        }
        return `Found ${metadata.circularDependencies} circular dependency chains`;

      case 'dependency-cruiser':
        if (metadata.violations === 0) {
          return 'No dependency rule violations';
        }
        return `Found ${metadata.violations} dependency rule violations`;

      case 'npm-outdated':
        if (metadata.totalOutdated === 0) {
          return 'All dependencies are up to date';
        }
        return `${metadata.totalOutdated} outdated packages: ` +
               `${metadata.majorUpdates || 0} major, ` +
               `${metadata.minorUpdates || 0} minor`;

      default:
        return 'Analysis completed';
    }
  }

  /**
   * Check if tools should run for a repository
   * @param {string} repositoryPath - Path to the repository
   * @returns {Promise<boolean>} Whether tools should run
   */
  async shouldRunTools(repositoryPath) {
    if (!this.toolsEnabled) {
      return false;
    }

    try {
      // Check if it's a JavaScript/TypeScript project
      const packageJsonPath = path.join(repositoryPath, 'package.json');
      await fs.access(packageJsonPath);
      return true;
    } catch {
      // Not a Node.js project, check for JS files
      try {
        const files = await fs.readdir(repositoryPath);
        return files.some(file => /\.(js|jsx|ts|tsx)$/.test(file));
      } catch {
        return false;
      }
    }
  }
}

// Export for use in DeepWiki
module.exports = DeepWikiToolIntegration;

// Example usage:
if (require.main === module) {
  const integration = new DeepWikiToolIntegration();
  
  // Test with a sample repository
  const testRepo = process.argv[2] || '/workspace/test-repo';
  
  integration.runTools(testRepo)
    .then(results => {
      console.log('Raw results:', JSON.stringify(results, null, 2));
      
      const formatted = integration.formatToolResults(results);
      console.log('\nFormatted results:', JSON.stringify(formatted, null, 2));
    })
    .catch(error => {
      console.error('Test failed:', error);
    });
}
