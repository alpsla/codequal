const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function testKubectlMetrics() {
  try {
    console.log('Testing kubectl-based DeepWiki metrics...\n');
    
    // Test disk usage
    const dfCommand = `kubectl exec -n codequal-dev deployment/deepwiki -- df -BG /root/.adalflow | tail -1`;
    const { stdout: dfOutput } = await execAsync(dfCommand);
    
    console.log('Raw df output:', dfOutput);
    
    const dfParts = dfOutput.trim().split(/\s+/);
    const totalGB = parseInt(dfParts[1].replace('G', ''));
    const usedGB = parseInt(dfParts[2].replace('G', ''));
    const availableGB = parseInt(dfParts[3].replace('G', ''));
    const percentUsed = parseInt(dfParts[4].replace('%', ''));
    
    console.log('\nParsed metrics:');
    console.log('- Total: ' + totalGB + 'GB');
    console.log('- Used: ' + usedGB + 'GB');
    console.log('- Available: ' + availableGB + 'GB');
    console.log('- Percent Used: ' + percentUsed + '%');
    
    // Test directory count
    const lsCommand = `kubectl exec -n codequal-dev deployment/deepwiki -- find /root/.adalflow -maxdepth 1 -type d | wc -l`;
    const { stdout: lsOutput } = await execAsync(lsCommand);
    const dirCount = parseInt(lsOutput.trim()) - 1;
    
    console.log('\nActive analyses (directories): ' + dirCount);
    
    // Test total size
    const duCommand = `kubectl exec -n codequal-dev deployment/deepwiki -- du -sm /root/.adalflow | cut -f1`;
    const { stdout: duOutput } = await execAsync(duCommand);
    const tempDirectoryMB = parseInt(duOutput.trim());
    
    console.log('Temp directory size: ' + tempDirectoryMB + 'MB (' + (tempDirectoryMB/1024).toFixed(2) + 'GB)');
    
    // Final metrics object
    const metrics = {
      totalGB,
      usedGB,
      availableGB,
      percentUsed,
      tempDirectoryGB: tempDirectoryMB / 1024,
      activeAnalyses: dirCount,
      avgAnalysisSizeMB: dirCount > 0 ? Math.round(tempDirectoryMB / dirCount) : 0
    };
    
    console.log('\nFinal metrics object:');
    console.log(JSON.stringify(metrics, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testKubectlMetrics();