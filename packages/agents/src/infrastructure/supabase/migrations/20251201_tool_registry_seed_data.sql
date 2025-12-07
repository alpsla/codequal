-- ============================================================================
-- Tool Registry Seed Data
-- Languages: Java, TypeScript, JavaScript, Python, Go, Rust
-- ============================================================================

-- ============================================================================
-- VALIDATOR TOOLS
-- ============================================================================

-- Java Validators
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, group_id, artifact_id, current_version, categories, command_template, output_format)
VALUES
('pmd', 'PMD', 'Java source code analyzer for bugs and bad practices', ARRAY['java'], 'maven', 'pmd-core', 'net.sourceforge.pmd', 'pmd-core', '7.0.0', ARRAY['bugs', 'code_quality', 'best_practices'], 'pmd check -d {source} -R rulesets/java/quickstart.xml -f json', 'json'),
('checkstyle', 'Checkstyle', 'Java code style checker', ARRAY['java'], 'maven', 'checkstyle', 'com.puppycrawl.tools', 'checkstyle', '10.12.0', ARRAY['style', 'formatting'], 'java -jar checkstyle.jar -c /google_checks.xml -f json {files}', 'json'),
('spotbugs', 'SpotBugs', 'Static analysis for Java bugs', ARRAY['java'], 'maven', 'spotbugs', 'com.github.spotbugs', 'spotbugs', '4.8.0', ARRAY['bugs', 'security'], 'spotbugs -xml {files}', 'xml'),
('semgrep-java', 'Semgrep (Java)', 'Security and code quality for Java', ARRAY['java'], 'github', 'semgrep', NULL, NULL, '1.45.0', ARRAY['security', 'bugs'], 'semgrep scan --config auto --lang java --json {files}', 'json');

-- TypeScript Validators
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, current_version, categories, command_template, output_format)
VALUES
('typescript', 'TypeScript Compiler', 'TypeScript type checker', ARRAY['typescript'], 'npm', 'typescript', '5.3.0', ARRAY['type_errors'], 'tsc --noEmit --pretty false', 'text'),
('eslint-ts', 'ESLint (TypeScript)', 'Linter for TypeScript', ARRAY['typescript', 'javascript'], 'npm', 'eslint', '8.56.0', ARRAY['style', 'code_quality', 'bugs'], 'eslint --format json {files}', 'json'),
('biome', 'Biome', 'Fast linter and formatter for TS/JS', ARRAY['typescript', 'javascript'], 'npm', '@biomejs/biome', '1.4.0', ARRAY['style', 'code_quality', 'formatting'], 'biome lint --reporter json {files}', 'json'),
('semgrep-ts', 'Semgrep (TypeScript)', 'Security scanner for TypeScript', ARRAY['typescript', 'javascript'], 'github', 'semgrep', '1.45.0', ARRAY['security'], 'semgrep scan --config auto --lang typescript --json {files}', 'json');

-- JavaScript Validators
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, current_version, categories, command_template, output_format)
VALUES
('eslint', 'ESLint', 'JavaScript linter', ARRAY['javascript'], 'npm', 'eslint', '8.56.0', ARRAY['style', 'code_quality', 'bugs', 'best_practices'], 'eslint --format json {files}', 'json'),
('prettier-check', 'Prettier (Check)', 'Code formatter checker', ARRAY['javascript', 'typescript'], 'npm', 'prettier', '3.1.0', ARRAY['formatting'], 'prettier --check {files}', 'text'),
('semgrep-js', 'Semgrep (JavaScript)', 'Security scanner for JavaScript', ARRAY['javascript'], 'github', 'semgrep', '1.45.0', ARRAY['security'], 'semgrep scan --config auto --lang javascript --json {files}', 'json');

