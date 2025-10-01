#!/usr/bin/env ts-node

/**
 * NVD Direct Download Script
 *
 * Downloads CVE data directly from NVD API (bypassing Dependency-Check)
 * Solves ARM64 H2 database corruption issues
 *
 * NVD API v2.0 Documentation:
 * https://nvd.nist.gov/developers/vulnerabilities
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import winston from 'winston';
import axios from 'axios';

dotenv.config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

interface NVDCveItem {
  cve: {
    id: string;
    descriptions: Array<{ lang: string; value: string }>;
    metrics?: {
      cvssMetricV31?: Array<{
        cvssData: {
          baseScore: number;
          baseSeverity: string;
          vectorString: string;
        };
      }>;
      cvssMetricV30?: Array<{
        cvssData: {
          baseScore: number;
          baseSeverity: string;
          vectorString: string;
        };
      }>;
      cvssMetricV2?: Array<{
        cvssData: {
          baseScore: number;
          vectorString: string;
        };
      }>;
    };
    weaknesses?: Array<{
      description: Array<{ lang: string; value: string }>;
    }>;
    references?: Array<{ url: string }>;
    published?: string;
    lastModified?: string;
  };
  configurations?: {
    nodes: Array<{
      cpeMatch: Array<{
        criteria: string;
        vulnerable?: boolean;
      }>;
    }>;
  };
}

interface CVERecord {
  cve_id: string;
  cvss_v3_score?: number;
  cvss_v3_vector?: string;
  cvss_v2_score?: number;
  severity?: string;
  cwe_id?: string;
  description: string;
  cpe_entries?: string[];
  reference_urls?: string[];
  published_date?: Date;
  last_modified_date?: Date;
}

/**
 * Download CVE data from NVD API v2.0
 */
async function downloadFromNVD(apiKey: string, startIndex = 0): Promise<NVDCveItem[]> {
  const resultsPerPage = 2000; // NVD API max
  const baseUrl = 'https://services.nvd.nist.gov/rest/json/cves/2.0';

  try {
    logger.info(`Fetching CVEs from NVD API (startIndex: ${startIndex})...`);

    const response = await axios.get(baseUrl, {
      params: {
        startIndex,
        resultsPerPage,
      },
      headers: {
        'apiKey': apiKey,
      },
      timeout: 120000, // 2 minutes
    });

    const totalResults = response.data.totalResults || 0;
    const vulnerabilities = response.data.vulnerabilities || [];

    logger.info(`Downloaded ${vulnerabilities.length} CVEs (${startIndex} to ${startIndex + vulnerabilities.length} of ${totalResults})`);

    return vulnerabilities;
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('NVD API key invalid or rate limited');
    }
    throw new Error(`NVD API error: ${error.message}`);
  }
}

/**
 * Transform NVD API response to our CVERecord schema
 */
function transformNVDData(nvdItems: NVDCveItem[]): CVERecord[] {
  return nvdItems.map(item => {
    const cve = item.cve;

    // Extract CVSS v3 (prefer v3.1, fallback to v3.0)
    const cvssV3 =
      cve.metrics?.cvssMetricV31?.[0]?.cvssData ||
      cve.metrics?.cvssMetricV30?.[0]?.cvssData;

    const cvssV2 = cve.metrics?.cvssMetricV2?.[0]?.cvssData;

    // Extract CWE
    const cweId = cve.weaknesses?.[0]?.description
      ?.find(d => d.lang === 'en')?.value;

    // Extract description
    const description = cve.descriptions
      ?.find(d => d.lang === 'en')?.value || 'No description available';

    // Extract CPE entries
    // Note: configurations is an array of configuration objects, each with nodes
    const cpeEntries: string[] = [];
    item.configurations?.forEach(config => {
      config.nodes?.forEach(node => {
        node.cpeMatch?.forEach(match => {
          if (match.vulnerable !== false) {
            cpeEntries.push(match.criteria);
          }
        });
      });
    });

    // Extract references
    const referenceUrls = cve.references?.map(ref => ref.url) || [];

    return {
      cve_id: cve.id,
      cvss_v3_score: cvssV3?.baseScore,
      cvss_v3_vector: cvssV3?.vectorString,
      cvss_v2_score: cvssV2?.baseScore,
      severity: cvssV3?.baseSeverity?.toUpperCase(),
      cwe_id: cweId,
      description,
      cpe_entries: cpeEntries.length > 0 ? cpeEntries : undefined,
      reference_urls: referenceUrls.length > 0 ? referenceUrls : undefined,
      published_date: cve.published ? new Date(cve.published) : undefined,
      last_modified_date: cve.lastModified ? new Date(cve.lastModified) : undefined,
    };
  });
}

