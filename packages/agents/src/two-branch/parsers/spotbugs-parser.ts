/**
 * SpotBugs XML Parser
 *
 * Parses SpotBugs XML output and transforms to V9 issue format
 *
 * @see https://spotbugs.readthedocs.io/en/stable/bugDescriptions.html
 */

import { parseStringPromise } from 'xml2js';
import { logger } from '../utils/logger';

// ============================================================
// TYPES
// ============================================================

export interface SpotBugsBug {
  // Bug identity
  type: string;                    // e.g., "NP_NULL_ON_SOME_PATH"
  category: string;                // e.g., "CORRECTNESS", "BAD_PRACTICE"
  abbrev: string;                  // Short category name
  priority: 1 | 2 | 3;             // 1=critical, 2=high, 3=medium
  rank: number;                    // 1-20 (1=most scary, 20=least)

  // Location
  className: string;               // e.g., "org.apache.kafka.clients.admin.AdminClient"
  sourceFile: string;              // e.g., "AdminClient.java"
  sourceLine: number;              // Line number
  sourceStart?: number;            // Start line (if range)
  sourceEnd?: number;              // End line (if range)

  // Messages
  shortMessage: string;            // Brief description
  longMessage: string;             // Detailed explanation

  // Additional context
  method?: string;                 // Method name where bug was found
  field?: string;                  // Field name if applicable
  local?: string;                  // Local variable name if applicable
}

export interface SpotBugsAnalysisResult {
  version: string;
  timestamp: string;
  bugs: SpotBugsBug[];
  summary: {
    totalClasses: number;
    referencedClasses: number;
    totalBugs: number;
    byPriority: {
      priority1: number;
      priority2: number;
      priority3: number;
    };
    byCategory: Record<string, number>;
  };
}

// ============================================================
// PARSER
// ============================================================

export class SpotBugsParser {
  /**
   * Parse SpotBugs XML output
   */
  async parse(xml: string): Promise<SpotBugsAnalysisResult> {
    try {
      const parsed = await parseStringPromise(xml, {
        explicitArray: false,
        mergeAttrs: true
      });

      const bugCollection = parsed.BugCollection;

      if (!bugCollection) {
        throw new Error('Invalid SpotBugs XML: missing BugCollection element');
      }

      // Extract bugs
      const bugs = this.extractBugs(bugCollection);

      // Extract summary
      const summary = this.extractSummary(bugCollection, bugs);

      return {
        version: bugCollection.version || 'unknown',
        timestamp: bugCollection.timestamp || new Date().toISOString(),
        bugs,
        summary
      };

    } catch (error: any) {
      logger.error('Failed to parse SpotBugs XML:', error);
      throw new Error(`SpotBugs XML parsing failed: ${error.message}`);
    }
  }

  /**
   * Extract bug instances from parsed XML
   */
  private extractBugs(bugCollection: any): SpotBugsBug[] {
    const bugs: SpotBugsBug[] = [];

    // BugInstance can be a single object or array
    const bugInstances = Array.isArray(bugCollection.BugInstance)
      ? bugCollection.BugInstance
      : bugCollection.BugInstance
      ? [bugCollection.BugInstance]
      : [];

    for (const instance of bugInstances) {
      try {
        const bug = this.parseBugInstance(instance);
        if (bug) {
          bugs.push(bug);
        }
      } catch (error: any) {
        logger.warn('Failed to parse bug instance:', error);
        // Continue with next bug
      }
    }

    return bugs;
  }

  /**
   * Parse a single BugInstance element
   */
  private parseBugInstance(instance: any): SpotBugsBug | null {
    // Extract basic info
    const type = instance.type;
    const category = instance.category;
    const priority = parseInt(instance.priority || '3');
    const rank = parseInt(instance.rank || '20');
    const abbrev = instance.abbrev || category;

    // Extract SourceLine (location info)
    const sourceLine = instance.SourceLine;
    if (!sourceLine) {
      logger.warn(`Bug ${type} missing SourceLine information`);
      return null;
    }

    // SourceLine can be single or array (method, class, etc.)
    const primarySource = Array.isArray(sourceLine) ? sourceLine[0] : sourceLine;

    const className = primarySource.classname || 'Unknown';
    const sourceFile = primarySource.sourcefile || this.extractFileNameFromClass(className);
    const lineNumber = parseInt(primarySource.start || primarySource.end || '0');
    const sourceStart = parseInt(primarySource.start || lineNumber.toString());
    const sourceEnd = parseInt(primarySource.end || lineNumber.toString());

    // Extract messages
    const shortMessage = instance.ShortMessage || type;
    const longMessage = instance.LongMessage || shortMessage;

    // Extract method/field info if available
    const method = instance.Method?.name;
    const field = instance.Field?.name;
    const local = instance.LocalVariable?.name;

    return {
      type,
      category,
      abbrev,
      priority: priority as 1 | 2 | 3,
      rank,
      className,
      sourceFile,
      sourceLine: lineNumber,
      sourceStart,
      sourceEnd,
      shortMessage,
      longMessage,
      method,
      field,
      local
    };
  }