-- Python Validators
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, current_version, categories, command_template, output_format)
VALUES
('ruff-check', 'Ruff', 'Fast Python linter', ARRAY['python'], 'pypi', 'ruff', '0.1.8', ARRAY['style', 'code_quality', 'imports', 'bugs'], 'ruff check --output-format json {files}', 'json'),
('mypy', 'MyPy', 'Python type checker', ARRAY['python'], 'pypi', 'mypy', '1.7.0', ARRAY['type_errors'], 'mypy --output json {files}', 'json'),
('bandit', 'Bandit', 'Python security linter', ARRAY['python'], 'pypi', 'bandit', '1.7.6', ARRAY['security'], 'bandit -r -f json {files}', 'json'),
('pylint', 'Pylint', 'Python code analyzer', ARRAY['python'], 'pypi', 'pylint', '3.0.0', ARRAY['code_quality', 'bugs', 'best_practices'], 'pylint --output-format=json {files}', 'json'),
('semgrep-py', 'Semgrep (Python)', 'Security scanner for Python', ARRAY['python'], 'github', 'semgrep', '1.45.0', ARRAY['security'], 'semgrep scan --config auto --lang python --json {files}', 'json');

-- Go Validators
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, github_repo, current_version, categories, command_template, output_format)
VALUES
('golangci-lint-check', 'golangci-lint', 'Go meta-linter', ARRAY['go'], 'github', 'golangci-lint', 'golangci/golangci-lint', '1.55.0', ARRAY['style', 'code_quality', 'bugs', 'performance'], 'golangci-lint run --out-format json {files}', 'json'),
('gosec', 'gosec', 'Go security checker', ARRAY['go'], 'github', 'gosec', 'securego/gosec', '2.18.0', ARRAY['security'], 'gosec -fmt json {files}', 'json'),
('staticcheck', 'staticcheck', 'Go static analyzer', ARRAY['go'], 'github', 'staticcheck', 'dominikh/go-tools', '2023.1.6', ARRAY['bugs', 'code_quality'], 'staticcheck -f json {files}', 'json'),
('semgrep-go', 'Semgrep (Go)', 'Security scanner for Go', ARRAY['go'], 'github', 'semgrep', '1.45.0', ARRAY['security'], 'semgrep scan --config auto --lang go --json {files}', 'json');

-- Rust Validators
INSERT INTO validator_tools (tool_id, name, description, languages, registry, package_name, github_repo, current_version, categories, command_template, output_format)
VALUES
('clippy', 'Clippy', 'Rust linter', ARRAY['rust'], 'github', 'rust-clippy', 'rust-lang/rust-clippy', '0.1.75', ARRAY['style', 'code_quality', 'bugs', 'performance'], 'cargo clippy --message-format json', 'json'),
('cargo-audit', 'cargo-audit', 'Rust dependency auditor', ARRAY['rust'], 'github', 'cargo-audit', 'rustsec/rustsec', '0.18.0', ARRAY['security', 'dependencies'], 'cargo audit --json', 'json'),
('semgrep-rust', 'Semgrep (Rust)', 'Security scanner for Rust', ARRAY['rust'], 'github', 'semgrep', '1.45.0', ARRAY['security'], 'semgrep scan --config auto --lang rust --json {files}', 'json');

-- ============================================================================
-- FIXER TOOLS
-- ============================================================================

-- Java Fixers
INSERT INTO fixer_tools (tool_id, name, description, languages, registry, package_name, group_id, artifact_id, current_version, fix_type, fix_command, base_confidence, safe_for_auto_apply, requires_review, categories, execution_speed)
VALUES
('sorald', 'Sorald', 'Automatic repair for SonarJava violations', ARRAY['java'], 'maven', 'sorald', 'se.kth.castor', 'sorald', '0.8.0', 'dedicated', 'java -jar sorald.jar repair --source {source} --rule-key {ruleKey}', 70, false, true, ARRAY['bugs', 'code_quality'], 'slow'),
('google-java-format', 'Google Java Format', 'Java code formatter', ARRAY['java'], 'maven', 'google-java-format', 'com.google.googlejavaformat', 'google-java-format', '1.18.0', 'native', 'java -jar google-java-format.jar --replace {files}', 95, true, false, ARRAY['formatting'], 'medium'),
('semgrep-fix-java', 'Semgrep Autofix (Java)', 'Semgrep autofix for Java', ARRAY['java'], 'github', 'semgrep', NULL, NULL, '1.45.0', 'native', 'semgrep scan --config auto --lang java --autofix {files}', 75, false, true, ARRAY['security'], 'slow');

