/**
 * V9 Language to Analyzer Container Mapping
 * Based on DigitalOcean Container Registry
 */

const REGISTRY = 'registry.digitalocean.com/codequal';

const LANGUAGE_ANALYZERS = {
  // Primary language analyzers with specific versions
  java: {
    image: `${REGISTRY}/analyzer:lang-java-v5.1`,
    tools: ['spotbugs', 'pmd', 'checkstyle', 'sonarqube', 'infer', 'error-prone'],
    description: 'Java static analysis tools'
  },

  python: {
    image: `${REGISTRY}/analyzer:lang-python-v4.3`,
    tools: ['bandit', 'pylint', 'flake8', 'mypy', 'radon', 'safety'],
    description: 'Python security and quality tools'
  },

  javascript: {
    image: `${REGISTRY}/analyzer:lang-javascript-v4.3`,
    tools: ['eslint', 'jshint', 'flow', 'sonarjs', 'njsscan'],
    description: 'JavaScript/Node.js analysis tools'
  },

  typescript: {
    image: `${REGISTRY}/analyzer:lang-javascript-v4.3`, // Same as JS
    tools: ['tslint', 'eslint', 'tsc', 'sonarjs'],
    description: 'TypeScript analysis tools'
  },

  go: {
    image: `${REGISTRY}/analyzer:lang-go-v2.1`,
    tools: ['golint', 'go-vet', 'ineffassign', 'gosec', 'staticcheck'],
    description: 'Go static analysis and security tools'
  },

  rust: {
    image: `${REGISTRY}/analyzer:lang-rust-v1.3`,
    tools: ['clippy', 'rustfmt', 'cargo-audit'],
    description: 'Rust compiler lints and security'
  },

  ruby: {
    image: `${REGISTRY}/analyzer:lang-ruby-v2.2`,
    tools: ['rubocop', 'brakeman', 'reek', 'bundle-audit'],
    description: 'Ruby style and security analysis'
  },

  cpp: {
    image: `${REGISTRY}/analyzer:lang-cpp-v3.0`,
    tools: ['cppcheck', 'clang-tidy', 'pvs-studio', 'coverity'],
    description: 'C++ static analysis tools'
  },

  csharp: {
    image: `${REGISTRY}/analyzer:lang-csharp-v2.5`,
    tools: ['roslyn', 'fxcop', 'security-code-scan'],
    description: 'C# .NET analysis tools'
  },

  php: {
    image: `${REGISTRY}/analyzer:lang-php-v3.2`,
    tools: ['phpstan', 'psalm', 'phpcs', 'security-checker'],
    description: 'PHP static analysis and security'
  },

  kotlin: {
    image: `${REGISTRY}/analyzer:lang-kotlin-v1.4`,
    tools: ['detekt', 'ktlint', 'android-lint'],
    description: 'Kotlin static analysis'
  },

  swift: {
    image: `${REGISTRY}/analyzer:lang-swift-v1.2`,
    tools: ['swiftlint', 'tailor', 'swiftformat'],
    description: 'Swift code quality tools'
  },

  scala: {
    image: `${REGISTRY}/analyzer:lang-scala-v1.1`,
    tools: ['scalastyle', 'wartremover', 'scapegoat'],
    description: 'Scala static analysis'
  },

  // Additional specialized analyzers
  security: {
    image: `${REGISTRY}/analyzer:security-v3.0`,
    tools: ['semgrep', 'trivy', 'gitleaks', 'trufflehog'],
    description: 'Cross-language security scanning'
  },

  dependency: {
    image: `${REGISTRY}/analyzer:dependency-v2.8`,
    tools: ['dependency-check', 'snyk', 'safety', 'npm-audit'],
    description: 'Dependency vulnerability scanning'
  },

  infrastructure: {
    image: `${REGISTRY}/analyzer:infra-v1.5`,
    tools: ['terraform-validate', 'tflint', 'checkov', 'kube-score'],
    description: 'Infrastructure as Code analysis'
  }
};

/**
 * Get the appropriate analyzer image for a language
 */
function getAnalyzerForLanguage(language) {
  const lang = language.toLowerCase();
  return LANGUAGE_ANALYZERS[lang] || LANGUAGE_ANALYZERS.security;
}

/**
 * Get all available languages
 */
function getSupportedLanguages() {
  return Object.keys(LANGUAGE_ANALYZERS).filter(lang =>
    !['security', 'dependency', 'infrastructure'].includes(lang)
  );
}

/**
 * Get tools for a specific language
 */
function getToolsForLanguage(language) {
  const analyzer = getAnalyzerForLanguage(language);
  return analyzer ? analyzer.tools : [];
}

module.exports = {
  REGISTRY,
  LANGUAGE_ANALYZERS,
  getAnalyzerForLanguage,
  getSupportedLanguages,
  getToolsForLanguage
};