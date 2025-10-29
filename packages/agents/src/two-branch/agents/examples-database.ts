/**
 * Compact Examples Database for AI Agent Few-Shot Learning
 * 
 * Strategy: 2-3 examples per category in compact JSON format
 * Purpose: Teach AI agents how to generate high-quality fix recommendations
 * Cost: ~200 tokens per prompt (very efficient)
 */

export interface FixExample {
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  before: string;   // Short code snippet showing the issue
  after: string;    // Fixed version
  why: string;      // One-line explanation of why the fix works
}

/**
 * Security Examples - High-impact vulnerabilities
 */
export const SECURITY_EXAMPLES: FixExample[] = [
  {
    rule: "SQL Injection",
    severity: "critical",
    before: "String query = \"SELECT * FROM users WHERE id = '\" + userId + \"'\";",
    after: "PreparedStatement stmt = conn.prepareStatement(\"SELECT * FROM users WHERE id = ?\");\nstmt.setString(1, userId);",
    why: "Prevents SQL injection by using parameterized queries"
  },
  {
    rule: "XSS",
    severity: "high",
    before: "response.getWriter().write(userInput);",
    after: "response.getWriter().write(ESAPI.encoder().encodeForHTML(userInput));",
    why: "Prevents XSS by encoding user input before rendering"
  },
  {
    rule: "Weak Random",
    severity: "high",
    before: "Random random = new Random();\nint token = random.nextInt();",
    after: "SecureRandom secureRandom = new SecureRandom();\nint token = secureRandom.nextInt();",
    why: "SecureRandom provides cryptographically strong randomness for security tokens"
  }
];

/**
 * Performance Examples - Efficiency and resource optimization
 */
export const PERFORMANCE_EXAMPLES: FixExample[] = [
  {
    rule: "Unguarded Log",
    severity: "medium",
    before: "logger.debug(\"User data: \" + user.toString());",
    after: "if (logger.isDebugEnabled()) {\n    logger.debug(\"User data: {}\", user);\n}",
    why: "Avoids expensive string concatenation when debug logging is disabled"
  },
  {
    rule: "Inefficient Loop",
    severity: "medium",
    before: "for (int i = 0; i < list.size(); i++) {\n    process(list.get(i));\n}",
    after: "int size = list.size();\nfor (int i = 0; i < size; i++) {\n    process(list.get(i));\n}",
    why: "Caches size() result to avoid redundant method calls in loop condition"
  }
];

/**
 * Architecture Examples - Design patterns and structure
 */
export const ARCHITECTURE_EXAMPLES: FixExample[] = [
  {
    rule: "God Class",
    severity: "medium",
    before: "public class Manager {\n    // 1000+ lines handling users, orders, payments, notifications...\n}",
    after: "public class UserManager { /* user logic */ }\npublic class OrderManager { /* order logic */ }\npublic class PaymentService { /* payment logic */ }",
    why: "Single Responsibility Principle - each class has one clear purpose"
  },
  {
    rule: "Tight Coupling",
    severity: "medium",
    before: "public class Service {\n    private DatabaseImpl db = new DatabaseImpl();\n}",
    after: "public class Service {\n    private Database db;\n    public Service(Database db) { this.db = db; }\n}",
    why: "Dependency Injection enables testing and flexibility"
  }
];

/**
 * Dependency Examples - Library and version management
 */
export const DEPENDENCY_EXAMPLES: FixExample[] = [
  {
    rule: "CVE Vulnerability",
    severity: "high",
    before: "<dependency>\n    <groupId>com.fasterxml.jackson.core</groupId>\n    <artifactId>jackson-databind</artifactId>\n    <version>2.9.0</version>\n</dependency>",
    after: "<dependency>\n    <groupId>com.fasterxml.jackson.core</groupId>\n    <artifactId>jackson-databind</artifactId>\n    <version>2.14.2</version>\n</dependency>",
    why: "Updates to patched version that fixes CVE-2019-12384 (RCE vulnerability)"
  },
  {
    rule: "Outdated Dependency",
    severity: "medium",
    before: "implementation 'org.springframework.boot:spring-boot-starter-web:2.0.0'",
    after: "implementation 'org.springframework.boot:spring-boot-starter-web:3.1.0'",
    why: "Updates to LTS version with security patches and performance improvements"
  }
];

/**
 * Code Quality Examples - Best practices and maintainability
 */
export const CODE_QUALITY_EXAMPLES: FixExample[] = [
  {
    rule: "System.out.println",
    severity: "medium",
    before: "System.out.println(\"User logged in: \" + userId);",
    after: "private static final Logger logger = LoggerFactory.getLogger(MyClass.class);\nlogger.info(\"User logged in: {}\", userId);",
    why: "Proper logging framework with levels, formatting, and centralized configuration"
  },
  {
    rule: "Raw Exception",
    severity: "medium",
    before: "throw new Exception(\"Invalid input\");",
    after: "throw new IllegalArgumentException(\"Invalid input: expected non-null user ID\");",
    why: "Specific exception types enable proper error handling and meaningful error messages"
  },
  {
    rule: "Parameter Reassignment",
    severity: "medium",
    before: "public void process(String input) {\n    input = input.trim();\n}",
    after: "public void process(String input) {\n    String trimmedInput = input.trim();\n}",
    why: "Avoids confusing parameter mutations; use local variables for transformations"
  }
];

/**
 * Get examples for a specific category
 */
export function getExamplesForCategory(
  category: string,
  limit = 2
): FixExample[] {
  const normalizedCategory = category.toLowerCase().replace(/[_\s]+/g, ' ').trim();
  
  let examples: FixExample[] = [];
  
  if (normalizedCategory.includes('security')) {
    examples = SECURITY_EXAMPLES;
  } else if (normalizedCategory.includes('performance')) {
    examples = PERFORMANCE_EXAMPLES;
  } else if (normalizedCategory.includes('architecture')) {
    examples = ARCHITECTURE_EXAMPLES;
  } else if (normalizedCategory.includes('dependen')) {
    examples = DEPENDENCY_EXAMPLES;
  } else {
    // Default to Code Quality for anything else
    examples = CODE_QUALITY_EXAMPLES;
  }
  
  return examples.slice(0, limit);
}

/**
 * Map from category to examples
 */
export const EXAMPLES_BY_CATEGORY: Record<string, FixExample[]> = {
  'Security': SECURITY_EXAMPLES,
  'Performance': PERFORMANCE_EXAMPLES,
  'Architecture': ARCHITECTURE_EXAMPLES,
  'Dependencies': DEPENDENCY_EXAMPLES,
  'Code Quality': CODE_QUALITY_EXAMPLES
};