-- TypeScript Fixers
INSERT INTO fixer_tools (tool_id, name, description, languages, registry, package_name, current_version, fix_type, fix_command, base_confidence, safe_for_auto_apply, requires_review, categories, execution_speed)
VALUES
('eslint-fix-ts', 'ESLint --fix (TypeScript)', 'ESLint autofix for TypeScript', ARRAY['typescript', 'javascript'], 'npm', 'eslint', '8.56.0', 'native', 'eslint --fix {files}', 90, true, false, ARRAY['style', 'code_quality', 'bugs'], 'medium'),
('prettier', 'Prettier', 'Code formatter', ARRAY['typescript', 'javascript'], 'npm', 'prettier', '3.1.0', 'native', 'prettier --write {files}', 99, true, false, ARRAY['formatting'], 'fast'),
('biome-fix', 'Biome Fix', 'Biome autofix', ARRAY['typescript', 'javascript'], 'npm', '@biomejs/biome', '1.4.0', 'native', 'biome check --apply {files}', 92, true, false, ARRAY['style', 'code_quality', 'formatting'], 'fast'),
('semgrep-fix-ts', 'Semgrep Autofix (TypeScript)', 'Semgrep autofix for TypeScript', ARRAY['typescript', 'javascript'], 'github', 'semgrep', '1.45.0', 'native', 'semgrep scan --config auto --lang typescript --autofix {files}', 75, false, true, ARRAY['security'], 'slow');

-- JavaScript Fixers
INSERT INTO fixer_tools (tool_id, name, description, languages, registry, package_name, current_version, fix_type, fix_command, base_confidence, safe_for_auto_apply, requires_review, categories, execution_speed)
VALUES
('eslint-fix', 'ESLint --fix', 'ESLint autofix for JavaScript', ARRAY['javascript'], 'npm', 'eslint', '8.56.0', 'native', 'eslint --fix {files}', 90, true, false, ARRAY['style', 'code_quality', 'bugs'], 'medium'),
('semgrep-fix-js', 'Semgrep Autofix (JavaScript)', 'Semgrep autofix for JavaScript', ARRAY['javascript'], 'github', 'semgrep', '1.45.0', 'native', 'semgrep scan --config auto --lang javascript --autofix {files}', 75, false, true, ARRAY['security'], 'slow');

-- Python Fixers
INSERT INTO fixer_tools (tool_id, name, description, languages, registry, package_name, current_version, fix_type, fix_command, base_confidence, safe_for_auto_apply, requires_review, categories, execution_speed)
VALUES
('ruff-fix', 'Ruff --fix', 'Ruff autofix', ARRAY['python'], 'pypi', 'ruff', '0.1.8', 'native', 'ruff check --fix {files}', 90, true, false, ARRAY['style', 'code_quality', 'imports'], 'fast'),
('ruff-format', 'Ruff format', 'Ruff code formatter', ARRAY['python'], 'pypi', 'ruff', '0.1.8', 'native', 'ruff format {files}', 99, true, false, ARRAY['formatting'], 'fast'),
('black', 'Black', 'Python code formatter', ARRAY['python'], 'pypi', 'black', '23.12.0', 'native', 'black {files}', 99, true, false, ARRAY['formatting'], 'fast'),
('isort', 'isort', 'Python import sorter', ARRAY['python'], 'pypi', 'isort', '5.13.0', 'native', 'isort {files}', 98, true, false, ARRAY['imports'], 'fast'),
('autoflake', 'autoflake', 'Remove unused imports/variables', ARRAY['python'], 'pypi', 'autoflake', '2.2.1', 'native', 'autoflake --in-place --remove-all-unused-imports {files}', 92, true, false, ARRAY['unused_code', 'imports'], 'fast'),
('pyupgrade', 'pyupgrade', 'Python syntax upgrader', ARRAY['python'], 'pypi', 'pyupgrade', '3.15.0', 'dedicated', 'pyupgrade --py39-plus {files}', 88, true, false, ARRAY['modernization'], 'fast'),
('semgrep-fix-py', 'Semgrep Autofix (Python)', 'Semgrep autofix for Python', ARRAY['python'], 'github', 'semgrep', '1.45.0', 'native', 'semgrep scan --config auto --lang python --autofix {files}', 75, false, true, ARRAY['security'], 'slow');

