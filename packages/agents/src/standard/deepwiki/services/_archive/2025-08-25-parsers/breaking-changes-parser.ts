/**
 * Breaking Changes Parser
 * 
 * Extracts breaking changes from DeepWiki analysis responses.
 * Identifies API changes, removed features, and incompatible modifications.
 */

export interface BreakingChange {
  id: string;
  type: 'api' | 'feature' | 'dependency' | 'config' | 'schema' | 'behavior';
  severity: 'critical' | 'high' | 'medium' | 'low';
  component: string;
  description: string;
  impact: string;
  migration?: string;
  file?: string;
  line?: number;
  beforeCode?: string;
  afterCode?: string;
}

export interface BreakingChangesAnalysis {
  total: number;
  critical: number;
  byType: Record<string, number>;
  changes: BreakingChange[];
  migrationComplexity: 'simple' | 'moderate' | 'complex';
  estimatedEffort: string;
}

/**
 * Parse breaking changes from DeepWiki response content
 */
export function parseBreakingChanges(content: string): BreakingChangesAnalysis {
  const changes: BreakingChange[] = [];
  const lines = content.split('\n');
  
  let inBreakingSection = false;
  let currentChange: Partial<BreakingChange> | null = null;
  let changeId = 1;
  
  // Patterns to identify breaking changes
  const breakingPatterns = {
    api: [
      /removed?\s+(?:method|function|endpoint|api)/i,
      /changed?\s+(?:signature|parameter|return\s+type)/i,
      /deprecated?\s+(?:and\s+removed?|endpoint|method)/i,
      /breaking:\s*api/i,
      /incompatible\s+api/i
    ],
    feature: [
      /removed?\s+feature/i,
      /discontinued?\s+support/i,
      /no\s+longer\s+supported?/i,
      /breaking:\s*feature/i
    ],
    dependency: [
      /requires?\s+(?:minimum|at\s+least)\s+version/i,
      /incompatible\s+with\s+version/i,
      /breaking:\s*dependency/i,
      /peer\s+dependency\s+changed?/i
    ],
    config: [
      /configuration\s+changed?/i,
      /config\s+(?:format|schema)\s+changed?/i,
      /breaking:\s*config/i,
      /settings?\s+renamed?/i
    ],
    schema: [
      /schema\s+(?:changed?|modified?|updated?)/i,
      /database\s+migration\s+required?/i,
      /breaking:\s*schema/i,
      /model\s+changed?/i
    ],
    behavior: [
      /behavior\s+changed?/i,
      /default\s+(?:value|behavior)\s+changed?/i,
      /breaking:\s*behavior/i,
      /semantics?\s+changed?/i
    ]
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const lowerLine = trimmedLine.toLowerCase();
    
    // Check if we're in the breaking changes section
    if (lowerLine.includes('breaking') && 
        (lowerLine.includes('change') || lowerLine.includes('##'))) {
      inBreakingSection = true;
      continue;
    }
    
    // Exit breaking changes section if we hit another major section
    if (inBreakingSection && trimmedLine.startsWith('##') && 
        !lowerLine.includes('breaking')) {
      inBreakingSection = false;
    }
    
    // Detect breaking change type
    let changeType: BreakingChange['type'] | null = null;
    for (const [type, patterns] of Object.entries(breakingPatterns)) {
      if (patterns.some(pattern => pattern.test(line))) {
        changeType = type as BreakingChange['type'];
        break;
      }
    }
    
    // Parse breaking change entry
    if ((inBreakingSection || changeType) && 
        (trimmedLine.match(/^(\d+\.|\*|-)\s+/) || changeType)) {
      
      // Save previous change if exists
      if (currentChange && currentChange.description) {
        changes.push(completeBreakingChange(currentChange, changeId++));
      }
      
      // Start new change
      const description = trimmedLine.replace(/^(\d+\.|\*|-)\s+/, '');
      currentChange = {
        type: changeType || determineChangeType(description),
        description: description,
        severity: determineSeverity(description),
        component: extractComponent(description),
        impact: extractImpact(description)
      };
      
      // Extract file and line information
      const locationMatch = description.match(/(?:in\s+)?([^\s]+\.(ts|js|tsx|jsx|py|go|java|rb|rs|cs))(?::(\d+))?/i);
      if (locationMatch) {
        currentChange.file = locationMatch[1];
        if (locationMatch[3]) {
          currentChange.line = parseInt(locationMatch[3]);
        }
      }
      
      // Extract method/function name
      const methodMatch = description.match(/(?:method|function|endpoint)\s+`?(\w+)`?/i);
      if (methodMatch && !currentChange.component) {
        currentChange.component = methodMatch[1];
      }
    }
    
    // Parse additional details for current change
    if (currentChange && !trimmedLine.match(/^(\d+\.|\*|-)\s+/)) {
      // Migration instructions
      if (lowerLine.includes('migration:') || lowerLine.includes('to fix:') || 
          lowerLine.includes('update:') || lowerLine.includes('replace:')) {
        currentChange.migration = trimmedLine.replace(/^(migration:|to\s+fix:|update:|replace:)\s*/i, '');
      }
      
      // Before/After code examples
      if (lowerLine.includes('before:')) {
        const nextLines = extractCodeBlock(lines, i + 1);
        if (nextLines.code) {
          currentChange.beforeCode = nextLines.code;
          i = nextLines.endIndex;
        }
      }
      
      if (lowerLine.includes('after:')) {
        const nextLines = extractCodeBlock(lines, i + 1);
        if (nextLines.code) {
          currentChange.afterCode = nextLines.code;
          i = nextLines.endIndex;
        }
      }
      
      // Impact details
      if (lowerLine.includes('impact:') || lowerLine.includes('affects:')) {
        const impact = trimmedLine.replace(/^(impact:|affects:)\s*/i, '');
        currentChange.impact = currentChange.impact ? 
          `${currentChange.impact}. ${impact}` : impact;
      }
    }
  }
  
  // Add the last change
  if (currentChange && currentChange.description) {
    changes.push(completeBreakingChange(currentChange, changeId));
  }
  
  // Calculate analysis metrics
  const analysis: BreakingChangesAnalysis = {
    total: changes.length,
    critical: changes.filter(c => c.severity === 'critical').length,
    byType: {},
    changes: changes,
    migrationComplexity: calculateMigrationComplexity(changes),
    estimatedEffort: estimateMigrationEffort(changes)
  };
  
  // Count by type
  for (const change of changes) {
    analysis.byType[change.type] = (analysis.byType[change.type] || 0) + 1;
  }
  
  return analysis;
}