  /**
   * Extract summary statistics
   */
  private extractSummary(bugCollection: any, bugs: SpotBugsBug[]) {
    const findBugsSum = bugCollection.FindBugsSummary || {};

    // Count by priority
    const byPriority = {
      priority1: bugs.filter(b => b.priority === 1).length,
      priority2: bugs.filter(b => b.priority === 2).length,
      priority3: bugs.filter(b => b.priority === 3).length
    };

    // Count by category
    const byCategory: Record<string, number> = {};
    for (const bug of bugs) {
      byCategory[bug.category] = (byCategory[bug.category] || 0) + 1;
    }

    return {
      totalClasses: parseInt(findBugsSum.total_classes || '0'),
      referencedClasses: parseInt(findBugsSum.referenced_classes || '0'),
      totalBugs: bugs.length,
      byPriority,
      byCategory
    };
  }

  /**
   * Extract file name from fully qualified class name
   */
  private extractFileNameFromClass(className: string): string {
    const parts = className.split('.');
    const simpleClassName = parts[parts.length - 1];
    return `${simpleClassName}.java`;
  }

  /**
   * Map SpotBugs priority to CodeQual severity
   */
  mapPriorityToSeverity(priority: number): 'critical' | 'high' | 'medium' | 'low' {
    switch (priority) {
      case 1:
        return 'critical';
      case 2:
        return 'high';
      case 3:
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Map SpotBugs category to CodeQual category
   */
  mapSpotBugsCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'CORRECTNESS': 'bug',
      'BAD_PRACTICE': 'code-quality',
      'PERFORMANCE': 'performance',
      'MALICIOUS_CODE': 'security',
      'MT_CORRECTNESS': 'concurrency',
      'SECURITY': 'security',
      'STYLE': 'style',
      'EXPERIMENTAL': 'experimental',
      'I18N': 'internationalization'
    };

    return categoryMap[category] || 'bug';
  }

  /**
   * Get human-readable bug type explanation
   */
  getBugTypeExplanation(type: string): string {
    const explanations: Record<string, string> = {
      // Null pointer bugs
      'NP_NULL_ON_SOME_PATH': 'Possible null pointer dereference on path through code',
      'NP_NULL_PARAM_DEREF': 'Null pointer dereference due to parameter',
      'NP_ALWAYS_NULL': 'Null pointer dereference because value is always null',
      'NP_LOAD_OF_KNOWN_NULL_VALUE': 'Load of known null value',

      // Resource leaks
      'OBL_UNSATISFIED_OBLIGATION': 'Method may fail to clean up resource',
      'OS_OPEN_STREAM': 'Method may fail to close stream',
      'ODR_OPEN_DATABASE_RESOURCE': 'Method may fail to close database resource',

      // Concurrency
      'IS2_INCONSISTENT_SYNC': 'Inconsistent synchronization on field',
      'DC_DOUBLECHECK': 'Possible double check of field',
      'NN_NAKED_NOTIFY': 'Naked notify',

      // Security
      'SQL_PREPARED_STATEMENT_GENERATED_FROM_NONCONSTANT_STRING': 'SQL injection vulnerability',
      'XSS_REQUEST_PARAMETER_TO_SEND_ERROR': 'Cross-site scripting vulnerability',
      'PATH_TRAVERSAL_IN': 'Potential path traversal vulnerability',

      // Bad practice
      'DE_MIGHT_IGNORE': 'Method ignores exceptional return value',
      'RV_RETURN_VALUE_IGNORED_BAD_PRACTICE': 'Return value ignored',
      'SE_BAD_FIELD': 'Non-serializable field in serializable class'
    };

    return explanations[type] || `SpotBugs found issue: ${type}`;
  }
}

// ============================================================
// V9 TRANSFORMATION
// ============================================================

export interface V9Issue {
  id: string;
  tool: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  file: string;
  line: number;
  column?: number;
  message: string;
  explanation: string;
  rule: string;
  priority?: number;
  [key: string]: any;
}

/**
 * Transform SpotBugs bug to V9 issue format
 */
export function transformToV9Issue(bug: SpotBugsBug, branch: 'main' | 'pr'): V9Issue {
  const parser = new SpotBugsParser();

  // Convert Java package path to file path
  const filePath = bug.sourceFile.includes('/')
    ? bug.sourceFile
    : bug.className.replace(/\./g, '/') + '.java';

  return {
    id: `SPOTBUGS-${bug.type}-${bug.sourceLine}`,
    tool: 'SpotBugs',
    severity: parser.mapPriorityToSeverity(bug.priority),
    category: parser.mapSpotBugsCategory(bug.category),
    file: filePath,
    line: bug.sourceLine,
    message: bug.shortMessage,
    explanation: bug.longMessage,
    rule: bug.type,
    priority: bug.priority,
    rank: bug.rank,
    spotbugsCategory: bug.category,
    method: bug.method,
    field: bug.field,
    branch
  };
}

/**
 * Batch transform SpotBugs bugs to V9 issues
 */
export function transformSpotBugsResults(
  result: SpotBugsAnalysisResult,
  branch: 'main' | 'pr'
): V9Issue[] {
  return result.bugs.map(bug => transformToV9Issue(bug, branch));
}

// ============================================================
// EXPORTS
// ============================================================

export default SpotBugsParser;