-- Go Fixers
INSERT INTO fixer_tools (tool_id, name, description, languages, registry, package_name, github_repo, current_version, fix_type, fix_command, base_confidence, safe_for_auto_apply, requires_review, categories, execution_speed)
VALUES
('gofmt', 'gofmt', 'Go code formatter', ARRAY['go'], 'binary', 'gofmt', NULL, 'builtin', 'native', 'gofmt -w {files}', 99, true, false, ARRAY['formatting'], 'fast'),
('goimports', 'goimports', 'Go import formatter', ARRAY['go'], 'github', 'goimports', 'golang/tools', 'latest', 'native', 'goimports -w {files}', 98, true, false, ARRAY['imports', 'formatting'], 'fast'),
('golangci-lint-fix', 'golangci-lint --fix', 'golangci-lint autofix', ARRAY['go'], 'github', 'golangci-lint', 'golangci/golangci-lint', '1.55.0', 'native', 'golangci-lint run --fix {files}', 85, true, false, ARRAY['style', 'code_quality'], 'medium'),
('semgrep-fix-go', 'Semgrep Autofix (Go)', 'Semgrep autofix for Go', ARRAY['go'], 'github', 'semgrep', '1.45.0', 'native', 'semgrep scan --config auto --lang go --autofix {files}', 75, false, true, ARRAY['security'], 'slow');

-- Rust Fixers
INSERT INTO fixer_tools (tool_id, name, description, languages, registry, package_name, github_repo, current_version, fix_type, fix_command, base_confidence, safe_for_auto_apply, requires_review, categories, execution_speed)
VALUES
('rustfmt', 'rustfmt', 'Rust code formatter', ARRAY['rust'], 'binary', 'rustfmt', NULL, 'builtin', 'native', 'rustfmt {files}', 99, true, false, ARRAY['formatting'], 'fast'),
('clippy-fix', 'Clippy --fix', 'Clippy autofix', ARRAY['rust'], 'github', 'rust-clippy', 'rust-lang/rust-clippy', '0.1.75', 'native', 'cargo clippy --fix --allow-dirty', 80, false, true, ARRAY['style', 'code_quality', 'bugs'], 'slow'),
('semgrep-fix-rust', 'Semgrep Autofix (Rust)', 'Semgrep autofix for Rust', ARRAY['rust'], 'github', 'semgrep', '1.45.0', 'native', 'semgrep scan --config auto --lang rust --autofix {files}', 75, false, true, ARRAY['security'], 'slow');

-- AI Fixer (Universal fallback)
INSERT INTO fixer_tools (tool_id, name, description, languages, registry, package_name, current_version, fix_type, fix_command, base_confidence, safe_for_auto_apply, requires_review, categories, execution_speed)
VALUES
('ai-fixer', 'AI Fixer', 'AI-powered code fixer using Claude/GPT', ARRAY['java', 'typescript', 'javascript', 'python', 'go', 'rust'], 'api', 'ai-fixer', '1.0.0', 'ai', NULL, 55, false, true, ARRAY['security', 'bugs', 'code_quality', 'type_errors'], 'slow');

-- ============================================================================
-- RULE TO FIXER MAPPINGS
-- Maps specific rules from validators to fixers with confidence levels
-- ============================================================================