/**
 * Determine change type from description
 */
function determineChangeType(description: string): BreakingChange['type'] {
  const lower = description.toLowerCase();
  
  if (lower.includes('api') || lower.includes('endpoint') || 
      lower.includes('signature') || lower.includes('parameter')) {
    return 'api';
  }
  if (lower.includes('feature') || lower.includes('functionality')) {
    return 'feature';
  }
  if (lower.includes('dependency') || lower.includes('package') || 
      lower.includes('version')) {
    return 'dependency';
  }
  if (lower.includes('config') || lower.includes('setting') || 
      lower.includes('environment')) {
    return 'config';
  }
  if (lower.includes('schema') || lower.includes('database') || 
      lower.includes('model')) {
    return 'schema';
  }
  if (lower.includes('behavior') || lower.includes('default')) {
    return 'behavior';
  }
  
  return 'api'; // Default to API changes
}

/**
 * Determine severity of breaking change
 */
function determineSeverity(description: string): BreakingChange['severity'] {
  const lower = description.toLowerCase();
  
  // Critical indicators
  if (lower.includes('critical') || lower.includes('must') || 
      lower.includes('immediately') || lower.includes('security')) {
    return 'critical';
  }
  
  // High severity indicators
  if (lower.includes('removed') || lower.includes('deleted') || 
      lower.includes('discontinued') || lower.includes('incompatible')) {
    return 'high';
  }
  
  // Medium severity indicators
  if (lower.includes('changed') || lower.includes('modified') || 
      lower.includes('updated') || lower.includes('renamed')) {
    return 'medium';
  }
  
  // Low severity indicators
  if (lower.includes('deprecated') || lower.includes('optional') || 
      lower.includes('minor')) {
    return 'low';
  }
  
  return 'medium'; // Default to medium
}

/**
 * Extract component name from description
 */
