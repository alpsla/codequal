/**
 * Full Corgea API Investigation
 * Testing all endpoints for Monday call preparation
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const CORGEA_API_KEY = process.env.CORGEA_API_KEY;
const CORGEA_BASE_URL = 'https://www.corgea.app/api/v1';

interface ApiResponse {
  endpoint: string;
  status: number;
  data?: any;
  error?: string;
}

async function testEndpoint(
  method: string,
  endpoint: string,
  body?: any
): Promise<ApiResponse> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        'CORGEA-TOKEN': CORGEA_API_KEY!,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(CORGEA_BASE_URL + endpoint, options);
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text.substring(0, 500);
    }

    return {
      endpoint,
      status: response.status,
      data: response.ok ? data : undefined,
      error: !response.ok ? text.substring(0, 200) : undefined
    };
  } catch (error: any) {
    return {
      endpoint,
      status: 0,
      error: error.message
    };
  }
}

async function investigateCorgea() {
  console.log('============================================================');
  console.log('           CORGEA API INVESTIGATION                         ');
  console.log('           Preparing for Monday Call                        ');
  console.log('============================================================\n');

  if (!CORGEA_API_KEY) {
    console.log('ERROR: CORGEA_API_KEY not set');
    return;
  }

  const maskedKey = CORGEA_API_KEY.substring(0, 8) + '...' + CORGEA_API_KEY.slice(-4);
  console.log('API Key: ' + maskedKey + '\n');

  // 1. Verify account info
  console.log('=== 1. ACCOUNT VERIFICATION ===');
  const verify = await testEndpoint('GET', '/verify');
  console.log('Status: ' + verify.status);
  if (verify.data) {
    console.log('Account Info:', JSON.stringify(verify.data, null, 2));
  }

  // 2. List all scans
  console.log('\n=== 2. ALL SCANS ===');
  const scans = await testEndpoint('GET', '/scans');
  console.log('Status: ' + scans.status);
  let scanList: any[] = [];
  if (scans.data && scans.data.scans) {
    scanList = scans.data.scans;
    console.log('Total scans: ' + scanList.length);
    scanList.slice(0, 5).forEach((scan: any, i: number) => {
      console.log('  ' + (i+1) + '. ID: ' + scan.id);
      console.log('     Status: ' + scan.status + ', Engine: ' + scan.engine);
      console.log('     Created: ' + scan.created_at);
    });
  }

  // 3. List all issues
  console.log('\n=== 3. ALL ISSUES ===');
  const issues = await testEndpoint('GET', '/issues');
  console.log('Status: ' + issues.status);
  let issueList: any[] = [];
  if (issues.data) {
    if (issues.data.issues) {
      issueList = issues.data.issues;
      console.log('Total issues: ' + issueList.length);
      issueList.slice(0, 5).forEach((issue: any, i: number) => {
        const title = issue.title || issue.rule_id || issue.cwe_id || 'Unknown';
        console.log('  ' + (i+1) + '. ' + title);
        console.log('     Severity: ' + (issue.severity || 'N/A') + ', File: ' + (issue.file_path || 'N/A'));
        console.log('     Has Fix: ' + (issue.fix ? 'YES' : 'NO'));
      });
    } else {
      console.log('Response:', JSON.stringify(issues.data, null, 2).substring(0, 500));
    }
  }

  // 4. Check specific scan details (use first scan if available)
  if (scanList.length > 0) {
    const scanId = scanList[0].id;

    console.log('\n=== 4. SCAN DETAILS (' + scanId + ') ===');
    const scanDetails = await testEndpoint('GET', '/scan/' + scanId);
    console.log('Status: ' + scanDetails.status);
    if (scanDetails.data) {
      console.log('Scan Details:', JSON.stringify(scanDetails.data, null, 2).substring(0, 800));
    }

    console.log('\n=== 5. SCAN ISSUES (' + scanId + ') ===');
    const scanIssues = await testEndpoint('GET', '/scan/' + scanId + '/issues');
    console.log('Status: ' + scanIssues.status);
    if (scanIssues.data && scanIssues.data.issues) {
      console.log('Issues in scan: ' + scanIssues.data.issues.length);
      scanIssues.data.issues.slice(0, 5).forEach((issue: any, i: number) => {
        const title = issue.title || issue.rule_id || issue.cwe_id || 'Unknown';
        console.log('  ' + (i+1) + '. ' + title);
        console.log('     File: ' + (issue.file_path || 'N/A') + ', Line: ' + (issue.line || 'N/A'));
        console.log('     Has Fix: ' + (issue.fix ? 'YES' : 'NO'));
        if (issue.fix) {
          console.log('     Fix Preview: ' + JSON.stringify(issue.fix).substring(0, 300) + '...');
        }
      });
    } else if (scanIssues.data) {
      console.log('Response:', JSON.stringify(scanIssues.data, null, 2).substring(0, 500));
    }

    // 6. Try to get scan report
    console.log('\n=== 6. SCAN REPORT (' + scanId + ') ===');
    const report = await testEndpoint('GET', '/scan/' + scanId + '/report');
    console.log('Status: ' + report.status);
    if (report.data) {
      const reportStr = typeof report.data === 'string' ? report.data : JSON.stringify(report.data);
      console.log('Report type: ' + typeof report.data);
      console.log('Report preview: ' + reportStr.substring(0, 500) + '...');
    } else if (report.error) {
      console.log('Error: ' + report.error);
    }
  }

  // 7. Check blocking rules
  console.log('\n=== 7. BLOCKING RULES ===');
  const rules = await testEndpoint('GET', '/blocking-rules');
  console.log('Status: ' + rules.status);
  if (rules.data) {
    console.log('Rules:', JSON.stringify(rules.data, null, 2).substring(0, 500));
  }

  // 8. Check SCA issues
  console.log('\n=== 8. SCA (Dependency) ISSUES ===');
  const sca = await testEndpoint('GET', '/issues/sca');
  console.log('Status: ' + sca.status);
  if (sca.data) {
    if (sca.data.issues) {
      console.log('SCA Issues: ' + sca.data.issues.length);
      sca.data.issues.slice(0, 3).forEach((issue: any, i: number) => {
        console.log('  ' + (i+1) + '. ' + (issue.package_name || issue.title || 'Unknown'));
        console.log('     CVE: ' + (issue.cve_id || 'N/A') + ', Severity: ' + (issue.severity || 'N/A'));
      });
    } else {
      console.log('Response:', JSON.stringify(sca.data, null, 2).substring(0, 300));
    }
  }

  // 9. Test issue details endpoint
  if (issueList.length > 0) {
    const issueId = issueList[0].id;
    console.log('\n=== 9. ISSUE DETAILS (' + issueId + ') ===');
    const issueDetails = await testEndpoint('GET', '/issue/' + issueId);
    console.log('Status: ' + issueDetails.status);
    if (issueDetails.data) {
      console.log('Issue Details:', JSON.stringify(issueDetails.data, null, 2).substring(0, 1500));
    }
  }

  // 10. Try CLI endpoints mentioned in docs
  console.log('\n=== 10. CLI ENDPOINTS ===');
  const cliIssues = await testEndpoint('GET', '/cli/issues?project=codequal-test');
  console.log('/cli/issues Status: ' + cliIssues.status);
  if (cliIssues.data) {
    console.log('Response:', JSON.stringify(cliIssues.data, null, 2).substring(0, 300));
  } else if (cliIssues.error) {
    console.log('Error: ' + cliIssues.error);
  }

  console.log('\n=== INVESTIGATION COMPLETE ===\n');
}

investigateCorgea().catch(console.error);