-- ESLint -> ESLint --fix (High confidence)
INSERT INTO rule_to_fixer_mappings (validator_tool_id, rule_id, fixer_tool_id, confidence, issue_type, safe_for_auto_apply, notes)
VALUES
('eslint', 'no-unused-vars', 'eslint-fix', 85, 'unused_code', true, 'ESLint can auto-remove unused vars'),
('eslint', 'semi', 'eslint-fix', 99, 'style', true, 'Safe semicolon fix'),
('eslint', 'quotes', 'eslint-fix', 99, 'style', true, 'Safe quote style fix'),
('eslint', 'indent', 'eslint-fix', 99, 'style', true, 'Safe indentation fix'),
('eslint', 'eqeqeq', 'eslint-fix', 90, 'bugs', true, '=== instead of =='),
('eslint', 'prefer-const', 'eslint-fix', 95, 'code_quality', true, 'let to const conversion'),
('eslint', 'no-var', 'eslint-fix', 95, 'code_quality', true, 'var to let/const conversion'),
('eslint', 'arrow-body-style', 'eslint-fix', 90, 'style', true, 'Arrow function body style'),
('eslint', 'object-shorthand', 'eslint-fix', 90, 'style', true, 'Object property shorthand'),
('eslint', '@typescript-eslint/no-unused-vars', 'eslint-fix-ts', 85, 'unused_code', true, 'TypeScript unused vars');

-- TypeScript ESLint -> ESLint --fix
INSERT INTO rule_to_fixer_mappings (validator_tool_id, rule_id, fixer_tool_id, confidence, issue_type, safe_for_auto_apply, notes)
VALUES
('eslint-ts', 'no-unused-vars', 'eslint-fix-ts', 85, 'unused_code', true, NULL),
('eslint-ts', '@typescript-eslint/no-explicit-any', NULL, 45, 'type_errors', false, 'Requires AI - needs type inference'),
('eslint-ts', '@typescript-eslint/explicit-function-return-type', NULL, 50, 'type_errors', false, 'Requires AI - needs type inference');

-- TypeScript Compiler -> AI Fixer (Low confidence - type errors need context)
INSERT INTO rule_to_fixer_mappings (validator_tool_id, rule_id, rule_pattern, fixer_tool_id, confidence, issue_type, safe_for_auto_apply, notes)
VALUES
('typescript', 'TS2345', '^TS2[0-9]+', NULL, 40, 'type_errors', false, 'Type mismatch - needs AI with context'),
('typescript', 'TS2322', '^TS2[0-9]+', NULL, 40, 'type_errors', false, 'Type assignment error - needs AI'),
('typescript', 'TS6306', NULL, NULL, 30, 'type_errors', false, 'Project reference errors - complex fix');

-- Ruff -> Ruff --fix (High confidence)
INSERT INTO rule_to_fixer_mappings (validator_tool_id, rule_id, fixer_tool_id, confidence, issue_type, safe_for_auto_apply, notes)
VALUES
('ruff-check', 'F401', 'ruff-fix', 95, 'unused_code', true, 'Remove unused imports'),
('ruff-check', 'F841', 'ruff-fix', 85, 'unused_code', true, 'Remove unused variables'),
('ruff-check', 'E501', 'ruff-fix', 70, 'style', true, 'Line too long - may change semantics'),
('ruff-check', 'I001', 'ruff-fix', 99, 'imports', true, 'Import sorting'),
('ruff-check', 'E711', 'ruff-fix', 95, 'bugs', true, 'Comparison to None'),
('ruff-check', 'E712', 'ruff-fix', 95, 'bugs', true, 'Comparison to True/False'),
('ruff-check', 'UP036', 'pyupgrade', 90, 'modernization', true, 'Version-specific syntax upgrade');

