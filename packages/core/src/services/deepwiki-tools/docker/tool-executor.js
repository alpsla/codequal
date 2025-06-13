#!/usr/bin/env node

/**
 * Tool Executor for DeepWiki
 * This script is executed within the DeepWiki pod to run analysis tools
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Tool execution functions
const tools = {
  'npm-audit': runNpmAudit,
  'license-checker': runLicenseChecker,
  'madge': runMadge,
  'dependency-cruiser': runDependencyCruiser,
  'npm-outdated': runNpmOutdated
};

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: tool-executor.js <repository-path> [tools]');
    process.exit(1);
  }
  
  const repoPath = args[0];
  const requestedTools = args[1] ? args[1].split(',') : Object.keys(tools);
  
  console.log(`Running tools in: ${repoPath}`);
  console.log(`Tools to run: ${requestedTools.join(', ')}`);
  
  const results = {
    timestamp: new Date().toISOString(),
    repository: repoPath,
    results: {}
  };
  
  // Detect applicable tools
  const applicableTools = await detectApplicableTools(repoPath, requestedTools);
  
  // Run tools in parallel
  const toolPromises = applicableTools.map(async (toolName) => {
    const startTime = Date.now();
    
    try {
      const output = await tools[toolName](repoPath);
      results.results[toolName] = {
        success: true,
        executionTime: Date.now() - startTime,
        output,
        metadata: extractMetadata(toolName, output)
      };
    } catch (error) {
      results.results[toolName] = {
        success: false,
        executionTime: Date.now() - startTime,
        error: error.message
      };
    }
  });
  
  await Promise.all(toolPromises);
  
  // Output results as JSON
  console.log(JSON.stringify(results, null, 2));
}

async function detectApplicableTools(repoPath, requestedTools) {
  const applicable = [];
  
  try {
    // Check for package.json
    const hasPackageJson = await fileExists(path.join(repoPath, 'package.json'));
    
    if (hasPackageJson) {
      if (requestedTools.includes('npm-audit')) {
        const hasLockFile = await fileExists(path.join(repoPath, 'package-lock.json'));
        if (hasLockFile) {
          applicable.push('npm-audit');
        }
      }
      
      if (requestedTools.includes('license-checker')) {
        applicable.push('license-checker');
      }
      
      if (requestedTools.includes('npm-outdated')) {
        applicable.push('npm-outdated');
      }
    }
    
    // Check for JavaScript files
    const hasJsFiles = await hasJavaScriptFiles(repoPath);
    if (hasJsFiles) {
      if (requestedTools.includes('madge')) {
        applicable.push('madge');
      }
      
      if (requestedTools.includes('dependency-cruiser')) {
        applicable.push('dependency-cruiser');
      }
    }
  } catch (error) {
    console.error('Error detecting applicable tools:', error);
  }
  
  return applicable;
}

async function runNpmAudit(repoPath) {
  return new Promise((resolve, reject) => {
    exec('npm audit --json', { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
      // npm audit exits with error if vulnerabilities found, but we still want the output
      if (stdout) {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          resolve({ error: 'Failed to parse npm audit output' });
        }
      } else {
        reject(new Error(error?.message || 'npm audit failed'));
      }
    });
  });
}

async function runLicenseChecker(repoPath) {
  return new Promise((resolve, reject) => {
    exec('npx license-checker --json --production', { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          resolve({ error: 'Failed to parse license-checker output' });
        }
      }
    });
  });
}

async function runMadge(repoPath) {
  const srcDir = await findSourceDirectory(repoPath);
  
  return new Promise((resolve, reject) => {
    exec(`npx madge --circular --json "${srcDir}"`, { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          resolve([]);
        }
      }
    });
  });
}

async function runDependencyCruiser(repoPath) {
  const srcDir = await findSourceDirectory(repoPath);
  const configFile = await findDepCruiserConfig(repoPath);
  
  let command = `npx dependency-cruiser "${srcDir}" --output-type json`;
  if (configFile) {
    command += ` --config "${configFile}"`;
  }
  
  return new Promise((resolve, reject) => {
    exec(command, { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          resolve({ error: 'Failed to parse dependency-cruiser output' });
        }
      }
    });
  });
}

async function runNpmOutdated(repoPath) {
  return new Promise((resolve, reject) => {
    exec('npm outdated --json', { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
      // npm outdated exits with error if packages are outdated, but we still want the output
      if (stdout) {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          resolve({});
        }
      } else {
        resolve({});
      }
    });
  });
}

function extractMetadata(toolName, output) {
  const metadata = {};
  
  switch (toolName) {
    case 'npm-audit':
      if (output.metadata?.vulnerabilities) {
        metadata.vulnerabilities = output.metadata.vulnerabilities;
        metadata.totalVulnerabilities = output.metadata.vulnerabilities.total || 0;
      }
      break;
      
    case 'license-checker':
      if (typeof output === 'object') {
        const licenses = new Set();
        const riskyLicenses = [];
        
        Object.entries(output).forEach(([pkg, info]) => {
          const license = info.licenses || 'Unknown';
          licenses.add(license);
          
          if (/GPL|AGPL|LGPL/i.test(license)) {
            riskyLicenses.push(pkg);
          }
        });
        
        metadata.totalPackages = Object.keys(output).length;
        metadata.uniqueLicenses = licenses.size;
        metadata.riskyLicenses = riskyLicenses.length;
      }
      break;
      
    case 'madge':
      if (Array.isArray(output)) {
        metadata.circularDependencies = output.length;
        metadata.hasCircularDeps = output.length > 0;
      }
      break;
      
    case 'dependency-cruiser':
      if (output.summary) {
        metadata.violations = output.summary.violations || 0;
        metadata.totalModules = output.summary.totalCruised || 0;
      }
      break;
      
    case 'npm-outdated':
      if (typeof output === 'object') {
        metadata.totalOutdated = Object.keys(output).length;
        
        let major = 0, minor = 0, patch = 0;
        Object.values(output).forEach(pkg => {
          if (pkg.current && pkg.latest) {
            const [currMajor, currMinor] = pkg.current.split('.');
            const [latestMajor, latestMinor] = pkg.latest.split('.');
            
            if (currMajor !== latestMajor) {
              major++;
            } else if (currMinor !== latestMinor) {
              minor++;
            } else {
              patch++;
            }
          }
        });
        
        metadata.majorUpdates = major;
        metadata.minorUpdates = minor;
        metadata.patchUpdates = patch;
      }
      break;
  }
  
  return metadata;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function hasJavaScriptFiles(repoPath) {
  try {
    const entries = await fs.readdir(repoPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory() && ['src', 'lib', 'app', 'components'].includes(entry.name)) {
        return true;
      }
      if (entry.isFile() && /\.(js|jsx|ts|tsx)$/.test(entry.name)) {
        return true;
      }
    }
    
    return false;
  } catch {
    return false;
  }
}

async function findSourceDirectory(repoPath) {
  const dirs = ['src', 'lib', 'app', 'source'];
  
  for (const dir of dirs) {
    const dirPath = path.join(repoPath, dir);
    if (await fileExists(dirPath)) {
      return dirPath;
    }
  }
  
  return repoPath;
}

async function findDepCruiserConfig(repoPath) {
  const configs = [
    '.dependency-cruiser.js',
    '.dependency-cruiser.json',
    'dependency-cruiser.config.js'
  ];
  
  for (const config of configs) {
    const configPath = path.join(repoPath, config);
    if (await fileExists(configPath)) {
      return configPath;
    }
  }
  
  return null;
}

// Run main function
main().catch(error => {
  console.error('Tool executor failed:', error);
  process.exit(1);
});
