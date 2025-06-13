#!/usr/bin/env node

/**
 * Tool Executor for DeepWiki
 * This script is called from within the Docker container to execute analysis tools
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class ToolExecutor {
  constructor() {
    this.timeout = parseInt(process.env.TOOLS_TIMEOUT || '60000');
    this.maxBuffer = parseInt(process.env.TOOLS_MAX_BUFFER || '20971520');
    this.parallel = process.env.TOOLS_PARALLEL !== 'false';
  }

  /**
   * Execute tools for a repository
   */
  async executeTools(repositoryPath, enabledTools) {
    console.log(`Executing tools for repository: ${repositoryPath}`);
    console.log(`Enabled tools: ${enabledTools.join(', ')}`);

    const results = {};
    const startTime = Date.now();

    try {
      // Check if repository exists
      await fs.access(repositoryPath);
      
      // Check for package.json to determine if it's a Node.js project
      const packageJsonPath = path.join(repositoryPath, 'package.json');
      let hasPackageJson = false;
      
      try {
        await fs.access(packageJsonPath);
        hasPackageJson = true;
      } catch {
        console.log('No package.json found, skipping npm-based tools');
      }

      // Execute tools based on availability
      if (this.parallel) {
        const promises = enabledTools.map(tool => 
          this.executeTool(tool, repositoryPath, hasPackageJson)
        );
        const toolResults = await Promise.allSettled(promises);
        
        toolResults.forEach((result, index) => {
          const toolName = enabledTools[index];
          if (result.status === 'fulfilled') {
            results[toolName] = result.value;
          } else {
            results[toolName] = {
              toolId: toolName,
              success: false,
              error: result.reason instanceof Error ? result.reason.message : String(result.reason),
              executionTime: 0
            };
          }
        });
      } else {
        // Sequential execution
        for (const tool of enabledTools) {
          try {
            results[tool] = await this.executeTool(tool, repositoryPath, hasPackageJson);
          } catch (error) {
            results[tool] = {
              toolId: tool,
              success: false,
              error: error instanceof Error ? error.message : String(error),
              executionTime: 0
            };
          }
        }
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      return {
        timestamp: new Date().toISOString(),
        repository: repositoryPath,
        totalExecutionTime: totalTime,
        results
      };

    } catch (error) {
      console.error('Tool execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute a single tool
   */
  async executeTool(toolName, repositoryPath, hasPackageJson) {
    const startTime = Date.now();
    
    console.log(`Executing tool: ${toolName}`);

    try {
      // Skip npm-based tools if no package.json
      if (['npm-audit', 'npm-outdated'].includes(toolName) && !hasPackageJson) {
        return {
          toolId: toolName,
          success: false,
          error: 'No package.json found - skipping npm-based tool',
          executionTime: Date.now() - startTime
        };
      }

      const result = await this.runToolCommand(toolName, repositoryPath);
      const endTime = Date.now();

      return {
        toolId: toolName,
        success: true,
        output: result.output,
        executionTime: endTime - startTime,
        metadata: this.extractMetadata(toolName, result.output)
      };

    } catch (error) {
      const endTime = Date.now();
      
      return {
        toolId: toolName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: endTime - startTime
      };
    }
  }

  /**
   * Run a tool command
   */
  async runToolCommand(toolName, repositoryPath) {
    return new Promise((resolve, reject) => {
      let command, args;

      switch (toolName) {
        case 'npm-audit':
          command = 'npm';
          args = ['audit', '--json'];
          break;
        case 'license-checker':
          command = 'license-checker';
          args = ['--json'];
          break;
        case 'madge':
          command = 'madge';
          args = ['--json', '--circular', '.'];
          break;
        case 'dependency-cruiser':
          command = 'depcruise';
          args = ['--output-type', 'json', '.'];
          break;
        case 'npm-outdated':
          command = 'npm';
          args = ['outdated', '--json'];
          break;
        default:
          reject(new Error(`Unknown tool: ${toolName}`));
          return;
      }

      const child = spawn(command, args, {
        cwd: repositoryPath,
        timeout: this.timeout,
        maxBuffer: this.maxBuffer
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        // Some tools return non-zero exit codes even on success
        if (toolName === 'npm-audit' && code === 1) {
          // npm audit returns 1 when vulnerabilities are found
          code = 0;
        }
        if (toolName === 'npm-outdated' && code === 1) {
          // npm outdated returns 1 when outdated packages are found
          code = 0;
        }

        if (code === 0 || stdout.length > 0) {
          resolve({
            output: stdout,
            stderr: stderr,
            exitCode: code
          });
        } else {
          reject(new Error(`Tool ${toolName} failed with exit code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Extract metadata from tool output
   */
  extractMetadata(toolName, output) {
    try {
      const data = JSON.parse(output);
      
      switch (toolName) {
        case 'npm-audit':
          return {
            totalVulnerabilities: data.metadata?.vulnerabilities?.total || 0,
            vulnerabilities: data.metadata?.vulnerabilities || {}
          };
        case 'license-checker':
          return {
            totalPackages: Object.keys(data).length,
            riskyLicenses: Object.values(data).filter(pkg => 
              pkg.licenses && ['GPL', 'AGPL'].some(risk => pkg.licenses.includes(risk))
            ).length
          };
        case 'madge':
          return {
            circularDependencies: Array.isArray(data) ? data.length : 0
          };
        case 'dependency-cruiser':
          return {
            violations: data.summary?.violations || 0
          };
        case 'npm-outdated':
          const packages = Object.keys(data);
          return {
            totalOutdated: packages.length,
            majorUpdates: packages.filter(pkg => 
              data[pkg].current && data[pkg].wanted && 
              parseInt(data[pkg].wanted.split('.')[0]) > parseInt(data[pkg].current.split('.')[0])
            ).length,
            minorUpdates: packages.filter(pkg => 
              data[pkg].current && data[pkg].wanted && 
              parseInt(data[pkg].wanted.split('.')[1]) > parseInt(data[pkg].current.split('.')[1])
            ).length
          };
        default:
          return {};
      }
    } catch (error) {
      console.warn(`Failed to parse ${toolName} output as JSON:`, error.message);
      return {};
    }
  }
}

// Main execution
async function main() {
  const repositoryPath = process.argv[2];
  const enabledToolsStr = process.argv[3];
  const timeout = process.argv[4];

  if (!repositoryPath || !enabledToolsStr) {
    console.error('Usage: node tool-executor.js <repository_path> <enabled_tools> [timeout]');
    process.exit(1);
  }

  const enabledTools = enabledToolsStr.split(',').map(tool => tool.trim());
  
  if (timeout) {
    process.env.TOOLS_TIMEOUT = timeout;
  }

  const executor = new ToolExecutor();
  
  try {
    const results = await executor.executeTools(repositoryPath, enabledTools);
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Execution failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ToolExecutor;