-- PMD -> Sorald (Medium confidence)
INSERT INTO rule_to_fixer_mappings (validator_tool_id, rule_id, fixer_tool_id, confidence, issue_type, safe_for_auto_apply, notes)
VALUES
('pmd', 'AvoidDuplicateLiterals', 'sorald', 65, 'code_quality', false, 'Extract constants'),
('pmd', 'CloseResource', 'sorald', 70, 'bugs', false, 'Add try-with-resources'),
('pmd', 'UseEqualsToCompareStrings', 'sorald', 80, 'bugs', false, 'String comparison fix'),
('pmd', 'UnusedPrivateField', NULL, 50, 'unused_code', false, 'Needs AI - may have reflection usage'),
('pmd', 'UnnecessaryBoxing', 'sorald', 75, 'code_quality', false, 'Remove boxing/unboxing');

-- Checkstyle -> Google Java Format
INSERT INTO rule_to_fixer_mappings (validator_tool_id, rule_id, fixer_tool_id, confidence, issue_type, safe_for_auto_apply, notes)
VALUES
('checkstyle', 'Indentation', 'google-java-format', 99, 'style', true, 'Formatting fix'),
('checkstyle', 'WhitespaceAround', 'google-java-format', 99, 'style', true, 'Formatting fix'),
('checkstyle', 'LineLength', 'google-java-format', 80, 'style', true, 'May wrap lines');

-- golangci-lint -> golangci-lint --fix
INSERT INTO rule_to_fixer_mappings (validator_tool_id, rule_id, fixer_tool_id, confidence, issue_type, safe_for_auto_apply, notes)
VALUES
('golangci-lint-check', 'gofmt', 'gofmt', 99, 'formatting', true, 'Go formatting'),
('golangci-lint-check', 'goimports', 'goimports', 99, 'imports', true, 'Import fixes'),
('golangci-lint-check', 'unused', 'golangci-lint-fix', 85, 'unused_code', true, 'Unused code removal'),
('golangci-lint-check', 'errcheck', NULL, 50, 'bugs', false, 'Needs AI - error handling context'),
('golangci-lint-check', 'staticcheck', NULL, 55, 'bugs', false, 'Needs AI - complex fixes');

-- Clippy -> Clippy --fix
INSERT INTO rule_to_fixer_mappings (validator_tool_id, rule_id, fixer_tool_id, confidence, issue_type, safe_for_auto_apply, notes)
VALUES
('clippy', 'clippy::needless_return', 'clippy-fix', 90, 'style', true, 'Remove needless return'),
('clippy', 'clippy::redundant_clone', 'clippy-fix', 85, 'performance', false, 'May affect ownership'),
('clippy', 'clippy::unused_imports', 'clippy-fix', 95, 'unused_code', true, 'Remove unused imports'),
('clippy', 'clippy::unnecessary_cast', 'clippy-fix', 80, 'code_quality', true, 'Remove unnecessary casts');

-- Security tools -> Semgrep autofix OR AI
INSERT INTO rule_to_fixer_mappings (validator_tool_id, rule_id, rule_pattern, fixer_tool_id, confidence, issue_type, safe_for_auto_apply, notes)
VALUES
('semgrep-java', 'java.lang.security.*', '^java\\.lang\\.security\\.', 'semgrep-fix-java', 70, 'security', false, 'Semgrep autofix available'),
('semgrep-ts', 'typescript.react.security.*', NULL, 'semgrep-fix-ts', 70, 'security', false, 'Security fix'),
('semgrep-py', 'python.lang.security.*', '^python\\.lang\\.security\\.', 'semgrep-fix-py', 70, 'security', false, 'Security fix'),
('semgrep-go', 'go.lang.security.*', '^go\\.lang\\.security\\.', 'semgrep-fix-go', 70, 'security', false, 'Security fix'),
('semgrep-rust', 'rust.lang.security.*', '^rust\\.lang\\.security\\.', 'semgrep-fix-rust', 70, 'security', false, 'Security fix'),
('bandit', 'B101', NULL, NULL, 35, 'security', false, 'Assert usage - needs context'),
('bandit', 'B104', NULL, NULL, 60, 'security', false, 'Hardcoded bind - may need AI'),
('gosec', 'G101', NULL, NULL, 40, 'security', false, 'Hardcoded credentials - needs AI');
