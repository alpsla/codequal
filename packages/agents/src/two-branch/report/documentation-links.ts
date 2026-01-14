/**
 * Documentation Links Registry
 *
 * Comprehensive mapping of security tools and rules to their official documentation.
 * Used to provide direct links instead of generic Google searches in reports.
 *
 * Supported Tools:
 * - Python: Bandit, Semgrep, Ruff, Mypy, pip-audit
 * - Java: PMD, Checkstyle, SpotBugs, Semgrep
 * - TypeScript/JavaScript: ESLint, Semgrep, npm-audit
 * - Universal: OWASP Dependency-Check, CodeQL
 *
 * Created: 2025-12-14
 */

export interface DocumentationLink {
  title: string;
  url: string;
  type: 'official' | 'owasp' | 'cwe' | 'tutorial' | 'reference';
}

export interface RuleDocumentation {
  rule: string;
  tool: string;
  links: DocumentationLink[];
}

/**
 * Tool-level documentation base URLs
 */
export const TOOL_DOCUMENTATION: Record<string, { name: string; baseUrl: string; rulesUrl?: string }> = {
  // Python Tools
  bandit: {
    name: 'Bandit',
    baseUrl: 'https://bandit.readthedocs.io/en/latest/',
    rulesUrl: 'https://bandit.readthedocs.io/en/latest/plugins/'
  },
  ruff: {
    name: 'Ruff',
    baseUrl: 'https://docs.astral.sh/ruff/',
    rulesUrl: 'https://docs.astral.sh/ruff/rules/'
  },
  mypy: {
    name: 'Mypy',
    baseUrl: 'https://mypy.readthedocs.io/en/stable/',
    rulesUrl: 'https://mypy.readthedocs.io/en/stable/error_codes.html'
  },
  'pip-audit': {
    name: 'pip-audit',
    baseUrl: 'https://pypi.org/project/pip-audit/',
    rulesUrl: 'https://nvd.nist.gov/vuln/search'
  },
  pylint: {
    name: 'Pylint',
    baseUrl: 'https://pylint.pycqa.org/en/latest/',
    rulesUrl: 'https://pylint.pycqa.org/en/latest/user_guide/messages/messages_overview.html'
  },

  // Java Tools
  pmd: {
    name: 'PMD',
    baseUrl: 'https://pmd.github.io/',
    rulesUrl: 'https://pmd.github.io/latest/pmd_rules_java.html'
  },
  checkstyle: {
    name: 'Checkstyle',
    baseUrl: 'https://checkstyle.org/',
    rulesUrl: 'https://checkstyle.org/checks.html'
  },
  spotbugs: {
    name: 'SpotBugs',
    baseUrl: 'https://spotbugs.github.io/',
    rulesUrl: 'https://spotbugs.readthedocs.io/en/latest/bugDescriptions.html'
  },

  // JavaScript/TypeScript Tools
  eslint: {
    name: 'ESLint',
    baseUrl: 'https://eslint.org/',
    rulesUrl: 'https://eslint.org/docs/latest/rules/'
  },
  'npm-audit': {
    name: 'npm audit',
    baseUrl: 'https://docs.npmjs.com/cli/v8/commands/npm-audit',
    rulesUrl: 'https://nvd.nist.gov/vuln/search'
  },
  typescript: {
    name: 'TypeScript',
    baseUrl: 'https://www.typescriptlang.org/docs/',
    rulesUrl: 'https://www.typescriptlang.org/tsconfig'
  },

  // Universal Tools
  semgrep: {
    name: 'Semgrep',
    baseUrl: 'https://semgrep.dev/',
    rulesUrl: 'https://semgrep.dev/r'
  },
  'dependency-check': {
    name: 'OWASP Dependency-Check',
    baseUrl: 'https://owasp.org/www-project-dependency-check/',
    rulesUrl: 'https://nvd.nist.gov/vuln/search'
  },
  codeql: {
    name: 'CodeQL',
    baseUrl: 'https://codeql.github.com/',
    rulesUrl: 'https://codeql.github.com/codeql-query-help/'
  },

  // Architecture Tools (Scanner-only, no auto-fix)
  madge: {
    name: 'Madge',
    baseUrl: 'https://github.com/pahen/madge',
    rulesUrl: 'https://github.com/pahen/madge#readme'
  },
  'dependency-cruiser': {
    name: 'Dependency Cruiser',
    baseUrl: 'https://github.com/sverweij/dependency-cruiser',
    rulesUrl: 'https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md'
  },
  'ts-unused-exports': {
    name: 'ts-unused-exports',
    baseUrl: 'https://github.com/pzavolinsky/ts-unused-exports',
    rulesUrl: 'https://github.com/pzavolinsky/ts-unused-exports#readme'
  },
  pydeps: {
    name: 'pydeps',
    baseUrl: 'https://github.com/thebjorn/pydeps',
    rulesUrl: 'https://github.com/thebjorn/pydeps#readme'
  },

  // Performance Tools (Scanner-only, no auto-fix)
  lighthouse: {
    name: 'Lighthouse',
    baseUrl: 'https://developers.google.com/web/tools/lighthouse',
    rulesUrl: 'https://web.dev/performance-scoring/'
  },
  'bundle-analyzer': {
    name: 'Bundle Analyzer',
    baseUrl: 'https://github.com/webpack-contrib/webpack-bundle-analyzer',
    rulesUrl: 'https://web.dev/reduce-javascript-payloads-with-tree-shaking/'
  },

  // ============================================
  // P0 CRITICAL SECURITY TOOLS (Session 59)
  // ============================================

  // Secret Detection
  gitleaks: {
    name: 'Gitleaks',
    baseUrl: 'https://github.com/gitleaks/gitleaks',
    rulesUrl: 'https://github.com/gitleaks/gitleaks#configuration'
  },
  trufflehog: {
    name: 'TruffleHog',
    baseUrl: 'https://trufflesecurity.com/trufflehog',
    rulesUrl: 'https://github.com/trufflesecurity/trufflehog#what-is-a-detector'
  },

  // IaC Security
  checkov: {
    name: 'Checkov',
    baseUrl: 'https://www.checkov.io/',
    rulesUrl: 'https://www.checkov.io/5.Policy%20Index/all.html'
  },

  // Container Security
  trivy: {
    name: 'Trivy',
    baseUrl: 'https://aquasecurity.github.io/trivy/',
    rulesUrl: 'https://aquasecurity.github.io/trivy/latest/docs/scanner/'
  },
  grype: {
    name: 'Grype',
    baseUrl: 'https://github.com/anchore/grype',
    rulesUrl: 'https://github.com/anchore/grype#supported-sources'
  },

  // ============================================
  // P1 API/GRAPHQL TOOLS (Session 59)
  // ============================================

  spectral: {
    name: 'Spectral',
    baseUrl: 'https://stoplight.io/open-source/spectral',
    rulesUrl: 'https://meta.stoplight.io/docs/spectral/docs/reference/openapi-rules.md'
  },
  'graphql-cop': {
    name: 'GraphQL-Cop',
    baseUrl: 'https://github.com/dolevf/graphql-cop',
    rulesUrl: 'https://github.com/dolevf/graphql-cop#supported-audits'
  },

  // ============================================
  // P2 ARCHITECTURE TOOLS (Session 59)
  // ============================================

  jdepend: {
    name: 'JDepend',
    baseUrl: 'https://github.com/clarkware/jdepend',
    rulesUrl: 'https://github.com/clarkware/jdepend#metrics'
  },
  'import-linter': {
    name: 'Import Linter',
    baseUrl: 'https://import-linter.readthedocs.io/',
    rulesUrl: 'https://import-linter.readthedocs.io/en/stable/contract_types.html'
  },
  'go-arch-lint': {
    name: 'go-arch-lint',
    baseUrl: 'https://github.com/fe3dback/go-arch-lint',
    rulesUrl: 'https://github.com/fe3dback/go-arch-lint#rules'
  },
  'cargo-modules': {
    name: 'cargo-modules',
    baseUrl: 'https://github.com/regehr/cargo-modules',
    rulesUrl: 'https://github.com/regehr/cargo-modules#usage'
  },
  packwerk: {
    name: 'Packwerk',
    baseUrl: 'https://github.com/Shopify/packwerk',
    rulesUrl: 'https://github.com/Shopify/packwerk/blob/main/USAGE.md'
  },
  deptrac: {
    name: 'Deptrac',
    baseUrl: 'https://qossmic.github.io/deptrac/',
    rulesUrl: 'https://qossmic.github.io/deptrac/concepts/'
  },

  // ============================================
  // CLOUD API FIXER TOOLS (Session 60)
  // ============================================

  corgea: {
    name: 'Corgea',
    baseUrl: 'https://corgea.com/',
    rulesUrl: 'https://docs.corgea.app/'
  }
};

/**
 * Bandit rule documentation mapping
 * https://bandit.readthedocs.io/en/latest/plugins/
 *
 * NOTE: Includes both B-code aliases (B101, B105) and full names (assert_used, hardcoded_password_string)
 * for flexible lookup since different tools report Bandit findings differently.
 */
