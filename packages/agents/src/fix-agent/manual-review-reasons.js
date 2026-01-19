"use strict";
/**
 * Manual Review Reasons
 *
 * Defines WHY certain issues cannot be auto-fixed and what the user needs to do.
 * Part of Option 3: User-friendly "can't fix" messages
 *
 * Categories:
 * - CONTEXT_REQUIRED: Need business logic understanding
 * - SECURITY_DECISION: Security trade-off that owner must make
 * - ARCHITECTURE_DECISION: Architectural change needed
 * - BREAKING_CHANGE: Fix would break API/behavior
 * - MULTIPLE_OPTIONS: Several valid fixes, user must choose
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERFORMANCE_MANUAL_REVIEW = exports.QUALITY_MANUAL_REVIEW = exports.SECURITY_MANUAL_REVIEW = void 0;
exports.getManualReviewInfo = getManualReviewInfo;
exports.generateManualReviewMessage = generateManualReviewMessage;
exports.canAIHelp = canAIHelp;
exports.getAIPromptHint = getAIPromptHint;
/**
 * Security Issues - Why they need manual review
 */
exports.SECURITY_MANUAL_REVIEW = {
    // Hardcoded secrets (S105, S106, S107)
    'hardcoded-password': {
        reason: 'SECURITY_DECISION',
        explanation: 'Hardcoded passwords/secrets detected. Auto-fix cannot know where to store secrets in YOUR infrastructure.',
        userAction: 'Move secrets to environment variables, secret manager (AWS Secrets Manager, HashiCorp Vault), or .env files (not committed).',
        aiCanHelp: true,
        aiPromptHint: 'Replace hardcoded secret with environment variable lookup. Use os.environ.get() for Python, process.env for Node.js.',
        exampleFix: `
// Before: const API_KEY = "sk-12345abcdef";
// After:  const API_KEY = process.env.API_KEY || '';`,
        riskLevel: 'high',
    },
    // SQL Injection (S608)
    'sql-injection': {
        reason: 'CONTEXT_REQUIRED',
        explanation: 'SQL injection vulnerability detected. Fix requires understanding your database layer and ORM usage.',
        userAction: 'Use parameterized queries or your ORM\'s built-in escaping. Never concatenate user input into SQL strings.',
        aiCanHelp: true,
        aiPromptHint: 'Convert string concatenation SQL to parameterized query. Detect ORM (SQLAlchemy, Django ORM, TypeORM) and use appropriate syntax.',
        exampleFix: `
# Before: query = "SELECT * FROM users WHERE id = " + user_id
# After:  cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))`,
        riskLevel: 'high',
    },
    // Command Injection (S602, subprocess shell=True)
    'command-injection': {
        reason: 'ARCHITECTURE_DECISION',
        explanation: 'Command injection risk via shell=True. Removing shell=True may break the command if it uses shell features.',
        userAction: 'Review if shell features (pipes, wildcards) are needed. If not, use shell=False with command as list.',
        aiCanHelp: true,
        aiPromptHint: 'Convert subprocess.call(cmd, shell=True) to subprocess.run([...], shell=False). Split command into list.',
        exampleFix: `
# Before: subprocess.call(f"ls {directory}", shell=True)
# After:  subprocess.run(["ls", directory], shell=False, check=True)`,
        riskLevel: 'high',
    },
    // Insecure Deserialization (S301 - pickle)
    'insecure-deserialization': {
        reason: 'ARCHITECTURE_DECISION',
        explanation: 'Pickle deserialization can execute arbitrary code. Requires choosing a safe serialization format.',
        userAction: 'Replace pickle with JSON for simple data, or use a safe serialization library. If pickle is required, only deserialize trusted data.',
        aiCanHelp: true,
        aiPromptHint: 'Replace pickle.loads() with json.loads(). Handle type conversion for non-JSON-native types.',
        exampleFix: `
# Before: data = pickle.loads(raw_data)
# After:  data = json.loads(raw_data)  # For JSON-compatible data`,
        riskLevel: 'high',
    },
    // Weak Cryptography (S303, S304, S324)
    'weak-cryptography': {
        reason: 'SECURITY_DECISION',
        explanation: 'Weak hash/cipher detected (MD5, SHA1, DES). Fix depends on backward compatibility requirements.',
        userAction: 'Replace MD5/SHA1 with SHA-256 or SHA-3. For password hashing, use bcrypt, scrypt, or Argon2.',
        aiCanHelp: true,
        aiPromptHint: 'Replace hashlib.md5() with hashlib.sha256(). For passwords, suggest bcrypt.',
        exampleFix: `
# Before: hashlib.md5(password.encode()).hexdigest()
# After:  hashlib.sha256(password.encode()).hexdigest()
# Best:   bcrypt.hashpw(password.encode(), bcrypt.gensalt())`,
        riskLevel: 'high',
    },
    // eval/exec usage (S102, S307)
    'dynamic-code-execution': {
        reason: 'ARCHITECTURE_DECISION',
        explanation: 'eval()/exec() detected. These are almost always dangerous. Replacement depends on what the code is trying to achieve.',
        userAction: 'Determine what the dynamic code does and replace with a safe alternative (dict lookup, match/case, AST parsing for expressions).',
        aiCanHelp: true,
        aiPromptHint: 'Analyze eval() usage. If evaluating math expressions, use ast.literal_eval(). If dynamic dispatch, use dict of functions.',
        exampleFix: `
# Before: result = eval(expression)
# After:  result = ast.literal_eval(expression)  # Safe for literals only`,
        riskLevel: 'high',
    },
    // Path Traversal
    'path-traversal': {
        reason: 'CONTEXT_REQUIRED',
        explanation: 'Path traversal vulnerability. Fix requires knowing the allowed file access patterns.',
        userAction: 'Validate that resolved path stays within allowed directory. Use os.path.realpath() and check prefix.',
        aiCanHelp: true,
        aiPromptHint: 'Add path validation: resolve real path and check it starts with allowed base directory.',
        exampleFix: `
# Before: path = os.path.join(base, user_input)
# After:  path = os.path.realpath(os.path.join(base, user_input))
#         if not path.startswith(os.path.realpath(base)):
#             raise ValueError("Path traversal detected")`,
        riskLevel: 'high',
    },
};
/**
 * Quality Issues - Why some need manual review
 */
