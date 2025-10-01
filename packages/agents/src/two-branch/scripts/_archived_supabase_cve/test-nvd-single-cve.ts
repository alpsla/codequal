#!/usr/bin/env ts-node
/**
 * Test NVD API Response for Single CVE
 *
 * Fetches CVE-2021-44228 (Log4Shell) to examine actual API response structure
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

async function testSingleCVE() {
  const nvdApiKey = process.env.NVD_API_KEY;

  if (!nvdApiKey) {
    console.error('NVD_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('Fetching CVE-2021-44228 from NVD API...\n');

  try {
    const response = await axios.get('https://services.nvd.nist.gov/rest/json/cves/2.0', {
      params: {
        cveId: 'CVE-2021-44228'
      },
      headers: {
        'apiKey': nvdApiKey
      },
      timeout: 30000
    });

    const cveData = response.data;

    console.log('=== Full API Response ===');
    console.log(JSON.stringify(cveData, null, 2));
    console.log('\n');

    if (cveData.vulnerabilities && cveData.vulnerabilities.length > 0) {
      const vuln = cveData.vulnerabilities[0];
      const cve = vuln.cve;

      console.log('=== CVE Structure ===');
      console.log(`ID: ${cve.id}`);
      console.log(`Published: ${cve.published}`);
      console.log(`\nConfigurations present: ${cve.configurations ? 'YES' : 'NO'}`);

      if (cve.configurations) {
        console.log('Configurations structure:');
        console.log(JSON.stringify(cve.configurations, null, 2));

        console.log('\n=== Extracted CPE Entries (FIXED LOGIC) ===');
        const cpeEntries: string[] = [];

        // Use FIXED extraction logic
        cve.configurations?.forEach((config: any) => {
          config.nodes?.forEach((node: any) => {
            node.cpeMatch?.forEach((match: any) => {
              if (match.vulnerable !== false) {
                cpeEntries.push(match.criteria);
              }
            });
          });
        });

        console.log(`Total CPE entries: ${cpeEntries.length}`);
        console.log('\nFirst 10 CPE entries:');
        cpeEntries.slice(0, 10).forEach((cpe, i) => {
          console.log(`${i + 1}. ${cpe}`);
        });
      } else {
        console.log('⚠️  NO configurations field in API response!');
      }
    }

  } catch (error: any) {
    console.error('Error fetching CVE:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSingleCVE().catch(console.error);
