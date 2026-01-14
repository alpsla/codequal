-- SESSION 80: Seed initial fix pattern guidance data
-- These patterns help AI avoid common mistakes when generating fixes

-- CloseResource: Common issue with try-with-resources
INSERT INTO fix_pattern_guidance (
  rule_id, language, tool,
  anti_patterns, correct_patterns, related_rules,
  guidance_text, prompt_additions
) VALUES (
  'CloseResource', 'java', 'any',
  '[
    {"pattern": "empty catch block", "why": "Swallows exceptions, hides bugs and resource leaks"},
    {"pattern": "catch (Throwable)", "why": "Catches Errors that should crash the JVM"},
    {"pattern": "manual close() calls", "why": "Error-prone, may not run if exception thrown earlier"}
  ]'::jsonb,
  '[
    {"pattern": "try-with-resources", "example": "try (var stream = new FileInputStream(file)) { ... }"},
    {"pattern": "log and rethrow", "example": "catch(IOException e) { log.error(\"Failed\", e); throw new RuntimeException(e); }"}
  ]'::jsonb,
  ARRAY['EmptyCatchBlock', 'AvoidCatchingThrowable'],
  'When fixing CloseResource, ALWAYS use try-with-resources. This ensures automatic cleanup even if exceptions occur.',
  E'CRITICAL for CloseResource:\n- MUST use try-with-resources (try (var x = new Resource()) { })\n- NEVER generate empty catch blocks - log and rethrow or handle specifically\n- NEVER catch Throwable - catch specific exceptions like IOException'
) ON CONFLICT (rule_id, language, tool) DO UPDATE SET
  anti_patterns = EXCLUDED.anti_patterns,
  correct_patterns = EXCLUDED.correct_patterns,
  related_rules = EXCLUDED.related_rules,
  guidance_text = EXCLUDED.guidance_text,
  prompt_additions = EXCLUDED.prompt_additions,
  updated_at = NOW();

-- EmptyCatchBlock: Silent exception swallowing
INSERT INTO fix_pattern_guidance (
  rule_id, language, tool,
  anti_patterns, correct_patterns, related_rules,
  guidance_text, prompt_additions
) VALUES (
  'EmptyCatchBlock', 'java', 'any',
  '[
    {"pattern": "empty catch block", "why": "Silently swallows exceptions, making debugging impossible"},
    {"pattern": "catch with only comment", "why": "Still swallows the exception"}
  ]'::jsonb,
  '[
    {"pattern": "log and rethrow", "example": "catch(IOException e) { log.error(\"Failed to read file\", e); throw new RuntimeException(e); }"},
    {"pattern": "handle with fallback", "example": "catch(IOException e) { log.warn(\"Using default\", e); return defaultValue; }"}
  ]'::jsonb,
  ARRAY['CloseResource', 'AvoidCatchingGenericException'],
  'Empty catch blocks hide bugs. Always log the exception and either rethrow or handle with a fallback.',
  E'CRITICAL for EmptyCatchBlock:\n- ALWAYS log the exception with log.error() or log.warn()\n- Either rethrow as RuntimeException OR provide meaningful fallback\n- Include exception in log: log.error(\"message\", exception)'
) ON CONFLICT (rule_id, language, tool) DO UPDATE SET
  anti_patterns = EXCLUDED.anti_patterns,
  correct_patterns = EXCLUDED.correct_patterns,
  related_rules = EXCLUDED.related_rules,
  guidance_text = EXCLUDED.guidance_text,
  prompt_additions = EXCLUDED.prompt_additions,
  updated_at = NOW();