exports.QUALITY_MANUAL_REVIEW = {
    // Unused variables (F841, no-unused-vars)
    'unused-variable': {
        reason: 'MULTIPLE_OPTIONS',
        explanation: 'Unused variable detected. Could be: intentional placeholder, bug (meant to use it), or dead code.',
        userAction: 'Determine if variable should be: removed, used, or prefixed with _ to indicate intentional non-use.',
        aiCanHelp: true,
        aiPromptHint: 'Analyze if variable is debugging leftover (remove), error (find where to use), or intentional (_prefix).',
        exampleFix: `
# Option 1: Remove it
# Option 2: Use it where intended
# Option 3: unused_var -> _unused_var (intentional)`,
        riskLevel: 'low',
    },
    // Empty catch/except blocks
    'empty-catch-block': {
        reason: 'CONTEXT_REQUIRED',
        explanation: 'Empty catch block swallows exceptions. Fix depends on what should happen on error.',
        userAction: 'Decide: log the error, re-raise, return default value, or handle specifically.',
        aiCanHelp: true,
        aiPromptHint: 'Add logging to catch block at minimum. Suggest re-raising if exception type is unexpected.',
        exampleFix: `
# Before: except Exception: pass
# After:  except SpecificError as e:
#             logger.warning(f"Expected error: {e}")
#         except Exception:
#             raise  # Re-raise unexpected errors`,
        riskLevel: 'medium',
    },
    // Magic numbers
    'magic-number': {
        reason: 'CONTEXT_REQUIRED',
        explanation: 'Magic number detected. Auto-fix cannot know the semantic meaning to create a good constant name.',
        userAction: 'Extract to named constant with descriptive name explaining the value\'s purpose.',
        aiCanHelp: true,
        aiPromptHint: 'Suggest constant name based on context. E.g., 86400 -> SECONDS_PER_DAY, 1000 -> MAX_RETRY_COUNT.',
        exampleFix: `
# Before: for i in range(1000):
# After:  MAX_ITERATIONS = 1000
#         for i in range(MAX_ITERATIONS):`,
        riskLevel: 'low',
    },
    // Complex function (too many parameters, too long)
    'complexity-too-high': {
        reason: 'ARCHITECTURE_DECISION',
        explanation: 'Function is too complex. Refactoring requires understanding the domain and choosing appropriate abstractions.',
        userAction: 'Break into smaller functions, use parameter objects, or apply design patterns appropriate to your domain.',
        aiCanHelp: false, // Too context-dependent
        riskLevel: 'medium',
    },
};
/**
 * Performance Issues - Why they need manual review
 */
