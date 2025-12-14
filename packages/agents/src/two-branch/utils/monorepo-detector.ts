/**
 * MonorepoDetector - Detects project/monorepo type and provides setup instructions
 *
 * This service helps users understand what setup is required before PRO tier analysis
 * by detecting the project structure and providing appropriate setup commands.
 *
 * Purpose:
 * - Basic tier: Works without npm install (Semgrep, npm-audit, dependency-check)
 * - PRO tier: Needs dependencies installed (TypeScript compiler, AI fixes)
 *
 * Supported Project Types:
 * - Lerna monorepo
 * - pnpm workspaces
 * - yarn workspaces
 * - Nx monorepo
 * - Turborepo
 * - npm workspaces
 * - Standard npm project
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type MonorepoType =
  | 'lerna'
  | 'pnpm'
  | 'yarn-workspaces'
  | 'npm-workspaces'
  | 'nx'
  | 'turborepo'
  | 'standard'
  | 'unknown';

export interface MonorepoDetectionResult {
  /** Detected monorepo/project type */
  type: MonorepoType;
  /** Human-readable name for display */
  displayName: string;
  /** Whether this is a monorepo structure */
  isMonorepo: boolean;
  /** Confidence score 0-100 */
  confidence: number;
  /** Config files that were detected */
  detectedFiles: string[];
  /** Workspace paths if detected */
  workspacePaths?: string[];
  /** Package manager detected */
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'unknown';
}

export interface SetupInstructions {
  /** Project type detected */
  projectType: MonorepoDetectionResult;
  /** Whether dependencies appear to be installed */
  dependenciesInstalled: boolean;
  /** Commands needed to set up the project */
  setupCommands: SetupCommand[];
  /** What analysis will work without setup */
  withoutSetup: string[];
  /** What analysis requires setup */
  requiresSetup: string[];
  /** User-facing markdown instructions */
  markdown: string;
  /** User-facing HTML instructions */
  html: string;
}

export interface SetupCommand {
  /** Human-readable description */
  description: string;
  /** Command to run */
  command: string;
  /** Estimated time to run */
  estimatedTime: string;
  /** Whether this command is required */
  required: boolean;
  /** Notes about this command */
  notes?: string;
}

// ============================================================================
// Detection Patterns
// ============================================================================

interface DetectionConfig {
  type: MonorepoType;
  displayName: string;
  isMonorepo: boolean;
  files: string[];
  packageJsonCheck?: (packageJson: any) => boolean;
  priority: number; // Higher = more specific
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'unknown';
}

const DETECTION_CONFIGS: DetectionConfig[] = [
  // Lerna - Very specific
  {
    type: 'lerna',
    displayName: 'Lerna Monorepo',
    isMonorepo: true,
    files: ['lerna.json'],
    priority: 100,
    packageManager: 'npm', // Lerna can use npm or yarn, default to npm
  },
  // Nx - Very specific
  {
    type: 'nx',
    displayName: 'Nx Monorepo',
    isMonorepo: true,
    files: ['nx.json'],
    priority: 100,
    packageManager: 'npm',
  },
  // Turborepo - Very specific
  {
    type: 'turborepo',
    displayName: 'Turborepo',
    isMonorepo: true,
    files: ['turbo.json'],
    priority: 100,
    packageManager: 'npm',
  },
  // pnpm workspaces - Specific file
  {
    type: 'pnpm',
    displayName: 'pnpm Workspaces',
    isMonorepo: true,
    files: ['pnpm-workspace.yaml', 'pnpm-workspace.yml'],
    priority: 90,
    packageManager: 'pnpm',
  },
  // yarn workspaces - Check package.json
  {
    type: 'yarn-workspaces',
    displayName: 'Yarn Workspaces',
    isMonorepo: true,
    files: ['yarn.lock'],
    packageJsonCheck: (pkg) => Array.isArray(pkg.workspaces) || pkg.workspaces?.packages,
    priority: 80,
    packageManager: 'yarn',
  },
  // npm workspaces - Check package.json
  {
    type: 'npm-workspaces',
    displayName: 'npm Workspaces',
    isMonorepo: true,
    files: ['package-lock.json'],
    packageJsonCheck: (pkg) => Array.isArray(pkg.workspaces),
    priority: 70,
    packageManager: 'npm',
  },
  // Standard npm project - Fallback
  {
    type: 'standard',
    displayName: 'Standard npm Project',
    isMonorepo: false,
    files: ['package.json'],
    priority: 10,
    packageManager: 'npm',
  },
];

