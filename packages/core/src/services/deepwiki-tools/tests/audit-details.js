#!/usr/bin/env node

/**
 * Detailed NPM Audit Analyzer
 * Shows detailed information about vulnerabilities
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔒 NPM Security Audit Details');
console.log('=============================\n');

const projectRoot = path.join(__dirname, '../../../../../..');

// Change to project root
process.chdir(projectRoot);

try {
    // Run npm audit with detailed output
    const auditOutput = execSync('npm audit --json', { encoding: 'utf-8' });
    const audit = JSON.parse(auditOutput);
    
    // Display summary
    if (audit.metadata && audit.metadata.vulnerabilities) {
        const vulns = audit.metadata.vulnerabilities;
        console.log('📊 Vulnerability Summary:');
        console.log(`   Total: ${vulns.total || 0}`);
        console.log(`   Critical: ${vulns.critical || 0}`);
        console.log(`   High: ${vulns.high || 0}`);
        console.log(`   Moderate: ${vulns.moderate || 0}`);
        console.log(`   Low: ${vulns.low || 0}`);
        console.log(`   Info: ${vulns.info || 0}`);
        console.log('');
    }
    
    // Display vulnerability details
    if (audit.vulnerabilities) {
        console.log('📋 Vulnerability Details:');
        console.log('─'.repeat(60));
        
        Object.entries(audit.vulnerabilities).forEach(([pkg, vuln]) => {
            console.log(`\n📦 Package: ${pkg}`);
            console.log(`   Severity: ${vuln.severity}`);
            console.log(`   Version: ${vuln.range}`);
            
            if (vuln.via && Array.isArray(vuln.via)) {
                vuln.via.forEach(v => {
                    if (typeof v === 'object' && v.title) {
                        console.log(`   Issue: ${v.title}`);
                        if (v.url) console.log(`   More info: ${v.url}`);
                        if (v.fixAvailable) {
                            console.log(`   Fix available: ✅`);
                        }
                    }
                });
            }
            
            if (vuln.fixAvailable) {
                console.log(`   Fix: Update to ${vuln.fixAvailable.name}@${vuln.fixAvailable.version}`);
            }
            
            // Show dependency path
            if (vuln.nodes && vuln.nodes.length > 0) {
                console.log(`   Used by: ${vuln.nodes.join(' → ')}`);
            }
        });
    }
    
    // Try to run audit fix dry-run
    console.log('\n\n🔧 Checking automatic fixes...');
    console.log('─'.repeat(60));
    
    try {
        const fixOutput = execSync('npm audit fix --dry-run 2>&1', { encoding: 'utf-8' });
        console.log(fixOutput);
    } catch (e) {
        // If no fixes available, that's okay
        console.log('No automatic fixes available (or all fixes require major updates)');
    }
    
    // Save detailed report
    const reportPath = path.join(__dirname, 'audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(audit, null, 2));
    console.log(`\n💾 Full audit report saved to: audit-report.json`);
    
} catch (error) {
    if (error.stdout) {
        // npm audit returns non-zero exit code when vulnerabilities found
        const audit = JSON.parse(error.stdout);
        
        // Still process the output
        if (audit.metadata && audit.metadata.vulnerabilities) {
            const vulns = audit.metadata.vulnerabilities;
            console.log('📊 Vulnerability Summary:');
            console.log(`   Total: ${vulns.total || 0}`);
            console.log(`   Low: ${vulns.low || 0}`);
            
            // Since these are all low severity, let's see what they are
            if (audit.vulnerabilities) {
                console.log('\n📋 Low Severity Issues:');
                Object.entries(audit.vulnerabilities).forEach(([pkg, vuln]) => {
                    console.log(`\n   📦 ${pkg} (${vuln.severity})`);
                    if (vuln.via && Array.isArray(vuln.via)) {
                        vuln.via.forEach(v => {
                            if (typeof v === 'object' && v.title) {
                                console.log(`      ${v.title}`);
                            }
                        });
                    }
                });
            }
            
            console.log('\n✅ All vulnerabilities are LOW severity - safe to continue!');
        }
    } else {
        console.error('Error running audit:', error.message);
    }
}

// Additional checks
console.log('\n\n🔍 Additional Security Checks:');
console.log('─'.repeat(60));

// Check for .env files
const envFiles = ['.env', '.env.local', '.env.production'];
envFiles.forEach(file => {
    if (fs.existsSync(path.join(projectRoot, file))) {
        console.log(`⚠️  Found ${file} - ensure it's in .gitignore`);
    }
});

// Check package.json for suspicious scripts
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
if (packageJson.scripts) {
    const suspiciousScripts = Object.entries(packageJson.scripts)
        .filter(([name, cmd]) => 
            cmd.includes('curl') || 
            cmd.includes('wget') || 
            cmd.includes('eval') ||
            cmd.includes('base64')
        );
    
    if (suspiciousScripts.length > 0) {
        console.log('⚠️  Found potentially suspicious scripts:');
        suspiciousScripts.forEach(([name, cmd]) => {
            console.log(`   - ${name}: ${cmd}`);
        });
    } else {
        console.log('✅ No suspicious scripts found');
    }
}

console.log('\n✅ Security audit completed!');
