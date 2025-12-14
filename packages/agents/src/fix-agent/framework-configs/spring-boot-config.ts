/**
 * Spring Boot Framework Configuration
 *
 * Defines how issues are handled specifically for Spring Boot projects:
 * - What patterns are intentional (dependency injection, annotations)
 * - What errors to filter out
 * - Framework-specific fix strategies
 */

import {
  FrameworkConfig,
  IntentionalPattern,
  FilterRule,
  EnvironmentRequirement,
  FrameworkFixStrategy,
} from '../types/framework-issue-types';

/**
 * Spring Boot Framework Configuration
 *
 * Spring Boot is a Java framework with:
 * - Convention over configuration
 * - Dependency injection via annotations
 * - Auto-configuration
 * - Actuator endpoints for monitoring
 */
export const SPRING_BOOT_CONFIG: FrameworkConfig = {
  framework: 'spring-boot',

  // =========================================================================
  // Intentional Patterns - Don't fix these, they're by design
  // =========================================================================
  intentionalPatterns: [
    // Field injection - while constructor injection is preferred, field injection
    // is valid in Spring and often used in controllers/services
    {
      ruleId: 'java:S6813', // SonarQube - Field injection is not recommended
      filePatterns: [
        /Controller\.java$/,
        /Service\.java$/,
        /Repository\.java$/,
      ],
      codePatterns: [
        /@Autowired/,
        /@Inject/,
      ],
      reason: 'Field injection is a valid Spring pattern, especially in controllers',
    },

    // Unused parameters in controller methods - often needed for Spring MVC mapping
    {
      ruleId: 'java:S1172', // Unused parameter
      filePatterns: [
        /Controller\.java$/,
        /RestController\.java$/,
      ],
      codePatterns: [
        /@GetMapping/,
        /@PostMapping/,
        /@PutMapping/,
        /@DeleteMapping/,
        /@RequestMapping/,
      ],
      reason: 'Spring MVC controller parameters are needed for request mapping even if not directly used',
    },

    // @SuppressWarnings annotations - intentional suppression
    {
      ruleId: 'java:S1309', // @SuppressWarnings should be used with care
      filePatterns: [
        /\.java$/,
      ],
      reason: '@SuppressWarnings is intentionally used to suppress known false positives',
    },

    // Actuator endpoints exposure - often intentional for monitoring
    {
      ruleId: 'spring-actuator-non-health-enabled',
      filePatterns: [
        /application\.properties$/,
        /application\.ya?ml$/,
      ],
      codePatterns: [
        /management\.endpoints\.web\.exposure\.include/,
      ],
      reason: 'Actuator endpoints are often intentionally exposed for monitoring in production',
    },

    // Entity without equals/hashCode - sometimes intentional with JPA proxies
    {
      ruleId: 'java:S2160', // Override equals/hashCode
      filePatterns: [
        /entity\//i,
        /model\//i,
        /domain\//i,
      ],
      codePatterns: [
        /@Entity/,
        /@MappedSuperclass/,
      ],
      reason: 'JPA entities may intentionally omit equals/hashCode to work with proxy instances',
    },
  ],

  // =========================================================================
  // Filter Rules - Don't report these at all
  // =========================================================================
  filterRules: [
    // Test configuration - different rules apply
    {
      ruleId: 'java:S2187', // Test class without test methods
      condition: 'in_test_files',
      reason: 'TEST_FIXTURE',
      explanation: 'Spring test configuration classes don\'t need test methods',
    },

    // Generated code (Lombok, MapStruct, etc.)
    {
      ruleId: 'java:S1186', // Empty method body
      condition: 'in_generated_code',
      reason: 'BUILD_ARTIFACT',
      explanation: 'Generated code from Lombok/MapStruct should not be analyzed',
    },

    // Spring configuration classes
    {
      ruleId: 'java:S6830', // REST endpoint methods should not be private
      condition: 'always',
      reason: 'FRAMEWORK_BOILERPLATE',
      explanation: 'Spring configuration methods follow specific conventions',
    },
  ],

  // =========================================================================
  // Environment Requirements
  // =========================================================================
  environmentRequirements: [
    {
      requirement: 'Maven dependencies',
      checkCommand: 'ls target/dependency/*.jar 2>/dev/null || mvn dependency:resolve -q',
      fixCommand: 'mvn dependency:resolve',
      relatedErrorPatterns: [
        'package org.springframework',
        'cannot find symbol',
        'ClassNotFoundException',
      ],
    },
    {
      requirement: 'Gradle dependencies',
      checkCommand: 'ls build/libs/*.jar 2>/dev/null || ./gradlew dependencies -q',
      fixCommand: './gradlew --refresh-dependencies',
      relatedErrorPatterns: [
        'Could not resolve',
        'package org.springframework',
      ],
    },
    {
      requirement: 'Spring Boot DevTools',
      checkCommand: 'grep -q "spring-boot-devtools" pom.xml || grep -q "spring-boot-devtools" build.gradle',
      fixCommand: 'Add spring-boot-devtools dependency for development',
      relatedErrorPatterns: [
        'LiveReload',
        'devtools',
      ],
    },
  ],

  // =========================================================================
  // Framework-Specific Fix Strategies
  // =========================================================================
  fixStrategies: [
    // Security: Actuator endpoints
    {
      ruleId: 'spring-actuator-dangerous-endpoints-enabled',
      strategy: 'framework_pattern',
      frameworkPattern: 'Restrict actuator exposure: management.endpoints.web.exposure.include=health,info,metrics',
    },

    // SQL Injection prevention
    {
      ruleId: 'java:S3649', // SQL injection
      strategy: 'framework_pattern',
      frameworkPattern: 'Use @Query with named parameters or Spring Data derived queries',
    },

    // CORS configuration
    {
      ruleId: 'cors-misconfiguration',
      strategy: 'framework_pattern',
      frameworkPattern: 'Use @CrossOrigin with specific origins or WebMvcConfigurer for global CORS',
    },

    // Missing @Transactional
    {
      ruleId: 'java:S2229', // Methods should not have too many return statements
      strategy: 'skip', // This is often intentional in service methods
    },

    // ResponseEntity usage
    {
      ruleId: 'spring-response-entity-return',
      strategy: 'framework_pattern',
      frameworkPattern: 'Return ResponseEntity.ok(body) or ResponseEntity.status(code).body(body)',
    },
  ],
};

/**
 * Check if an issue matches Spring Boot intentional patterns
 */
export function isSpringBootIntentionalUse(
  ruleId: string,
  filePath: string,
  codeSnippet?: string
): { isIntentional: boolean; reason?: string } {
  for (const pattern of SPRING_BOOT_CONFIG.intentionalPatterns) {
    if (pattern.ruleId !== ruleId) continue;

    const fileMatches = pattern.filePatterns.some(p => p.test(filePath));
    if (!fileMatches) continue;

    if (pattern.codePatterns && codeSnippet) {
      const codeMatches = pattern.codePatterns.some(p => p.test(codeSnippet));
      if (!codeMatches) continue;
    }

    return {
      isIntentional: true,
      reason: pattern.reason,
    };
  }

  return { isIntentional: false };
}

export default SPRING_BOOT_CONFIG;