/**
 * Upload CVE records to Supabase in batches with retry logic
 */
async function uploadToSupabase(
  supabase: any,
  records: CVERecord[]
): Promise<void> {
  const batchSize = 1000;
  let uploaded = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    // Retry logic with exponential backoff
    let retries = 3;
    let delay = 1000; // Start with 1 second

    while (retries > 0) {
      try {
        const { error } = await supabase
          .from('cve_database')
          .upsert(batch, { onConflict: 'cve_id' });

        if (error) {
          throw new Error(error.message);
        }

        // Success - break retry loop
        break;
      } catch (error: any) {
        retries--;
        if (retries === 0) {
          throw new Error(`Supabase upload failed after 3 retries: ${error.message}`);
        }

        logger.warn(`Upload failed, retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }

    uploaded += batch.length;
    const progress = Math.round((uploaded / records.length) * 100);
    logger.info(`Uploaded ${uploaded}/${records.length} CVEs (${progress}%)`);
  }
}

/**
 * Main execution
 */
async function main() {
  logger.info('================================================================================');
  logger.info('NVD Direct Download Script (Bypassing Dependency-Check H2 Database)');
  logger.info('================================================================================\n');

  // Validate environment
  const nvdApiKey = process.env.NVD_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!nvdApiKey || !supabaseUrl || !supabaseKey) {
    logger.error('❌ Missing required environment variables:');
    if (!nvdApiKey) logger.error('   - NVD_API_KEY');
    if (!supabaseUrl) logger.error('   - SUPABASE_URL');
    if (!supabaseKey) logger.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  logger.info('✅ Environment variables validated\n');

  // Initialize Supabase
  const supabase = createClient(supabaseUrl, supabaseKey);
  logger.info('✅ Supabase client initialized\n');

  // Download and upload in batches
  logger.info('📥 Starting NVD CVE download...');
  logger.info('   Strategy: Download 2,000 CVEs at a time, upload immediately');
  logger.info('   Estimated time: 15-25 minutes (depends on NVD API rate limits)\n');

  let startIndex = 0;
  let totalProcessed = 0;
  const startTime = Date.now();

  // NVD API allows 5 requests per 30 seconds with API key
  const rateLimitDelay = 6000; // 6 seconds between requests (safe margin)

  while (true) {
    try {
      // Download batch from NVD
      const nvdItems = await downloadFromNVD(nvdApiKey, startIndex);

      if (nvdItems.length === 0) {
        logger.info('✅ All CVEs downloaded');
        break;
      }

      // Transform to our schema
      const cveRecords = transformNVDData(nvdItems);

      // Upload to Supabase
      await uploadToSupabase(supabase, cveRecords);

      totalProcessed += cveRecords.length;
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const rate = Math.round(totalProcessed / elapsed);

      logger.info(`Progress: ${totalProcessed} CVEs processed (${rate} CVEs/sec)`);

      // Move to next batch
      startIndex += nvdItems.length;

      // Rate limiting: wait before next request
      if (nvdItems.length === 2000) {
        // More CVEs to download, respect rate limit
        logger.info(`⏸️  Rate limit wait: ${rateLimitDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
      }

    } catch (error: any) {
      logger.error(`❌ Error at startIndex ${startIndex}:`, error.message);

      if (error.message.includes('rate limited')) {
        logger.info('⏸️  Rate limited. Waiting 60 seconds...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        continue; // Retry same batch
      }

      throw error;
    }
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  const minutes = Math.floor(totalTime / 60);
  const seconds = totalTime % 60;

  logger.info('\n================================================================================');
  logger.info('✅ CVE DATABASE LOAD COMPLETE');
  logger.info('================================================================================');
  logger.info(`Total CVEs: ${totalProcessed}`);
  logger.info(`Total time: ${minutes}m ${seconds}s`);
  logger.info(`Average rate: ${Math.round(totalProcessed / totalTime)} CVEs/sec`);
  logger.info('================================================================================\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