exports.PERFORMANCE_MANUAL_REVIEW = {
    // String concatenation in loop
    'string-concat-in-loop': {
        reason: 'AI_CAN_HELP',
        explanation: 'String concatenation in loop creates O(n²) performance. Use StringBuilder/join() pattern.',
        userAction: 'Replace += with list.append() then join(), or use StringBuilder (Java).',
        aiCanHelp: true,
        aiPromptHint: 'Convert string += in loop to list append + join pattern.',
        exampleFix: `
# Before: result = ""; for x in items: result += x
# After:  result = "".join(items)`,
        riskLevel: 'low',
    },
    // Object creation in loop
    'object-creation-in-loop': {
        reason: 'CONTEXT_REQUIRED',
        explanation: 'Creating objects in loop may be intentional (unique per iteration) or wasteful (same object reused).',
        userAction: 'If object is the same each iteration, move creation outside loop. If unique per iteration, this is correct.',
        aiCanHelp: true,
        aiPromptHint: 'Analyze if object creation depends on loop variable. If not, hoist outside loop.',
        exampleFix: `
# Before: for i in range(100): pattern = re.compile(r"\\d+")
# After:  pattern = re.compile(r"\\d+")  # Hoist out
#         for i in range(100): ...use pattern...`,
        riskLevel: 'low',
    },
    // N+1 query pattern
    'n-plus-one-query': {
        reason: 'ARCHITECTURE_DECISION',
        explanation: 'N+1 query pattern detected. Fix requires understanding ORM/database layer and data requirements.',
        userAction: 'Use eager loading (select_related/prefetch_related in Django, JOIN in SQL, include() in Prisma).',
        aiCanHelp: true,
        aiPromptHint: 'Detect ORM and suggest appropriate eager loading syntax.',
        exampleFix: `
# Before: for user in User.objects.all(): print(user.profile.name)
# After:  for user in User.objects.select_related('profile'): print(user.profile.name)`,
        riskLevel: 'medium',
    },
};
/**
 * Get manual review info for a rule
 */
function getManualReviewInfo(ruleId, category) {
    const maps = {
        security: exports.SECURITY_MANUAL_REVIEW,
        quality: exports.QUALITY_MANUAL_REVIEW,
        performance: exports.PERFORMANCE_MANUAL_REVIEW,
    };
    const categoryMap = maps[category];
    // Direct match
    if (categoryMap[ruleId]) {
        return categoryMap[ruleId];
    }
    // Pattern matching for rule IDs
    const patterns = {
        // Security patterns
        'S105|S106|S107|hardcoded': 'hardcoded-password',
        'S608|sql.*injection|sqli': 'sql-injection',
        'S602|S603|S604|S605|shell.*true|subprocess': 'command-injection',
        'S301|S302|pickle|marshal': 'insecure-deserialization',
        'S303|S304|S324|md5|sha1|weak.*hash|weak.*cipher': 'weak-cryptography',
        'S102|S307|eval|exec': 'dynamic-code-execution',
        'path.*traversal|directory.*traversal': 'path-traversal',
        // Quality patterns
        'F841|unused.*var|no-unused-vars': 'unused-variable',
        'empty.*catch|EmptyCatchBlock|bare.*except': 'empty-catch-block',
        'magic.*number|MagicNumber': 'magic-number',
        'complexity|cyclomatic|cognitive': 'complexity-too-high',
        // Performance patterns
        'string.*concat.*loop|InefficientStringBuffering': 'string-concat-in-loop',
        'object.*loop|AvoidInstantiatingObjectsInLoops': 'object-creation-in-loop',
        'n\\+1|N\\+1|eager.*load': 'n-plus-one-query',
    };
    for (const [pattern, key] of Object.entries(patterns)) {
        if (new RegExp(pattern, 'i').test(ruleId)) {
            return categoryMap[key] || null;
        }
    }
    return null;
}
/**
 * Generate user-friendly message for issues that can't be auto-fixed
 */
function generateManualReviewMessage(ruleId, category, filePath, lineNumber) {
    const info = getManualReviewInfo(ruleId, category);
    if (!info) {
        return `⚠️ **Manual Review Required** (${ruleId})

Location: ${filePath}:${lineNumber}

This issue requires human judgment to fix safely. Please review the flagged code and apply an appropriate fix based on your application's requirements.`;
    }
    let message = `⚠️ **Manual Review Required** (${ruleId})

📍 **Location:** ${filePath}:${lineNumber}

❓ **Why can't this be auto-fixed?**
${info.explanation}

✅ **What you should do:**
${info.userAction}`;
    if (info.exampleFix) {
        message += `

💡 **Example fix:**
\`\`\`
${info.exampleFix.trim()}
\`\`\``;
    }
    if (info.aiCanHelp) {
        message += `

🤖 **AI Suggestion Available:** Our AI can generate a context-aware fix suggestion for this issue. Request AI fix for more specific guidance.`;
    }
    message += `

⚡ **Risk Level:** ${info.riskLevel.toUpperCase()}`;
    return message;
}
/**
 * Check if AI can help with this issue
 */
function canAIHelp(ruleId, category) {
    var _a;
    const info = getManualReviewInfo(ruleId, category);
    return (_a = info === null || info === void 0 ? void 0 : info.aiCanHelp) !== null && _a !== void 0 ? _a : false;
}
/**
 * Get AI prompt hint for generating fix
 */
function getAIPromptHint(ruleId, category) {
    var _a;
    const info = getManualReviewInfo(ruleId, category);
    return (_a = info === null || info === void 0 ? void 0 : info.aiPromptHint) !== null && _a !== void 0 ? _a : null;
}