// ============================================================================
// Setup Commands by Project Type
// ============================================================================

const SETUP_COMMANDS: Record<MonorepoType, SetupCommand[]> = {
  lerna: [
    {
      description: 'Install root dependencies',
      command: 'npm install',
      estimatedTime: '1-3 minutes',
      required: true,
    },
    {
      description: 'Bootstrap all packages (installs workspace dependencies)',
      command: 'npx lerna bootstrap',
      estimatedTime: '3-10 minutes',
      required: true,
      notes: 'This installs dependencies for all packages in the monorepo',
    },
  ],
  nx: [
    {
      description: 'Install all dependencies',
      command: 'npm install',
      estimatedTime: '2-5 minutes',
      required: true,
    },
    {
      description: 'Build all affected projects (optional but recommended)',
      command: 'npx nx run-many --target=build --all',
      estimatedTime: '5-15 minutes',
      required: false,
      notes: 'Required if TypeScript analysis needs built artifacts',
    },
  ],
  turborepo: [
    {
      description: 'Install all dependencies',
      command: 'npm install',
      estimatedTime: '2-5 minutes',
      required: true,
      notes: 'Turborepo typically works with standard npm install',
    },
  ],
  pnpm: [
    {
      description: 'Install all workspace dependencies',
      command: 'pnpm install',
      estimatedTime: '2-5 minutes',
      required: true,
      notes: 'pnpm must be installed globally: npm install -g pnpm',
    },
  ],
  'yarn-workspaces': [
    {
      description: 'Install all workspace dependencies',
      command: 'yarn install',
      estimatedTime: '2-5 minutes',
      required: true,
    },
  ],
  'npm-workspaces': [
    {
      description: 'Install all workspace dependencies',
      command: 'npm install',
      estimatedTime: '2-5 minutes',
      required: true,
      notes: 'npm workspaces are supported in npm 7+',
    },
  ],
  standard: [
    {
      description: 'Install project dependencies',
      command: 'npm install',
      estimatedTime: '1-3 minutes',
      required: true,
    },
  ],
  unknown: [
    {
      description: 'Try installing dependencies',
      command: 'npm install',
      estimatedTime: '1-5 minutes',
      required: true,
      notes: 'Project type could not be determined. Try npm install first.',
    },
  ],
};

// ============================================================================
// MonorepoDetector Class
// ============================================================================

