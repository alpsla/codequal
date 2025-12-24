-- ============================================================================
-- P0/P1/P2 Tools Migration - Session 59
-- Date: 2025-12-19
-- Purpose: Add critical security, API/GraphQL, and architecture tools
-- ============================================================================

-- ============================================================================
-- P0 CRITICAL SECURITY TOOLS
-- ============================================================================

-- Gitleaks - Secret Detection
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, github_repo, current_version, categories, command_template, output_format)
VALUES
('gitleaks', 'Gitleaks', 'Secret and credential detection in code',
 ARRAY['java', 'python', 'typescript', 'javascript', 'go', 'rust', 'ruby', 'php', 'csharp'],
 'github', 'gitleaks', 'gitleaks/gitleaks', '8.18.0',
 ARRAY['secrets', 'security'],
 'gitleaks detect --source {source} --format json', 'json')
ON CONFLICT (tool_id) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- TruffleHog - Secret Detection
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, github_repo, current_version, categories, command_template, output_format)
VALUES
('trufflehog', 'TruffleHog', 'High-sensitivity secret detection with verification',
 ARRAY['java', 'python', 'typescript', 'javascript', 'go', 'rust', 'ruby', 'php', 'csharp'],
 'github', 'trufflehog', 'trufflesecurity/trufflehog', '3.63.0',
 ARRAY['secrets', 'security'],
 'trufflehog filesystem {source} --json', 'json')
ON CONFLICT (tool_id) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- Checkov - IaC Security
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, current_version, categories, command_template, output_format)
VALUES
('checkov', 'Checkov', 'Infrastructure as Code security scanner (Terraform, K8s, Docker)',
 ARRAY['java', 'python', 'typescript', 'javascript', 'go', 'rust', 'ruby', 'php', 'csharp'],
 'pypi', 'checkov', '3.1.0',
 ARRAY['iac_security', 'security'],
 'checkov -d {source} --output json', 'json')
ON CONFLICT (tool_id) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- Trivy - Container/Image Security
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, github_repo, current_version, categories, command_template, output_format)
VALUES
('trivy', 'Trivy', 'Container vulnerability scanner (images, filesystems, IaC)',
 ARRAY['java', 'python', 'typescript', 'javascript', 'go', 'rust', 'ruby', 'php'],
 'github', 'trivy', 'aquasecurity/trivy', '0.48.0',
 ARRAY['container_security', 'security', 'dependencies'],
 'trivy fs {source} --format json', 'json')
ON CONFLICT (tool_id) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- Grype - SBOM Vulnerability Scanner
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, github_repo, current_version, categories, command_template, output_format)
VALUES
('grype', 'Grype', 'SBOM-based vulnerability scanner for containers',
 ARRAY['java', 'python', 'typescript', 'javascript', 'go', 'rust', 'ruby', 'php'],
 'github', 'grype', 'anchore/grype', '0.74.0',
 ARRAY['container_security', 'security', 'dependencies'],
 'grype dir:{source} -o json', 'json')
ON CONFLICT (tool_id) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- ============================================================================
-- P1 API/GRAPHQL TOOLS
-- ============================================================================

-- Spectral - API Schema Linting
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, current_version, categories, command_template, output_format)
VALUES
('spectral', 'Spectral', 'OpenAPI and AsyncAPI schema linter',
 ARRAY['typescript', 'javascript', 'java', 'python', 'go', 'ruby', 'php'],
 'npm', '@stoplight/spectral-cli', '6.11.0',
 ARRAY['api_design', 'code_quality'],
 'spectral lint {source} --format json', 'json')
ON CONFLICT (tool_id) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- GraphQL-Cop - GraphQL Security
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, github_repo, current_version, categories, command_template, output_format)
VALUES
('graphql-cop', 'GraphQL-Cop', 'GraphQL security audit tool',
 ARRAY['typescript', 'javascript', 'java', 'python', 'go', 'ruby'],
 'github', 'graphql-cop', 'dolevf/graphql-cop', '1.13.0',
 ARRAY['graphql_security', 'security'],
 'graphql-cop -t {endpoint}', 'json')
ON CONFLICT (tool_id) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- ============================================================================
-- P2 ARCHITECTURE TOOLS
-- ============================================================================

-- JDepend - Java Architecture
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, group_id, artifact_id, current_version, categories, command_template, output_format)
VALUES
('jdepend', 'JDepend', 'Java package dependency analyzer',
 ARRAY['java'],
 'maven', 'jdepend', 'jdepend', 'jdepend', '2.10',
 ARRAY['architecture'],
 'jdepend -xml {source}', 'xml')
