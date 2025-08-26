/**
 * Enhanced Code Quality parser for DeepWiki responses
 * Extracts complexity metrics, duplication, test coverage, and other quality indicators
 */

export interface CodeQualityMetrics {
  complexity: ComplexityMetrics;
  duplication: DuplicationMetrics;
  testCoverage: TestCoverageMetrics;
  maintainability: MaintainabilityMetrics;
  documentation: DocumentationMetrics;
  codeSmells: CodeSmell[];
  technicalDebt: TechnicalDebtMetrics;
}

export interface ComplexityMetrics {
  cyclomatic: {
    max: number;
    average: number;
    threshold: number;
    violations: Array<{
      file: string;
      function: string;
      complexity: number;
    }>;
  };
  cognitive: {
    max: number;
    average: number;
    violations: Array<{
      file: string;
      function: string;
      score: number;
    }>;
  };
}

export interface DuplicationMetrics {
  percentage: number;
  duplicatedLines: number;
  duplicatedBlocks: number;
  instances: Array<{
    files: string[];
    lines: number;
    tokens: number;
  }>;
}

export interface TestCoverageMetrics {
  overall: number;
  line: number;
  branch: number;
  function: number;
  statement: number;
  untested: Array<{
    file: string;
    coverage: number;
    uncoveredLines: string;
  }>;
}

export interface MaintainabilityMetrics {
  index: number;
  grade: string;
  issues: Array<{
    type: string;
    severity: string;
    file: string;
    description: string;
  }>;
}

export interface DocumentationMetrics {
  coverage: number;
  missingDocs: Array<{
    file: string;
    type: 'function' | 'class' | 'module';
    name: string;
  }>;
}

export interface CodeSmell {
  type: string;
  severity: 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  description: string;
  suggestion: string;
}

export interface TechnicalDebtMetrics {
  totalMinutes: number;
  breakdown: {
    complexity: number;
    duplication: number;
    coverage: number;
    documentation: number;
  };
  hotspots: Array<{
    file: string;
    debtMinutes: number;
    issues: string[];
  }>;
}

