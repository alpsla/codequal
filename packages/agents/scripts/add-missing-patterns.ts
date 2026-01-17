#!/usr/bin/env npx ts-node
/**
 * Add Missing Patterns for Rules Without Code Fixes
 *
 * These rules were identified as having text guidance only:
 * 1. FileTabCharacterCheck - ✅ Fixable (replace tabs with spaces)
 * 2. HideUtilityClassConstructorCheck - ✅ Fixable (add private constructor)
 * 3. CollapsibleIfStatements - ⚠️ Partial (needs AST)
 * 4. RightCurlyCheck - ⚠️ Partial (style dependent)
 * 5. MissingJavadocMethodCheck - ⚠️ Partial (template only)
 * 6. JavadocMethodCheck - ⚠️ Partial (template only)
 * 7. DesignForExtensionCheck - ❌ Not auto-fixable (architectural)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface PatternToAdd {
  rule_id: string;
  tool: string;
  name: string;
  description: string;
  transformation_type: string;
  file_types: string[];
  detection: object;
  fix_template: {
    template: string;
    variables: string[];
  };
  examples: Array<{
    before: string;
    after: string;
    explanation: string;
  }>;
  confidence: number;
  safe_for_auto_apply: boolean;
  tags: string[];
}

const patternsToAdd: PatternToAdd[] = [
  // 1. FileTabCharacterCheck - Replace tabs with spaces
  {
    rule_id: 'FileTabCharacterCheck',
    tool: 'checkstyle',
    name: 'Replace Tab Characters with Spaces',
    description: 'Converts tab characters to spaces for consistent formatting. Uses 4 spaces per tab.',
    transformation_type: 'string_replacement',
    file_types: ['java'],
    detection: {
      pattern: '\\t',
      message_contains: ['tab', 'character']
    },
    fix_template: {
      template: '{{LINE_CONTENT:replace_tabs_with_spaces:4}}',
      variables: ['LINE_CONTENT', 'TAB_SIZE']
    },
    examples: [
      {
        before: '\tpublic void method() {',
        after: '    public void method() {',
        explanation: 'Replace tab with 4 spaces for consistent indentation'
      },
      {
        before: '\t\tint x = 1;',
        after: '        int x = 1;',
        explanation: 'Replace 2 tabs with 8 spaces'
      }
    ],
    confidence: 95,
    safe_for_auto_apply: true,
    tags: ['formatting', 'whitespace', 'style']
  },

  // 2. HideUtilityClassConstructorCheck - Add private constructor
  {
    rule_id: 'HideUtilityClassConstructorCheck',
    tool: 'checkstyle',
    name: 'Add Private Constructor to Utility Class',
    description: 'Adds a private constructor to prevent instantiation of utility classes.',
    transformation_type: 'code_insertion',
    file_types: ['java'],
    detection: {
      pattern: 'class\\s+\\w+Utils?',
      message_contains: ['utility', 'constructor', 'private']
    },
    fix_template: {
      template: `
    /**
     * Private constructor to prevent instantiation.
     */
    private {{CLASS_NAME}}() {
        throw new UnsupportedOperationException("Utility class should not be instantiated");
    }`,
      variables: ['CLASS_NAME']
    },
    examples: [
      {
        before: `public final class StringUtils {
    public static boolean isEmpty(String s) {
        return s == null || s.isEmpty();
    }
}`,
        after: `public final class StringUtils {
    /**
     * Private constructor to prevent instantiation.
     */
    private StringUtils() {
        throw new UnsupportedOperationException("Utility class should not be instantiated");
    }

    public static boolean isEmpty(String s) {
        return s == null || s.isEmpty();
    }
}`,
        explanation: 'Add private constructor after class declaration'
      }
    ],
    confidence: 90,
    safe_for_auto_apply: true,
    tags: ['design', 'utility-class', 'constructor']
  },

  // 3. RightCurlyCheck - Fix curly brace placement
  {
    rule_id: 'RightCurlyCheck',
    tool: 'checkstyle',
    name: 'Fix Right Curly Brace Placement',
    description: 'Ensures right curly braces are on the same line as the next statement (same-line style).',
    transformation_type: 'line_adjustment',
    file_types: ['java'],
    detection: {
      pattern: '\\}\\s*$',
      message_contains: ['right curly', 'same line', 'brace']
    },
    fix_template: {
      template: '} {{NEXT_KEYWORD}}',
      variables: ['NEXT_KEYWORD']
    },
    examples: [
      {
        before: `if (condition) {
    doSomething();
}
else {
    doOther();
}`,
        after: `if (condition) {
    doSomething();
} else {
    doOther();
}`,
        explanation: 'Move else to same line as closing brace'
      },
      {
        before: `try {
    riskyCode();
}
catch (Exception e) {
    handle(e);
}`,
        after: `try {
    riskyCode();
} catch (Exception e) {
    handle(e);
}`,
        explanation: 'Move catch to same line as closing brace'
      }
    ],
    confidence: 85,
    safe_for_auto_apply: true,
    tags: ['formatting', 'braces', 'style']
  },

  // 4. MissingJavadocMethodCheck - Add Javadoc template
  {
    rule_id: 'MissingJavadocMethodCheck',
    tool: 'checkstyle',
    name: 'Add Javadoc to Public Method',
    description: 'Adds Javadoc documentation template to public methods.',
    transformation_type: 'code_insertion',
    file_types: ['java'],
    detection: {
      pattern: 'public\\s+\\w+\\s+\\w+\\s*\\(',
      message_contains: ['javadoc', 'missing', 'method']
    },
    fix_template: {
      template: `/**
     * {{METHOD_DESCRIPTION}}
     *
{{PARAMS}}
     * @return {{RETURN_TYPE}} {{RETURN_DESCRIPTION}}
     */`,
      variables: ['METHOD_DESCRIPTION', 'PARAMS', 'RETURN_TYPE', 'RETURN_DESCRIPTION']
    },
    examples: [
      {
        before: `    public String getName() {
        return this.name;
    }`,
        after: `    /**
     * Gets the name.
     *
     * @return String the name
     */
    public String getName() {
        return this.name;
    }`,
        explanation: 'Add Javadoc with @return for getter method'
      },
      {
        before: `    public void setName(String name) {
        this.name = name;
    }`,
        after: `    /**
     * Sets the name.
     *
     * @param name the name to set
     */
    public void setName(String name) {
        this.name = name;
    }`,
        explanation: 'Add Javadoc with @param for setter method'
      }
    ],
    confidence: 75,
    safe_for_auto_apply: false, // Needs human review for accurate descriptions
    tags: ['documentation', 'javadoc', 'methods']
  },

  // 5. CollapsibleIfStatements - Combine nested ifs
  {
    rule_id: 'CollapsibleIfStatements',
    tool: 'pmd',
    name: 'Combine Nested If Statements',
    description: 'Combines nested if statements with no else clause into a single if with AND condition.',
    transformation_type: 'code_restructure',
    file_types: ['java'],
    detection: {
      pattern: 'if\\s*\\([^)]+\\)\\s*\\{\\s*if',
      message_contains: ['collapsible', 'nested', 'if']
    },
    fix_template: {
      template: 'if ({{CONDITION_1}} && {{CONDITION_2}}) {\n{{BODY}}\n}',
      variables: ['CONDITION_1', 'CONDITION_2', 'BODY']
    },
    examples: [
      {
        before: `if (a != null) {
    if (a.isValid()) {
        process(a);
    }
}`,
        after: `if (a != null && a.isValid()) {
    process(a);
}`,
        explanation: 'Combine nested conditions with && operator'
      }
    ],
    confidence: 80,
    safe_for_auto_apply: false, // AST understanding needed
    tags: ['refactoring', 'code-complexity', 'if-statements']
  }
];

async function addPatterns(): Promise<void> {
  console.log('=== Adding Missing Fix Patterns ===\n');

  for (const pattern of patternsToAdd) {
    console.log(`Adding pattern for: ${pattern.rule_id}`);

    // Check if pattern already exists
    const { data: existing } = await supabase
      .from('fix_patterns')
      .select('id')
      .eq('rule_id', pattern.rule_id)
      .eq('tool', pattern.tool)
      .single();

    if (existing) {
      console.log(`  ⏭️  Pattern already exists (id: ${existing.id.substring(0, 8)})`);
      continue;
    }

    // Insert new pattern
    const { data, error } = await supabase
      .from('fix_patterns')
      .insert({
        id: uuidv4(),
        ...pattern,
        status: 'active',
        created_by: 'manual-script',
        source: 'manual',
        verified: true,
        apply_count: 0,
        success_count: 0,
        revert_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Failed: ${error.message}`);
    } else {
      console.log(`  ✅ Added (id: ${data.id.substring(0, 8)})`);
    }
  }

  console.log('\n=== Done ===');
}

addPatterns().catch(console.error);
