/**
 * GapAnalyzer - Identifies missing data in analysis results
 */

export interface Gap {
  field: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestedPrompt?: string;
}

export interface GapAnalysis {
  totalGaps: number;
  criticalGaps: number;
  gaps: Gap[];
  completeness: number; // Percentage 0-100
}

export class GapAnalyzer {
  private requiredFields: any;

  constructor() {
    // Define the complete structure we need
    this.requiredFields = {
      issues: {
        required: ['title', 'severity', 'category', 'impact', 'file', 'line', 'codeSnippet', 'fix'],
        priority: 'critical'
      },
      testCoverage: {
        required: ['overall', 'byCategory', 'testFileCount', 'sourceFileCount'],
        priority: 'high'
      },
      dependencies: {
        required: ['total', 'outdated', 'vulnerable'],
        priority: 'medium'
      },
      architecture: {
        required: ['score', 'antiPatterns', 'recommendations'],
        priority: 'medium'
      },
      teamMetrics: {
        required: ['contributors', 'mainContributors'],
        priority: 'low'
      },
      documentation: {
        required: ['score', 'missing'],
        priority: 'low'
      }
    };
  }

  /**
   * Analyze the current result and identify gaps
   */
  analyzeGaps(currentResult: any): GapAnalysis {
    const gaps: Gap[] = [];
    let totalFields = 0;
    let filledFields = 0;

    // Check issues
    if (!currentResult.issues || currentResult.issues.length === 0) {
      gaps.push({
        field: 'issues',
        description: 'No issues found - need comprehensive issue analysis',
        priority: 'critical',
        suggestedPrompt: 'Find and list all security, performance, and code quality issues with exact file paths and line numbers'
      });
    } else {
      totalFields += currentResult.issues.length * 8; // 8 required fields per issue
      
      currentResult.issues.forEach((issue: any, index: number) => {
        this.requiredFields.issues.required.forEach((field: string) => {
          if (!issue[field]) {
            gaps.push({
              field: `issues[${index}].${field}`,
              description: `Issue #${index + 1} missing ${field}`,
              priority: 'high',
              suggestedPrompt: `For issue "${issue.title || 'Unknown'}", provide ${field}`
            });
          } else {
            filledFields++;
          }
        });

        // Check for specific field quality
        if (issue.file === 'unknown' || !issue.file) {
          gaps.push({
            field: `issues[${index}].location`,
            description: `Issue "${issue.title}" has unknown location`,
            priority: 'high',
            suggestedPrompt: `Find exact file path and line number for: ${issue.title}`
          });
        }

        if (!issue.codeSnippet || issue.codeSnippet.length < 10) {
          gaps.push({
            field: `issues[${index}].codeSnippet`,
            description: `Issue "${issue.title}" missing code snippet`,
            priority: 'medium',
            suggestedPrompt: `Show the actual code causing: ${issue.title}`
          });
        }
      });
    }

    // Check test coverage
    totalFields += 4;
    if (!currentResult.testCoverage) {
      gaps.push({
        field: 'testCoverage',
        description: 'Test coverage analysis missing',
        priority: 'high',
        suggestedPrompt: 'Analyze test files and provide exact test coverage percentage (0-100)'
      });
    } else {
      if (!currentResult.testCoverage.overall || currentResult.testCoverage.overall === 0) {
        gaps.push({
          field: 'testCoverage.overall',
          description: 'Missing overall test coverage percentage',
          priority: 'high',
          suggestedPrompt: 'Calculate exact test coverage percentage by counting test files vs source files'
        });
      } else {
        filledFields++;
      }

      if (!currentResult.testCoverage.testFileCount) {
        gaps.push({
          field: 'testCoverage.testFileCount',
          description: 'Missing test file count',
          priority: 'medium',
          suggestedPrompt: 'Count all test files (*.test.ts, *.spec.js, etc.)'
        });
      } else {
        filledFields++;
      }
    }

    // Check dependencies
    totalFields += 3;
    if (!currentResult.dependencies) {
      gaps.push({
        field: 'dependencies',
        description: 'Dependency analysis missing',
        priority: 'medium',
        suggestedPrompt: 'Analyze package.json and list all outdated and vulnerable dependencies'
      });
    } else {
      if (!currentResult.dependencies.outdated || currentResult.dependencies.outdated.length === 0) {
        gaps.push({
          field: 'dependencies.outdated',
          description: 'No outdated dependencies found (suspicious)',
          priority: 'medium',
          suggestedPrompt: 'List all dependencies from package.json with current vs latest versions'
        });
      } else {
        filledFields++;
      }
    }

    // Check architecture
    totalFields += 3;
    if (!currentResult.architecture) {
      gaps.push({
        field: 'architecture',
        description: 'Architecture analysis missing',
        priority: 'medium',
        suggestedPrompt: 'Analyze code architecture and identify anti-patterns'
      });
    } else {
      if (!currentResult.architecture.score) {
        gaps.push({
          field: 'architecture.score',
          description: 'Architecture score missing',
          priority: 'low',
          suggestedPrompt: 'Rate architecture quality from 0-100'
        });
      } else {
        filledFields++;
      }
    }

    // Check team metrics
    totalFields += 2;
    if (!currentResult.teamMetrics) {
      gaps.push({
        field: 'teamMetrics',
        description: 'Team metrics missing',
        priority: 'low',
        suggestedPrompt: 'Count exact number of contributors to this repository'
      });
    } else {
      if (!currentResult.teamMetrics.contributors || currentResult.teamMetrics.contributors === 0) {
        gaps.push({
          field: 'teamMetrics.contributors',
          description: 'Contributor count missing or zero',
          priority: 'low',
          suggestedPrompt: 'Count the exact number of unique contributors'
        });
      } else {
        filledFields++;
      }
    }

    // Check documentation
    totalFields += 2;
    if (!currentResult.documentation) {
      gaps.push({
        field: 'documentation',
        description: 'Documentation analysis missing',
        priority: 'low',
        suggestedPrompt: 'Assess documentation quality and completeness'
      });
    } else {
      if (!currentResult.documentation.score) {
        gaps.push({
          field: 'documentation.score',
          description: 'Documentation score missing',
          priority: 'low',
          suggestedPrompt: 'Rate documentation quality from 0-100'
        });
      } else {
        filledFields++;
      }
    }

    // Calculate completeness
    const completeness = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
    const criticalGaps = gaps.filter(g => g.priority === 'critical').length;

    return {
      totalGaps: gaps.length,
      criticalGaps,
      gaps,
      completeness
    };
  }

