-- ================================================================================
-- CodeQual Tool Database - Seed Data
-- Generated: 2025-12-01T13:33:56.974Z
-- ================================================================================

-- Run this AFTER the schema migration (tool-database-schema.sql)

BEGIN;

-- =============================================================================
-- SUMMARY
-- =============================================================================
-- Total tools: 58
-- Enabled tools: 57
-- Disabled tools: 1 (snyk)
-- Languages covered: 13 (c, cpp, csharp, go, java, javascript, kotlin, php, python, ruby, rust, swift, typescript)
-- Categories covered: 8 (compatibility, dependency, performance, quality, secrets, security, style, type-safety)
-- Fixer mappings: 32
-- =============================================================================

-- =============================================================================
-- SEED DATA: Tools
-- Generated from TypeScript SEED_TOOLS on 2025-12-01T13:33:56.976Z
-- =============================================================================

-- Tool: PMD
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'pmd',
  'PMD',
  'analyzer'::tool_type,
  'pmd pmd -d . -R rulesets/java/quickstart.xml -f json',
  'json'::output_format,
  false,
  NULL,
  NULL,
  'https://pmd.github.io/',
  'https://pmd.github.io/latest/pmd_rules_java_{category}.html#{ruleId}',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('pmd', 'java'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('pmd', 'kotlin'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('pmd', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('pmd', 'security'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('pmd', 'performance'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Checkstyle
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'checkstyle',
  'Checkstyle',
  'analyzer'::tool_type,
  'checkstyle -c /google_checks.xml -f xml .',
  'xml'::output_format,
  false,
  NULL,
  NULL,
  'https://checkstyle.org/',
  'https://checkstyle.org/checks/{category}/{ruleId}.html',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('checkstyle', 'java'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('checkstyle', 'style'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('checkstyle', 'quality'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: SpotBugs
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'spotbugs',
  'SpotBugs',
  'analyzer'::tool_type,
  'spotbugs -textui -effort:max -xml:withMessages .',
  'xml'::output_format,
  false,
  NULL,
  NULL,
  'https://spotbugs.github.io/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('spotbugs', 'java'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('spotbugs', 'security'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('spotbugs', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('spotbugs', 'performance'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Error Prone
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'error-prone',
  'Error Prone',
  'hybrid'::tool_type,
  'javac -XDcompilePolicy=simple -processorpath error_prone_core.jar',
  'text'::output_format,
  true,
  '-XepPatchChecks:{checks} -XepPatchLocation:.',
  NULL,
  'https://errorprone.info/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('error-prone', 'java'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('error-prone', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('error-prone', 'security'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Sorald
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'sorald',
  'Sorald',
  'fixer'::tool_type,
  'sorald repair --source . --rule-key {ruleKey}',
  'json'::output_format,
  true,
  NULL,
  NULL,
  'https://github.com/SpoonLabs/sorald',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('sorald', 'java'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('sorald', 'quality'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: OpenRewrite
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'openrewrite',
  'OpenRewrite',
  'fixer'::tool_type,
  'mvn rewrite:run -Drewrite.activeRecipes={recipe}',
  'text'::output_format,
  true,
  NULL,
  NULL,
  'https://docs.openrewrite.org/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('openrewrite', 'java'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('openrewrite', 'kotlin'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('openrewrite', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('openrewrite', 'style'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('openrewrite', 'dependency'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Ruff
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'ruff',
  'Ruff',
  'hybrid'::tool_type,
  'ruff check . --output-format json',
  'json'::output_format,
  true,
  'ruff check . --fix',
  NULL,
  'https://docs.astral.sh/ruff/',
  'https://docs.astral.sh/ruff/rules/{ruleId}',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('ruff', 'python'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('ruff', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('ruff', 'style'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('ruff', 'security'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Bandit
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'bandit',
  'Bandit',
  'analyzer'::tool_type,
  'bandit -r . -f json',
  'json'::output_format,
  false,
  NULL,
  NULL,
  'https://bandit.readthedocs.io/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('bandit', 'python'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('bandit', 'security'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Pylint
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'pylint',
  'Pylint',
  'analyzer'::tool_type,
  'pylint . --output-format=json',
  'json'::output_format,
  false,
  NULL,
  NULL,
  'https://pylint.pycqa.org/',
  'https://pylint.pycqa.org/en/latest/messages/{category}/{ruleId}.html',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('pylint', 'python'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('pylint', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('pylint', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Mypy
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'mypy',
  'Mypy',
  'analyzer'::tool_type,
  'mypy . --output json',
  'json'::output_format,
  false,
  NULL,
  NULL,
  'https://mypy.readthedocs.io/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('mypy', 'python'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('mypy', 'type-safety'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Black
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'black',
  'Black',
  'fixer'::tool_type,
  'black --check .',
  'text'::output_format,
  true,
  'black .',
  NULL,
  'https://black.readthedocs.io/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('black', 'python'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('black', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: isort
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'isort',
  'isort',
  'fixer'::tool_type,
  'isort --check-only .',
  'text'::output_format,
  true,
  'isort .',
  NULL,
  'https://pycqa.github.io/isort/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('isort', 'python'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('isort', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: autoflake
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'autoflake',
  'autoflake',
  'fixer'::tool_type,
  'autoflake --check .',
  'text'::output_format,
  true,
  'autoflake --in-place --remove-all-unused-imports --remove-unused-variables .',
  NULL,
  'https://github.com/PyCQA/autoflake',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('autoflake', 'python'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('autoflake', 'quality'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: pyupgrade
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'pyupgrade',
  'pyupgrade',
  'fixer'::tool_type,
  'pyupgrade --py3-plus *.py',
  'text'::output_format,
  true,
  NULL,
  NULL,
  'https://github.com/asottile/pyupgrade',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('pyupgrade', 'python'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('pyupgrade', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('pyupgrade', 'compatibility'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Safety
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'safety',
  'Safety',
  'analyzer'::tool_type,
  'safety check --json',
  'json'::output_format,
  false,
  NULL,
  NULL,
  'https://safetycli.com/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('safety', 'python'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('safety', 'dependency'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('safety', 'security'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: pip-audit
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'pip-audit',
  'pip-audit',
  'hybrid'::tool_type,
  'pip-audit --format json',
  'json'::output_format,
  true,
  'pip-audit --fix',
  NULL,
  'https://github.com/pypa/pip-audit',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('pip-audit', 'python'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('pip-audit', 'dependency'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('pip-audit', 'security'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: ESLint (JavaScript)
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'eslint-js',
  'ESLint (JavaScript)',
  'hybrid'::tool_type,
  'eslint . --format json --ext .js,.jsx,.mjs,.cjs',
  'json'::output_format,
  true,
  'eslint . --fix --ext .js,.jsx,.mjs,.cjs',
  NULL,
  'https://eslint.org/',
  'https://eslint.org/docs/rules/{ruleId}',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('eslint-js', 'javascript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('eslint-js', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('eslint-js', 'style'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('eslint-js', 'security'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Prettier (JavaScript)
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'prettier-js',
  'Prettier (JavaScript)',
  'fixer'::tool_type,
  'prettier --check "**/*.{js,jsx,mjs,cjs}"',
  'text'::output_format,
  true,
  'prettier --write "**/*.{js,jsx,mjs,cjs}"',
  NULL,
  'https://prettier.io/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('prettier-js', 'javascript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('prettier-js', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Biome (JavaScript)
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'biome-js',
  'Biome (JavaScript)',
  'hybrid'::tool_type,
  'biome check --files-ignore-unknown=true "**/*.{js,jsx,mjs,cjs}"',
  'json'::output_format,
  true,
  'biome check --apply "**/*.{js,jsx,mjs,cjs}"',
  NULL,
  'https://biomejs.dev/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('biome-js', 'javascript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('biome-js', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('biome-js', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: npm audit (JavaScript)
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'npm-audit-js',
  'npm audit (JavaScript)',
  'hybrid'::tool_type,
  'npm audit --json',
  'json'::output_format,
  true,
  'npm audit fix',
  NULL,
  'https://docs.npmjs.com/cli/v10/commands/npm-audit',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('npm-audit-js', 'javascript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('npm-audit-js', 'dependency'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('npm-audit-js', 'security'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: JSHint
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'jshint',
  'JSHint',
  'analyzer'::tool_type,
  'jshint . --reporter=json',
  'json'::output_format,
  false,
  NULL,
  NULL,
  'https://jshint.com/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('jshint', 'javascript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('jshint', 'quality'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: StandardJS
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'standardjs',
  'StandardJS',
  'hybrid'::tool_type,
  'standard --verbose | snazzy',
  'text'::output_format,
  true,
  'standard --fix',
  NULL,
  'https://standardjs.com/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('standardjs', 'javascript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('standardjs', 'style'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('standardjs', 'quality'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: ESLint (TypeScript)
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'eslint-ts',
  'ESLint (TypeScript)',
  'hybrid'::tool_type,
  'eslint . --format json --ext .ts,.tsx,.mts,.cts',
  'json'::output_format,
  true,
  'eslint . --fix --ext .ts,.tsx,.mts,.cts',
  NULL,
  'https://eslint.org/',
  'https://eslint.org/docs/rules/{ruleId}',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('eslint-ts', 'typescript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('eslint-ts', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('eslint-ts', 'style'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('eslint-ts', 'security'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: TypeScript-ESLint
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'typescript-eslint',
  'TypeScript-ESLint',
  'hybrid'::tool_type,
  'eslint . --format json --ext .ts,.tsx',
  'json'::output_format,
  true,
  'eslint . --fix --ext .ts,.tsx',
  NULL,
  'https://typescript-eslint.io/',
  'https://typescript-eslint.io/rules/{ruleId}',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('typescript-eslint', 'typescript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('typescript-eslint', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('typescript-eslint', 'type-safety'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Prettier (TypeScript)
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'prettier-ts',
  'Prettier (TypeScript)',
  'fixer'::tool_type,
  'prettier --check "**/*.{ts,tsx,mts,cts}"',
  'text'::output_format,
  true,
  'prettier --write "**/*.{ts,tsx,mts,cts}"',
  NULL,
  'https://prettier.io/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('prettier-ts', 'typescript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('prettier-ts', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Biome (TypeScript)
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'biome-ts',
  'Biome (TypeScript)',
  'hybrid'::tool_type,
  'biome check --files-ignore-unknown=true "**/*.{ts,tsx,mts,cts}"',
  'json'::output_format,
  true,
  'biome check --apply "**/*.{ts,tsx,mts,cts}"',
  NULL,
  'https://biomejs.dev/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('biome-ts', 'typescript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('biome-ts', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('biome-ts', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: npm audit (TypeScript)
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'npm-audit-ts',
  'npm audit (TypeScript)',
  'hybrid'::tool_type,
  'npm audit --json',
  'json'::output_format,
  true,
  'npm audit fix',
  NULL,
  'https://docs.npmjs.com/cli/v10/commands/npm-audit',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('npm-audit-ts', 'typescript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('npm-audit-ts', 'dependency'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('npm-audit-ts', 'security'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: TypeScript Compiler
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'tsc',
  'TypeScript Compiler',
  'analyzer'::tool_type,
  'tsc --noEmit',
  'text'::output_format,
  false,
  NULL,
  NULL,
  'https://www.typescriptlang.org/',
  'https://www.typescriptlang.org/docs/handbook/2/everyday-types.html',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('tsc', 'typescript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('tsc', 'type-safety'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('tsc', 'quality'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: ts-prune
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'ts-prune',
  'ts-prune',
  'analyzer'::tool_type,
  'ts-prune',
  'text'::output_format,
  false,
  NULL,
  NULL,
  'https://github.com/nadeesha/ts-prune',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('ts-prune', 'typescript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('ts-prune', 'quality'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Clippy
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'clippy',
  'Clippy',
  'hybrid'::tool_type,
  'cargo clippy --message-format=json',
  'json'::output_format,
  true,
  'cargo clippy --fix',
  NULL,
  'https://rust-lang.github.io/rust-clippy/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('clippy', 'rust'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('clippy', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('clippy', 'performance'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('clippy', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: rustfmt
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'rustfmt',
  'rustfmt',
  'fixer'::tool_type,
  'cargo fmt -- --check',
  'text'::output_format,
  true,
  'cargo fmt',
  NULL,
  'https://rust-lang.github.io/rustfmt/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('rustfmt', 'rust'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('rustfmt', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: cargo-audit
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'cargo-audit',
  'cargo-audit',
  'analyzer'::tool_type,
  'cargo audit --json',
  'json'::output_format,
  false,
  NULL,
  NULL,
  'https://rustsec.org/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('cargo-audit', 'rust'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('cargo-audit', 'dependency'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('cargo-audit', 'security'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: golangci-lint
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'golangci-lint',
  'golangci-lint',
  'hybrid'::tool_type,
  'golangci-lint run --out-format json',
  'json'::output_format,
  true,
  'golangci-lint run --fix',
  NULL,
  'https://golangci-lint.run/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('golangci-lint', 'go'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('golangci-lint', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('golangci-lint', 'security'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('golangci-lint', 'performance'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('golangci-lint', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: gosec
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'gosec',
  'gosec',
  'analyzer'::tool_type,
  'gosec -fmt json ./...',
  'json'::output_format,
  false,
  NULL,
  NULL,
  'https://securego.io/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('gosec', 'go'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('gosec', 'security'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: gofmt
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'gofmt',
  'gofmt',
  'fixer'::tool_type,
  'gofmt -l .',
  'text'::output_format,
  true,
  'gofmt -w .',
  NULL,
  'https://pkg.go.dev/cmd/gofmt',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('gofmt', 'go'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('gofmt', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: goimports
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'goimports',
  'goimports',
  'fixer'::tool_type,
  'goimports -l .',
  'text'::output_format,
  true,
  'goimports -w .',
  NULL,
  'https://pkg.go.dev/golang.org/x/tools/cmd/goimports',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('goimports', 'go'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('goimports', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Semgrep
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'semgrep',
  'Semgrep',
  'hybrid'::tool_type,
  'semgrep --config=auto --json .',
  'json'::output_format,
  true,
  'semgrep --config=auto --autofix .',
  NULL,
  'https://semgrep.dev/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('semgrep', 'java'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('semgrep', 'python'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('semgrep', 'javascript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('semgrep', 'typescript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('semgrep', 'go'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('semgrep', 'ruby'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('semgrep', 'php'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('semgrep', 'csharp'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('semgrep', 'rust'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('semgrep', 'kotlin'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('semgrep', 'swift'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('semgrep', 'c'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('semgrep', 'cpp'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('semgrep', 'security'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('semgrep', 'quality'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Gitleaks
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'gitleaks',
  'Gitleaks',
  'analyzer'::tool_type,
  'gitleaks detect --source . --format json',
  'json'::output_format,
  false,
  NULL,
  NULL,
  'https://gitleaks.io/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('gitleaks', 'java'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('gitleaks', 'python'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('gitleaks', 'javascript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('gitleaks', 'typescript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('gitleaks', 'go'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('gitleaks', 'ruby'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('gitleaks', 'php'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('gitleaks', 'csharp'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('gitleaks', 'rust'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('gitleaks', 'kotlin'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('gitleaks', 'swift'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('gitleaks', 'c'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('gitleaks', 'cpp'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('gitleaks', 'secrets'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('gitleaks', 'security'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Trivy
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'trivy',
  'Trivy',
  'analyzer'::tool_type,
  'trivy fs . --format json',
  'json'::output_format,
  false,
  NULL,
  NULL,
  'https://trivy.dev/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('trivy', 'java'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('trivy', 'python'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('trivy', 'javascript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('trivy', 'typescript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('trivy', 'go'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('trivy', 'ruby'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('trivy', 'php'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('trivy', 'rust'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('trivy', 'security'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('trivy', 'dependency'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Snyk
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'snyk',
  'Snyk',
  'hybrid'::tool_type,
  'snyk test --json',
  'json'::output_format,
  true,
  'snyk fix',
  NULL,
  'https://snyk.io/',
  NULL,
  false
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('snyk', 'java'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('snyk', 'python'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('snyk', 'javascript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('snyk', 'typescript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('snyk', 'go'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('snyk', 'ruby'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('snyk', 'php'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('snyk', 'csharp'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('snyk', 'security'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('snyk', 'dependency'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: OWASP Dependency-Check
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'dependency-check',
  'OWASP Dependency-Check',
  'analyzer'::tool_type,
  'dependency-check --scan . --format JSON',
  'json'::output_format,
  false,
  NULL,
  NULL,
  'https://owasp.org/www-project-dependency-check/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('dependency-check', 'java'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('dependency-check', 'javascript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('dependency-check', 'typescript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('dependency-check', 'python'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('dependency-check', 'ruby'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('dependency-check', 'php'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('dependency-check', 'dependency'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('dependency-check', 'security'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: RuboCop
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'rubocop',
  'RuboCop',
  'hybrid'::tool_type,
  'rubocop --format json',
  'json'::output_format,
  true,
  'rubocop -a',
  NULL,
  'https://rubocop.org/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('rubocop', 'ruby'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('rubocop', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('rubocop', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Brakeman
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'brakeman',
  'Brakeman',
  'analyzer'::tool_type,
  'brakeman -f json',
  'json'::output_format,
  false,
  NULL,
  NULL,
  'https://brakemanscanner.org/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('brakeman', 'ruby'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('brakeman', 'security'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: bundler-audit
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'bundler-audit',
  'bundler-audit',
  'hybrid'::tool_type,
  'bundle-audit check --format json',
  'json'::output_format,
  true,
  'bundle-audit update',
  NULL,
  'https://github.com/rubysec/bundler-audit',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('bundler-audit', 'ruby'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('bundler-audit', 'dependency'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('bundler-audit', 'security'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: PHP_CodeSniffer
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'phpcs',
  'PHP_CodeSniffer',
  'analyzer'::tool_type,
  'phpcs --report=json .',
  'json'::output_format,
  false,
  NULL,
  NULL,
  'https://github.com/squizlabs/PHP_CodeSniffer',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('phpcs', 'php'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('phpcs', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('phpcs', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: PHP Code Beautifier
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'phpcbf',
  'PHP Code Beautifier',
  'fixer'::tool_type,
  'phpcbf .',
  'text'::output_format,
  true,
  NULL,
  NULL,
  'https://github.com/squizlabs/PHP_CodeSniffer',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('phpcbf', 'php'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('phpcbf', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: PHPStan
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'phpstan',
  'PHPStan',
  'analyzer'::tool_type,
  'phpstan analyse --error-format=json .',
  'json'::output_format,
  false,
  NULL,
  NULL,
  'https://phpstan.org/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('phpstan', 'php'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('phpstan', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('phpstan', 'type-safety'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Psalm
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'psalm',
  'Psalm',
  'hybrid'::tool_type,
  'psalm --output-format=json',
  'json'::output_format,
  true,
  'psalm --alter --issues=all',
  NULL,
  'https://psalm.dev/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('psalm', 'php'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('psalm', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('psalm', 'type-safety'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('psalm', 'security'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: dotnet format
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'dotnet-format',
  'dotnet format',
  'fixer'::tool_type,
  'dotnet format --verify-no-changes',
  'text'::output_format,
  true,
  'dotnet format',
  NULL,
  'https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-format',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('dotnet-format', 'csharp'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('dotnet-format', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Roslyn Analyzers
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'roslyn-analyzers',
  'Roslyn Analyzers',
  'analyzer'::tool_type,
  'dotnet build /p:TreatWarningsAsErrors=false',
  'text'::output_format,
  false,
  NULL,
  NULL,
  'https://learn.microsoft.com/en-us/visualstudio/code-quality/roslyn-analyzers-overview',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('roslyn-analyzers', 'csharp'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('roslyn-analyzers', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('roslyn-analyzers', 'security'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: Cppcheck
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'cppcheck',
  'Cppcheck',
  'analyzer'::tool_type,
  'cppcheck --enable=all --xml .',
  'xml'::output_format,
  false,
  NULL,
  NULL,
  'https://cppcheck.sourceforge.io/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('cppcheck', 'c'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('cppcheck', 'cpp'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('cppcheck', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('cppcheck', 'security'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: clang-tidy
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'clang-tidy',
  'clang-tidy',
  'hybrid'::tool_type,
  'clang-tidy -checks=* .',
  'text'::output_format,
  true,
  'clang-tidy --fix -checks=* .',
  NULL,
  'https://clang.llvm.org/extra/clang-tidy/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('clang-tidy', 'c'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('clang-tidy', 'cpp'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('clang-tidy', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('clang-tidy', 'security'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('clang-tidy', 'performance'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: clang-format
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'clang-format',
  'clang-format',
  'fixer'::tool_type,
  'clang-format --dry-run .',
  'text'::output_format,
  true,
  'clang-format -i .',
  NULL,
  'https://clang.llvm.org/docs/ClangFormat.html',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('clang-format', 'c'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('clang-format', 'cpp'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('clang-format', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: SwiftLint
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'swiftlint',
  'SwiftLint',
  'hybrid'::tool_type,
  'swiftlint --reporter json',
  'json'::output_format,
  true,
  'swiftlint --fix',
  NULL,
  'https://realm.github.io/SwiftLint/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('swiftlint', 'swift'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('swiftlint', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('swiftlint', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: swift-format
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'swift-format',
  'swift-format',
  'fixer'::tool_type,
  'swift-format lint .',
  'text'::output_format,
  true,
  'swift-format format --in-place .',
  NULL,
  'https://github.com/apple/swift-format',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('swift-format', 'swift'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('swift-format', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: detekt
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'detekt',
  'detekt',
  'hybrid'::tool_type,
  'detekt --report json:detekt-report.json',
  'json'::output_format,
  true,
  'detekt --auto-correct',
  NULL,
  'https://detekt.dev/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('detekt', 'kotlin'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('detekt', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('detekt', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: ktlint
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'ktlint',
  'ktlint',
  'hybrid'::tool_type,
  'ktlint --reporter=json',
  'json'::output_format,
  true,
  'ktlint -F',
  NULL,
  'https://pinterest.github.io/ktlint/',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('ktlint', 'kotlin'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('ktlint', 'style'::tool_category) ON CONFLICT DO NOTHING;

-- Tool: AI Fixer (Tier 3)
INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, version, documentation_url, rule_doc_url_pattern, is_enabled)
VALUES (
  'ai',
  'AI Fixer (Tier 3)',
  'fixer'::tool_type,
  'codequal-ai-fix',
  'json'::output_format,
  true,
  'codequal-ai-fix --apply',
  NULL,
  'https://codequal.dev/docs/ai-fixer',
  NULL,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  command = EXCLUDED.command,
  output_format = EXCLUDED.output_format,
  has_native_fix = EXCLUDED.has_native_fix,
  native_fix_command = EXCLUDED.native_fix_command,
  version = EXCLUDED.version,
  documentation_url = EXCLUDED.documentation_url,
  rule_doc_url_pattern = EXCLUDED.rule_doc_url_pattern,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO tool_languages (tool_id, language) VALUES ('ai', 'java'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('ai', 'python'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('ai', 'javascript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('ai', 'typescript'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('ai', 'rust'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('ai', 'go'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('ai', 'csharp'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('ai', 'cpp'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('ai', 'c'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('ai', 'ruby'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('ai', 'php'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('ai', 'swift'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_languages (tool_id, language) VALUES ('ai', 'kotlin'::programming_language) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('ai', 'quality'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('ai', 'security'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('ai', 'performance'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('ai', 'style'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('ai', 'dependency'::tool_category) ON CONFLICT DO NOTHING;
INSERT INTO tool_categories (tool_id, category) VALUES ('ai', 'type-safety'::tool_category) ON CONFLICT DO NOTHING;

-- =============================================================================
-- SEED DATA: Fixer Mappings
-- =============================================================================

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'pmd',
  '.*',
  'sorald',
  '2'::fix_tier,
  75,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'checkstyle',
  '.*',
  'openrewrite',
  '2'::fix_tier,
  70,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'pylint',
  '(C|W|R)\d+',
  'ruff',
  '1'::fix_tier,
  85,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'ruff',
  '.*',
  'ruff',
  '1'::fix_tier,
  95,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'pylint',
  'W0611',
  'autoflake',
  '2'::fix_tier,
  95,
  'Unused imports'
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'pylint',
  'C0411',
  'isort',
  '1'::fix_tier,
  95,
  'Import order'
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'eslint-js',
  '.*',
  'eslint-js',
  '1'::fix_tier,
  90,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'jshint',
  '.*',
  'eslint-js',
  '2'::fix_tier,
  70,
  'JSHint issues often fixable by ESLint'
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'standardjs',
  '.*',
  'standardjs',
  '1'::fix_tier,
  95,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'eslint-ts',
  '.*',
  'eslint-ts',
  '1'::fix_tier,
  90,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'typescript-eslint',
  '.*',
  'typescript-eslint',
  '1'::fix_tier,
  85,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'typescript-eslint',
  '@typescript-eslint/.*',
  'typescript-eslint',
  '1'::fix_tier,
  90,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'tsc',
  'TS\d+',
  'ai',
  '3'::fix_tier,
  60,
  'Type errors need AI'
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'ts-prune',
  '.*',
  'ai',
  '3'::fix_tier,
  50,
  'Unused exports need manual review'
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'clippy',
  '.*',
  'clippy',
  '1'::fix_tier,
  85,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'golangci-lint',
  '.*',
  'golangci-lint',
  '1'::fix_tier,
  80,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'gosec',
  '.*',
  'ai',
  '3'::fix_tier,
  60,
  'Security issues need review'
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'rubocop',
  '.*',
  'rubocop',
  '1'::fix_tier,
  85,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'phpcs',
  '.*',
  'phpcbf',
  '2'::fix_tier,
  80,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'psalm',
  '.*',
  'psalm',
  '1'::fix_tier,
  75,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'cppcheck',
  '.*',
  'clang-tidy',
  '2'::fix_tier,
  70,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'clang-tidy',
  '.*',
  'clang-tidy',
  '1'::fix_tier,
  85,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'swiftlint',
  '.*',
  'swiftlint',
  '1'::fix_tier,
  85,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'detekt',
  '.*',
  'detekt',
  '1'::fix_tier,
  80,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'ktlint',
  '.*',
  'ktlint',
  '1'::fix_tier,
  90,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'semgrep',
  '.*',
  'semgrep',
  '1'::fix_tier,
  70,
  'Autofix available for some rules'
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'npm-audit-js',
  '.*',
  'npm-audit-js',
  '1'::fix_tier,
  60,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'npm-audit-ts',
  '.*',
  'npm-audit-ts',
  '1'::fix_tier,
  60,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'safety',
  '.*',
  'ai',
  '3'::fix_tier,
  50,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'cargo-audit',
  '.*',
  'ai',
  '3'::fix_tier,
  50,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'bundler-audit',
  '.*',
  'bundler-audit',
  '2'::fix_tier,
  60,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO fixer_mappings (analyzer_tool_id, rule_pattern, fixer_tool_id, fix_tier, confidence, notes)
VALUES (
  'gitleaks',
  '.*',
  'ai',
  '3'::fix_tier,
  30,
  'Secrets need careful manual review'
) ON CONFLICT DO NOTHING;

-- Verify counts
SELECT
  (SELECT COUNT(*) FROM tools) as tools_count,
  (SELECT COUNT(*) FROM tool_languages) as tool_languages_count,
  (SELECT COUNT(*) FROM tool_categories) as tool_categories_count,
  (SELECT COUNT(*) FROM fixer_mappings) as fixer_mappings_count;

COMMIT;