ON CONFLICT (tool_id) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- pydeps - Python Architecture
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, current_version, categories, command_template, output_format)
VALUES
('pydeps', 'pydeps', 'Python dependency graph generator',
 ARRAY['python'],
 'pypi', 'pydeps', '1.12.0',
 ARRAY['architecture'],
 'pydeps {source} --show-deps --no-show', 'json')
ON CONFLICT (tool_id) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- import-linter - Python Architecture
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, current_version, categories, command_template, output_format)
VALUES
('import-linter', 'Import Linter', 'Python import contract enforcement',
 ARRAY['python'],
 'pypi', 'import-linter', '2.0.0',
 ARRAY['architecture'],
 'lint-imports', 'text')
ON CONFLICT (tool_id) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- Madge - TypeScript/JS Architecture
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, current_version, categories, command_template, output_format)
VALUES
('madge', 'Madge', 'JavaScript/TypeScript circular dependency detector',
 ARRAY['typescript', 'javascript'],
 'npm', 'madge', '6.1.0',
 ARRAY['architecture'],
 'madge --circular --json {source}', 'json')
ON CONFLICT (tool_id) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- Dependency Cruiser - TypeScript/JS Architecture
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, current_version, categories, command_template, output_format)
VALUES
('dependency-cruiser', 'Dependency Cruiser', 'JavaScript/TypeScript architecture rule validator',
 ARRAY['typescript', 'javascript'],
 'npm', 'dependency-cruiser', '16.0.0',
 ARRAY['architecture'],
 'depcruise --output-type json {source}', 'json')
ON CONFLICT (tool_id) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- ts-unused-exports - TypeScript Architecture
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, current_version, categories, command_template, output_format)
VALUES
('ts-unused-exports', 'ts-unused-exports', 'Find unused TypeScript exports',
 ARRAY['typescript'],
 'npm', 'ts-unused-exports', '10.0.0',
 ARRAY['architecture', 'unused_code'],
 'ts-unused-exports tsconfig.json --excludePathsFromReport=node_modules', 'text')
ON CONFLICT (tool_id) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- go-arch-lint - Go Architecture
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, github_repo, current_version, categories, command_template, output_format)
VALUES
('go-arch-lint', 'go-arch-lint', 'Go architecture linter',
 ARRAY['go'],
 'github', 'go-arch-lint', 'fe3dback/go-arch-lint', '1.1.0',
 ARRAY['architecture'],
 'go-arch-lint check --project-path {source}', 'json')
ON CONFLICT (tool_id) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- cargo-modules - Rust Architecture
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, github_repo, current_version, categories, command_template, output_format)
VALUES
('cargo-modules', 'cargo-modules', 'Rust module dependency analyzer',
 ARRAY['rust'],
 'github', 'cargo-modules', 'regber/cargo-modules', '0.10.0',
 ARRAY['architecture'],
 'cargo modules structure --json', 'json')
ON CONFLICT (tool_id) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- Packwerk - Ruby Architecture
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, github_repo, current_version, categories, command_template, output_format)
VALUES
('packwerk', 'Packwerk', 'Ruby/Rails package boundary enforcer',
 ARRAY['ruby'],
 'github', 'packwerk', 'Shopify/packwerk', '3.1.0',
 ARRAY['architecture'],
 'packwerk check', 'text')
ON CONFLICT (tool_id) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- Deptrac - PHP Architecture
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, github_repo, current_version, categories, command_template, output_format)
VALUES
('deptrac', 'Deptrac', 'PHP layer dependency analyzer',
 ARRAY['php'],
 'github', 'deptrac', 'qossmic/deptrac', '1.0.0',
 ARRAY['architecture'],
 'deptrac analyse --report-uncovered --formatter json', 'json')
ON CONFLICT (tool_id) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- ============================================================================
-- FIXER TOOLS FOR P0/P1/P2 (AI only - recommendation mode)
-- ============================================================================

-- Note: P0/P1/P2 tools don't have dedicated fixers - they use AI recommendations
-- The existing ai-fixer tool handles these through the recommendation system

-- Update AI Fixer to include new categories
UPDATE fixer_tools
SET categories = ARRAY['security', 'bugs', 'code_quality', 'type_errors', 'secrets', 'iac_security', 'container_security', 'graphql_security', 'api_design', 'architecture'],
    languages = ARRAY['java', 'typescript', 'javascript', 'python', 'go', 'rust', 'ruby', 'php', 'csharp'],
    updated_at = NOW()
WHERE tool_id = 'ai-fixer';

-- ============================================================================
-- RULE TO FIXER MAPPINGS FOR P0/P1/P2
-- All route to AI fixer with low confidence (recommendation only)
-- ============================================================================

