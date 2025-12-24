/**
 * Universal Tools - Shared runners for multi-language support
 *
 * Export all universal tool runners that work across multiple programming languages.
 *
 * Tool Coverage:
 * - Semgrep: Pattern-based security scanning (all tiers)
 *   - Uses p/security-audit, p/owasp-top-ten rulesets
 *   - Plus CodeQual custom rules for incomplete escaping detection
 *
 * - CodeQL: Deep semantic analysis (PRO tier only)
 *   - Data flow analysis, taint tracking
 *   - Cross-function analysis
 *   - More thorough but slower
 *
 * - Dependency Check: Vulnerability scanning for dependencies (all tiers)
 *
 * - Secret Scanner: Detects secrets/credentials in code
 *   - Gitleaks: Fast, CI/CD friendly, 140+ patterns
 *   - TruffleHog: 800+ secret types, validates credentials
 *
 * - IaC Scanner: Infrastructure as Code security scanning
 *   - Checkov: 1000+ policies for Terraform/K8s/CloudFormation
 *   - Trivy: All-in-one scanner for IaC misconfigurations
 *
 * - Container Scanner: Container image and Dockerfile security
 *   - Trivy: Image scanning, OS/package vulnerabilities
 *   - Grype: Fast SBOM-based vulnerability scanning
 *
 * - API Schema Scanner: OpenAPI and AsyncAPI linting (Session 59)
 *   - Spectral: 100+ rules for OpenAPI 2.0/3.x and AsyncAPI 2.x
 *
 * - GraphQL Scanner: GraphQL security analysis (Session 59)
 *   - graphql-cop: 40+ security checks
 *   - Static schema analysis
 */

export { UniversalToolBase, UniversalToolConfig } from './universal-tool-base';
export { UniversalSemgrepRunner, runSemgrep } from './semgrep-runner';
export { UniversalDependencyCheckRunner, runDependencyCheck } from './dependency-check-runner';
export {
  CodeQLRunner,
  CodeQLConfig,
  CODEQL_DEFAULTS,
  runCodeQL,
  runCodeQLFast,
  runCodeQLParallel,
  runCodeQLExtended,
  isCodeQLAvailable,
  clearCodeQLCache,
  getCodeQLCacheStats,
} from './codeql-runner';

// Security Scanners (Phase 1 Integration)
export {
  SecretScanner,
  secretScanner,
  SecretIssue,
  SecretScanResult,
  SecretScannerConfig,
} from './secret-scanner';

export {
  IaCScanner,
  iacScanner,
  IaCIssue,
  IaCScanResult,
  IaCScannerConfig,
  IaCFramework,
} from './iac-scanner';

export {
  ContainerScanner,
  containerScanner,
  ContainerVulnerability,
  DockerfileIssue,
  ContainerScanResult,
  ContainerScannerConfig,
} from './container-scanner';

// API Schema Scanners (Session 59 - P1)
export {
  runSpectral,
  runAPISchemaScanner,
  APISchemaIssue,
  APISchemaScanResult,
  APISchemaScannerConfig,
  findSchemaFiles,
  getSchemaType,
  SECURITY_RULES as SPECTRAL_SECURITY_RULES,
} from './api-schema-scanner';

export {
  runGraphQLScanner,
  GraphQLIssue,
  GraphQLScanResult,
  GraphQLScannerConfig,
  findGraphQLFiles,
  analyzeSchemaFile as analyzeGraphQLSchema,
  analyzeConfigFile as analyzeGraphQLConfig,
  SECURITY_CHECKS as GRAPHQL_SECURITY_CHECKS,
} from './graphql-scanner';

/**
 * Check if a tool name is universal (should use shared runners)
 */
export function isUniversalTool(toolName: string): boolean {
  const universalTools = [
    'semgrep',
    'dependency-check',
    'codeql',
    // Security scanners (Phase 1)
    'gitleaks',
    'trufflehog',
    'checkov',
    'trivy',
    'grype',
    // API/Schema scanners (Session 59)
    'spectral',
    'graphql-cop',
    'graphql-scanner',
  ];
  return universalTools.includes(toolName.toLowerCase());
}

/**
 * Get the list of all universal tool names
 */
export function getUniversalToolNames(): string[] {
  return [
    'semgrep',
    'dependency-check',
    'codeql',
    // Security scanners (Phase 1)
    'gitleaks',
    'trufflehog',
    'checkov',
    'trivy',
    'grype',
    // API/Schema scanners (Session 59)
    'spectral',
    'graphql-cop',
    'graphql-scanner',
  ];
}

/**
 * Get tools available for a specific tier
 * @param tier - 'basic' | 'pro'
 */
export function getToolsForTier(tier: 'basic' | 'pro'): string[] {
  const basicTools = [
    'semgrep',
    'dependency-check',
    // Security scanners available in basic tier
    'gitleaks',
    'trufflehog',
    'checkov',
    'trivy',
    'grype',
    // API/Schema scanners (Session 59)
    'spectral',
    'graphql-cop',
    'graphql-scanner',
  ];

  if (tier === 'pro') {
    return [...basicTools, 'codeql'];
  }

  return basicTools;
}

/**
 * Check if a tool requires PRO tier
 */
export function isProTierTool(toolName: string): boolean {
  const proOnlyTools = ['codeql'];
  return proOnlyTools.includes(toolName.toLowerCase());
}

/**
 * Get security category for a tool
 */
export function getToolSecurityCategory(
  toolName: string
): 'sast' | 'sca' | 'secrets' | 'iac' | 'container' | 'api' | 'other' {
  const categories: Record<string, 'sast' | 'sca' | 'secrets' | 'iac' | 'container' | 'api' | 'other'> = {
    semgrep: 'sast',
    codeql: 'sast',
    'dependency-check': 'sca',
    gitleaks: 'secrets',
    trufflehog: 'secrets',
    checkov: 'iac',
    trivy: 'container',  // Multi-purpose: can do IaC, container, and SCA
    grype: 'container',
    // API/Schema scanners (Session 59)
    spectral: 'api',
    'graphql-cop': 'api',
    'graphql-scanner': 'api',
  };
  return categories[toolName.toLowerCase()] || 'other';
}

/**
 * Get tools for a specific security category
 */
export function getToolsByCategory(
  category: 'sast' | 'sca' | 'secrets' | 'iac' | 'container' | 'api'
): string[] {
  const categoryTools: Record<string, string[]> = {
    sast: ['semgrep', 'codeql'],
    sca: ['dependency-check', 'trivy', 'grype'],
    secrets: ['gitleaks', 'trufflehog'],
    iac: ['checkov', 'trivy'],
    container: ['trivy', 'grype'],
    // API/Schema scanners (Session 59)
    api: ['spectral', 'graphql-cop', 'graphql-scanner'],
  };
  return categoryTools[category] || [];
}