function extractComponent(description: string): string {
  // Try to extract class/module/component name
  const patterns = [
    /(?:class|module|component|service|controller)\s+`?(\w+)`?/i,
    /`(\w+)`\s+(?:class|module|component|service|controller)/i,
    /(\w+)\s+(?:api|endpoint|method|function)/i,
    /^(\w+):/
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // Extract from file path if available
  const fileMatch = description.match(/([^/\\]+)\.(ts|js|tsx|jsx|py|go|java|rb|rs|cs)/i);
  if (fileMatch) {
    return fileMatch[1];
  }
  
  return 'Unknown';
}

/**
 * Extract impact description
 */
function extractImpact(description: string): string {
  // Common impact patterns
  if (description.toLowerCase().includes('all')) {
    return 'Affects all consumers of this API';
  }
  if (description.toLowerCase().includes('client')) {
    return 'Client code must be updated';
  }
  if (description.toLowerCase().includes('database')) {
    return 'Database migration required';
  }
  if (description.toLowerCase().includes('config')) {
    return 'Configuration files must be updated';
  }
  
  // Default impact based on severity
  const severity = determineSeverity(description);
  switch (severity) {
    case 'critical':
      return 'Application will not function without addressing this change';
    case 'high':
      return 'Major functionality affected, immediate attention required';
    case 'medium':
      return 'Some features may not work as expected';
    case 'low':
      return 'Minor impact, but should be addressed';
    default:
      return 'Review and update affected code';
  }
}

/**
 * Extract code block from lines
 */
function extractCodeBlock(lines: string[], startIndex: number): { code: string; endIndex: number } {
  let code = '';
  let inCodeBlock = false;
  let endIndex = startIndex;
  
  for (let i = startIndex; i < lines.length && i < startIndex + 20; i++) {
    const line = lines[i];
    
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        return { code, endIndex: i };
      } else {
        // Start of code block
        inCodeBlock = true;
        continue;
      }
    }
    
    if (inCodeBlock) {
      code += line + '\n';
    } else if (line.trim() && !line.trim().match(/^(\d+\.|\*|-)\s+/)) {
      // Single line of code (indented)
      if (line.startsWith('  ') || line.startsWith('\t')) {
        code += line.trim() + '\n';
      } else {
        break;
      }
    } else {
      break;
    }
    
    endIndex = i;
  }
  
  return { code: code.trim(), endIndex };
}

/**
 * Complete a breaking change with defaults
 */
function completeBreakingChange(
  partial: Partial<BreakingChange>,
  id: number
): BreakingChange {
  return {
    id: `breaking-${id}`,
    type: partial.type || 'api',
    severity: partial.severity || 'medium',
    component: partial.component || 'Unknown',
    description: partial.description || 'Breaking change detected',
    impact: partial.impact || 'Review and update affected code',
    migration: partial.migration,
    file: partial.file,
    line: partial.line,
    beforeCode: partial.beforeCode,
    afterCode: partial.afterCode
  };
}

/**
 * Calculate migration complexity based on changes
 */
function calculateMigrationComplexity(changes: BreakingChange[]): 'simple' | 'moderate' | 'complex' {
  if (changes.length === 0) return 'simple';
  
  const criticalCount = changes.filter(c => c.severity === 'critical').length;
  const highCount = changes.filter(c => c.severity === 'high').length;
  const hasSchemaChanges = changes.some(c => c.type === 'schema');
  const hasApiChanges = changes.some(c => c.type === 'api');
  
  if (criticalCount > 2 || (hasSchemaChanges && hasApiChanges)) {
    return 'complex';
  }
  if (criticalCount > 0 || highCount > 3 || changes.length > 10) {
    return 'moderate';
  }
  
  return 'simple';
}

/**
 * Estimate migration effort
 */
function estimateMigrationEffort(changes: BreakingChange[]): string {
  const complexity = calculateMigrationComplexity(changes);
  const hours = {
    simple: changes.length * 0.5,
    moderate: changes.length * 2,
    complex: changes.length * 4
  };
  
  const estimatedHours = Math.max(1, Math.round(hours[complexity]));
  
  if (estimatedHours <= 4) {
    return `${estimatedHours} hours`;
  } else if (estimatedHours <= 8) {
    return '1 day';
  } else if (estimatedHours <= 40) {
    return `${Math.ceil(estimatedHours / 8)} days`;
  } else {
    return `${Math.ceil(estimatedHours / 40)} weeks`;
  }
}

/**
 * Convert breaking changes to issues format
 */
export function breakingChangesToIssues(analysis: BreakingChangesAnalysis): any[] {
  return analysis.changes.map(change => ({
    id: change.id,
    category: 'breaking-change',
    type: 'breaking-change',
    severity: change.severity,
    title: `Breaking Change: ${change.component} - ${change.type}`,
    description: change.description,
    file: change.file || 'unknown',
    line: change.line || 0,
    remediation: change.migration || 'Review breaking change and update code accordingly',
    metadata: {
      changeType: change.type,
      component: change.component,
      impact: change.impact,
      beforeCode: change.beforeCode,
      afterCode: change.afterCode,
      migrationComplexity: analysis.migrationComplexity
    }
  }));
}