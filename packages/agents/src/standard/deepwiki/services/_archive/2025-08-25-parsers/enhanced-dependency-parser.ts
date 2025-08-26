/**
 * Enhanced dependency parser for DeepWiki responses
 * Extracts vulnerable, outdated, and deprecated dependencies with full details
 */

export interface DependencyInfo {
  name: string;
  currentVersion?: string;
  latestVersion?: string;
  severity?: string;
  cve?: string;
  description?: string;
  recommendation?: string;
  type: 'vulnerable' | 'outdated' | 'deprecated';
}

export interface ParsedDependencies {
  vulnerable: DependencyInfo[];
  outdated: DependencyInfo[];
  deprecated: DependencyInfo[];
}

export function parseEnhancedDependencies(content: string): ParsedDependencies {
  const dependencies: ParsedDependencies = {
    vulnerable: [],
    outdated: [],
    deprecated: []
  };

  const lines = content.split('\n');
  let currentSection: 'vulnerable' | 'outdated' | 'deprecated' | null = null;
  let currentDependency: Partial<DependencyInfo> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Detect section headers
    if (line.match(/^#{1,4}\s*(Vulnerable|Security)\s*(Dependencies|Packages)/i)) {
      currentSection = 'vulnerable';
      currentDependency = null;
      continue;
    } else if (line.match(/^#{1,4}\s*Outdated\s*(Dependencies|Packages)/i)) {
      currentSection = 'outdated';
      currentDependency = null;
      continue;
    } else if (line.match(/^#{1,4}\s*Deprecated\s*(Dependencies|Packages)/i)) {
      currentSection = 'deprecated';
      currentDependency = null;
      continue;
    } else if (line.match(/^#{1,4}\s*(Issues Found|Problems|Analysis Results|Breaking Changes)/i)) {
      // Exit dependency sections when we hit other sections
      currentSection = null;
      currentDependency = null;
      continue;
    }

    // Skip if not in a dependency section
    if (!currentSection) {
      // But still look for inline dependency mentions
      if (line.includes('CVE-') || line.includes('@') && (line.includes('vulnerable') || line.includes('outdated'))) {
        parseInlineDependency(line, dependencies);
      }
      continue;
    }

    // Parse dependency entries (numbered or bulleted lists)
    const entryMatch = line.match(/^(\d+\.|\*|-)\s+\*?\*?([^*@]+)(@[\d.]+)?\*?\*?(.*)$/);
    if (entryMatch) {
      // Save previous dependency if exists
      if (currentDependency && currentDependency.name) {
        addDependency(dependencies, currentSection, currentDependency as DependencyInfo);
      }

      // Start new dependency
      const packageName = entryMatch[2].trim();
      const version = entryMatch[3]?.replace('@', '').trim();
      const restOfLine = entryMatch[4]?.trim();

      currentDependency = {
        name: packageName,
        currentVersion: version,
        type: currentSection,
        description: restOfLine
      };

      // Check for CVE in the same line
      const cveMatch = restOfLine?.match(/CVE-\d{4}-\d+/);
      if (cveMatch) {
        currentDependency.cve = cveMatch[0];
      }

      // Check for severity
      const severityMatch = restOfLine?.match(/\((Critical|High|Medium|Low)\)/i);
      if (severityMatch) {
        currentDependency.severity = severityMatch[1].toLowerCase();
      }

      continue;
    }

    // Parse additional dependency details (indented lines)
    if (currentDependency && trimmedLine && !line.match(/^(\d+\.|\*|-)\s+/)) {
      // CVE information
      const cveMatch = line.match(/CVE-\d{4}-\d+/);
      if (cveMatch && !currentDependency.cve) {
        currentDependency.cve = cveMatch[0];
      }

      // Vulnerability description
      if (line.match(/^\s*-?\s*(Vulnerability|Issue|Problem):/i)) {
        const desc = line.replace(/^\s*-?\s*(Vulnerability|Issue|Problem):\s*/i, '').trim();
        currentDependency.description = (currentDependency.description || '') + ' ' + desc;
      }

      // Affected versions
      if (line.match(/^\s*-?\s*(Affected|Versions?):/i)) {
        const versions = line.replace(/^\s*-?\s*(Affected|Versions?):\s*/i, '').trim();
        if (!currentDependency.description) {
          currentDependency.description = `Affected: ${versions}`;
        } else {
          currentDependency.description += ` Affected: ${versions}`;
        }
      }

      // Recommendation
      if (line.match(/^\s*-?\s*(Recommendation|Fix|Update|Alternative):/i)) {
        currentDependency.recommendation = line.replace(/^\s*-?\s*(Recommendation|Fix|Update|Alternative):\s*/i, '').trim();
      }

      // Latest version for outdated packages
      if (line.match(/^\s*-?\s*(Latest|Current):/i)) {
        const versionMatch = line.match(/(\d+\.[\d.]+)/);
        if (versionMatch) {
          currentDependency.latestVersion = versionMatch[1];
        }
      }

      // Status for deprecated packages
      if (line.match(/^\s*-?\s*(Status|Deprecated|Alternative):/i)) {
        const status = line.replace(/^\s*-?\s*(Status|Deprecated|Alternative):\s*/i, '').trim();
        if (currentSection === 'deprecated') {
          if (!currentDependency.description) {
            currentDependency.description = status;
          } else {
            currentDependency.description += `. ${status}`;
          }
        }
      }

      // Severity detection
      if (line.match(/\b(Critical|High|Medium|Low)\b/i) && !currentDependency.severity) {
        const severityMatch = line.match(/\b(Critical|High|Medium|Low)\b/i);
        if (severityMatch) {
          currentDependency.severity = severityMatch[1].toLowerCase();
        }
      }
    }
  }

  // Save last dependency if exists
  if (currentDependency && currentDependency.name && currentSection) {
    addDependency(dependencies, currentSection, currentDependency as DependencyInfo);
  }

  return dependencies;
}

function parseInlineDependency(line: string, dependencies: ParsedDependencies): void {
  // Parse inline mentions like "express@4.17.1 has CVE-2022-24999"
  const packageMatch = line.match(/(\S+)@([\d.]+)/);
  const cveMatch = line.match(/CVE-\d{4}-\d+/);
  
  if (packageMatch) {
    const dep: DependencyInfo = {
      name: packageMatch[1],
      currentVersion: packageMatch[2],
      type: 'vulnerable',
      cve: cveMatch?.[0]
    };

    // Detect severity
    const severityMatch = line.match(/\b(Critical|High|Medium|Low)\b/i);
    if (severityMatch) {
      dep.severity = severityMatch[1].toLowerCase();
    }

    // Determine type
    if (cveMatch || line.toLowerCase().includes('vulnerab')) {
      dep.type = 'vulnerable';
      dependencies.vulnerable.push(dep);
    } else if (line.toLowerCase().includes('outdated') || line.toLowerCase().includes('behind')) {
      dep.type = 'outdated';
      dependencies.outdated.push(dep);
    } else if (line.toLowerCase().includes('deprecated')) {
      dep.type = 'deprecated';
      dependencies.deprecated.push(dep);
    }
  }
}

function addDependency(
  dependencies: ParsedDependencies, 
  type: 'vulnerable' | 'outdated' | 'deprecated',
  dep: DependencyInfo
): void {
  // Clean up the dependency info
  dep.name = dep.name.replace(/\*\*/g, '').trim();
  if (dep.description) {
    dep.description = dep.description.trim();
  }
  
  // Set default severity if not specified
  if (!dep.severity) {
    if (type === 'vulnerable') {
      dep.severity = dep.cve ? 'high' : 'medium';
    } else if (type === 'outdated') {
      dep.severity = 'low';
    } else if (type === 'deprecated') {
      dep.severity = 'medium';
    }
  }

  dependencies[type].push(dep);
}

/**
 * Convert dependency info to issues for report generation
 */
export function dependenciesToIssues(dependencies: ParsedDependencies): any[] {
  const issues: any[] = [];
  let issueId = 1;

  // Process vulnerable dependencies
  dependencies.vulnerable.forEach(dep => {
    issues.push({
      id: `dep-vuln-${issueId++}`,
      severity: dep.severity || 'high',
      category: 'dependencies',
      type: 'security',
      title: `Vulnerable dependency: ${dep.name}@${dep.currentVersion}`,
      description: dep.cve ? 
        `${dep.cve}: ${dep.description || 'Known security vulnerability'}` :
        dep.description || 'Security vulnerability detected',
      message: `${dep.name}@${dep.currentVersion} has ${dep.cve || 'security vulnerability'}`,
      recommendation: dep.recommendation || `Update ${dep.name} to latest secure version`,
      metadata: {
        packageName: dep.name,
        currentVersion: dep.currentVersion,
        cve: dep.cve,
        dependencyType: 'vulnerable'
      }
    });
  });

  // Process outdated dependencies
  dependencies.outdated.forEach(dep => {
    issues.push({
      id: `dep-outdated-${issueId++}`,
      severity: dep.severity || 'low',
      category: 'dependencies',
      type: 'maintenance',
      title: `Outdated dependency: ${dep.name}@${dep.currentVersion}`,
      description: dep.latestVersion ? 
        `Current: ${dep.currentVersion}, Latest: ${dep.latestVersion}` :
        dep.description || 'Package is outdated',
      message: `${dep.name} is outdated (${dep.currentVersion}${dep.latestVersion ? ' → ' + dep.latestVersion : ''})`,
      recommendation: dep.recommendation || `Update ${dep.name} to ${dep.latestVersion || 'latest version'}`,
      metadata: {
        packageName: dep.name,
        currentVersion: dep.currentVersion,
        latestVersion: dep.latestVersion,
        dependencyType: 'outdated'
      }
    });
  });

  // Process deprecated dependencies
  dependencies.deprecated.forEach(dep => {
    issues.push({
      id: `dep-deprecated-${issueId++}`,
      severity: dep.severity || 'medium',
      category: 'dependencies',
      type: 'maintenance',
      title: `Deprecated dependency: ${dep.name}`,
      description: dep.description || 'This package is deprecated and no longer maintained',
      message: `${dep.name} is deprecated`,
      recommendation: dep.recommendation || `Replace ${dep.name} with a maintained alternative`,
      metadata: {
        packageName: dep.name,
        currentVersion: dep.currentVersion,
        dependencyType: 'deprecated'
      }
    });
  });

  return issues;
}