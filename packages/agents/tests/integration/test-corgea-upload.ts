/**
 * Test Corgea Scan Upload
 * Uploads SARIF to Corgea and retrieves AI-generated fixes
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const CORGEA_API_KEY = process.env.CORGEA_API_KEY;
const CORGEA_BASE_URL = 'https://www.corgea.app/api/v1';

// Simple SARIF with one security issue
const testSARIF = {
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [{
    "tool": {
      "driver": {
        "name": "CodeQual Test",
        "version": "1.0.0",
        "rules": [{
          "id": "sql-injection",
          "name": "SQL Injection",
          "shortDescription": { "text": "SQL Injection vulnerability" },
          "defaultConfiguration": { "level": "error" }
        }]
      }
    },
    "results": [{
      "ruleId": "sql-injection",
      "level": "error",
      "message": { "text": "Potential SQL injection in query construction" },
      "locations": [{
        "physicalLocation": {
          "artifactLocation": { "uri": "src/UserService.java" },
          "region": { "startLine": 42, "startColumn": 10 }
        }
      }]
    }]
  }]
};

async function testCorgeaUpload() {
  console.log('=== Testing Corgea Scan Upload ===\n');

  if (!CORGEA_API_KEY) {
    console.log('❌ CORGEA_API_KEY not set');
    return;
  }

  const maskedKey = CORGEA_API_KEY.substring(0, 8) + '...' + CORGEA_API_KEY.slice(-4);
  console.log('API Key: ' + maskedKey);
  console.log('Base URL: ' + CORGEA_BASE_URL + '\n');

  // Step 1: Upload SARIF scan
  // API requires: run_id, engine, project as query params
  // Body: text/plain with SARIF content
  console.log('1. Uploading SARIF scan...');

  const runId = 'codequal-test-' + Date.now();
  const engine = 'semgrep';  // Must be: checkmarx, codeql, fortify, semgrep, snyk
  const project = 'codequal-test';

  const repoData = Buffer.from(JSON.stringify({
    branch_name: 'main',
    integration_url: 'https://github.com/test/repo'
  })).toString('base64');

  const queryParams = new URLSearchParams({
    run_id: runId,
    engine: engine,
    project: project,
    repo_data: repoData
  });

  console.log('   Run ID: ' + runId);
  console.log('   Engine: ' + engine);
  console.log('   Project: ' + project);

  try {
    const uploadResponse = await fetch(CORGEA_BASE_URL + '/scan-upload?' + queryParams.toString(), {
      method: 'POST',
      headers: {
        'CORGEA-TOKEN': CORGEA_API_KEY,
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(testSARIF)
    });

    console.log('   Status: ' + uploadResponse.status + ' ' + uploadResponse.statusText);

    const responseText = await uploadResponse.text();
    console.log('   Response: ' + responseText.substring(0, 500));

    if (uploadResponse.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('   ✅ Scan uploaded!');
        if (data.scan_id) {
          console.log('   Scan ID: ' + data.scan_id);
        }
      } catch {
        console.log('   Response is not JSON');
      }
    } else {
      console.log('   ❌ Upload failed');
    }
  } catch (error: any) {
    console.log('   ❌ Error: ' + error.message);
  }

  // Step 2: Poll for scan results
  console.log('\n2. Polling for scan results...');

  // Try different endpoints to get results
  const endpoints = [
    '/scans',
    '/scan/' + 'eba2f755-fc2e-4e06-aea1-d81b20b198d7',
    '/scan/' + 'eba2f755-fc2e-4e06-aea1-d81b20b198d7' + '/issues'
  ];

  for (const endpoint of endpoints) {
    console.log('\n   Trying: ' + endpoint);
    try {
      const response = await fetch(CORGEA_BASE_URL + endpoint, {
        method: 'GET',
        headers: {
          'CORGEA-TOKEN': CORGEA_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      console.log('   Status: ' + response.status);

      if (response.ok) {
        const text = await response.text();
        if (text.startsWith('{') || text.startsWith('[')) {
          const data = JSON.parse(text);
          console.log('   ✅ Success!');
          console.log('   Response: ' + JSON.stringify(data, null, 2).substring(0, 500));
        } else {
          console.log('   HTML response (not JSON)');
        }
      }
    } catch (error: any) {
      console.log('   Error: ' + error.message);
    }
  }

  console.log('\n=== Test Complete ===');
}

testCorgeaUpload().catch(console.error);