-- P0: Secret Detection → AI (recommendation only, must rotate secrets manually)
INSERT INTO rule_to_fixer_mappings (validator_tool_id, rule_id, rule_pattern, fixer_tool_id, confidence, issue_type, safe_for_auto_apply, notes)
VALUES
('gitleaks', 'generic-api-key', '.*', NULL, 0, 'secrets', false, 'Secrets must be rotated manually - recommendation only'),
('trufflehog', 'detector.*', '.*', NULL, 0, 'secrets', false, 'Secrets must be rotated manually - recommendation only')
ON CONFLICT (validator_tool_id, rule_id) DO UPDATE SET
  confidence = EXCLUDED.confidence,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- P0: IaC Security → AI (recommendation only)
INSERT INTO rule_to_fixer_mappings (validator_tool_id, rule_id, rule_pattern, fixer_tool_id, confidence, issue_type, safe_for_auto_apply, notes)
VALUES
('checkov', 'CKV_*', 'CKV_.*', NULL, 30, 'iac_security', false, 'IaC changes require careful review - recommendation only')
ON CONFLICT (validator_tool_id, rule_id) DO UPDATE SET
  confidence = EXCLUDED.confidence,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- P0: Container Security → AI (recommendation only)
INSERT INTO rule_to_fixer_mappings (validator_tool_id, rule_id, rule_pattern, fixer_tool_id, confidence, issue_type, safe_for_auto_apply, notes)
VALUES
('trivy', 'CVE-*', 'CVE-.*', NULL, 40, 'container_security', false, 'Container updates require compatibility testing'),
('grype', 'CVE-*', 'CVE-.*', NULL, 40, 'container_security', false, 'Container updates require compatibility testing')
ON CONFLICT (validator_tool_id, rule_id) DO UPDATE SET
  confidence = EXCLUDED.confidence,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- P1: API Design → AI (recommendation only)
INSERT INTO rule_to_fixer_mappings (validator_tool_id, rule_id, rule_pattern, fixer_tool_id, confidence, issue_type, safe_for_auto_apply, notes)
VALUES
('spectral', 'oas3-schema', '.*', NULL, 50, 'api_design', false, 'API schema changes need design consideration'),
('graphql-cop', 'security-*', '.*', NULL, 40, 'graphql_security', false, 'GraphQL security requires server-side changes')
ON CONFLICT (validator_tool_id, rule_id) DO UPDATE SET
  confidence = EXCLUDED.confidence,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- P2: Architecture → AI (recommendation only)
INSERT INTO rule_to_fixer_mappings (validator_tool_id, rule_id, rule_pattern, fixer_tool_id, confidence, issue_type, safe_for_auto_apply, notes)
VALUES
('jdepend', 'circular-dependency', '.*', NULL, 20, 'architecture', false, 'Circular dependencies require structural refactoring'),
('pydeps', 'circular-import', '.*', NULL, 25, 'architecture', false, 'Circular imports require module restructuring'),
('import-linter', 'layer-violation', '.*', NULL, 20, 'architecture', false, 'Layer violations require architecture refactoring'),
('madge', 'circular', '.*', NULL, 20, 'architecture', false, 'Circular dependencies require structural changes'),
('dependency-cruiser', 'no-circular', '.*', NULL, 25, 'architecture', false, 'Architecture rule violations need design changes'),
('ts-unused-exports', 'unused-export', '.*', NULL, 60, 'unused_code', false, 'Dead code removal may break external consumers'),
('go-arch-lint', 'violation', '.*', NULL, 20, 'architecture', false, 'Go architecture violations need design changes'),
('cargo-modules', 'circular', '.*', NULL, 25, 'architecture', false, 'Rust circular dependencies need restructuring'),
('packwerk', 'boundary-violation', '.*', NULL, 30, 'architecture', false, 'Ruby boundary violations need package restructuring'),
('deptrac', 'layer-violation', '.*', NULL, 25, 'architecture', false, 'PHP layer violations need architecture refactoring')
ON CONFLICT (validator_tool_id, rule_id) DO UPDATE SET
  confidence = EXCLUDED.confidence,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- ============================================================================
-- VERIFICATION QUERY
-- Run this to verify all tools were added correctly
-- ============================================================================
-- SELECT tool_id, name, categories FROM validator_tools
-- WHERE tool_id IN ('gitleaks', 'trufflehog', 'checkov', 'trivy', 'grype',
--                   'spectral', 'graphql-cop', 'jdepend', 'pydeps', 'import-linter',
--                   'madge', 'dependency-cruiser', 'ts-unused-exports')
-- ORDER BY tool_id;
