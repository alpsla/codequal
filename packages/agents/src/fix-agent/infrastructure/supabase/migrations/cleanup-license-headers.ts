/**
 * Cleanup License Header Patterns Migration
 *
 * SESSION 27: Identifies and removes patterns that contain license headers
 * (Copyright, Apache License, MIT, GPL, etc.)
 * 
 * These patterns are problematic because:
 * 1. License headers are repository-specific
 * 2. They bloat fix templates with irrelevant content
 * 3. They indicate the pattern captured the entire file instead of just the fix
 *
 * Run: npx ts-node src/fix-agent/infrastructure/supabase/migrations/cleanup-license-headers.ts
 * Delete: npx ts-node src/fix-agent/infrastructure/supabase/migrations/cleanup-license-headers.ts --delete
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// Patterns that indicate license header content
const LICENSE_PATTERNS = [
  'copyright',
  'licensed under',
  'apache license',
  'mit license',
  'gpl license',
  'bsd license',
  'mozilla public license',
  'creative commons',
  'all rights reserved',
  'permission is hereby granted',
  'the above copyright notice',
  'without restriction, including without limitation',
  'this software is provided',
  'redistribute and/or modify',
  'license, version 2.0',
  'spdx-license-identifier'
];

// Patterns indicating full file was captured (bad pattern)
const FULL_FILE_INDICATORS = [
  'package com.',
  'import java.',
  'import org.',
  '#!/usr/bin/env',
  '#!/bin/bash',
  '#!/bin/sh',
  'from __future__ import',
  'namespace ',
  'use strict'
];

async function cleanupLicensePatterns(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Scanning for patterns with license headers...\n');

  // Fetch all patterns
  const { data: patterns, error } = await supabase
    .from('fix_patterns')
    .select('id, rule_id, tool, fix_template, examples, confidence, created_at');

  if (error) {
    console.error('❌ Failed to fetch patterns:', error.message);
    process.exit(1);
  }

  if (!patterns || patterns.length === 0) {
    console.log('✅ No patterns found in database');
    return;
  }

  console.log(`📊 Found ${patterns.length} total patterns\n`);

  const badPatterns: Array<{
    id: string;
    rule_id: string;
    tool: string;
    reason: string;
    snippet: string;
    templateLength: number;
  }> = [];

  for (const pattern of patterns) {
    // Check fix_template
    const template = pattern.fix_template?.template || '';
    const exampleAfter = pattern.examples?.[0]?.after || '';
    const content = (template + ' ' + exampleAfter).toLowerCase();

    // Check for license content
    for (const licensePattern of LICENSE_PATTERNS) {
      if (content.includes(licensePattern)) {
        badPatterns.push({
          id: pattern.id,
          rule_id: pattern.rule_id,
          tool: pattern.tool,
          reason: `Contains license: "${licensePattern}"`,
          snippet: content.substring(0, 150) + '...',
          templateLength: template.length + exampleAfter.length
        });
        break;
      }
    }

    // Also flag patterns that are suspiciously long (likely full file captures)
    if (!badPatterns.find(p => p.id === pattern.id)) {
      const totalLength = template.length + exampleAfter.length;
      if (totalLength > 2000) {
        // Check if it has full file indicators
        for (const indicator of FULL_FILE_INDICATORS) {
          if (content.includes(indicator.toLowerCase())) {
            badPatterns.push({
              id: pattern.id,
              rule_id: pattern.rule_id,
              tool: pattern.tool,
              reason: `Likely full file capture (${totalLength} chars, contains "${indicator}")`,
              snippet: content.substring(0, 150) + '...',
              templateLength: totalLength
            });
            break;
          }
        }
      }
    }
  }

  if (badPatterns.length === 0) {
    console.log('✅ No patterns with license headers found!');
    return;
  }

  // Sort by template length (largest first - most problematic)
  badPatterns.sort((a, b) => b.templateLength - a.templateLength);

  console.log(`⚠️  Found ${badPatterns.length} patterns with license/file issues:\n`);
  console.log('='.repeat(90));

  // Group by reason for summary
  const reasonCounts: Record<string, number> = {};
  for (const p of badPatterns) {
    const reasonType = p.reason.split(':')[0] || p.reason;
    reasonCounts[reasonType] = (reasonCounts[reasonType] || 0) + 1;
  }

  console.log('\n📊 Breakdown by issue type:');
  for (const [reason, count] of Object.entries(reasonCounts)) {
    console.log(`   ${reason}: ${count} patterns`);
  }
  console.log('');

  // Show first 20 examples
  const samplesToShow = Math.min(badPatterns.length, 20);
  console.log(`\n📋 First ${samplesToShow} examples:\n`);

  for (let i = 0; i < samplesToShow; i++) {
    const p = badPatterns[i];
    console.log(`\n📛 [${i + 1}] Pattern: ${p.id.substring(0, 8)}...`);
    console.log(`   Rule: ${p.rule_id}`);
    console.log(`   Tool: ${p.tool}`);
    console.log(`   Size: ${p.templateLength} chars`);
    console.log(`   Reason: ${p.reason}`);
    console.log(`   Snippet: ${p.snippet.substring(0, 80)}...`);
  }

  if (badPatterns.length > samplesToShow) {
    console.log(`\n   ... and ${badPatterns.length - samplesToShow} more patterns`);
  }

  console.log('\n' + '='.repeat(90));

  // Check if --delete flag is passed
  const shouldDelete = process.argv.includes('--delete');

  if (!shouldDelete) {
    console.log('\n⚠️  DRY RUN - No patterns deleted');
    console.log('   To delete these patterns, run with --delete flag:');
    console.log('   npx ts-node src/fix-agent/infrastructure/supabase/migrations/cleanup-license-headers.ts --delete\n');
    console.log(`   This will delete ${badPatterns.length} patterns`);
    return;
  }

  // Delete bad patterns
  console.log('\n🗑️  Deleting patterns with license headers...\n');

  let deleted = 0;
  let failed = 0;

  for (const p of badPatterns) {
    const { error: deleteError } = await supabase
      .from('fix_patterns')
      .delete()
      .eq('id', p.id);

    if (deleteError) {
      console.log(`   ❌ Failed to delete ${p.id.substring(0, 8)}: ${deleteError.message}`);
      failed++;
    } else {
      deleted++;
      // Only show every 10th deletion to reduce output
      if (deleted % 10 === 0 || deleted <= 5) {
        console.log(`   ✅ Deleted ${deleted}/${badPatterns.length}...`);
      }
    }
  }

  console.log('\n' + '='.repeat(90));
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Deleted: ${deleted}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📦 Remaining: ${patterns.length - deleted}`);
  console.log('\n💡 Next step: Run pattern calibration to rebuild clean patterns');
}

cleanupLicensePatterns().catch(console.error);