export function parseEnhancedCodeQuality(content: string): CodeQualityMetrics {
  const metrics: CodeQualityMetrics = {
    complexity: {
      cyclomatic: {
        max: 0,
        average: 0,
        threshold: 10,
        violations: []
      },
      cognitive: {
        max: 0,
        average: 0,
        violations: []
      }
    },
    duplication: {
      percentage: 0,
      duplicatedLines: 0,
      duplicatedBlocks: 0,
      instances: []
    },
    testCoverage: {
      overall: 0,
      line: 0,
      branch: 0,
      function: 0,
      statement: 0,
      untested: []
    },
    maintainability: {
      index: 100,
      grade: 'A',
      issues: []
    },
    documentation: {
      coverage: 0,
      missingDocs: []
    },
    codeSmells: [],
    technicalDebt: {
      totalMinutes: 0,
      breakdown: {
        complexity: 0,
        duplication: 0,
        coverage: 0,
        documentation: 0
      },
      hotspots: []
    }
  };

  const lines = content.split('\n');
  let currentSection: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Detect section headers
    if (line.match(/^#{1,4}\s*(Code Quality|Quality Analysis|Code Metrics)/i)) {
      currentSection = 'quality';
      continue;
    } else if (line.match(/^#{1,4}\s*(Complexity|Cyclomatic Complexity)/i)) {
      currentSection = 'complexity';
      continue;
    } else if (line.match(/^#{1,4}\s*(Duplication|Code Duplication|Duplicate Code)/i)) {
      currentSection = 'duplication';
      continue;
    } else if (line.match(/^#{1,4}\s*(Test Coverage|Coverage|Testing)/i)) {
      currentSection = 'coverage';
      continue;
    } else if (line.match(/^#{1,4}\s*(Maintainability|Code Maintainability)/i)) {
      currentSection = 'maintainability';
      continue;
    } else if (line.match(/^#{1,4}\s*(Documentation|Code Documentation)/i)) {
      currentSection = 'documentation';
      continue;
    } else if (line.match(/^#{1,4}\s*(Code Smells|Smells|Anti-?patterns)/i)) {
      currentSection = 'smells';
      continue;
    } else if (line.match(/^#{1,4}\s*(Technical Debt|Tech Debt)/i)) {
      currentSection = 'debt';
      continue;
    }

    // Parse based on current section
    if (currentSection === 'complexity') {
      parseComplexityLine(line, metrics.complexity);
    } else if (currentSection === 'duplication') {
      parseDuplicationLine(line, metrics.duplication);
    } else if (currentSection === 'coverage') {
      parseCoverageLine(line, metrics.testCoverage);
    } else if (currentSection === 'maintainability') {
      parseMaintainabilityLine(line, metrics.maintainability);
    } else if (currentSection === 'documentation') {
      parseDocumentationLine(line, metrics.documentation);
    } else if (currentSection === 'smells') {
      parseCodeSmellLine(line, lines, i, metrics.codeSmells);
    } else if (currentSection === 'debt') {
      parseTechnicalDebtLine(line, metrics.technicalDebt);
    }

    // Parse inline metrics anywhere in the content
    parseInlineMetrics(line, metrics);
  }

  // Calculate derived metrics
  calculateDerivedMetrics(metrics);

  return metrics;
}

function parseComplexityLine(line: string, complexity: ComplexityMetrics): void {
  // Parse cyclomatic complexity
  const cyclomaticMatch = line.match(/Cyclomatic\s*Complexity:?\s*(\d+)/i);
  if (cyclomaticMatch) {
    const value = parseInt(cyclomaticMatch[1]);
    if (line.toLowerCase().includes('max')) {
      complexity.cyclomatic.max = value;
    } else if (line.toLowerCase().includes('average') || line.toLowerCase().includes('avg')) {
      complexity.cyclomatic.average = value;
    }
  }

  // Parse complexity violations
  const violationMatch = line.match(/(\S+\.(ts|js|tsx|jsx)).*?(\w+)\s*(?:function|method).*?complexity:?\s*(\d+)/i);
  if (violationMatch) {
    complexity.cyclomatic.violations.push({
      file: violationMatch[1],
      function: violationMatch[3],
      complexity: parseInt(violationMatch[4])
    });
  }

  // Parse cognitive complexity
  const cognitiveMatch = line.match(/Cognitive\s*Complexity:?\s*(\d+)/i);
  if (cognitiveMatch) {
    const value = parseInt(cognitiveMatch[1]);
    if (line.toLowerCase().includes('max')) {
      complexity.cognitive.max = value;
    } else if (line.toLowerCase().includes('average') || line.toLowerCase().includes('avg')) {
      complexity.cognitive.average = value;
    }
  }
}

function parseDuplicationLine(line: string, duplication: DuplicationMetrics): void {
  // Parse duplication percentage
  const percentMatch = line.match(/(?:Duplication|Duplicated):?\s*(\d+(?:\.\d+)?)\s*%/i);
  if (percentMatch) {
    duplication.percentage = parseFloat(percentMatch[1]);
  }

  // Parse duplicated lines
  const linesMatch = line.match(/(\d+)\s*(?:duplicated\s*)?lines/i);
  if (linesMatch && line.toLowerCase().includes('duplicat')) {
    duplication.duplicatedLines = parseInt(linesMatch[1]);
  }

  // Parse duplicated blocks
  const blocksMatch = line.match(/(\d+)\s*(?:duplicated\s*)?blocks/i);
  if (blocksMatch) {
    duplication.duplicatedBlocks = parseInt(blocksMatch[1]);
  }

  // Parse duplication instances
  const instanceMatch = line.match(/Files?:\s*(.+?)\s*(?:and|,)\s*(.+?)(?:\s*-\s*(\d+)\s*lines)?/i);
  if (instanceMatch) {
    duplication.instances.push({
      files: [instanceMatch[1].trim(), instanceMatch[2].trim()],
      lines: instanceMatch[3] ? parseInt(instanceMatch[3]) : 0,
      tokens: 0
    });
  }
}

function parseCoverageLine(line: string, coverage: TestCoverageMetrics): void {
  // Parse overall coverage
  const overallMatch = line.match(/(?:Overall|Total)\s*(?:Test\s*)?Coverage:?\s*(\d+(?:\.\d+)?)\s*%/i);
  if (overallMatch) {
    coverage.overall = parseFloat(overallMatch[1]);
  }

  // Parse line coverage
  const lineMatch = line.match(/Line\s*Coverage:?\s*(\d+(?:\.\d+)?)\s*%/i);
  if (lineMatch) {
    coverage.line = parseFloat(lineMatch[1]);
  }

  // Parse branch coverage
  const branchMatch = line.match(/Branch\s*Coverage:?\s*(\d+(?:\.\d+)?)\s*%/i);
  if (branchMatch) {
    coverage.branch = parseFloat(branchMatch[1]);
  }

  // Parse function coverage
  const functionMatch = line.match(/Function\s*Coverage:?\s*(\d+(?:\.\d+)?)\s*%/i);
  if (functionMatch) {
    coverage.function = parseFloat(functionMatch[1]);
  }

  // Parse statement coverage
  const statementMatch = line.match(/Statement\s*Coverage:?\s*(\d+(?:\.\d+)?)\s*%/i);
  if (statementMatch) {
    coverage.statement = parseFloat(statementMatch[1]);
  }

  // Parse untested files
  const untestedMatch = line.match(/(\S+\.(ts|js|tsx|jsx)).*?(\d+(?:\.\d+)?)\s*%\s*(?:coverage|covered)/i);
  if (untestedMatch && parseFloat(untestedMatch[3]) < 80) {
    coverage.untested.push({
      file: untestedMatch[1],
      coverage: parseFloat(untestedMatch[3]),
      uncoveredLines: ''
    });
  }
}

function parseMaintainabilityLine(line: string, maintainability: MaintainabilityMetrics): void {
  // Parse maintainability index
  const indexMatch = line.match(/Maintainability\s*Index:?\s*(\d+(?:\.\d+)?)/i);
  if (indexMatch) {
    maintainability.index = parseFloat(indexMatch[1]);
  }

  // Parse maintainability grade
  const gradeMatch = line.match(/Grade:?\s*([A-F])/i);
  if (gradeMatch && line.toLowerCase().includes('maintainability')) {
    maintainability.grade = gradeMatch[1];
  }

  // Parse maintainability issues
  const issueMatch = line.match(/^(\d+\.|\*|-)\s*(.+?):\s*(.+)/);
  if (issueMatch && line.toLowerCase().includes('maintainability')) {
    const description = issueMatch[3].trim();
    const fileMatch = description.match(/(\S+\.(ts|js|tsx|jsx))/);
    
    maintainability.issues.push({
      type: 'maintainability',
      severity: determineSeverity(description),
      file: fileMatch ? fileMatch[1] : 'unknown',
      description: description
    });
  }
}

function parseDocumentationLine(line: string, documentation: DocumentationMetrics): void {
  // Parse documentation coverage
  const coverageMatch = line.match(/Documentation\s*Coverage:?\s*(\d+(?:\.\d+)?)\s*%/i);
  if (coverageMatch) {
    documentation.coverage = parseFloat(coverageMatch[1]);
  }

  // Parse missing documentation
  const missingMatch = line.match(/(\S+\.(ts|js|tsx|jsx)).*?(?:missing|undocumented)\s*(function|class|module)\s*(\w+)?/i);
  if (missingMatch) {
    documentation.missingDocs.push({
      file: missingMatch[1],
      type: missingMatch[3] as 'function' | 'class' | 'module',
      name: missingMatch[4] || 'unknown'
    });
  }
}

function parseCodeSmellLine(line: string, lines: string[], index: number, smells: CodeSmell[]): void {
  const smellMatch = line.match(/^(\d+\.|\*|-)\s*\*?\*?([^*]+?)\*?\*?:?\s*(.+)/);
  if (smellMatch) {
    const type = smellMatch[2].trim();
    const description = smellMatch[3].trim();
    const fileMatch = description.match(/(?:File:|in\s+)?\s*(\S+\.(ts|js|tsx|jsx))/);
    const lineMatch = description.match(/(?:Line|line):?\s*(\d+)/i);
    
    // Look ahead for suggestion
    let suggestion = '';
    if (index + 1 < lines.length) {
      const nextLine = lines[index + 1];
      if (nextLine.match(/^\s*(?:Suggestion|Fix|Recommendation):/i)) {
        suggestion = nextLine.replace(/^\s*(?:Suggestion|Fix|Recommendation):\s*/i, '').trim();
      }
    }

    smells.push({
      type: type,
      severity: determineSeverity(description),
      file: fileMatch ? fileMatch[1] : 'unknown',
      line: lineMatch ? parseInt(lineMatch[1]) : undefined,
      description: description,
      suggestion: suggestion || `Refactor ${type.toLowerCase()}`
    });
  }
}

function parseTechnicalDebtLine(line: string, debt: TechnicalDebtMetrics): void {
  // Parse total technical debt
  const totalMatch = line.match(/(?:Total\s*)?Technical\s*Debt:?\s*(\d+)\s*(?:minutes|mins|hours)/i);
  if (totalMatch) {
    const value = parseInt(totalMatch[1]);
    if (line.toLowerCase().includes('hour')) {
      debt.totalMinutes = value * 60;
    } else {
      debt.totalMinutes = value;
    }
  }

  // Parse debt breakdown
  const breakdownMatch = line.match(/(Complexity|Duplication|Coverage|Documentation)\s*debt:?\s*(\d+)\s*(?:minutes|mins)/i);
  if (breakdownMatch) {
    const category = breakdownMatch[1].toLowerCase() as keyof typeof debt.breakdown;
    debt.breakdown[category] = parseInt(breakdownMatch[2]);
  }

  // Parse debt hotspots
  const hotspotMatch = line.match(/(\S+\.(ts|js|tsx|jsx)).*?(\d+)\s*(?:minutes|mins)\s*(?:of\s*)?debt/i);
  if (hotspotMatch) {
    debt.hotspots.push({
      file: hotspotMatch[1],
      debtMinutes: parseInt(hotspotMatch[3]),
      issues: []
    });
  }
}

function parseInlineMetrics(line: string, metrics: CodeQualityMetrics): void {
  // Parse any inline coverage percentage
  if (!metrics.testCoverage.overall) {
    const coverageMatch = line.match(/(?:test\s*)?coverage:?\s*(\d+(?:\.\d+)?)\s*%/i);
    if (coverageMatch && !line.toLowerCase().includes('documentation')) {
      metrics.testCoverage.overall = parseFloat(coverageMatch[1]);
    }
  }

  // Parse any inline complexity
  if (!metrics.complexity.cyclomatic.average) {
    const complexityMatch = line.match(/(?:average\s*)?complexity:?\s*(\d+(?:\.\d+)?)/i);
    if (complexityMatch && !line.toLowerCase().includes('cognitive')) {
      metrics.complexity.cyclomatic.average = parseFloat(complexityMatch[1]);
    }
  }

  // Parse any inline duplication
  if (!metrics.duplication.percentage) {
    const dupMatch = line.match(/duplication:?\s*(\d+(?:\.\d+)?)\s*%/i);
    if (dupMatch) {
      metrics.duplication.percentage = parseFloat(dupMatch[1]);
    }
  }
}

function determineSeverity(text: string): 'high' | 'medium' | 'low' {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('critical') || lowerText.includes('severe') || lowerText.includes('high')) {
    return 'high';
  }
  if (lowerText.includes('medium') || lowerText.includes('moderate')) {
    return 'medium';
  }
  return 'low';
}

function calculateDerivedMetrics(metrics: CodeQualityMetrics): void {
  // Calculate maintainability grade from index if not set
  if (!metrics.maintainability.grade && metrics.maintainability.index) {
    if (metrics.maintainability.index >= 85) metrics.maintainability.grade = 'A';
    else if (metrics.maintainability.index >= 70) metrics.maintainability.grade = 'B';
    else if (metrics.maintainability.index >= 55) metrics.maintainability.grade = 'C';
    else if (metrics.maintainability.index >= 40) metrics.maintainability.grade = 'D';
    else metrics.maintainability.grade = 'F';
  }

  // Calculate total technical debt if not set
  if (!metrics.technicalDebt.totalMinutes && Object.values(metrics.technicalDebt.breakdown).some(v => v > 0)) {
    metrics.technicalDebt.totalMinutes = Object.values(metrics.technicalDebt.breakdown).reduce((a, b) => a + b, 0);
  }

  // Estimate coverage if line coverage is known but overall isn't
  if (!metrics.testCoverage.overall && metrics.testCoverage.line) {
    metrics.testCoverage.overall = metrics.testCoverage.line;
  }
}

/**
 * Convert code quality metrics to issues for report generation
 */
export function codeQualityToIssues(metrics: CodeQualityMetrics): any[] {
  const issues: any[] = [];
  let issueId = 1;

  // Process complexity violations
  metrics.complexity.cyclomatic.violations.forEach(violation => {
    if (violation.complexity > metrics.complexity.cyclomatic.threshold) {
      issues.push({
        id: `quality-complexity-${issueId++}`,
        severity: violation.complexity > 20 ? 'high' : violation.complexity > 15 ? 'medium' : 'low',
        category: 'code-quality',
        type: 'complexity',
        title: `High cyclomatic complexity in ${violation.function}`,
        description: `Function has complexity of ${violation.complexity} (threshold: ${metrics.complexity.cyclomatic.threshold})`,
        message: `Complexity: ${violation.complexity} in ${violation.function}`,
        location: {
          file: violation.file,
          line: 0
        },
        recommendation: `Refactor ${violation.function} to reduce complexity. Consider extracting methods or simplifying logic.`,
        metadata: {
          metricType: 'complexity',
          value: violation.complexity,
          threshold: metrics.complexity.cyclomatic.threshold
        }
      });
    }
  });

  // Process duplication issues
  if (metrics.duplication.percentage > 5) {
    // Build detailed description with file locations
    let detailedDescription = `${metrics.duplication.duplicatedLines} duplicated lines across ${metrics.duplication.duplicatedBlocks} blocks`;
    
    if (metrics.duplication.instances.length > 0) {
      detailedDescription += '\n\nDuplication found between:';
      metrics.duplication.instances.forEach((instance, idx) => {
        detailedDescription += `\n${idx + 1}. ${instance.files.join(' ↔ ')}`;
        if (instance.lines > 0) {
          detailedDescription += ` (${instance.lines} lines)`;
        }
      });
    }
    
    issues.push({
      id: `quality-duplication-${issueId++}`,
      severity: metrics.duplication.percentage > 15 ? 'high' : metrics.duplication.percentage > 10 ? 'medium' : 'low',
      category: 'code-quality',
      type: 'duplication',
      title: `Code duplication: ${metrics.duplication.percentage.toFixed(1)}%`,
      description: detailedDescription,
      message: `${metrics.duplication.percentage.toFixed(1)}% code duplication detected`,
      recommendation: 'Extract common code into reusable functions or modules',
      metadata: {
        metricType: 'duplication',
        percentage: metrics.duplication.percentage,
        lines: metrics.duplication.duplicatedLines,
        blocks: metrics.duplication.duplicatedBlocks,
        instances: metrics.duplication.instances
      }
    });
  }

  // Process test coverage issues
  if (metrics.testCoverage.overall < 80 && metrics.testCoverage.overall > 0) {
    issues.push({
      id: `quality-coverage-${issueId++}`,
      severity: metrics.testCoverage.overall < 50 ? 'high' : metrics.testCoverage.overall < 70 ? 'medium' : 'low',
      category: 'code-quality',
      type: 'testing',
      title: `Low test coverage: ${metrics.testCoverage.overall.toFixed(1)}%`,
      description: `Test coverage is below recommended 80% threshold`,
      message: `Test coverage at ${metrics.testCoverage.overall.toFixed(1)}%`,
      recommendation: 'Add unit tests to reach 80% coverage minimum',
      metadata: {
        metricType: 'coverage',
        overall: metrics.testCoverage.overall,
        line: metrics.testCoverage.line,
        branch: metrics.testCoverage.branch,
        function: metrics.testCoverage.function
      }
    });
  }

  // Process code smells
  metrics.codeSmells.forEach(smell => {
    issues.push({
      id: `quality-smell-${issueId++}`,
      severity: smell.severity,
      category: 'code-quality',
      type: 'maintainability',
      title: smell.type,
      description: smell.description,
      message: `Code smell: ${smell.type}`,
      location: smell.file !== 'unknown' ? {
        file: smell.file,
        line: smell.line || 0
      } : undefined,
      recommendation: smell.suggestion,
      metadata: {
        metricType: 'smell',
        smellType: smell.type
      }
    });
  });

  // Process technical debt
  if (metrics.technicalDebt.totalMinutes > 60) {
    const hours = (metrics.technicalDebt.totalMinutes / 60).toFixed(1);
    issues.push({
      id: `quality-debt-${issueId++}`,
      severity: metrics.technicalDebt.totalMinutes > 480 ? 'high' : metrics.technicalDebt.totalMinutes > 240 ? 'medium' : 'low',
      category: 'code-quality',
      type: 'technical-debt',
      title: `Technical debt: ${hours} hours`,
      description: `Accumulated technical debt requiring ${hours} hours to resolve`,
      message: `${hours} hours of technical debt`,
      recommendation: 'Schedule refactoring sessions to address technical debt',
      metadata: {
        metricType: 'debt',
        totalMinutes: metrics.technicalDebt.totalMinutes,
        breakdown: metrics.technicalDebt.breakdown
      }
    });
  }

  return issues;
}