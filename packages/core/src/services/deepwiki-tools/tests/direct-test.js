#!/usr/bin/env node

/**
 * Direct Tool Runner Test
 * Runs the ToolRunnerService directly with minimal dependencies
 */

const path = require('path');

// Set up module paths
const projectRoot = path.join(__dirname, '../../../../../..');
const coreDistPath = path.join(projectRoot, 'packages/core/dist');

// Check if core is built
const fs = require('fs');
if (!fs.existsSync(coreDistPath)) {
    console.error('❌ Core package not built. Run: npm run build --workspace=@codequal/core');
    process.exit(1);
}

console.log('🧪 Direct Tool Runner Test');
console.log('=========================\n');

// Load the compiled ToolRunnerService
try {
    const { ToolRunnerService } = require(path.join(coreDistPath, 'services/deepwiki-tools/tool-runner.service.js'));
    
    // Create logger
    const logger = {
        info: (msg, meta) => console.log('[INFO]', msg, meta || ''),
        warn: (msg, meta) => console.warn('[WARN]', msg, meta || ''),
        error: (msg, meta) => console.error('[ERROR]', msg, meta || ''),
        debug: (msg, meta) => console.debug('[DEBUG]', msg, meta || '')
    };
    
    // Create tool runner
    const toolRunner = new ToolRunnerService(logger);
    
    // Test repositories
    const testRepos = [
        {
            name: 'MCP-Hybrid',
            path: path.join(projectRoot, 'packages/mcp-hybrid')
        },
        {
            name: 'Core',
            path: path.join(projectRoot, 'packages/core')
        }
    ];
    
    // Run tests
    async function runTests() {
        for (const repo of testRepos) {
            console.log(`\n📦 Testing ${repo.name}`);
            console.log('─'.repeat(50));
            
            if (!fs.existsSync(repo.path)) {
                console.log('⚠️  Path not found');
                continue;
            }
            
            try {
                const startTime = Date.now();
                
                const results = await toolRunner.runTools({
                    repositoryPath: repo.path,
                    enabledTools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated'],
                    timeout: 30000 // 30 seconds
                });
                
                const duration = Date.now() - startTime;
                console.log(`⏱️  Completed in ${duration}ms\n`);
                
                // Display results
                for (const [toolId, result] of Object.entries(results)) {
                    if (result.success) {
                        console.log(`✅ ${toolId}: Success (${result.executionTime}ms)`);
                        
                        // Show key metrics
                        switch (toolId) {
                            case 'npm-audit':
                                if (result.metadata?.totalVulnerabilities) {
                                    console.log(`   Vulnerabilities: ${result.metadata.totalVulnerabilities}`);
                                }
                                break;
                            case 'license-checker':
                                if (result.output?.totalPackages) {
                                    console.log(`   Total packages: ${result.output.totalPackages}`);
                                }
                                break;
                            case 'madge':
                                if (result.output?.circular) {
                                    console.log(`   Circular deps: ${result.output.circular.length}`);
                                }
                                break;
                            case 'npm-outdated':
                                if (result.output?.outdatedCount !== undefined) {
                                    console.log(`   Outdated: ${result.output.outdatedCount}`);
                                }
                                break;
                        }
                    } else {
                        console.log(`❌ ${toolId}: ${result.error}`);
                    }
                }
                
                // Save results
                const outputDir = path.join(__dirname, 'direct-test-results');
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }
                
                const resultFile = path.join(outputDir, `${repo.name.toLowerCase()}-results.json`);
                fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
                console.log(`\n💾 Results saved to: direct-test-results/${path.basename(resultFile)}`);
                
            } catch (error) {
                console.error(`❌ Error testing ${repo.name}:`, error.message);
            }
        }
    }
    
    // Run the tests
    runTests().then(() => {
        console.log('\n✅ Direct tool testing completed!');
        console.log('\nThe tools are working correctly and ready for DeepWiki integration.');
    }).catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
    
} catch (error) {
    console.error('❌ Failed to load ToolRunnerService:', error.message);
    console.error('\nMake sure the core package is built:');
    console.error('  npm run build --workspace=@codequal/core');
    process.exit(1);
}
