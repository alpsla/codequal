/**
 * SpotBugs-specific fix generator
 * Runs in the same pod as SpotBugs analyzer for optimal performance
 */

import { BaseFixGenerator, IssueContext, IssueFix } from './base-fix-generator';

export class SpotBugsFixGenerator extends BaseFixGenerator {
  // Pattern database for common SpotBugs issues
  private readonly fixPatterns = new Map<string, (issue: IssueContext) => IssueFix>([
    ['NP_NULL_ON_SOME_PATH', this.fixNullPointer.bind(this)],
    ['SQL_PREPARED_STATEMENT_GENERATED_FROM_NONCONSTANT_STRING', this.fixSqlInjection.bind(this)],
    ['OS_OPEN_STREAM', this.fixUnclosedStream.bind(this)],
    ['REC_CATCH_EXCEPTION', this.fixBroadCatch.bind(this)],
    ['EI_EXPOSE_REP', this.fixExposedInternalRep.bind(this)],
  ]);

  constructor() {
    super('spotbugs');
  }

  protected async generateSpecificFix(issue: IssueContext): Promise<IssueFix> {
    // Check if we have a specific pattern handler
    for (const [pattern, handler] of this.fixPatterns) {
      if (issue.message.includes(pattern) || issue.type.includes(pattern)) {
        return handler(issue);
      }
    }

    // Default fix based on severity
    return this.generateDefaultFix(issue);
  }

  private fixNullPointer(issue: IssueContext): IssueFix {
    return {
      suggestion: 'Add null check before dereferencing the object',
      code: `if (${this.extractVariable(issue)} != null) {
    ${issue.codeSnippet || '// original code here'}
}`,
      confidence: 0.9
    };
  }

  private fixSqlInjection(issue: IssueContext): IssueFix {
    return {
      suggestion: 'Use PreparedStatement with parameterized queries',
      code: `String sql = "SELECT * FROM users WHERE id = ?";
try (PreparedStatement pstmt = connection.prepareStatement(sql)) {
    pstmt.setString(1, userId);
    ResultSet rs = pstmt.executeQuery();
    // process results
}`,
      confidence: 0.95
    };
  }

  private fixUnclosedStream(issue: IssueContext): IssueFix {
    const streamVar = this.extractVariable(issue);
    return {
      suggestion: 'Use try-with-resources to automatically close the stream',
      code: `try (FileInputStream ${streamVar} = new FileInputStream(file)) {
    // use stream
} catch (IOException e) {
    logger.error("Failed to read file", e);
}`,
      confidence: 0.9
    };
  }

  private fixBroadCatch(issue: IssueContext): IssueFix {
    return {
      suggestion: 'Catch specific exceptions instead of generic Exception',
      code: `try {
    // code that might throw exceptions
} catch (IOException e) {
    logger.error("IO error occurred", e);
    throw new ServiceException("Failed to process file", e);
} catch (SQLException e) {
    logger.error("Database error occurred", e);
    throw new ServiceException("Failed to query database", e);
}`,
      confidence: 0.85
    };
  }

  private fixExposedInternalRep(issue: IssueContext): IssueFix {
    return {
      suggestion: 'Return a defensive copy instead of the internal array/collection',
      code: `public Date getDate() {
    return date != null ? new Date(date.getTime()) : null;
}

public List<String> getItems() {
    return new ArrayList<>(items);
}`,
      confidence: 0.9
    };
  }

  private generateDefaultFix(issue: IssueContext): IssueFix {
    const severityActions = {
      critical: 'IMMEDIATELY address this critical security/stability issue',
      high: 'Fix this issue before merging to prevent production problems',
      medium: 'Consider refactoring to improve code quality',
      low: 'Apply best practices to enhance maintainability'
    };

    return {
      suggestion: severityActions[issue.severity as keyof typeof severityActions] || 'Review and fix this issue',
      code: `// TODO: Fix ${issue.type} issue
// ${issue.message}
// Original line ${issue.line}: ${issue.codeSnippet || 'see file'}`,
      confidence: 0.6
    };
  }

  private extractVariable(issue: IssueContext): string {
    // Try to extract variable name from code snippet
    if (issue.codeSnippet) {
      const match = issue.codeSnippet.match(/(\w+)\s*\./);
      if (match) return match[1];
    }
    return 'object';
  }
}