const BANDIT_RULES: Record<string, DocumentationLink[]> = {
  // B101 - Assert Used
  'assert_used': [
    { title: 'Bandit B101: assert_used', url: 'https://bandit.readthedocs.io/en/latest/plugins/b101_assert_used.html', type: 'official' },
    { title: 'Python Assert Statement', url: 'https://docs.python.org/3/reference/simple_stmts.html#the-assert-statement', type: 'reference' }
  ],
  'b101': [
    { title: 'Bandit B101: assert_used', url: 'https://bandit.readthedocs.io/en/latest/plugins/b101_assert_used.html', type: 'official' },
    { title: 'Python Assert Statement', url: 'https://docs.python.org/3/reference/simple_stmts.html#the-assert-statement', type: 'reference' }
  ],
  // B102 - Exec Used
  'exec_used': [
    { title: 'Bandit B102: exec_used', url: 'https://bandit.readthedocs.io/en/latest/plugins/b102_exec_used.html', type: 'official' },
    { title: 'CWE-78: OS Command Injection', url: 'https://cwe.mitre.org/data/definitions/78.html', type: 'cwe' },
    { title: 'OWASP Command Injection', url: 'https://owasp.org/www-community/attacks/Command_Injection', type: 'owasp' }
  ],
  'b102': [
    { title: 'Bandit B102: exec_used', url: 'https://bandit.readthedocs.io/en/latest/plugins/b102_exec_used.html', type: 'official' },
    { title: 'CWE-78: OS Command Injection', url: 'https://cwe.mitre.org/data/definitions/78.html', type: 'cwe' },
    { title: 'OWASP Command Injection', url: 'https://owasp.org/www-community/attacks/Command_Injection', type: 'owasp' }
  ],
  // B105 - Hardcoded Password String
  'hardcoded_password_string': [
    { title: 'Bandit B105: hardcoded_password_string', url: 'https://bandit.readthedocs.io/en/latest/plugins/b105_hardcoded_password_string.html', type: 'official' },
    { title: 'CWE-798: Hard-coded Credentials', url: 'https://cwe.mitre.org/data/definitions/798.html', type: 'cwe' },
    { title: 'OWASP Secrets Management', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html', type: 'owasp' }
  ],
  'b105': [
    { title: 'Bandit B105: hardcoded_password_string', url: 'https://bandit.readthedocs.io/en/latest/plugins/b105_hardcoded_password_string.html', type: 'official' },
    { title: 'CWE-798: Hard-coded Credentials', url: 'https://cwe.mitre.org/data/definitions/798.html', type: 'cwe' },
    { title: 'OWASP Secrets Management', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html', type: 'owasp' }
  ],
  // B106 - Hardcoded Password Func Arg
  'hardcoded_password_funcarg': [
    { title: 'Bandit B106: hardcoded_password_funcarg', url: 'https://bandit.readthedocs.io/en/latest/plugins/b106_hardcoded_password_funcarg.html', type: 'official' },
    { title: 'CWE-798: Hard-coded Credentials', url: 'https://cwe.mitre.org/data/definitions/798.html', type: 'cwe' }
  ],
  'b106': [
    { title: 'Bandit B106: hardcoded_password_funcarg', url: 'https://bandit.readthedocs.io/en/latest/plugins/b106_hardcoded_password_funcarg.html', type: 'official' },
    { title: 'CWE-798: Hard-coded Credentials', url: 'https://cwe.mitre.org/data/definitions/798.html', type: 'cwe' }
  ],
  // B107 - Hardcoded Password Default
  'hardcoded_password_default': [
    { title: 'Bandit B107: hardcoded_password_default', url: 'https://bandit.readthedocs.io/en/latest/plugins/b107_hardcoded_password_default.html', type: 'official' },
    { title: 'CWE-798: Hard-coded Credentials', url: 'https://cwe.mitre.org/data/definitions/798.html', type: 'cwe' }
  ],
  'b107': [
    { title: 'Bandit B107: hardcoded_password_default', url: 'https://bandit.readthedocs.io/en/latest/plugins/b107_hardcoded_password_default.html', type: 'official' },
    { title: 'CWE-798: Hard-coded Credentials', url: 'https://cwe.mitre.org/data/definitions/798.html', type: 'cwe' }
  ],
  'hardcoded_tmp_directory': [
    { title: 'Bandit B108: hardcoded_tmp_directory', url: 'https://bandit.readthedocs.io/en/latest/plugins/b108_hardcoded_tmp_directory.html', type: 'official' }
  ],
  'try_except_pass': [
    { title: 'Bandit B110: try_except_pass', url: 'https://bandit.readthedocs.io/en/latest/plugins/b110_try_except_pass.html', type: 'official' },
    { title: 'Python Exception Handling', url: 'https://docs.python.org/3/tutorial/errors.html', type: 'reference' }
  ],
  'try_except_continue': [
    { title: 'Bandit B112: try_except_continue', url: 'https://bandit.readthedocs.io/en/latest/plugins/b112_try_except_continue.html', type: 'official' }
  ],
  'flask_debug_true': [
    { title: 'Bandit B201: flask_debug_true', url: 'https://bandit.readthedocs.io/en/latest/plugins/b201_flask_debug_true.html', type: 'official' },
    { title: 'Flask Debug Mode Security', url: 'https://flask.palletsprojects.com/en/latest/debugging/', type: 'reference' }
  ],
  'hashlib': [
    { title: 'Bandit B303: hashlib (Weak Hash)', url: 'https://bandit.readthedocs.io/en/latest/plugins/b303_md5.html', type: 'official' },
    { title: 'CWE-328: Weak Hash', url: 'https://cwe.mitre.org/data/definitions/328.html', type: 'cwe' }
  ],
  'blacklist': [
    { title: 'Bandit B301-B320: Blacklist Calls', url: 'https://bandit.readthedocs.io/en/latest/blacklists/blacklist_calls.html', type: 'official' }
  ],
  'markupsafe_markup_xss': [
    { title: 'Bandit: MarkupSafe XSS', url: 'https://bandit.readthedocs.io/en/latest/plugins/', type: 'official' },
    { title: 'OWASP XSS Prevention', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html', type: 'owasp' },
    { title: 'CWE-79: XSS', url: 'https://cwe.mitre.org/data/definitions/79.html', type: 'cwe' }
  ],
  'request_without_timeout': [
    { title: 'Bandit B113: request_without_timeout', url: 'https://bandit.readthedocs.io/en/latest/plugins/b113_request_without_timeout.html', type: 'official' }
  ],
  'ssl_with_bad_version': [
    { title: 'Bandit B502: ssl_with_bad_version', url: 'https://bandit.readthedocs.io/en/latest/plugins/b502_ssl_with_bad_version.html', type: 'official' },
    { title: 'OWASP TLS Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html', type: 'owasp' }
  ],
  // B608 - SQL Injection
  'sql_injection': [
    { title: 'Bandit B608: SQL Injection', url: 'https://bandit.readthedocs.io/en/latest/plugins/b608_hardcoded_sql_expressions.html', type: 'official' },
    { title: 'OWASP SQL Injection Prevention', url: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html', type: 'owasp' },
    { title: 'CWE-89: SQL Injection', url: 'https://cwe.mitre.org/data/definitions/89.html', type: 'cwe' }
  ],
  'b608': [
    { title: 'Bandit B608: SQL Injection', url: 'https://bandit.readthedocs.io/en/latest/plugins/b608_hardcoded_sql_expressions.html', type: 'official' },
    { title: 'OWASP SQL Injection Prevention', url: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html', type: 'owasp' },
    { title: 'CWE-89: SQL Injection', url: 'https://cwe.mitre.org/data/definitions/89.html', type: 'cwe' }
  ],
  'jinja2_autoescape_false': [
    { title: 'Bandit B701: jinja2_autoescape_false', url: 'https://bandit.readthedocs.io/en/latest/plugins/b701_jinja2_autoescape_false.html', type: 'official' },
    { title: 'Jinja2 Autoescaping', url: 'https://jinja.palletsprojects.com/en/3.1.x/api/#autoescaping', type: 'reference' }
  ],
  'paramiko_call': [
    { title: 'Bandit B601: paramiko_calls', url: 'https://bandit.readthedocs.io/en/latest/plugins/b601_paramiko_calls.html', type: 'official' }
  ],
  'subprocess_popen_with_shell_equals_true': [
    { title: 'Bandit B602: subprocess_popen_with_shell', url: 'https://bandit.readthedocs.io/en/latest/plugins/b602_subprocess_popen_with_shell_equals_true.html', type: 'official' },
    { title: 'Python subprocess security', url: 'https://docs.python.org/3/library/subprocess.html#security-considerations', type: 'reference' }
  ],
  'subprocess_without_shell_equals_true': [
    { title: 'Bandit B603: subprocess_without_shell', url: 'https://bandit.readthedocs.io/en/latest/plugins/b603_subprocess_without_shell_equals_true.html', type: 'official' }
  ],
  'start_process_with_partial_path': [
    { title: 'Bandit B607: start_process_with_partial_path', url: 'https://bandit.readthedocs.io/en/latest/plugins/b607_start_process_with_partial_path.html', type: 'official' }
  ]
};

/**
 * Semgrep rule documentation mapping
 * Rules are organized by language prefix
 */
const SEMGREP_RULES: Record<string, DocumentationLink[]> = {
  // Python Semgrep Rules
  'python.lang.security.audit.exec-detected.exec-detected': [
    { title: 'Semgrep: exec-detected', url: 'https://semgrep.dev/r/python.lang.security.audit.exec-detected.exec-detected', type: 'official' },
    { title: 'CWE-94: Code Injection', url: 'https://cwe.mitre.org/data/definitions/94.html', type: 'cwe' },
    { title: 'OWASP Code Injection', url: 'https://owasp.org/www-community/attacks/Code_Injection', type: 'owasp' }
  ],
  'python.lang.security.audit.eval-detected.eval-detected': [
    { title: 'Semgrep: eval-detected', url: 'https://semgrep.dev/r/python.lang.security.audit.eval-detected.eval-detected', type: 'official' },
    { title: 'CWE-95: Eval Injection', url: 'https://cwe.mitre.org/data/definitions/95.html', type: 'cwe' }
  ],
  'python.lang.security.insecure-hash-algorithms.insecure-hash-algorithm-sha1': [
    { title: 'Semgrep: insecure-hash-algorithm-sha1', url: 'https://semgrep.dev/r/python.lang.security.insecure-hash-algorithms.insecure-hash-algorithm-sha1', type: 'official' },
    { title: 'CWE-328: Weak Hash', url: 'https://cwe.mitre.org/data/definitions/328.html', type: 'cwe' }
  ],
  'python.lang.security.insecure-hash-algorithms.insecure-hash-algorithm-md5': [
    { title: 'Semgrep: insecure-hash-algorithm-md5', url: 'https://semgrep.dev/r/python.lang.security.insecure-hash-algorithms.insecure-hash-algorithm-md5', type: 'official' },
    { title: 'CWE-328: Weak Hash', url: 'https://cwe.mitre.org/data/definitions/328.html', type: 'cwe' }
  ],
  'python.lang.security.audit.insecure-file-permissions.insecure-file-permissions': [
    { title: 'Semgrep: insecure-file-permissions', url: 'https://semgrep.dev/r/python.lang.security.audit.insecure-file-permissions.insecure-file-permissions', type: 'official' },
    { title: 'CWE-732: Insecure Permissions', url: 'https://cwe.mitre.org/data/definitions/732.html', type: 'cwe' }
  ],
  'python.django.security.injection.sql.sql-injection-using-raw-sql': [
    { title: 'Semgrep: Django SQL Injection', url: 'https://semgrep.dev/r/python.django.security.injection.sql.sql-injection-using-raw-sql', type: 'official' },
    { title: 'Django SQL Injection Protection', url: 'https://docs.djangoproject.com/en/4.2/topics/security/#sql-injection-protection', type: 'reference' }
  ],
  'python.flask.security.audit.hardcoded-config.avoid_hardcoded_config_SECRET_KEY': [
    { title: 'Semgrep: Flask Hardcoded Secret', url: 'https://semgrep.dev/r/python.flask.security.audit.hardcoded-config.avoid_hardcoded_config_SECRET_KEY', type: 'official' },
    { title: 'Flask Configuration Handling', url: 'https://flask.palletsprojects.com/en/latest/config/', type: 'reference' }
  ],

  // JavaScript/TypeScript Semgrep Rules
  'javascript.express.security.audit.express-cookie-settings.express-cookie-session-no-secure': [
    { title: 'Semgrep: express-cookie-session-no-secure', url: 'https://semgrep.dev/r/javascript.express.security.audit.express-cookie-settings.express-cookie-session-no-secure', type: 'official' },
    { title: 'OWASP Session Management', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html', type: 'owasp' },
    { title: 'Express.js Security', url: 'https://expressjs.com/en/advanced/best-practice-security.html', type: 'reference' }
  ],
  'javascript.express.security.audit.xss.direct-response-write': [
    { title: 'Semgrep: direct-response-write', url: 'https://semgrep.dev/r/javascript.express.security.audit.xss.direct-response-write', type: 'official' },
    { title: 'OWASP XSS Prevention', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html', type: 'owasp' }
  ],
  'javascript.express.security.cors-misconfiguration': [
    { title: 'Semgrep: cors-misconfiguration', url: 'https://semgrep.dev/r/javascript.express.security.cors-misconfiguration', type: 'official' },
    { title: 'OWASP CORS', url: 'https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny', type: 'owasp' }
  ],
  'javascript.lang.security.detect-child-process': [
    { title: 'Semgrep: detect-child-process', url: 'https://semgrep.dev/r/javascript.lang.security.detect-child-process', type: 'official' },
    { title: 'Node.js Child Process', url: 'https://nodejs.org/api/child_process.html#child_process_security_considerations', type: 'reference' }
  ],

  // Java Semgrep Rules
  'java.lang.security.audit.command-injection-process-builder': [
    { title: 'Semgrep: command-injection-process-builder', url: 'https://semgrep.dev/r/java.lang.security.audit.command-injection-process-builder', type: 'official' },
    { title: 'OWASP Command Injection', url: 'https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html', type: 'owasp' }
  ],
  'java.lang.security.audit.unsafe-reflection': [
    { title: 'Semgrep: unsafe-reflection', url: 'https://semgrep.dev/r/java.lang.security.audit.unsafe-reflection', type: 'official' },
    { title: 'CWE-470: Unsafe Reflection', url: 'https://cwe.mitre.org/data/definitions/470.html', type: 'cwe' }
  ],
  'java.spring.security.audit.spring-actuator-dangerous-endpoints-enabled': [
    { title: 'Semgrep: spring-actuator-dangerous-endpoints', url: 'https://semgrep.dev/r/java.spring.security.audit.spring-actuator-non-health-enabled.spring-actuator-dangerous-endpoints-enabled', type: 'official' },
    { title: 'Spring Actuator Security', url: 'https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html#actuator.endpoints.security', type: 'reference' }
  ],

  // Generic Rules
  'generic.html-templates.security.unquoted-attribute-var.unquoted-attribute-var': [
    { title: 'Semgrep: unquoted-attribute-var', url: 'https://semgrep.dev/r/generic.html-templates.security.unquoted-attribute-var.unquoted-attribute-var', type: 'official' },
    { title: 'OWASP XSS Prevention', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html', type: 'owasp' }
  ],
  'generic.nginx.security.request-host-used.request-host-used': [
    { title: 'Semgrep: request-host-used', url: 'https://semgrep.dev/r/generic.nginx.security.request-host-used.request-host-used', type: 'official' },
    { title: 'Nginx Security', url: 'https://docs.nginx.com/nginx/admin-guide/security-controls/', type: 'reference' }
  ],

  // YAML/K8s/Docker Rules
  'yaml.github-actions.security.run-shell-injection': [
    { title: 'Semgrep: run-shell-injection', url: 'https://semgrep.dev/r/yaml.github-actions.security.run-shell-injection', type: 'official' },
    { title: 'GitHub Actions Security', url: 'https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions', type: 'reference' }
  ],
  'yaml.kubernetes.security.allow-privilege-escalation': [
    { title: 'Semgrep: allow-privilege-escalation', url: 'https://semgrep.dev/r/yaml.kubernetes.security.allow-privilege-escalation', type: 'official' },
    { title: 'Kubernetes Security', url: 'https://kubernetes.io/docs/concepts/security/pod-security-standards/', type: 'reference' }
  ],
  'yaml.kubernetes.security.secrets-in-config-file': [
    { title: 'Semgrep: secrets-in-config-file', url: 'https://semgrep.dev/r/yaml.kubernetes.security.secrets-in-config-file', type: 'official' },
    { title: 'Kubernetes Secrets', url: 'https://kubernetes.io/docs/concepts/configuration/secret/', type: 'reference' }
  ]
};

/**
 * PMD rule-to-category mapping
 * SESSION 77: Comprehensive mapping to generate specific rule documentation URLs
 * Categories: bestpractices, codestyle, design, documentation, errorprone, multithreading, performance, security
 */
const PMD_RULE_CATEGORIES: Record<string, string> = {
  // Best Practices
  'AvoidReassigningParameters': 'bestpractices',
  'AvoidStringBufferField': 'bestpractices',
  'AvoidUsingHardCodedIP': 'bestpractices',
  'CheckResultSet': 'bestpractices',
  'ConstantsInInterface': 'bestpractices',
  'DefaultLabelNotLastInSwitchStmt': 'bestpractices',
  'ForLoopCanBeForeach': 'bestpractices',
  'ForLoopVariableCount': 'bestpractices',
  'GuardLogStatement': 'bestpractices',
  'JUnit4SuitesShouldUseSuiteAnnotation': 'bestpractices',
  'JUnit4TestShouldUseAfterAnnotation': 'bestpractices',
  'JUnit4TestShouldUseBeforeAnnotation': 'bestpractices',
  'JUnit4TestShouldUseTestAnnotation': 'bestpractices',
  'JUnitAssertionsShouldIncludeMessage': 'bestpractices',
  'JUnitTestContainsTooManyAsserts': 'bestpractices',
  'JUnitTestsShouldIncludeAssert': 'bestpractices',
  'JUnitUseExpected': 'bestpractices',
  'LooseCoupling': 'bestpractices',
  'MethodReturnsInternalArray': 'bestpractices',
  'MissingOverride': 'bestpractices',
  'OneDeclarationPerLine': 'bestpractices',
  'PositionLiteralsFirstInCaseInsensitiveComparisons': 'bestpractices',
  'PositionLiteralsFirstInComparisons': 'bestpractices',
  'PreserveStackTrace': 'bestpractices',
  'ReplaceEnumerationWithIterator': 'bestpractices',
  'ReplaceHashtableWithMap': 'bestpractices',
  'ReplaceVectorWithList': 'bestpractices',
  'SwitchStmtsShouldHaveDefault': 'bestpractices',
  'SystemPrintln': 'bestpractices',
  'UnusedFormalParameter': 'bestpractices',
  'UnusedLocalVariable': 'bestpractices',
  'UnusedPrivateField': 'bestpractices',
  'UnusedPrivateMethod': 'bestpractices',
  'UseAssertEqualsInsteadOfAssertTrue': 'bestpractices',
  'UseAssertNullInsteadOfAssertTrue': 'bestpractices',
  'UseAssertSameInsteadOfAssertTrue': 'bestpractices',
  'UseAssertTrueInsteadOfAssertEquals': 'bestpractices',
  'UseCollectionIsEmpty': 'bestpractices',
  'UseVarargs': 'bestpractices',
  'WhileLoopWithLiteralBoolean': 'bestpractices',

  // Code Style
  'AtLeastOneConstructor': 'codestyle',
  'AvoidDollarSigns': 'codestyle',
  'AvoidProtectedFieldInFinalClass': 'codestyle',
  'AvoidProtectedMethodInFinalClassNotExtending': 'codestyle',
  'AvoidUsingNativeCode': 'codestyle',
  'BooleanGetMethodName': 'codestyle',
  'CallSuperInConstructor': 'codestyle',
  'ClassNamingConventions': 'codestyle',
  'CommentDefaultAccessModifier': 'codestyle',
  'ConfusingTernary': 'codestyle',
  'ControlStatementBraces': 'codestyle',
  'EmptyMethodInAbstractClassShouldBeAbstract': 'codestyle',
  'ExtendsObject': 'codestyle',
  'FieldDeclarationsShouldBeAtStartOfClass': 'codestyle',
  'FieldNamingConventions': 'codestyle',
  'FinalParameterInAbstractMethod': 'codestyle',
  'ForLoopShouldBeWhileLoop': 'codestyle',
  'FormalParameterNamingConventions': 'codestyle',
  'GenericsNaming': 'codestyle',
  'IdenticalCatchBranches': 'codestyle',
  'LinguisticNaming': 'codestyle',
  'LocalHomeNamingConvention': 'codestyle',
  'LocalInterfaceSessionNamingConvention': 'codestyle',
  'LocalVariableCouldBeFinal': 'codestyle',
  'LocalVariableNamingConventions': 'codestyle',
  'LongVariable': 'codestyle',
  'MDBAndSessionBeanNamingConvention': 'codestyle',
  'MethodArgumentCouldBeFinal': 'codestyle',
  'MethodNamingConventions': 'codestyle',
  'NoPackage': 'codestyle',
  'OnlyOneReturn': 'codestyle',
  'PackageCase': 'codestyle',
  'PrematureDeclaration': 'codestyle',
  'RemoteInterfaceNamingConvention': 'codestyle',
  'RemoteSessionInterfaceNamingConvention': 'codestyle',
  'ShortClassName': 'codestyle',
  'ShortMethodName': 'codestyle',
  'ShortVariable': 'codestyle',
  'TooManyStaticImports': 'codestyle',
  'UnnecessaryAnnotationValueElement': 'codestyle',
  'UnnecessaryBoxing': 'codestyle',
  'UnnecessaryCast': 'codestyle',
  'UnnecessaryConstructor': 'codestyle',
  'UnnecessaryFullyQualifiedName': 'codestyle',
  'UnnecessaryImport': 'codestyle',
  'UnnecessaryLocalBeforeReturn': 'codestyle',
  'UnnecessaryModifier': 'codestyle',
  'UnnecessaryReturn': 'codestyle',
  'UnnecessarySemicolon': 'codestyle',
  'UseDiamondOperator': 'codestyle',
  'UselessParentheses': 'codestyle',
  'UselessQualifiedThis': 'codestyle',
  'UseShortArrayInitializer': 'codestyle',
  'UseUnderscoresInNumericLiterals': 'codestyle',

  // Design
  'AbstractClassWithoutAbstractMethod': 'design',
  'AbstractClassWithoutAnyMethod': 'design',
  'AvoidCatchingGenericException': 'design',
  'AvoidDeeplyNestedIfStmts': 'design',
  'AvoidRethrowingException': 'design',
  'AvoidThrowingNewInstanceOfSameException': 'design',
  'AvoidThrowingNullPointerException': 'design',
  'AvoidThrowingRawExceptionTypes': 'design',
  'AvoidUncheckedExceptionsInSignatures': 'design',
  'ClassWithOnlyPrivateConstructorsShouldBeFinal': 'design',
  'CognitiveComplexity': 'design',
  'CollapsibleIfStatements': 'design',
  'CouplingBetweenObjects': 'design',
  'CyclomaticComplexity': 'design',
  'DataClass': 'design',
  'DoNotExtendJavaLangError': 'design',
  'ExceptionAsFlowControl': 'design',
  'ExcessiveClassLength': 'design',
  'ExcessiveImports': 'design',
  'ExcessiveMethodLength': 'design',
  'ExcessiveParameterList': 'design',
  'ExcessivePublicCount': 'design',
  'FinalFieldCouldBeStatic': 'design',
  'GodClass': 'design',
  'ImmutableField': 'design',
  'InvalidJavaBean': 'design',
  'LawOfDemeter': 'design',
  'LogicInversion': 'design',
  'LoosePackageCoupling': 'design',
  'MutableStaticState': 'design',
  'NcssCount': 'design',
  'NPathComplexity': 'design',
  'SignatureDeclareThrowsException': 'design',
  'SimplifiedTernary': 'design',
  'SimplifyBooleanAssertion': 'design',
  'SimplifyBooleanExpressions': 'design',
  'SimplifyBooleanReturns': 'design',
  'SimplifyConditional': 'design',
  'SingularField': 'design',
  'SwitchDensity': 'design',
  'TooManyFields': 'design',
  'TooManyMethods': 'design',
  'UselessOverridingMethod': 'design',
  'UseObjectForClearerAPI': 'design',
  'UseUtilityClass': 'design',

  // Documentation
  'CommentContent': 'documentation',
  'CommentRequired': 'documentation',
  'CommentSize': 'documentation',
  'UncommentedEmptyConstructor': 'documentation',
  'UncommentedEmptyMethodBody': 'documentation',

  // Error Prone
  'AssignmentInOperand': 'errorprone',
  'AssignmentToNonFinalStatic': 'errorprone',
  'AvoidAccessibilityAlteration': 'errorprone',
  'AvoidAssertAsIdentifier': 'errorprone',
  'AvoidBranchingStatementAsLastInLoop': 'errorprone',
  'AvoidCallingFinalize': 'errorprone',
  'AvoidCatchingNPE': 'errorprone',
  'AvoidCatchingThrowable': 'errorprone',
  'AvoidDecimalLiteralsInBigDecimalConstructor': 'errorprone',
  'AvoidDuplicateLiterals': 'errorprone',
  'AvoidEnumAsIdentifier': 'errorprone',
  'AvoidFieldNameMatchingMethodName': 'errorprone',
  'AvoidFieldNameMatchingTypeName': 'errorprone',
  'AvoidInstanceofChecksInCatchClause': 'errorprone',
  'AvoidLiteralsInIfCondition': 'errorprone',
  'AvoidLosingExceptionInformation': 'errorprone',
  'AvoidMultipleUnaryOperators': 'errorprone',
  'AvoidUsingOctalValues': 'errorprone',
  'BadComparison': 'errorprone',
  'BrokenNullCheck': 'errorprone',
  'CallSuperFirst': 'errorprone',
  'CallSuperLast': 'errorprone',
  'CheckSkipResult': 'errorprone',
  'ClassCastExceptionWithToArray': 'errorprone',
  'CloneMethodMustBePublic': 'errorprone',
  'CloneMethodMustImplementCloneable': 'errorprone',
  'CloneMethodReturnTypeMustMatchClassName': 'errorprone',
  'CloneThrowsCloneNotSupportedException': 'errorprone',
  'CloseResource': 'errorprone',
  'CompareObjectsWithEquals': 'errorprone',
  'ComparisonWithNaN': 'errorprone',
  'ConstructorCallsOverridableMethod': 'errorprone',
  'DetachedTestCase': 'errorprone',
  'DoNotCallGarbageCollectionExplicitly': 'errorprone',
  'DoNotCallSystemExit': 'errorprone',
  'DoNotExtendJavaLangThrowable': 'errorprone',
  'DoNotHardCodeSDCard': 'errorprone',
  'DoNotTerminateVM': 'errorprone',
  'DoNotThrowExceptionInFinally': 'errorprone',
  'DontImportSun': 'errorprone',
  'DontUseFloatTypeForLoopIndices': 'errorprone',
  'EmptyCatchBlock': 'errorprone',
  'EmptyFinalizer': 'errorprone',
  'EmptyFinallyBlock': 'errorprone',
  'EmptyIfStmt': 'errorprone',
  'EmptyInitializer': 'errorprone',
  'EmptyStatementBlock': 'errorprone',
  'EmptyStatementNotInLoop': 'errorprone',
  'EmptySwitchStatements': 'errorprone',
  'EmptySynchronizedBlock': 'errorprone',
  'EmptyTryBlock': 'errorprone',
  'EmptyWhileStmt': 'errorprone',
  'EqualsNull': 'errorprone',
  'FinalizeDoesNotCallSuperFinalize': 'errorprone',
  'FinalizeOnlyCallsSuperFinalize': 'errorprone',
  'FinalizeOverloaded': 'errorprone',
  'FinalizeShouldBeProtected': 'errorprone',
  'IdempotentOperations': 'errorprone',
  'ImplicitSwitchFallThrough': 'errorprone',
  'InstantiationToGetClass': 'errorprone',
  'InvalidLogMessageFormat': 'errorprone',
  'JumbledIncrementer': 'errorprone',
  'JUnitSpelling': 'errorprone',
  'JUnitStaticSuite': 'errorprone',
  'MethodWithSameNameAsEnclosingClass': 'errorprone',
  'MisplacedNullCheck': 'errorprone',
  'MissingBreakInSwitch': 'errorprone',
  'MissingSerialVersionUID': 'errorprone',
  'MissingStaticMethodInNonInstantiatableClass': 'errorprone',
  'MoreThanOneLogger': 'errorprone',
  'NonCaseLabelInSwitchStatement': 'errorprone',
  'NonStaticInitializer': 'errorprone',
  'NullAssignment': 'errorprone',
  'OverrideBothEqualsAndHashcode': 'errorprone',
  'ProperCloneImplementation': 'errorprone',
  'ProperLogger': 'errorprone',
  'ReturnEmptyCollectionRatherThanNull': 'errorprone',
  'ReturnFromFinallyBlock': 'errorprone',
  'SimpleDateFormatNeedsLocale': 'errorprone',
  'SingleMethodSingleton': 'errorprone',
  'SingletonClassReturningNewInstance': 'errorprone',
  'StaticEJBFieldShouldBeFinal': 'errorprone',
  'StringBufferInstantiationWithChar': 'errorprone',
  'SuspiciousEqualsMethodName': 'errorprone',
  'SuspiciousHashcodeMethodName': 'errorprone',
  'SuspiciousOctalEscape': 'errorprone',
  'TestClassWithoutTestCases': 'errorprone',
  'UnconditionalIfStatement': 'errorprone',
  'UnnecessaryBooleanAssertion': 'errorprone',
  'UnnecessaryCaseChange': 'errorprone',
  'UnnecessaryConversionTemporary': 'errorprone',
  'UnusedNullCheckInEquals': 'errorprone',
  'UseCorrectExceptionLogging': 'errorprone',
  'UseEqualsToCompareStrings': 'errorprone',
  'UselessOperationOnImmutable': 'errorprone',
  'UseLocaleWithCaseConversions': 'errorprone',
  'UseProperClassLoader': 'errorprone',

  // Multithreading
  'AvoidSynchronizedAtMethodLevel': 'multithreading',
  'AvoidThreadGroup': 'multithreading',
  'AvoidUsingVolatile': 'multithreading',
  'DoNotUseThreads': 'multithreading',
  'DontCallThreadRun': 'multithreading',
  'DoubleCheckedLocking': 'multithreading',
  'NonThreadSafeSingleton': 'multithreading',
  'UnsynchronizedStaticFormatter': 'multithreading',
  'UseConcurrentHashMap': 'multithreading',
  'UseNotifyAllInsteadOfNotify': 'multithreading',

  // Performance
  'AddEmptyString': 'performance',
  'AppendCharacterWithChar': 'performance',
  'AvoidArrayLoops': 'performance',
  'AvoidCalendarDateCreation': 'performance',
  'AvoidFileStream': 'performance',
  'AvoidInstantiatingObjectsInLoops': 'performance',
  'BigIntegerInstantiation': 'performance',
  'BooleanInstantiation': 'performance',
  'ByteInstantiation': 'performance',
  'ConsecutiveAppendsShouldReuse': 'performance',
  'ConsecutiveLiteralAppends': 'performance',
  'InefficientEmptyStringCheck': 'performance',
  'InefficientStringBuffering': 'performance',
  'InsufficientStringBufferDeclaration': 'performance',
  'IntegerInstantiation': 'performance',
  'LongInstantiation': 'performance',
  'OptimizableToArrayCall': 'performance',
  'RedundantFieldInitializer': 'performance',
  'ShortInstantiation': 'performance',
  'SimplifyStartsWith': 'performance',
  'StringInstantiation': 'performance',
  'StringToString': 'performance',
  'TooFewBranchesForASwitchStatement': 'performance',
  'UnnecessaryWrapperObjectCreation': 'performance',
  'UseArrayListInsteadOfVector': 'performance',
  'UseArraysAsList': 'performance',
  'UseIndexOfChar': 'performance',
  'UseIOStreamsWithApacheCommonsFileItem': 'performance',
  'UselessStringValueOf': 'performance',
  'UseStringBufferForStringAppends': 'performance',
  'UseStringBufferLength': 'performance',

  // Security
  'HardCodedCryptoKey': 'security',
  'InsecureCryptoIv': 'security',
};

/**
 * PMD rule documentation mapping
 * Includes pre-defined links for common rules
 */
const PMD_RULES: Record<string, DocumentationLink[]> = {
  'AvoidThrowingRawExceptionTypes': [
    { title: 'PMD: AvoidThrowingRawExceptionTypes', url: 'https://pmd.github.io/latest/pmd_rules_java_design.html#avoidthrowingrawexceptiontypes', type: 'official' },
    { title: 'Java Exceptions Best Practices', url: 'https://www.baeldung.com/java-exceptions', type: 'tutorial' }
  ],
  'CollapsibleIfStatements': [
    { title: 'PMD: CollapsibleIfStatements', url: 'https://pmd.github.io/latest/pmd_rules_java_design.html#collapsibleifstatements', type: 'official' },
    { title: 'Clean Code: Conditionals', url: 'https://refactoring.guru/smells/nested-conditionals', type: 'tutorial' }
  ],
  'GuardLogStatement': [
    { title: 'PMD: GuardLogStatement', url: 'https://pmd.github.io/latest/pmd_rules_java_bestpractices.html#guardlogstatement', type: 'official' },
    { title: 'SLF4J Parameterized Logging', url: 'http://www.slf4j.org/faq.html#logging_performance', type: 'reference' }
  ],
  'SystemPrintln': [
    { title: 'PMD: SystemPrintln', url: 'https://pmd.github.io/latest/pmd_rules_java_bestpractices.html#systemprintln', type: 'official' },
    { title: 'Logging vs System.out', url: 'https://www.baeldung.com/java-system-out-println-vs-logger', type: 'tutorial' }
  ],
  'AvoidReassigningParameters': [
    { title: 'PMD: AvoidReassigningParameters', url: 'https://pmd.github.io/latest/pmd_rules_java_bestpractices.html#avoidreassigningparameters', type: 'official' }
  ],
  'UnusedPrivateMethod': [
    { title: 'PMD: UnusedPrivateMethod', url: 'https://pmd.github.io/latest/pmd_rules_java_bestpractices.html#unusedprivatemethod', type: 'official' }
  ],
  'UnusedLocalVariable': [
    { title: 'PMD: UnusedLocalVariable', url: 'https://pmd.github.io/latest/pmd_rules_java_bestpractices.html#unusedlocalvariable', type: 'official' }
  ],
  'UseUtilityClass': [
    { title: 'PMD: UseUtilityClass', url: 'https://pmd.github.io/latest/pmd_rules_java_design.html#useutilityclass', type: 'official' }
  ]
};

/**
 * Generate PMD documentation URL using category mapping
 * SESSION 77: Uses PMD_RULE_CATEGORIES to generate specific rule URLs
 */
function generatePMDDocUrl(ruleId: string): DocumentationLink[] {
  // Extract just the rule name from full path like "com.puppycrawl.tools.checkstyle.checks.coding.HiddenFieldCheck"
  const ruleName = ruleId.split('.').pop() || ruleId;

  // Look up the category for this rule
  const category = PMD_RULE_CATEGORIES[ruleName];

  if (category) {
    // Generate specific URL with category and rule anchor
    const url = `https://pmd.github.io/latest/pmd_rules_java_${category}.html#${ruleName.toLowerCase()}`;
    return [
      { title: `PMD: ${ruleName}`, url, type: 'official' }
    ];
  }

  // Fallback to generic rules page if category not found
  return [
    { title: `PMD: ${ruleName}`, url: 'https://pmd.github.io/latest/pmd_rules_java.html', type: 'official' }
  ];
}

/**
 * Checkstyle rule documentation mapping
 */
// SESSION 26: Enhanced Checkstyle URL mapping with category detection
const CHECKSTYLE_CATEGORY_PATHS: Record<string, string> = {
  'coding': 'config_coding',
  'javadoc': 'config_javadoc', 
  'imports': 'config_imports',
  'naming': 'config_naming',
  'sizes': 'config_sizes',
  'whitespace': 'config_whitespace',
  'blocks': 'config_blocks',
  'design': 'config_design',
  'misc': 'config_misc',
  'modifier': 'config_modifier',
  'annotation': 'config_annotation',
  'metrics': 'config_metrics',
  'header': 'config_header',
  'regexp': 'config_regexp'
};

const CHECKSTYLE_RULES: Record<string, DocumentationLink[]> = {
  // Import rules
  'AvoidStarImportCheck': [
    { title: 'Checkstyle: AvoidStarImport', url: 'https://checkstyle.org/config_imports.html#AvoidStarImport', type: 'official' }
  ],
  // Javadoc rules
  'MissingJavadocMethodCheck': [
    { title: 'Checkstyle: MissingJavadocMethod', url: 'https://checkstyle.org/config_javadoc.html#MissingJavadocMethod', type: 'official' }
  ],
  'JavadocVariableCheck': [
    { title: 'Checkstyle: JavadocVariable', url: 'https://checkstyle.org/config_javadoc.html#JavadocVariable', type: 'official' }
  ],
  'JavadocMethodCheck': [
    { title: 'Checkstyle: JavadocMethod', url: 'https://checkstyle.org/config_javadoc.html#JavadocMethod', type: 'official' }
  ],
  // Coding rules
  'MagicNumberCheck': [
    { title: 'Checkstyle: MagicNumber', url: 'https://checkstyle.org/config_coding.html#MagicNumber', type: 'official' }
  ],
  'HiddenFieldCheck': [
    { title: 'Checkstyle: HiddenField', url: 'https://checkstyle.org/config_coding.html#HiddenField', type: 'official' }
  ],
  // Naming rules
  'ConstantNameCheck': [
    { title: 'Checkstyle: ConstantName', url: 'https://checkstyle.org/config_naming.html#ConstantName', type: 'official' }
  ],
  // Misc rules
  'FinalParametersCheck': [
    { title: 'Checkstyle: FinalParameters', url: 'https://checkstyle.org/config_misc.html#FinalParameters', type: 'official' }
  ],
  'FileTabCharacterCheck': [
    { title: 'Checkstyle: FileTabCharacter', url: 'https://checkstyle.org/config_whitespace.html#FileTabCharacter', type: 'official' }
  ],
  // Design rules
  'DesignForExtensionCheck': [
    { title: 'Checkstyle: DesignForExtension', url: 'https://checkstyle.org/config_design.html#DesignForExtension', type: 'official' }
  ],
  'VisibilityModifierCheck': [
    { title: 'Checkstyle: VisibilityModifier', url: 'https://checkstyle.org/config_design.html#VisibilityModifier', type: 'official' }
  ],
  // Size rules  
  'LineLengthCheck': [
    { title: 'Checkstyle: LineLength', url: 'https://checkstyle.org/config_sizes.html#LineLength', type: 'official' }
  ]
};

/**
 * Mypy error code documentation mapping
 */
const MYPY_RULES: Record<string, DocumentationLink[]> = {
  'error': [
    { title: 'Mypy Error Codes', url: 'https://mypy.readthedocs.io/en/stable/error_codes.html', type: 'official' },
    { title: 'Mypy Common Issues', url: 'https://mypy.readthedocs.io/en/stable/common_issues.html', type: 'tutorial' }
  ],
  'note': [
    { title: 'Mypy Error Codes', url: 'https://mypy.readthedocs.io/en/stable/error_codes.html', type: 'official' }
  ],
  'arg-type': [
    { title: 'Mypy: arg-type', url: 'https://mypy.readthedocs.io/en/stable/error_code_list.html#check-that-arguments-have-the-correct-type-arg-type', type: 'official' }
  ],
  'return-value': [
    { title: 'Mypy: return-value', url: 'https://mypy.readthedocs.io/en/stable/error_code_list.html#check-that-return-value-is-compatible-return-value', type: 'official' }
  ],
  'assignment': [
    { title: 'Mypy: assignment', url: 'https://mypy.readthedocs.io/en/stable/error_code_list.html#check-that-assigned-value-is-compatible-assignment', type: 'official' }
  ]
};

/**
 * SpotBugs bug pattern categories
 * SESSION 77: Comprehensive mapping for specific SpotBugs documentation URLs
 * https://spotbugs.readthedocs.io/en/latest/bugDescriptions.html
 */
const SPOTBUGS_CATEGORIES: Record<string, string> = {
  // Bad Practice
  'BC': 'BAD_PRACTICE',
  'BIT': 'BAD_PRACTICE',
  'CN': 'BAD_PRACTICE',
  'DE': 'BAD_PRACTICE',
  'DMI': 'BAD_PRACTICE',
  'DP': 'BAD_PRACTICE',
  'Dm': 'BAD_PRACTICE',
  'ES': 'BAD_PRACTICE',
  'EQ': 'BAD_PRACTICE',
  'FI': 'BAD_PRACTICE',
  'HE': 'BAD_PRACTICE',
  'IC': 'BAD_PRACTICE',
  'IMSE': 'BAD_PRACTICE',
  'ISC': 'BAD_PRACTICE',
  'IT': 'BAD_PRACTICE',
  'ME': 'BAD_PRACTICE',
  'NP': 'BAD_PRACTICE',
  'OBL': 'BAD_PRACTICE',
  'OS': 'BAD_PRACTICE',
  'RC': 'BAD_PRACTICE',
  'RR': 'BAD_PRACTICE',
  'RV': 'BAD_PRACTICE',
  'SE': 'BAD_PRACTICE',
  'SI': 'BAD_PRACTICE',
  'SW': 'BAD_PRACTICE',
  // Correctness
  'CO': 'CORRECTNESS',
  'DLS': 'CORRECTNESS',
  'EC': 'CORRECTNESS',
  'Eq': 'CORRECTNESS',
  'INT': 'CORRECTNESS',
  'NM': 'CORRECTNESS',
  'QBA': 'CORRECTNESS',
  'RE': 'CORRECTNESS',
  'SA': 'CORRECTNESS',
  'SQL': 'CORRECTNESS',
  'STI': 'CORRECTNESS',
  'TQ': 'CORRECTNESS',
  'VA': 'CORRECTNESS',
  // Internationalization
  'Dm_I18N': 'I18N',
  // Malicious Code Vulnerability
  'EI': 'MALICIOUS_CODE',
  'MS': 'MALICIOUS_CODE',
  // Multithreaded Correctness
  'AT': 'MT_CORRECTNESS',
  'DC': 'MT_CORRECTNESS',
  'DL': 'MT_CORRECTNESS',
  'JLM': 'MT_CORRECTNESS',
  'LI': 'MT_CORRECTNESS',
  'ML': 'MT_CORRECTNESS',
  'MWN': 'MT_CORRECTNESS',
  'NN': 'MT_CORRECTNESS',
  'No': 'MT_CORRECTNESS',
  'RS': 'MT_CORRECTNESS',
  'Ru': 'MT_CORRECTNESS',
  'SC': 'MT_CORRECTNESS',
  'SP': 'MT_CORRECTNESS',
  'TLW': 'MT_CORRECTNESS',
  'UG': 'MT_CORRECTNESS',
  'UL': 'MT_CORRECTNESS',
  'UW': 'MT_CORRECTNESS',
  'VO': 'MT_CORRECTNESS',
  'WL': 'MT_CORRECTNESS',
  'WS': 'MT_CORRECTNESS',
  // Performance
  'Bx': 'PERFORMANCE',
  'SIC': 'PERFORMANCE',
  'SS': 'PERFORMANCE',
  'UM': 'PERFORMANCE',
  'WMI': 'PERFORMANCE',
  // Security
  'HRS': 'SECURITY',
  'PT': 'SECURITY',
  'XSS': 'SECURITY',
  'SECB': 'SECURITY',
  'SECCI': 'SECURITY',
  'SECHCP': 'SECURITY',
  'SECPTI': 'SECURITY',
  'SECSQLC': 'SECURITY',
  'SECSQLI': 'SECURITY',
  'SECXPI': 'SECURITY',
  // Style/Dodgy
  'CI': 'STYLE',
  'DB': 'STYLE',
  'RI': 'STYLE',
  'UC': 'STYLE',
  'UPM': 'STYLE',
  'URF': 'STYLE',
  'UuF': 'STYLE',
};

/**
 * Generate SpotBugs documentation URL
 * SESSION 77: Uses bug pattern prefix to generate specific URLs
 */
function generateSpotBugsDocUrl(ruleId: string): DocumentationLink[] {
  // Extract prefix (e.g., "NP" from "NP_NULL_ON_SOME_PATH")
  const prefix = ruleId.split('_')[0];
  const category = SPOTBUGS_CATEGORIES[prefix];

  if (category) {
    // SpotBugs uses anchors like #NP_NULL_ON_SOME_PATH
    return [
      { title: `SpotBugs: ${ruleId}`, url: `https://spotbugs.readthedocs.io/en/latest/bugDescriptions.html#${ruleId.toLowerCase().replace(/_/g, '-')}`, type: 'official' }
    ];
  }

  // Try direct anchor
  return [
    { title: `SpotBugs: ${ruleId}`, url: `https://spotbugs.readthedocs.io/en/latest/bugDescriptions.html#${ruleId.toLowerCase().replace(/_/g, '-')}`, type: 'official' }
  ];
}

/**
 * Pylint message categories
 * SESSION 77: Comprehensive mapping for Pylint documentation URLs
 * Format: {category}/{message-id}.html
 */
const PYLINT_CATEGORIES: Record<string, string> = {
  'C': 'convention',   // Convention violations
  'R': 'refactor',     // Refactoring suggestions
  'W': 'warning',      // Warnings
  'E': 'error',        // Errors
  'F': 'fatal',        // Fatal errors
  'I': 'informational' // Informational messages
};

/**
 * Generate Pylint documentation URL
 * SESSION 77: Uses message code to generate specific URLs
 */
function generatePylintDocUrl(ruleId: string): DocumentationLink[] {
  // Pylint codes like C0114, W0611, E1101
  const match = ruleId.match(/^([CRWEFI])(\d{4})$/);

  if (match) {
    const categoryCode = match[1];
    const category = PYLINT_CATEGORIES[categoryCode];
    if (category) {
      return [
        { title: `Pylint: ${ruleId}`, url: `https://pylint.readthedocs.io/en/latest/user_guide/messages/${category}/${ruleId.toLowerCase()}.html`, type: 'official' }
      ];
    }
  }

  // Named rules like "missing-module-docstring"
  return [
    { title: `Pylint: ${ruleId}`, url: `https://pylint.readthedocs.io/en/latest/user_guide/messages/messages_overview.html`, type: 'official' }
  ];
}

/**
 * Checkstyle rule-to-category mapping
 * SESSION 77: Comprehensive mapping for Checkstyle rules
 */
const CHECKSTYLE_RULE_CATEGORIES: Record<string, string> = {
  // Annotation checks
  'AnnotationLocation': 'annotation',
  'AnnotationOnSameLine': 'annotation',
  'AnnotationUseStyle': 'annotation',
  'MissingDeprecated': 'annotation',
  'MissingOverride': 'annotation',
  'PackageAnnotation': 'annotation',
  'SuppressWarnings': 'annotation',
  'SuppressWarningsHolder': 'annotation',

  // Block checks
  'AvoidNestedBlocks': 'blocks',
  'EmptyBlock': 'blocks',
  'EmptyCatchBlock': 'blocks',
  'LeftCurly': 'blocks',
  'NeedBraces': 'blocks',
  'RightCurly': 'blocks',

  // Coding checks
  'ArrayTrailingComma': 'coding',
  'AvoidDoubleBraceInitialization': 'coding',
  'AvoidInlineConditionals': 'coding',
  'AvoidNoArgumentSuperConstructorCall': 'coding',
  'CovariantEquals': 'coding',
  'DeclarationOrder': 'coding',
  'DefaultComesLast': 'coding',
  'EmptyStatement': 'coding',
  'EqualsAvoidNull': 'coding',
  'EqualsHashCode': 'coding',
  'ExplicitInitialization': 'coding',
  'FallThrough': 'coding',
  'FinalLocalVariable': 'coding',
  'HiddenField': 'coding',
  'IllegalCatch': 'coding',
  'IllegalInstantiation': 'coding',
  'IllegalThrows': 'coding',
  'IllegalToken': 'coding',
  'IllegalTokenText': 'coding',
  'IllegalType': 'coding',
  'InnerAssignment': 'coding',
  'MagicNumber': 'coding',
  'MatchXpath': 'coding',
  'MissingCtor': 'coding',
  'MissingSwitchDefault': 'coding',
  'ModifiedControlVariable': 'coding',
  'MultipleStringLiterals': 'coding',
  'MultipleVariableDeclarations': 'coding',
  'NestedForDepth': 'coding',
  'NestedIfDepth': 'coding',
  'NestedTryDepth': 'coding',
  'NoArrayTrailingComma': 'coding',
  'NoClone': 'coding',
  'NoEnumTrailingComma': 'coding',
  'NoFinalizer': 'coding',
  'OneStatementPerLine': 'coding',
  'OverloadMethodsDeclarationOrder': 'coding',
  'PackageDeclaration': 'coding',
  'ParameterAssignment': 'coding',
  'RequireThis': 'coding',
  'ReturnCount': 'coding',
  'SimplifyBooleanExpression': 'coding',
  'SimplifyBooleanReturn': 'coding',
  'StringLiteralEquality': 'coding',
  'SuperClone': 'coding',
  'SuperFinalize': 'coding',
  'UnnecessaryParentheses': 'coding',
  'UnnecessarySemicolonAfterOuterTypeDeclaration': 'coding',
  'UnnecessarySemicolonAfterTypeMemberDeclaration': 'coding',
  'UnnecessarySemicolonInEnumeration': 'coding',
  'UnnecessarySemicolonInTryWithResources': 'coding',
  'VariableDeclarationUsageDistance': 'coding',

  // Design checks
  'DesignForExtension': 'design',
  'FinalClass': 'design',
  'HideUtilityClassConstructor': 'design',
  'InnerTypeLast': 'design',
  'InterfaceIsType': 'design',
  'MutableException': 'design',
  'OneTopLevelClass': 'design',
  'ThrowsCount': 'design',
  'VisibilityModifier': 'design',

  // Imports checks
  'AvoidStarImport': 'imports',
  'AvoidStaticImport': 'imports',
  'CustomImportOrder': 'imports',
  'IllegalImport': 'imports',
  'ImportControl': 'imports',
  'ImportOrder': 'imports',
  'RedundantImport': 'imports',
  'UnusedImports': 'imports',

  // Javadoc checks
  'AtclauseOrder': 'javadoc',
  'InvalidJavadocPosition': 'javadoc',
  'JavadocBlockTagLocation': 'javadoc',
  'JavadocContentLocation': 'javadoc',
  'JavadocMethod': 'javadoc',
  'JavadocMissingLeadingAsterisk': 'javadoc',
  'JavadocMissingWhitespaceAfterAsterisk': 'javadoc',
  'JavadocPackage': 'javadoc',
  'JavadocParagraph': 'javadoc',
  'JavadocStyle': 'javadoc',
  'JavadocTagContinuationIndentation': 'javadoc',
  'JavadocType': 'javadoc',
  'JavadocVariable': 'javadoc',
  'MissingJavadocMethod': 'javadoc',
  'MissingJavadocPackage': 'javadoc',
  'MissingJavadocType': 'javadoc',
  'NonEmptyAtclauseDescription': 'javadoc',
  'RequireEmptyLineBeforeBlockTagGroup': 'javadoc',
  'SingleLineJavadoc': 'javadoc',
  'SummaryJavadoc': 'javadoc',
  'WriteTag': 'javadoc',

  // Metrics checks
  'BooleanExpressionComplexity': 'metrics',
  'ClassDataAbstractionCoupling': 'metrics',
  'ClassFanOutComplexity': 'metrics',
  'CyclomaticComplexity': 'metrics',
  'JavaNCSS': 'metrics',
  'NPathComplexity': 'metrics',

  // Misc checks
  'ArrayTypeStyle': 'misc',
  'AvoidEscapedUnicodeCharacters': 'misc',
  'CommentsIndentation': 'misc',
  'DescendantToken': 'misc',
  'FinalParameters': 'misc',
  'Indentation': 'misc',
  'NewlineAtEndOfFile': 'misc',
  'NoCodeInFile': 'misc',
  'OrderedProperties': 'misc',
  'OuterTypeFilename': 'misc',
  'TodoComment': 'misc',
  'TrailingComment': 'misc',
  'Translation': 'misc',
  'UncommentedMain': 'misc',
  'UniqueProperties': 'misc',
  'UpperEll': 'misc',

  // Modifier checks
  'ClassMemberImpliedModifier': 'modifier',
  'InterfaceMemberImpliedModifier': 'modifier',
  'ModifierOrder': 'modifier',
  'RedundantModifier': 'modifier',

  // Naming checks
  'AbbreviationAsWordInName': 'naming',
  'AbstractClassName': 'naming',
  'CatchParameterName': 'naming',
  'ClassTypeParameterName': 'naming',
  'ConstantName': 'naming',
  'IllegalIdentifierName': 'naming',
  'InterfaceTypeParameterName': 'naming',
  'LambdaParameterName': 'naming',
  'LocalFinalVariableName': 'naming',
  'LocalVariableName': 'naming',
  'MemberName': 'naming',
  'MethodName': 'naming',
  'MethodTypeParameterName': 'naming',
  'PackageName': 'naming',
  'ParameterName': 'naming',
  'PatternVariableName': 'naming',
  'RecordComponentName': 'naming',
  'RecordTypeParameterName': 'naming',
  'StaticVariableName': 'naming',
  'TypeName': 'naming',

  // Regexp checks
  'Regexp': 'regexp',
  'RegexpMultiline': 'regexp',
  'RegexpOnFilename': 'regexp',
  'RegexpSingleline': 'regexp',
  'RegexpSinglelineJava': 'regexp',

  // Size checks
  'AnonInnerLength': 'sizes',
  'ExecutableStatementCount': 'sizes',
  'FileLength': 'sizes',
  'LambdaBodyLength': 'sizes',
  'LineLength': 'sizes',
  'MethodCount': 'sizes',
  'MethodLength': 'sizes',
  'OuterTypeNumber': 'sizes',
  'ParameterNumber': 'sizes',
  'RecordComponentNumber': 'sizes',

  // Whitespace checks
  'EmptyForInitializerPad': 'whitespace',
  'EmptyForIteratorPad': 'whitespace',
  'EmptyLineSeparator': 'whitespace',
  'FileTabCharacter': 'whitespace',
  'GenericWhitespace': 'whitespace',
  'MethodParamPad': 'whitespace',
  'NoLineWrap': 'whitespace',
  'NoWhitespaceAfter': 'whitespace',
  'NoWhitespaceBefore': 'whitespace',
  'NoWhitespaceBeforeCaseDefaultColon': 'whitespace',
  'OperatorWrap': 'whitespace',
  'ParenPad': 'whitespace',
  'SeparatorWrap': 'whitespace',
  'SingleSpaceSeparator': 'whitespace',
  'TypecastParenPad': 'whitespace',
  'WhitespaceAfter': 'whitespace',
  'WhitespaceAround': 'whitespace',
};

/**
 * Generate Checkstyle documentation URL
 * SESSION 77: Uses rule-to-category mapping for specific URLs
 */
function generateCheckstyleDocUrl(ruleId: string): DocumentationLink[] {
  // Extract rule name (remove "Check" suffix and package prefix)
  let ruleName = ruleId.split('.').pop() || ruleId;
  ruleName = ruleName.replace(/Check$/, '');

  // Look up category
  const category = CHECKSTYLE_RULE_CATEGORIES[ruleName];

  if (category) {
    return [
      { title: `Checkstyle: ${ruleName}`, url: `https://checkstyle.org/checks/${category}/${ruleName.toLowerCase()}.html`, type: 'official' }
    ];
  }

  // Fallback to general checks page
  return [
    { title: `Checkstyle: ${ruleName}`, url: 'https://checkstyle.org/checks.html', type: 'official' }
  ];
}

/**
 * Golangci-lint linter mapping
 * SESSION 77: Maps linter names to documentation
 */
function generateGolangciLintDocUrl(ruleId: string): DocumentationLink[] {
  // Golangci-lint rules are often prefixed with linter name
  // e.g., "errcheck", "staticcheck", "gosec"
  const linterDocs: Record<string, string> = {
    'errcheck': 'https://github.com/kisielk/errcheck',
    'staticcheck': 'https://staticcheck.io/docs/checks/',
    'gosec': 'https://github.com/securego/gosec#available-rules',
    'govet': 'https://pkg.go.dev/cmd/vet',
    'ineffassign': 'https://github.com/gordonklaus/ineffassign',
    'unused': 'https://staticcheck.io/docs/checks/#U1000',
    'gosimple': 'https://staticcheck.io/docs/checks/',
    'typecheck': 'https://golang.org/ref/spec',
    'gocritic': 'https://go-critic.com/overview',
    'revive': 'https://revive.run/r',
    'gofmt': 'https://pkg.go.dev/cmd/gofmt',
    'goimports': 'https://pkg.go.dev/golang.org/x/tools/cmd/goimports',
    'misspell': 'https://github.com/client9/misspell',
    'unparam': 'https://github.com/mvdan/unparam',
    'unconvert': 'https://github.com/mdempsky/unconvert',
    'prealloc': 'https://github.com/alexkohler/prealloc',
    'bodyclose': 'https://github.com/timakin/bodyclose',
    'noctx': 'https://github.com/sonatard/noctx',
    'exhaustive': 'https://github.com/nishanths/exhaustive',
    'dupl': 'https://github.com/mibk/dupl',
    'gocyclo': 'https://github.com/fzipp/gocyclo',
    'gocognit': 'https://github.com/uudashr/gocognit',
    'nestif': 'https://github.com/nakabonne/nestif',
    'funlen': 'https://github.com/ultraware/funlen',
    'lll': 'https://github.com/walle/lll',
  };

  // Try to match linter name
  for (const [linter, url] of Object.entries(linterDocs)) {
    if (ruleId.toLowerCase().includes(linter)) {
      return [
        { title: `${linter}: ${ruleId}`, url, type: 'official' }
      ];
    }
  }

  // Staticcheck rules (SA, S, ST, QF prefixes)
  if (ruleId.match(/^(SA|S|ST|QF)\d+/)) {
    return [
      { title: `Staticcheck: ${ruleId}`, url: `https://staticcheck.io/docs/checks/#${ruleId}`, type: 'official' }
    ];
  }

  // General fallback
  return [
    { title: `golangci-lint: ${ruleId}`, url: 'https://golangci-lint.run/usage/linters/', type: 'official' }
  ];
}

/**
 * RuboCop cop-to-department mapping
 * SESSION 77: Maps cops to their documentation
 */
function generateRuboCopDocUrl(ruleId: string): DocumentationLink[] {
  // RuboCop cops are formatted as "Department/CopName"
  // e.g., "Style/StringLiterals", "Lint/UselessAssignment"
  const parts = ruleId.split('/');

  if (parts.length === 2) {
    const department = parts[0].toLowerCase();
    const cop = parts[1];
    return [
      { title: `RuboCop: ${ruleId}`, url: `https://docs.rubocop.org/rubocop/cops_${department}.html#${department}${cop.toLowerCase()}`, type: 'official' }
    ];
  }

  return [
    { title: `RuboCop: ${ruleId}`, url: 'https://docs.rubocop.org/rubocop/cops.html', type: 'official' }
  ];
}

/**
 * Clippy lint-to-category mapping
 * SESSION 77: Maps Clippy lints to documentation
 */
function generateClippyDocUrl(ruleId: string): DocumentationLink[] {
  // Clippy lints are lowercase with underscores
  // e.g., "clippy::unwrap_used", "clippy::expect_used"
  const lintName = ruleId.replace('clippy::', '');
  return [
    { title: `Clippy: ${lintName}`, url: `https://rust-lang.github.io/rust-clippy/stable/index.html#${lintName}`, type: 'official' }
  ];
}

/**
 * PHPStan rule documentation
 * SESSION 77: Maps PHPStan rules to documentation
 */
function generatePHPStanDocUrl(ruleId: string): DocumentationLink[] {
  return [
    { title: `PHPStan: ${ruleId}`, url: `https://phpstan.org/user-guide/rule-levels`, type: 'official' }
  ];
}

/**
 * Psalm issue documentation
 * SESSION 77: Maps Psalm issues to documentation
 */
function generatePsalmDocUrl(ruleId: string): DocumentationLink[] {
  // Psalm issues are PascalCase like "MissingReturnType", "InvalidArgument"
  return [
    { title: `Psalm: ${ruleId}`, url: `https://psalm.dev/docs/running_psalm/issues/${ruleId}/`, type: 'official' }
  ];
}

/**
 * Architecture tool rule documentation (Scanner-only tools)
 * These tools detect architectural issues but cannot auto-fix
 */
const ARCHITECTURE_TOOL_RULES: Record<string, DocumentationLink[]> = {
  // Madge - Circular Dependencies
  'circular-dependency': [
    { title: 'Circular Dependency Anti-Pattern', url: 'https://refactoring.guru/smells/circular-dependency', type: 'tutorial' },
    { title: 'Breaking Circular Dependencies', url: 'https://blog.ploeh.dk/2022/02/21/breaking-circular-dependencies/', type: 'tutorial' },
    { title: 'Dependency Injection Pattern', url: 'https://www.martinfowler.com/articles/injection.html', type: 'reference' }
  ],
  // Dependency Cruiser - Layer Violations
  'no-circular': [
    { title: 'Circular Dependency Anti-Pattern', url: 'https://refactoring.guru/smells/circular-dependency', type: 'tutorial' },
    { title: 'Dependency Cruiser Rules Reference', url: 'https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md', type: 'official' }
  ],
  'not-reachable-from-folder': [
    { title: 'Layered Architecture', url: 'https://www.oreilly.com/library/view/software-architecture-patterns/9781491971437/ch01.html', type: 'reference' },
    { title: 'Clean Architecture Layers', url: 'https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html', type: 'tutorial' }
  ],
  'layer-violation': [
    { title: 'Layered Architecture', url: 'https://www.oreilly.com/library/view/software-architecture-patterns/9781491971437/ch01.html', type: 'reference' },
    { title: 'SOLID Principles', url: 'https://www.digitalocean.com/community/conceptual_articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design', type: 'tutorial' }
  ],
  // ts-unused-exports
  'unused-export': [
    { title: 'Tree Shaking Explained', url: 'https://webpack.js.org/guides/tree-shaking/', type: 'tutorial' },
    { title: 'Dead Code Elimination', url: 'https://refactoring.guru/smells/dead-code', type: 'tutorial' }
  ],
  // pydeps - Python circular imports
  'circular-import': [
    { title: 'Python Circular Imports', url: 'https://realpython.com/python-import/#handle-cyclic-imports', type: 'tutorial' },
    { title: 'Breaking Python Circular Imports', url: 'https://www.stefaanlippens.net/python-circular-imports/', type: 'tutorial' }
  ]
};

/**
 * Performance tool rule documentation (Scanner-only tools)
 * These tools detect performance issues but cannot auto-fix
 */
const PERFORMANCE_TOOL_RULES: Record<string, DocumentationLink[]> = {
  // Lighthouse - Web Core Vitals
  'largest-contentful-paint': [
    { title: 'Optimize LCP', url: 'https://web.dev/optimize-lcp/', type: 'tutorial' },
    { title: 'LCP Explained', url: 'https://web.dev/lcp/', type: 'official' }
  ],
  'cumulative-layout-shift': [
    { title: 'Optimize CLS', url: 'https://web.dev/optimize-cls/', type: 'tutorial' },
    { title: 'CLS Explained', url: 'https://web.dev/cls/', type: 'official' }
  ],
  'first-input-delay': [
    { title: 'Optimize FID', url: 'https://web.dev/optimize-fid/', type: 'tutorial' },
    { title: 'FID Explained', url: 'https://web.dev/fid/', type: 'official' }
  ],
  'first-contentful-paint': [
    { title: 'Optimize FCP', url: 'https://web.dev/fcp/', type: 'tutorial' }
  ],
  'time-to-first-byte': [
    { title: 'Optimize TTFB', url: 'https://web.dev/ttfb/', type: 'tutorial' }
  ],
  'total-blocking-time': [
    { title: 'Optimize TBT', url: 'https://web.dev/tbt/', type: 'tutorial' }
  ],
  // Bundle Analyzer
  'large-bundle': [
    { title: 'Reduce JavaScript Payloads', url: 'https://web.dev/reduce-javascript-payloads-with-tree-shaking/', type: 'tutorial' },
    { title: 'Code Splitting', url: 'https://webpack.js.org/guides/code-splitting/', type: 'official' },
    { title: 'Bundle Analysis Guide', url: 'https://web.dev/reduce-javascript-payloads-with-code-splitting/', type: 'tutorial' }
  ],
  'duplicate-dependency': [
    { title: 'Avoid Duplicate Dependencies', url: 'https://webpack.js.org/plugins/split-chunks-plugin/', type: 'official' }
  ]
};

/**
 * Dependency vulnerability documentation
 * Used for pip-audit, npm-audit, and OWASP Dependency-Check
 */
const DEPENDENCY_RULES: Record<string, DocumentationLink[]> = {
  'dependency-vulnerability': [
    { title: 'NVD - National Vulnerability Database', url: 'https://nvd.nist.gov/vuln/search', type: 'reference' },
    { title: 'OWASP Dependency-Check', url: 'https://owasp.org/www-project-dependency-check/', type: 'owasp' },
    { title: 'Snyk Vulnerability DB', url: 'https://security.snyk.io/', type: 'reference' }
  ]
};

/**
 * Get documentation links for a specific rule
 *
 * @param ruleId - The rule ID (e.g., 'exec_used', 'python.lang.security.audit.exec-detected.exec-detected')
 * @param tool - The tool name (e.g., 'bandit', 'semgrep', 'pmd')
 * @returns Array of documentation links, or empty array if not found
 */
export function getDocumentationLinks(ruleId: string, tool: string): DocumentationLink[] {
  const normalizedTool = tool.toLowerCase();
  const normalizedRule = ruleId.toLowerCase();

  // Check tool-specific mappings first
  switch (normalizedTool) {
    case 'bandit':
      // Try exact match first, then partial match
      if (BANDIT_RULES[ruleId]) return BANDIT_RULES[ruleId];
      for (const [key, value] of Object.entries(BANDIT_RULES)) {
        if (normalizedRule.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedRule)) {
          return value;
        }
      }
      break;

    case 'semgrep':
      // Semgrep rules often have full path
      if (SEMGREP_RULES[ruleId]) return SEMGREP_RULES[ruleId];
      for (const [key, value] of Object.entries(SEMGREP_RULES)) {
        if (normalizedRule.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedRule)) {
          return value;
        }
      }
      // Generate dynamic Semgrep link if not in registry
      if (ruleId.includes('.')) {
        return [
          { title: `Semgrep: ${ruleId.split('.').pop()}`, url: `https://semgrep.dev/r/${ruleId}`, type: 'official' }
        ];
      }
      break;

    case 'pmd':
      if (PMD_RULES[ruleId]) return PMD_RULES[ruleId];
      for (const [key, value] of Object.entries(PMD_RULES)) {
        if (normalizedRule.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedRule)) {
          return value;
        }
      }
      // SESSION 77: Use category mapping to generate specific rule documentation URLs
      return generatePMDDocUrl(ruleId);

    case 'checkstyle': {
      // Try exact match first
      const ruleName = ruleId.replace('Check', '').split('.').pop() || ruleId;
      if (CHECKSTYLE_RULES[ruleId]) return CHECKSTYLE_RULES[ruleId];
      if (CHECKSTYLE_RULES[`${ruleName}Check`]) return CHECKSTYLE_RULES[`${ruleName}Check`];

      // Try partial match
      for (const [key, value] of Object.entries(CHECKSTYLE_RULES)) {
        if (normalizedRule.includes(key.toLowerCase().replace('check', '')) ||
            key.toLowerCase().includes(normalizedRule.replace('check', ''))) {
          return value;
        }
      }

      // SESSION 77: Use comprehensive rule-to-category mapping for specific URLs
      return generateCheckstyleDocUrl(ruleId);
    }

    // SESSION 77: SpotBugs support
    case 'spotbugs':
    case 'findbugs':
      return generateSpotBugsDocUrl(ruleId);

    // SESSION 77: Pylint support
    case 'pylint':
      return generatePylintDocUrl(ruleId);

    case 'mypy':
      if (MYPY_RULES[ruleId]) return MYPY_RULES[ruleId];
      for (const [key, value] of Object.entries(MYPY_RULES)) {
        if (normalizedRule.includes(key.toLowerCase())) {
          return value;
        }
      }
      // Default mypy link
      return [
        { title: 'Mypy Error Codes', url: 'https://mypy.readthedocs.io/en/stable/error_codes.html', type: 'official' }
      ];

    case 'pip-audit':
    case 'npm-audit':
    case 'dependency-check':
      return DEPENDENCY_RULES['dependency-vulnerability'] || [];

    case 'ruff':
      // Ruff rules are formatted like E501, W503, etc.
      return [
        { title: `Ruff: ${ruleId}`, url: `https://docs.astral.sh/ruff/rules/${ruleId.toLowerCase()}`, type: 'official' }
      ];

    case 'eslint':
      return [
        { title: `ESLint: ${ruleId}`, url: `https://eslint.org/docs/latest/rules/${ruleId}`, type: 'official' }
      ];

    // SESSION 77: Go tools
    case 'golangci-lint':
    case 'golint':
    case 'staticcheck':
    case 'gosec':
    case 'govet':
      return generateGolangciLintDocUrl(ruleId);

    // SESSION 77: Ruby tools
    case 'rubocop':
      return generateRuboCopDocUrl(ruleId);

    // SESSION 77: Rust tools
    case 'clippy':
    case 'rust-clippy':
      return generateClippyDocUrl(ruleId);

    // SESSION 77: PHP tools
    case 'phpstan':
      return generatePHPStanDocUrl(ruleId);

    case 'psalm':
      return generatePsalmDocUrl(ruleId);

    // Architecture Scanner Tools (no auto-fix)
    case 'madge':
      if (ARCHITECTURE_TOOL_RULES['circular-dependency']) return ARCHITECTURE_TOOL_RULES['circular-dependency'];
      break;

    case 'dependency-cruiser':
      for (const [key, value] of Object.entries(ARCHITECTURE_TOOL_RULES)) {
        if (normalizedRule.includes(key) || key.includes(normalizedRule)) {
          return value;
        }
      }
      // Fallback for dependency-cruiser
      return ARCHITECTURE_TOOL_RULES['no-circular'] || [];

    case 'ts-unused-exports':
      return ARCHITECTURE_TOOL_RULES['unused-export'] || [];

    case 'pydeps':
      return ARCHITECTURE_TOOL_RULES['circular-import'] || [];

    // Performance Scanner Tools (no auto-fix)
    case 'lighthouse':
      if (PERFORMANCE_TOOL_RULES[normalizedRule]) return PERFORMANCE_TOOL_RULES[normalizedRule];
      for (const [key, value] of Object.entries(PERFORMANCE_TOOL_RULES)) {
        if (normalizedRule.includes(key) || key.includes(normalizedRule)) {
          return value;
        }
      }
      // Fallback for lighthouse - general Core Web Vitals
      return [
        { title: 'Core Web Vitals Guide', url: 'https://web.dev/vitals/', type: 'official' },
        { title: 'Lighthouse Performance Scoring', url: 'https://web.dev/performance-scoring/', type: 'tutorial' }
      ];

    case 'bundle-analyzer':
    case 'webpack-bundle-analyzer':
      if (PERFORMANCE_TOOL_RULES[normalizedRule]) return PERFORMANCE_TOOL_RULES[normalizedRule];
      for (const [key, value] of Object.entries(PERFORMANCE_TOOL_RULES)) {
        if (normalizedRule.includes(key) || key.includes(normalizedRule)) {
          return value;
        }
      }
      // Fallback for bundle analyzer
      return PERFORMANCE_TOOL_RULES['large-bundle'] || [];

    // ============================================
    // P0 CRITICAL SECURITY TOOLS (Session 59)
    // ============================================

    // Secret Detection Tools
    case 'gitleaks':
      return [
        { title: 'Gitleaks Documentation', url: 'https://github.com/gitleaks/gitleaks', type: 'official' },
        { title: 'Secret Management Best Practices', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html', type: 'owasp' },
        { title: 'CWE-798: Hard-coded Credentials', url: 'https://cwe.mitre.org/data/definitions/798.html', type: 'cwe' }
      ];

    case 'trufflehog':
      return [
        { title: 'TruffleHog Documentation', url: 'https://trufflesecurity.com/trufflehog', type: 'official' },
        { title: 'Secret Management Best Practices', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html', type: 'owasp' },
        { title: 'CWE-798: Hard-coded Credentials', url: 'https://cwe.mitre.org/data/definitions/798.html', type: 'cwe' }
      ];

    // IaC Security Tools
    case 'checkov':
      return [
        { title: 'Checkov Documentation', url: 'https://www.checkov.io/', type: 'official' },
        { title: 'Checkov Policy Index', url: 'https://www.checkov.io/5.Policy%20Index/all.html', type: 'reference' },
        { title: 'OWASP Infrastructure as Code Security', url: 'https://owasp.org/www-project-devsecops-guideline/latest/02b-Infrastructure-as-Code', type: 'owasp' }
      ];

    // Container Security Tools
    case 'trivy':
      return [
        { title: 'Trivy Documentation', url: 'https://aquasecurity.github.io/trivy/', type: 'official' },
        { title: 'Container Security Best Practices', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html', type: 'owasp' },
        { title: 'CVE Database', url: 'https://nvd.nist.gov/vuln/search', type: 'reference' }
      ];

    case 'grype':
      return [
        { title: 'Grype Documentation', url: 'https://github.com/anchore/grype', type: 'official' },
        { title: 'Container Security Best Practices', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html', type: 'owasp' },
        { title: 'CVE Database', url: 'https://nvd.nist.gov/vuln/search', type: 'reference' }
      ];

    // ============================================
    // P1 API/GRAPHQL TOOLS (Session 59)
    // ============================================

    case 'spectral':
      return [
        { title: 'Spectral Documentation', url: 'https://stoplight.io/open-source/spectral', type: 'official' },
        { title: 'OpenAPI Best Practices', url: 'https://oai.github.io/Documentation/best-practices.html', type: 'reference' },
        { title: 'API Security Best Practices', url: 'https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html', type: 'owasp' }
      ];

    case 'graphql-cop':
      return [
        { title: 'GraphQL-Cop Documentation', url: 'https://github.com/dolevf/graphql-cop', type: 'official' },
        { title: 'GraphQL Security Best Practices', url: 'https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html', type: 'owasp' },
        { title: 'GraphQL Security Considerations', url: 'https://graphql.org/learn/authorization/', type: 'reference' }
      ];

    // ============================================
    // P2 ARCHITECTURE TOOLS (Session 59)
    // ============================================

    case 'jdepend':
      return [
        { title: 'JDepend Documentation', url: 'https://github.com/clarkware/jdepend', type: 'official' },
        { title: 'Package Design Principles', url: 'https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html', type: 'tutorial' },
        { title: 'Dependency Management', url: 'https://www.oreilly.com/library/view/software-architecture-patterns/9781491971437/', type: 'reference' }
      ];

    case 'import-linter':
      return [
        { title: 'Import Linter Documentation', url: 'https://import-linter.readthedocs.io/', type: 'official' },
        { title: 'Python Circular Imports', url: 'https://realpython.com/python-import/#handle-cyclic-imports', type: 'tutorial' },
        { title: 'Layered Architecture', url: 'https://www.oreilly.com/library/view/software-architecture-patterns/9781491971437/ch01.html', type: 'reference' }
      ];

    case 'go-arch-lint':
      return [
        { title: 'go-arch-lint Documentation', url: 'https://github.com/fe3dback/go-arch-lint', type: 'official' },
        { title: 'Go Project Layout', url: 'https://github.com/golang-standards/project-layout', type: 'reference' },
        { title: 'Clean Architecture in Go', url: 'https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html', type: 'tutorial' }
      ];

    case 'cargo-modules':
      return [
        { title: 'cargo-modules Documentation', url: 'https://github.com/regehr/cargo-modules', type: 'official' },
        { title: 'Rust Module System', url: 'https://doc.rust-lang.org/book/ch07-02-defining-modules-to-control-scope-and-privacy.html', type: 'reference' },
        { title: 'Rust Package Layout', url: 'https://doc.rust-lang.org/cargo/guide/project-layout.html', type: 'reference' }
      ];

    case 'packwerk':
      return [
        { title: 'Packwerk Documentation', url: 'https://github.com/Shopify/packwerk', type: 'official' },
        { title: 'Rails Modular Monolith', url: 'https://shopify.engineering/shopify-monolith', type: 'tutorial' },
        { title: 'Package-Based Architecture', url: 'https://www.oreilly.com/library/view/software-architecture-patterns/9781491971437/', type: 'reference' }
      ];

    case 'deptrac':
      return [
        { title: 'Deptrac Documentation', url: 'https://qossmic.github.io/deptrac/', type: 'official' },
        { title: 'PHP Package Design', url: 'https://qossmic.github.io/deptrac/concepts/', type: 'reference' },
        { title: 'Clean Architecture', url: 'https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html', type: 'tutorial' }
      ];

    // ============================================
    // CLOUD API FIXER TOOLS (Session 60)
    // ============================================

    case 'corgea':
      return [
        { title: 'Corgea Documentation', url: 'https://docs.corgea.app/', type: 'official' },
        { title: 'Corgea AI Auto-Fix', url: 'https://corgea.com/auto-fix', type: 'reference' },
        { title: 'BLAST AI-Powered SAST', url: 'https://corgea.com/blog/whitepaper-blast-ai-powered-sast-scanner', type: 'tutorial' }
      ];
  }

  return [];
}

/**
 * Get fallback documentation based on issue category/type
 *
 * @param category - Issue category (Security, Performance, Code Quality, etc.)
 * @param language - Programming language
 * @returns Array of general documentation links
 */
export function getFallbackDocumentation(category: string, language = 'python'): DocumentationLink[] {
  const categoryLower = category.toLowerCase();

  if (categoryLower.includes('security')) {
    return [
      { title: 'OWASP Top 10', url: 'https://owasp.org/www-project-top-ten/', type: 'owasp' },
      { title: 'CWE Top 25', url: 'https://cwe.mitre.org/top25/', type: 'cwe' },
      { title: 'OWASP Cheat Sheet Series', url: 'https://cheatsheetseries.owasp.org/', type: 'owasp' }
    ];
  }

  if (categoryLower.includes('depend')) {
    return [
      { title: 'NVD - National Vulnerability Database', url: 'https://nvd.nist.gov/vuln/search', type: 'reference' },
      { title: 'OWASP Dependency-Check', url: 'https://owasp.org/www-project-dependency-check/', type: 'owasp' },
      { title: 'Snyk Learn', url: 'https://learn.snyk.io/', type: 'tutorial' }
    ];
  }

  if (categoryLower.includes('performance')) {
    const langSpecific: Record<string, DocumentationLink[]> = {
      python: [
        { title: 'Python Performance Tips', url: 'https://wiki.python.org/moin/PythonSpeed/PerformanceTips', type: 'reference' },
        { title: 'High Performance Python', url: 'https://www.oreilly.com/library/view/high-performance-python/9781492055013/', type: 'reference' }
      ],
      java: [
        { title: 'Java Performance Tuning', url: 'https://www.oracle.com/technical-resources/articles/javase/perftuning.html', type: 'reference' },
        { title: 'JVM Performance', url: 'https://docs.oracle.com/javase/8/docs/technotes/guides/vm/gctuning/', type: 'reference' }
      ],
      typescript: [
        { title: 'Node.js Performance', url: 'https://nodejs.org/en/docs/guides/dont-block-the-event-loop/', type: 'reference' },
        { title: 'Chrome DevTools Performance', url: 'https://developer.chrome.com/docs/devtools/performance/', type: 'reference' }
      ]
    };
    return langSpecific[language] || langSpecific['python'];
  }

  // Default: Code Quality
  return [
    { title: 'Clean Code Principles', url: 'https://www.oreilly.com/library/view/clean-code-a/9780136083238/', type: 'reference' },
    { title: 'Refactoring Techniques', url: 'https://refactoring.guru/refactoring', type: 'tutorial' },
    { title: 'Code Smells', url: 'https://refactoring.guru/refactoring/smells', type: 'tutorial' }
  ];
}

/**
 * Format documentation links as markdown
 *
 * @param links - Array of documentation links
 * @param maxLinks - Maximum number of links to include (default: 3)
 * @returns Formatted markdown string
 */
export function formatDocumentationLinksAsMarkdown(links: DocumentationLink[], maxLinks = 3): string {
  const iconMap: Record<string, string> = {
    official: '📚',
    owasp: '🛡️',
    cwe: '🔒',
    tutorial: '📖',
    reference: '📋'
  };

  return links
    .slice(0, maxLinks)
    .map(link => `- [${iconMap[link.type] || '🔗'} ${link.title}](${link.url})`)
    .join('\n');
}
