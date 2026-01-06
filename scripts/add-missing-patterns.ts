/**
 * Add missing Java/PMD patterns to Supabase
 *
 * Run: npx ts-node scripts/add-missing-patterns.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Missing patterns to add
const missingPatterns = [
  {
    id: uuidv4(),
    rule_id: 'UnnecessarySemicolon',
    tool: 'pmd',
    name: 'Remove Unnecessary Semicolon',
    description: 'Removes unnecessary semicolons after class/method/block declarations in Java code.',
    transformation_type: 'remove',
    file_types: ['java'],
    detection: {
      regex: '(\\}|\\)|\\])\\s*;\\s*$',
      context: {
        description: 'Semicolon after closing brace, parenthesis, or bracket'
      }
    },
    fix_template: {
      template: '$1',
      description: 'Remove the trailing semicolon after closing brace/bracket'
    },
    examples: [
      {
        before: `public class MyClass {
    public void method() {
        // some code
    };  // Unnecessary semicolon
}`,
        after: `public class MyClass {
    public void method() {
        // some code
    }  // Semicolon removed
}`,
        description: 'Remove semicolon after method closing brace'
      },
      {
        before: `if (condition) {
    doSomething();
};`,
        after: `if (condition) {
    doSomething();
}`,
        description: 'Remove semicolon after if block'
      }
    ],
    confidence: 95,
    safe_for_auto_apply: true,
    status: 'active',
    created_by: 'system',
    created_at: new Date().toISOString(),
    source: 'ai_generated',
    ai_model: null,
    ai_confidence: null,
    verified: true,
    apply_count: 0,
    success_count: 0,
    revert_count: 0,
    tags: ['java', 'pmd', 'style', 'cleanup']
  },
  {
    id: uuidv4(),
    rule_id: 'UnnecessaryImport',
    tool: 'pmd',
    name: 'Remove Unnecessary Import',
    description: 'Removes import statements that are not used in the Java file.',
    transformation_type: 'remove',
    file_types: ['java'],
    detection: {
      regex: '^import\\s+[\\w.]+;\\s*$',
      context: {
        description: 'Import statement that is not referenced in the code'
      }
    },
    fix_template: {
      template: '',
      description: 'Remove the entire import line'
    },
    examples: [
      {
        before: `import java.util.List;
import java.util.ArrayList;  // Used
import java.util.HashMap;    // Unused

public class MyClass {
    private ArrayList<String> items;
}`,
        after: `import java.util.ArrayList;  // Used

public class MyClass {
    private ArrayList<String> items;
}`,
        description: 'Remove unused import statements'
      },
      {
        before: `import java.io.*;  // Wildcard import, may be unnecessary
import java.util.Date;  // Unused

public class Simple {
}`,
        after: `public class Simple {
}`,
        description: 'Remove all unused imports'
      }
    ],
    confidence: 95,
    safe_for_auto_apply: true,
    status: 'active',
    created_by: 'system',
    created_at: new Date().toISOString(),
    source: 'ai_generated',
    ai_model: null,
    ai_confidence: null,
    verified: true,
    apply_count: 0,
    success_count: 0,
    revert_count: 0,
    tags: ['java', 'pmd', 'imports', 'cleanup']
  }
];

async function addPatterns() {
  console.log('Adding missing patterns to Supabase...\n');

  for (const pattern of missingPatterns) {
    console.log(`Adding pattern: ${pattern.rule_id} (${pattern.tool})`);

    // Check if pattern already exists
    const { data: existing } = await supabase
      .from('fix_patterns')
      .select('id, rule_id')
      .eq('rule_id', pattern.rule_id)
      .eq('tool', pattern.tool)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`  ⚠️  Pattern already exists: ${existing[0].id.substring(0, 8)}`);
      continue;
    }

    // Insert the pattern
    const { error } = await supabase
      .from('fix_patterns')
      .insert(pattern);

    if (error) {
      console.error(`  ❌ Failed to insert: ${error.message}`);
    } else {
      console.log(`  ✅ Added successfully: ${pattern.id.substring(0, 8)}`);
    }
  }

  console.log('\n--- Verification ---');

  // Verify patterns were added
  for (const pattern of missingPatterns) {
    const { data } = await supabase
      .from('fix_patterns')
      .select('id, rule_id, tool, confidence, status')
      .eq('rule_id', pattern.rule_id)
      .eq('tool', pattern.tool)
      .limit(1);

    if (data && data.length > 0) {
      console.log(`✅ ${pattern.rule_id}: Found (${data[0].status}, ${data[0].confidence}%)`);
    } else {
      console.log(`❌ ${pattern.rule_id}: NOT FOUND`);
    }
  }
}

addPatterns().catch(console.error);