  /**
   * Generate a prompt to fill specific gaps
   */
  generateGapFillingPrompt(gaps: Gap[], iteration: number): string {
    if (gaps.length === 0) {
      return '';
    }

    const prompts: string[] = [];
    
    // Group by priority
    const criticalGaps = gaps.filter(g => g.priority === 'critical');
    const highGaps = gaps.filter(g => g.priority === 'high');
    const mediumGaps = gaps.filter(g => g.priority === 'medium');
    const lowGaps = gaps.filter(g => g.priority === 'low');

    if (iteration === 2) {
      prompts.push('Please provide the following missing information:');
      prompts.push('');
      
      // Focus on critical and high priority gaps
      if (criticalGaps.length > 0) {
        prompts.push('CRITICAL INFORMATION NEEDED:');
        criticalGaps.forEach(gap => {
          if (gap.suggestedPrompt) {
            prompts.push(`- ${gap.suggestedPrompt}`);
          }
        });
        prompts.push('');
      }

      if (highGaps.length > 0) {
        prompts.push('IMPORTANT INFORMATION NEEDED:');
        highGaps.slice(0, 10).forEach(gap => { // Limit to 10 to avoid overwhelming
          if (gap.suggestedPrompt) {
            prompts.push(`- ${gap.suggestedPrompt}`);
          }
        });
      }
    } else if (iteration === 3) {
      // Very specific requests for final gaps
      prompts.push('Please provide these specific final details:');
      prompts.push('');
      
      const allGaps = [...criticalGaps, ...highGaps, ...mediumGaps];
      allGaps.slice(0, 5).forEach(gap => { // Only top 5 remaining gaps
        prompts.push(`${gap.field}: ${gap.suggestedPrompt || gap.description}`);
      });
    }

    prompts.push('');
    prompts.push('Provide exact values, not estimates. Include code snippets where applicable.');

    return prompts.join('\n');
  }

  /**
   * Check if we have enough data to proceed
   */
  isComplete(gapAnalysis: GapAnalysis): boolean {
    return gapAnalysis.completeness >= 85 && gapAnalysis.criticalGaps === 0;
  }
}