export class MonorepoDetector {
  /**
   * Detect the monorepo/project type
   */
  async detect(repoPath: string): Promise<MonorepoDetectionResult> {
    const detectedFiles: string[] = [];
    let packageJson: any = null;

    // Read package.json if it exists
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        detectedFiles.push('package.json');
      } catch {
        // Invalid package.json, continue without it
      }
    }

    // Check each detection config in priority order
    const sortedConfigs = [...DETECTION_CONFIGS].sort((a, b) => b.priority - a.priority);

    for (const config of sortedConfigs) {
      // Check for detection files
      const foundFiles: string[] = [];
      for (const file of config.files) {
        if (fs.existsSync(path.join(repoPath, file))) {
          foundFiles.push(file);
        }
      }

      // If no files found, skip this config
      if (foundFiles.length === 0 && config.type !== 'standard') {
        continue;
      }

      // For standard project, just need package.json
      if (config.type === 'standard' && !packageJson) {
        continue;
      }

      // Check package.json condition if specified
      if (config.packageJsonCheck && packageJson) {
        if (!config.packageJsonCheck(packageJson)) {
          continue;
        }
      }

      // Found a match!
      detectedFiles.push(...foundFiles);

      // Extract workspace paths if available
      const workspacePaths = this.extractWorkspacePaths(repoPath, packageJson, config.type);

      return {
        type: config.type,
        displayName: config.displayName,
        isMonorepo: config.isMonorepo,
        confidence: this.calculateConfidence(config, foundFiles, packageJson),
        detectedFiles: [...new Set(detectedFiles)],
        workspacePaths,
        packageManager: this.detectPackageManager(repoPath, config.packageManager),
      };
    }

    // Nothing detected
    return {
      type: 'unknown',
      displayName: 'Unknown Project Type',
      isMonorepo: false,
      confidence: 0,
      detectedFiles,
      packageManager: 'unknown',
    };
  }

  /**
   * Get setup instructions for a repository
   */
  async getSetupInstructions(repoPath: string): Promise<SetupInstructions> {
    const projectType = await this.detect(repoPath);
    const dependenciesInstalled = this.checkDependenciesInstalled(repoPath);
    const setupCommands = SETUP_COMMANDS[projectType.type] || SETUP_COMMANDS.unknown;

    const instructions: SetupInstructions = {
      projectType,
      dependenciesInstalled,
      setupCommands,
      withoutSetup: [
        'Semgrep security scanning',
        'npm-audit vulnerability check',
        'dependency-check vulnerability scan',
        'Basic code quality metrics',
      ],
      requiresSetup: [
        'TypeScript type checking',
        'ESLint rule analysis',
        'AI-powered fix generation',
        'Import/export analysis',
      ],
      markdown: this.generateMarkdownInstructions(projectType, dependenciesInstalled, setupCommands),
      html: this.generateHTMLInstructions(projectType, dependenciesInstalled, setupCommands),
    };

    return instructions;
  }

  /**
   * Validate that dependencies are installed
   */
  async validateSetup(repoPath: string): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check node_modules exists
    const nodeModulesPath = path.join(repoPath, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      issues.push('node_modules directory not found');
      suggestions.push('Run the setup commands to install dependencies');
    }

    // Check for typescript if project uses it
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      // Check TypeScript
      if (packageJson.devDependencies?.typescript || packageJson.dependencies?.typescript) {
        const tsPath = path.join(nodeModulesPath, 'typescript');
        if (!fs.existsSync(tsPath)) {
          issues.push('TypeScript is listed as dependency but not installed');
        }
      }
    }

    // For monorepos, check if workspace packages have node_modules
    const projectType = await this.detect(repoPath);
    if (projectType.isMonorepo && projectType.workspacePaths) {
      for (const workspace of projectType.workspacePaths.slice(0, 5)) { // Check first 5
        // Handle glob patterns
        const actualPath = workspace.replace(/\/\*$/, '');
        const workspaceNodeModules = path.join(repoPath, actualPath);

        if (fs.existsSync(workspaceNodeModules) && fs.statSync(workspaceNodeModules).isDirectory()) {
          // For Lerna, each package should have its own node_modules
          if (projectType.type === 'lerna') {
            const packages = fs.readdirSync(workspaceNodeModules)
              .filter(f => fs.statSync(path.join(workspaceNodeModules, f)).isDirectory());

            for (const pkg of packages.slice(0, 3)) { // Check first 3
              const pkgNodeModules = path.join(workspaceNodeModules, pkg, 'node_modules');
              if (!fs.existsSync(pkgNodeModules)) {
                issues.push(`Package "${pkg}" is missing node_modules`);
                suggestions.push('Run "npx lerna bootstrap" to install all package dependencies');
                break;
              }
            }
          }
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions: [...new Set(suggestions)],
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private extractWorkspacePaths(
    repoPath: string,
    packageJson: any,
    type: MonorepoType
  ): string[] | undefined {
    if (!packageJson) return undefined;

    // Get workspaces from package.json
    if (packageJson.workspaces) {
      if (Array.isArray(packageJson.workspaces)) {
        return packageJson.workspaces;
      }
      if (packageJson.workspaces.packages) {
        return packageJson.workspaces.packages;
      }
    }

    // For Lerna, check lerna.json
    if (type === 'lerna') {
      const lernaPath = path.join(repoPath, 'lerna.json');
      if (fs.existsSync(lernaPath)) {
        try {
          const lernaConfig = JSON.parse(fs.readFileSync(lernaPath, 'utf-8'));
          if (lernaConfig.packages) {
            return lernaConfig.packages;
          }
        } catch {
          // Invalid lerna.json
        }
      }
    }

    // For pnpm, check pnpm-workspace.yaml
    if (type === 'pnpm') {
      const pnpmPath = path.join(repoPath, 'pnpm-workspace.yaml');
      if (fs.existsSync(pnpmPath)) {
        try {
          const content = fs.readFileSync(pnpmPath, 'utf-8');
          // Simple YAML parsing for packages array
          const match = content.match(/packages:\s*\n((?:\s*-\s*.+\n?)+)/);
          if (match) {
            return match[1]
              .split('\n')
              .map(line => line.replace(/^\s*-\s*['"]?(.+?)['"]?\s*$/, '$1'))
              .filter(Boolean);
          }
        } catch {
          // Invalid pnpm-workspace.yaml
        }
      }
    }

    return undefined;
  }

  private calculateConfidence(
    config: DetectionConfig,
    foundFiles: string[],
    packageJson: any
  ): number {
    let confidence = 50; // Base confidence

    // More files found = higher confidence
    confidence += foundFiles.length * 10;

    // Package.json check passed = higher confidence
    if (config.packageJsonCheck && packageJson) {
      confidence += 20;
    }

    // Higher priority configs get bonus
    confidence += Math.min(config.priority / 5, 20);

    return Math.min(confidence, 100);
  }

  private detectPackageManager(
    repoPath: string,
    defaultManager: 'npm' | 'yarn' | 'pnpm' | 'unknown'
  ): 'npm' | 'yarn' | 'pnpm' | 'unknown' {
    // Check for lock files
    if (fs.existsSync(path.join(repoPath, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (fs.existsSync(path.join(repoPath, 'yarn.lock'))) {
      return 'yarn';
    }
    if (fs.existsSync(path.join(repoPath, 'package-lock.json'))) {
      return 'npm';
    }

    return defaultManager;
  }

  private checkDependenciesInstalled(repoPath: string): boolean {
    const nodeModulesPath = path.join(repoPath, 'node_modules');
    return fs.existsSync(nodeModulesPath) &&
           fs.statSync(nodeModulesPath).isDirectory();
  }

  private generateMarkdownInstructions(
    projectType: MonorepoDetectionResult,
    dependenciesInstalled: boolean,
    setupCommands: SetupCommand[]
  ): string {
    const lines: string[] = [];

    lines.push('## 🔧 Setup Required for PRO Tier Analysis\n');
    lines.push(`**Detected Project Type:** ${projectType.displayName}`);
    if (projectType.isMonorepo) {
      lines.push(`**Monorepo:** Yes`);
    }
    lines.push(`**Package Manager:** ${projectType.packageManager}\n`);

    if (dependenciesInstalled) {
      lines.push('✅ **Dependencies appear to be installed.**\n');
      lines.push('If you\'re still seeing errors, try running the commands below.\n');
    } else {
      lines.push('⚠️ **Dependencies are NOT installed.**\n');
      lines.push('PRO tier features require dependencies to be installed. Run these commands:\n');
    }

    lines.push('### Setup Commands\n');
    lines.push('```bash');
    for (const cmd of setupCommands) {
      lines.push(`# ${cmd.description} (${cmd.estimatedTime})`);
      if (cmd.notes) {
        lines.push(`# Note: ${cmd.notes}`);
      }
      lines.push(cmd.command);
      lines.push('');
    }
    lines.push('```\n');

    lines.push('### What Works WITHOUT Setup\n');
    lines.push('- Semgrep security scanning');
    lines.push('- npm-audit vulnerability check');
    lines.push('- dependency-check vulnerability scan');
    lines.push('- Basic code quality metrics\n');

    lines.push('### What REQUIRES Setup\n');
    lines.push('- TypeScript type checking');
    lines.push('- ESLint rule analysis');
    lines.push('- AI-powered fix generation');
    lines.push('- Import/export analysis\n');

    return lines.join('\n');
  }

  private generateHTMLInstructions(
    projectType: MonorepoDetectionResult,
    dependenciesInstalled: boolean,
    setupCommands: SetupCommand[]
  ): string {
    return `
<div class="setup-instructions">
  <h2>🔧 Setup Required for PRO Tier Analysis</h2>

  <div class="project-info">
    <p><strong>Detected Project Type:</strong> ${projectType.displayName}</p>
    ${projectType.isMonorepo ? '<p><strong>Monorepo:</strong> Yes</p>' : ''}
    <p><strong>Package Manager:</strong> ${projectType.packageManager}</p>
  </div>

  ${dependenciesInstalled ? `
    <div class="status success">
      <p>✅ <strong>Dependencies appear to be installed.</strong></p>
      <p>If you're still seeing errors, try running the commands below.</p>
    </div>
  ` : `
    <div class="status warning">
      <p>⚠️ <strong>Dependencies are NOT installed.</strong></p>
      <p>PRO tier features require dependencies to be installed. Run these commands:</p>
    </div>
  `}

  <h3>Setup Commands</h3>
  <div class="commands">
    ${setupCommands.map(cmd => `
      <div class="command">
        <p class="description">${cmd.description} <span class="time">(${cmd.estimatedTime})</span></p>
        ${cmd.notes ? `<p class="note">Note: ${cmd.notes}</p>` : ''}
        <code>${cmd.command}</code>
      </div>
    `).join('')}
  </div>

  <div class="feature-grid">
    <div class="feature-list without-setup">
      <h4>Works WITHOUT Setup</h4>
      <ul>
        <li>Semgrep security scanning</li>
        <li>npm-audit vulnerability check</li>
        <li>dependency-check vulnerability scan</li>
        <li>Basic code quality metrics</li>
      </ul>
    </div>
    <div class="feature-list requires-setup">
      <h4>REQUIRES Setup</h4>
      <ul>
        <li>TypeScript type checking</li>
        <li>ESLint rule analysis</li>
        <li>AI-powered fix generation</li>
        <li>Import/export analysis</li>
      </ul>
    </div>
  </div>
</div>

<style>
  .setup-instructions { padding: 1rem; }
  .project-info { background: #f8fafc; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
  .status { padding: 1rem; border-radius: 8px; margin: 1rem 0; }
  .status.success { background: #d1fae5; border: 1px solid #10b981; }
  .status.warning { background: #fef3c7; border: 1px solid #f59e0b; }
  .commands { background: #1f2937; color: #f9fafb; padding: 1rem; border-radius: 8px; }
  .command { margin-bottom: 1rem; }
  .command .description { color: #9ca3af; margin-bottom: 0.25rem; }
  .command .time { font-size: 0.875rem; }
  .command .note { color: #fbbf24; font-size: 0.875rem; margin-bottom: 0.25rem; }
  .command code { display: block; padding: 0.5rem; background: #374151; border-radius: 4px; }
  .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
  .feature-list { padding: 1rem; border-radius: 8px; }
  .feature-list.without-setup { background: #d1fae5; }
  .feature-list.requires-setup { background: #fee2e2; }
  .feature-list h4 { margin-top: 0; }
  .feature-list ul { margin-bottom: 0; padding-left: 1.5rem; }
</style>
`;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a MonorepoDetector instance
 */
export function createMonorepoDetector(): MonorepoDetector {
  return new MonorepoDetector();
}

/**
 * Quick detection of project type
 */
export async function detectProjectType(repoPath: string): Promise<MonorepoDetectionResult> {
  const detector = new MonorepoDetector();
  return detector.detect(repoPath);
}

/**
 * Get setup instructions for a repository
 */
export async function getSetupInstructions(repoPath: string): Promise<SetupInstructions> {
  const detector = new MonorepoDetector();
  return detector.getSetupInstructions(repoPath);
}

/**
 * Validate that a repository is properly set up for PRO tier analysis
 */
export async function validateProjectSetup(repoPath: string): Promise<{
  isValid: boolean;
  issues: string[];
  suggestions: string[];
}> {
  const detector = new MonorepoDetector();
  return detector.validateSetup(repoPath);
}
