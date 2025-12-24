/**
 * Complete Corgea Flow Test
 * Tests the full workflow: code upload + SARIF + fix generation
 *
 * Workflow:
 * 1. Upload git config (repo metadata)
 * 2. Upload source code files
 * 3. Upload SARIF scan results
 * 4. Poll for fix generation
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const CORGEA_API_KEY = process.env.CORGEA_API_KEY;
const CORGEA_BASE_URL = 'https://www.corgea.app/api/v1';

// Sample vulnerable Java code for testing
const VULNERABLE_CODE = `package com.example.service;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

public class UserService {
    private Connection connection;

    public UserService(Connection conn) {
        this.connection = conn;
    }

    // SQL Injection vulnerability - directly concatenating user input
    public ResultSet getUser(String userId) throws Exception {
        Statement stmt = connection.createStatement();
        String query = "SELECT * FROM users WHERE id = '" + userId + "'";
        return stmt.executeQuery(query);
    }

    // Another SQL Injection
    public void deleteUser(String username) throws Exception {
        Statement stmt = connection.createStatement();
        stmt.execute("DELETE FROM users WHERE username = '" + username + "'");
    }

    // Hardcoded credentials (security issue)
    private static final String DB_PASSWORD = "admin123";

    // Missing input validation
    public void updateEmail(String userId, String email) throws Exception {
        Statement stmt = connection.createStatement();
        stmt.execute("UPDATE users SET email = '" + email + "' WHERE id = " + userId);
    }
}
`;

// SARIF report matching the vulnerable code
const TEST_SARIF = {
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [{
    "tool": {
      "driver": {
        "name": "semgrep",
        "version": "1.0.0",
        "rules": [
          {
            "id": "java.lang.security.audit.sqli.tainted-sql-string",
            "name": "SQL Injection",
            "shortDescription": { "text": "SQL Injection vulnerability detected" },
            "defaultConfiguration": { "level": "error" }
          },
          {
            "id": "java.lang.security.audit.hardcoded-credentials",
            "name": "Hardcoded Credentials",
            "shortDescription": { "text": "Hardcoded password detected" },
            "defaultConfiguration": { "level": "warning" }
          }
        ]
      }
    },
    "results": [
      {
        "ruleId": "java.lang.security.audit.sqli.tainted-sql-string",
        "level": "error",
        "message": { "text": "Detected SQL query built using string concatenation with user input. Use parameterized queries instead." },
        "locations": [{
          "physicalLocation": {
            "artifactLocation": { "uri": "src/main/java/com/example/service/UserService.java" },
            "region": { "startLine": 17, "startColumn": 24, "endLine": 17, "endColumn": 75 }
          }
        }]
      },
      {
        "ruleId": "java.lang.security.audit.sqli.tainted-sql-string",
        "level": "error",
        "message": { "text": "SQL query built using string concatenation. Use PreparedStatement." },
        "locations": [{
          "physicalLocation": {
            "artifactLocation": { "uri": "src/main/java/com/example/service/UserService.java" },
            "region": { "startLine": 23, "startColumn": 9, "endLine": 23, "endColumn": 80 }
          }
        }]
      },
      {
        "ruleId": "java.lang.security.audit.hardcoded-credentials",
        "level": "warning",
        "message": { "text": "Hardcoded password detected. Use environment variables or a secrets manager." },
        "locations": [{
          "physicalLocation": {
            "artifactLocation": { "uri": "src/main/java/com/example/service/UserService.java" },
            "region": { "startLine": 27, "startColumn": 5, "endLine": 27, "endColumn": 55 }
          }
        }]
      },
      {
        "ruleId": "java.lang.security.audit.sqli.tainted-sql-string",
        "level": "error",
        "message": { "text": "SQL Injection in UPDATE statement" },
        "locations": [{
          "physicalLocation": {
            "artifactLocation": { "uri": "src/main/java/com/example/service/UserService.java" },
            "region": { "startLine": 32, "startColumn": 9, "endLine": 32, "endColumn": 85 }
          }
        }]
      }
    ]
  }]
};

async function testCompleteFlow() {
  console.log('============================================================');
  console.log('        CORGEA COMPLETE FLOW TEST                          ');
  console.log('        Code Upload + SARIF + Fix Generation               ');
  console.log('============================================================\n');

  if (!CORGEA_API_KEY) {
    console.log('ERROR: CORGEA_API_KEY not set');
    return;
  }

  const runId = 'codequal-complete-' + Date.now();
  const project = 'codequal-integration-test';

  console.log('Run ID: ' + runId);
  console.log('Project: ' + project + '\n');

  // Step 1: Upload SARIF first (to get a scan_id)
  console.log('=== STEP 1: Upload SARIF Scan First ===');
  const repoData = Buffer.from(JSON.stringify({
    branch_name: 'main',
    integration_url: 'https://github.com/codequal/vulnerable-test-app'
  })).toString('base64');

  const queryParams = new URLSearchParams({
    run_id: runId,
    engine: 'semgrep',
    project: project,
    repo_data: repoData
  });

  let scanId = '';
  try {
    const sarifResponse = await fetch(CORGEA_BASE_URL + '/scan-upload?' + queryParams.toString(), {
      method: 'POST',
      headers: {
        'CORGEA-TOKEN': CORGEA_API_KEY!,
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(TEST_SARIF)
    });
    console.log('   Status: ' + sarifResponse.status);
    const sarifResult = await sarifResponse.text();
    console.log('   Response: ' + sarifResult);

    if (sarifResponse.ok) {
      const data = JSON.parse(sarifResult);
      if (data.sast_scan_id) {
        scanId = data.sast_scan_id;
        console.log('   Scan ID: ' + scanId);
      }
    }
  } catch (error: any) {
    console.log('   Error: ' + error.message);
  }

  if (!scanId) {
    console.log('ERROR: Could not get scan ID');
    return;
  }

  // Step 2: Upload git config (raw text format)
  console.log('\n=== STEP 2: Upload Git Config ===');
  const gitConfigText = `[remote "origin"]
	url = https://github.com/codequal/vulnerable-test-app
	fetch = +refs/heads/*:refs/remotes/origin/*
[branch "main"]
	remote = origin
	merge = refs/heads/main`;

  try {
    const gitConfigResponse = await fetch(CORGEA_BASE_URL + '/git-config-upload?run_id=' + runId, {
      method: 'POST',
      headers: {
        'CORGEA-TOKEN': CORGEA_API_KEY!,
        'Content-Type': 'text/plain'
      },
      body: gitConfigText
    });
    console.log('   Status: ' + gitConfigResponse.status);
    const gitResult = await gitConfigResponse.text();
    console.log('   Response: ' + gitResult.substring(0, 200));
  } catch (error: any) {
    console.log('   Error: ' + error.message);
  }

  // Step 3: Upload source code (multipart/form-data with path query param)
  console.log('\n=== STEP 3: Upload Source Code ===');
  const filePath = 'src/main/java/com/example/service/UserService.java';

  try {
    // Create form data with file
    const formData = new FormData();
    const blob = new Blob([VULNERABLE_CODE], { type: 'text/plain' });
    formData.append('file', blob, 'UserService.java');

    const codeUrl = CORGEA_BASE_URL + '/code-upload?run_id=' + runId + '&path=' + encodeURIComponent(filePath);
    const codeResponse = await fetch(codeUrl, {
      method: 'POST',
      headers: {
        'CORGEA-TOKEN': CORGEA_API_KEY!
      },
      body: formData
    });
    console.log('   Status: ' + codeResponse.status);
    const codeResult = await codeResponse.text();
    console.log('   Response: ' + codeResult.substring(0, 200));
  } catch (error: any) {
    console.log('   Error: ' + error.message);
  }

  // Step 4: Poll for results
  console.log('\n=== STEP 4: Poll for Fix Generation ===');
  await pollForFixes(scanId);

  console.log('\n=== TEST COMPLETE ===');
}

async function pollForFixes(scanId: string) {
  const maxAttempts = 10;
  const delayMs = 5000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log('   Attempt ' + attempt + '/' + maxAttempts + '...');

    try {
      // Check scan status
      const scanResponse = await fetch(CORGEA_BASE_URL + '/scan/' + scanId, {
        headers: { 'CORGEA-TOKEN': CORGEA_API_KEY! }
      });
      const scanData = await scanResponse.json() as Record<string, any>;
      console.log('   Scan Status: ' + scanData.status);

      // Check for issues/fixes
      const issuesResponse = await fetch(CORGEA_BASE_URL + '/scan/' + scanId + '/issues', {
        headers: { 'CORGEA-TOKEN': CORGEA_API_KEY! }
      });
      const issuesData = await issuesResponse.json() as Record<string, any>;

      if (issuesData.issues && issuesData.issues.length > 0) {
        console.log('\n   FIXES FOUND! ' + issuesData.issues.length + ' issues');
        issuesData.issues.slice(0, 5).forEach((issue: any, i: number) => {
          console.log('   ' + (i+1) + '. ' + (issue.title || issue.rule_id || 'Unknown'));
          console.log('      Severity: ' + (issue.severity || 'N/A'));
          console.log('      Has Fix: ' + (issue.fix ? 'YES' : 'NO'));
          if (issue.fix) {
            console.log('      Fix: ' + JSON.stringify(issue.fix).substring(0, 300));
          }
        });
        return;
      }

      if (scanData.status === 'complete' || scanData.status === 'completed') {
        console.log('   Scan complete but no issues found');
        return;
      }

      if (attempt < maxAttempts) {
        console.log('   Waiting ' + (delayMs/1000) + 's...');
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error: any) {
      console.log('   Error: ' + error.message);
    }
  }

  console.log('   Max attempts reached. Scan may still be processing.');
}

testCompleteFlow().catch(console.error);