-- AvoidCatchingThrowable: Too broad exception handling
INSERT INTO fix_pattern_guidance (
  rule_id, language, tool,
  anti_patterns, correct_patterns, related_rules,
  guidance_text, prompt_additions
) VALUES (
  'AvoidCatchingThrowable', 'java', 'any',
  '[
    {"pattern": "catch (Throwable)", "why": "Catches Error types like OutOfMemoryError that should crash the JVM"},
    {"pattern": "catch (Exception)", "why": "Too broad, catches unchecked exceptions unexpectedly"}
  ]'::jsonb,
  '[
    {"pattern": "catch specific exceptions", "example": "catch(IOException | SQLException e) { ... }"},
    {"pattern": "multi-catch for related", "example": "try { ... } catch(FileNotFoundException e) { ... } catch(IOException e) { ... }"}
  ]'::jsonb,
  ARRAY['EmptyCatchBlock', 'CloseResource'],
  'Catch specific exception types. Throwable includes Error types that should not be caught.',
  E'CRITICAL for AvoidCatchingThrowable:\n- NEVER catch Throwable or Exception unless absolutely necessary\n- Catch specific exceptions: IOException, SQLException, etc.\n- Use multi-catch for related: catch(IOException | SQLException e)'
) ON CONFLICT (rule_id, language, tool) DO UPDATE SET
  anti_patterns = EXCLUDED.anti_patterns,
  correct_patterns = EXCLUDED.correct_patterns,
  related_rules = EXCLUDED.related_rules,
  guidance_text = EXCLUDED.guidance_text,
  prompt_additions = EXCLUDED.prompt_additions,
  updated_at = NOW();

-- UseUtilityClass: Utility class instantiation
INSERT INTO fix_pattern_guidance (
  rule_id, language, tool,
  anti_patterns, correct_patterns, related_rules,
  guidance_text, prompt_additions
) VALUES (
  'UseUtilityClass', 'java', 'any',
  '[
    {"pattern": "public default constructor", "why": "Allows instantiation of utility class"},
    {"pattern": "no constructor", "why": "Java adds default public constructor"}
  ]'::jsonb,
  '[
    {"pattern": "private constructor", "example": "private ClassName() { throw new UnsupportedOperationException(\"Utility class\"); }"},
    {"pattern": "final class", "example": "public final class Utils { private Utils() {} ... }"}
  ]'::jsonb,
  ARRAY[]::VARCHAR[],
  'Utility classes should have private constructor and be final.',
  E'CRITICAL for UseUtilityClass:\n- Add private constructor that throws UnsupportedOperationException\n- Make the class final to prevent extension\n- All methods should be static'
) ON CONFLICT (rule_id, language, tool) DO UPDATE SET
  anti_patterns = EXCLUDED.anti_patterns,
  correct_patterns = EXCLUDED.correct_patterns,
  related_rules = EXCLUDED.related_rules,
  guidance_text = EXCLUDED.guidance_text,
  prompt_additions = EXCLUDED.prompt_additions,
  updated_at = NOW();

-- NoPackage: Missing package declaration
INSERT INTO fix_pattern_guidance (
  rule_id, language, tool,
  anti_patterns, correct_patterns, related_rules,
  guidance_text, prompt_additions
) VALUES (
  'NoPackage', 'java', 'any',
  '[
    {"pattern": "no package declaration", "why": "Places class in default package, causing visibility issues"}
  ]'::jsonb,
  '[
    {"pattern": "add package matching directory", "example": "package com.example.myapp;"},
    {"pattern": "use domain-based naming", "example": "package org.company.project.module;"}
  ]'::jsonb,
  ARRAY[]::VARCHAR[],
  'Every Java class should have a package declaration matching its directory structure.',
  E'CRITICAL for NoPackage:\n- Add package declaration as first statement\n- Package should match directory structure\n- Use reverse domain naming convention'
) ON CONFLICT (rule_id, language, tool) DO UPDATE SET
  anti_patterns = EXCLUDED.anti_patterns,
  correct_patterns = EXCLUDED.correct_patterns,
  related_rules = EXCLUDED.related_rules,
  guidance_text = EXCLUDED.guidance_text,
  prompt_additions = EXCLUDED.prompt_additions,
  updated_at = NOW();
