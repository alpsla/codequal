/**
 * PRO Tier Setup Prompt Service
 *
 * Handles the user decision flow after framework detection:
 * 1. Detect framework and monorepo type
 * 2. Check if dependencies are installed
 * 3. If not: Prompt user with choices:
 *    - Option A: Install dependencies and get full PRO tier (AI fixes)
 *    - Option B: Use BASIC tier (IDE-assisted fixes, no installation needed)
 * 4. Return user's choice for downstream processing
 *
 * This is the critical UX touchpoint that explains the tradeoffs.
 */

import { MonorepoDetector, MonorepoDetectionResult, SetupInstructions, SetupCommand } from '../../two-branch/utils/monorepo-detector';
import { FrameworkDetector, FrameworkDetectionResult } from '../../two-branch/utils/framework-detector';

// ============================================================================
// Types
// ============================================================================

/**
 * User's choice for how to proceed
 */
export type UserTierChoice =
  | 'PRO_WITH_SETUP'      // User will run setup commands, wants full AI fixes
  | 'PRO_ALREADY_SETUP'   // Dependencies already installed, proceed with PRO
  | 'BASIC_NO_SETUP'      // User chooses BASIC tier, skip setup
  | 'CANCEL';             // User cancels analysis

/**
 * Result of the setup prompt flow
 */
export interface SetupPromptResult {
  /** User's choice */
  choice: UserTierChoice;

  /** Detected framework information */
  framework: FrameworkDetectionResult;

  /** Detected monorepo information */
  monorepo: MonorepoDetectionResult;

  /** Setup instructions (if needed) */
  setupInstructions?: SetupInstructions;

  /** Whether setup is required for full analysis */
  setupRequired: boolean;

  /** Recommended tier based on setup state */
  recommendedTier: 'pro' | 'basic';

  /** What features are available without setup */
  availableWithoutSetup: string[];

  /** What features require setup */
  requiresSetup: string[];
}

/**
 * Prompt content for display to user
 */
/** JSON structure for API responses */
export interface SetupPromptJSON {
  framework: {
    name: string;
    language: string;
    buildSystem: string;
    confidence: number;
  };
  monorepo: {
    type: string;
    isMonorepo: boolean;
    packageManager: string;
  };
  setupRequired: boolean;
  recommendedTier: 'pro' | 'basic';
  validationIssues: string[];
  commands: SetupCommand[];
}

export interface SetupPromptContent {
  /** Title of the prompt */
  title: string;

  /** Summary message */
  summary: string;

  /** Detailed explanation */
  details: string;

  /** Setup commands to run (if applicable) */
  commands: SetupCommand[];

  /** Options for user to choose */
  options: {
    id: UserTierChoice;
    label: string;
    description: string;
    recommended: boolean;
  }[];

  /** Markdown version for CLI/terminal */
  markdown: string;

  /** HTML version for web UI */
  html: string;

  /** JSON version for API */
  json: SetupPromptJSON;
}

// ============================================================================
// Constants
// ============================================================================

const FEATURES_WITHOUT_SETUP = [
  'Semgrep security scanning',
  'npm-audit vulnerability detection',
  'dependency-check CVE scanning',
  'Basic code quality metrics',
  'Issue grouping and cost analysis',
];

const FEATURES_REQUIRING_SETUP = [
  'TypeScript type error analysis',
  'ESLint rule checking',
  'AI-powered fix generation',
  'Import/export validation',
  'Full PRO tier auto-fixes',
];

// ============================================================================
// PRO Tier Setup Prompt Service
// ============================================================================

export class PROTierSetupPromptService {
  private monorepoDetector: MonorepoDetector;
  private frameworkDetector: FrameworkDetector;

  constructor() {
    this.monorepoDetector = new MonorepoDetector();
    this.frameworkDetector = new FrameworkDetector();
  }

  /**
   * Analyze repository and generate setup prompt
   */
  async analyzeAndPrompt(repoPath: string): Promise<SetupPromptContent> {
    // Detect framework and monorepo type
    const framework = await this.frameworkDetector.detectFrameworks(repoPath);
    const monorepo = await this.monorepoDetector.detect(repoPath);
    const setupInstructions = await this.monorepoDetector.getSetupInstructions(repoPath);
    const validation = await this.monorepoDetector.validateSetup(repoPath);

    const setupRequired = !validation.isValid;
    const recommendedTier = setupRequired ? 'basic' : 'pro';

    return this.generatePromptContent({
      framework,
      monorepo,
      setupInstructions,
      setupRequired,
      recommendedTier,
      validationIssues: validation.issues,
    });
  }

  /**
   * Generate prompt content for display
   */
  private generatePromptContent(context: {
    framework: FrameworkDetectionResult;
    monorepo: MonorepoDetectionResult;
    setupInstructions: SetupInstructions;
    setupRequired: boolean;
    recommendedTier: 'pro' | 'basic';
    validationIssues: string[];
  }): SetupPromptContent {
    const { framework, monorepo, setupInstructions, setupRequired, recommendedTier, validationIssues } = context;

    // Generate title
    const title = setupRequired
      ? '🔧 Setup Required for Full Analysis'
      : '✅ Ready for PRO Tier Analysis';

    // Generate summary
    const summary = setupRequired
      ? `Detected ${framework.primaryFramework} ${monorepo.isMonorepo ? `(${monorepo.displayName})` : ''} - dependencies not installed`
      : `Detected ${framework.primaryFramework} ${monorepo.isMonorepo ? `(${monorepo.displayName})` : ''} - ready to analyze`;

    // Generate details
    const details = this.generateDetails(context);

    // Generate options
    const options = this.generateOptions(setupRequired, recommendedTier);

    // Generate formatted versions
    const markdown = this.generateMarkdown(title, summary, details, setupInstructions.setupCommands, options);
    const html = this.generateHTML(title, summary, details, setupInstructions.setupCommands, options);

    return {
      title,
      summary,
      details,
      commands: setupInstructions.setupCommands,
      options,
      markdown,
      html,
      json: {
        framework: {
          name: framework.primaryFramework,
          language: framework.language,
          buildSystem: framework.buildSystem,
          confidence: framework.confidence,
        },
        monorepo: {
          type: monorepo.type,
          isMonorepo: monorepo.isMonorepo,
          packageManager: monorepo.packageManager,
        },
        setupRequired,
        recommendedTier,
        validationIssues,
        commands: setupInstructions.setupCommands,
      },
    };
  }

  /**
   * Generate detailed explanation
   */
  private generateDetails(context: {
    framework: FrameworkDetectionResult;
    monorepo: MonorepoDetectionResult;
    setupRequired: boolean;
    validationIssues: string[];
  }): string {
    const { framework, monorepo, setupRequired, validationIssues } = context;

    const lines: string[] = [];

    lines.push(`**Framework:** ${framework.primaryFramework} (${framework.language})`);
    lines.push(`**Build System:** ${framework.buildSystem}`);

    if (monorepo.isMonorepo) {
      lines.push(`**Monorepo Type:** ${monorepo.displayName}`);
      lines.push(`**Package Manager:** ${monorepo.packageManager}`);
    }

    if (setupRequired) {
      lines.push('');
      lines.push('**Issues Found:**');
      for (const issue of validationIssues) {
        lines.push(`- ${issue}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate user options
   */
  private generateOptions(
    setupRequired: boolean,
    recommendedTier: 'pro' | 'basic'
  ): SetupPromptContent['options'] {
    if (!setupRequired) {
      // Dependencies installed - offer PRO directly
      return [
        {
          id: 'PRO_ALREADY_SETUP',
          label: '🚀 Continue with PRO Tier',
          description: 'Dependencies are installed. Get full AI-powered fixes.',
          recommended: true,
        },
        {
          id: 'BASIC_NO_SETUP',
          label: '📝 Use BASIC Tier Instead',
          description: 'Skip AI fixes, get IDE-assisted recommendations.',
          recommended: false,
        },
      ];
    }

    // Dependencies not installed - offer choice
    return [
      {
        id: 'PRO_WITH_SETUP',
        label: '🔧 Install Dependencies (PRO Tier)',
        description: 'Run setup commands to enable full AI-powered fixes. Takes 2-10 minutes.',
        recommended: recommendedTier === 'pro',
      },
      {
        id: 'BASIC_NO_SETUP',
        label: '⚡ Skip Setup (BASIC Tier)',
        description: 'Get security scanning and IDE-assisted fixes without installing dependencies.',
        recommended: recommendedTier === 'basic',
      },
      {
        id: 'CANCEL',
        label: '❌ Cancel Analysis',
        description: 'Cancel and come back later.',
        recommended: false,
      },
    ];
  }

  /**
   * Generate Markdown version for CLI
   */
  private generateMarkdown(
    title: string,
    summary: string,
    details: string,
    commands: SetupCommand[],
    options: SetupPromptContent['options']
  ): string {
    const lines: string[] = [];

    lines.push(`# ${title}\n`);
    lines.push(`${summary}\n`);
    lines.push(details);
    lines.push('');

    if (commands.length > 0 && options.some(o => o.id === 'PRO_WITH_SETUP')) {
      lines.push('## Setup Commands\n');
      lines.push('```bash');
      for (const cmd of commands) {
        lines.push(`# ${cmd.description}`);
        if (cmd.notes) lines.push(`# Note: ${cmd.notes}`);
        lines.push(cmd.command);
        lines.push('');
      }
      lines.push('```\n');
    }

    lines.push('## Feature Comparison\n');
    lines.push('| Feature | Without Setup | With Setup |');
    lines.push('|---------|--------------|------------|');
    lines.push('| Security Scanning (Semgrep) | ✅ | ✅ |');
    lines.push('| Vulnerability Detection | ✅ | ✅ |');
    lines.push('| Issue Grouping | ✅ | ✅ |');
    lines.push('| TypeScript Analysis | ❌ | ✅ |');
    lines.push('| ESLint Analysis | ❌ | ✅ |');
    lines.push('| AI-Powered Fixes | ❌ | ✅ |');
    lines.push('');

    lines.push('## Your Options\n');
    for (const option of options) {
      const rec = option.recommended ? ' **(Recommended)**' : '';
      lines.push(`### ${option.label}${rec}`);
      lines.push(`${option.description}\n`);
    }

    return lines.join('\n');
  }

  /**
   * Generate HTML version for Web UI
   */
  private generateHTML(
    title: string,
    summary: string,
    details: string,
    commands: SetupCommand[],
    options: SetupPromptContent['options']
  ): string {
    return `
<div class="pro-tier-prompt">
  <h1>${title}</h1>
  <p class="summary">${summary}</p>

  <div class="details">
    ${details.split('\n').map(line => `<p>${line}</p>`).join('')}
  </div>

  ${commands.length > 0 ? `
    <div class="setup-commands">
      <h2>Setup Commands</h2>
      <div class="command-list">
        ${commands.map(cmd => `
          <div class="command">
            <span class="desc">${cmd.description}</span>
            <code>${cmd.command}</code>
            ${cmd.notes ? `<span class="note">${cmd.notes}</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : ''}

  <div class="options">
    <h2>Choose Your Path</h2>
    ${options.map(opt => `
      <button
        class="option-btn ${opt.recommended ? 'recommended' : ''}"
        data-choice="${opt.id}"
      >
        <span class="label">${opt.label}</span>
        <span class="desc">${opt.description}</span>
        ${opt.recommended ? '<span class="badge">Recommended</span>' : ''}
      </button>
    `).join('')}
  </div>

  <div class="feature-comparison">
    <h2>What You Get</h2>
    <div class="columns">
      <div class="without-setup">
        <h3>Without Setup (BASIC)</h3>
        <ul>
          ${FEATURES_WITHOUT_SETUP.map(f => `<li>✅ ${f}</li>`).join('')}
          ${FEATURES_REQUIRING_SETUP.map(f => `<li>❌ ${f}</li>`).join('')}
        </ul>
      </div>
      <div class="with-setup">
        <h3>With Setup (PRO)</h3>
        <ul>
          ${FEATURES_WITHOUT_SETUP.map(f => `<li>✅ ${f}</li>`).join('')}
          ${FEATURES_REQUIRING_SETUP.map(f => `<li>✅ ${f}</li>`).join('')}
        </ul>
      </div>
    </div>
  </div>
</div>
`;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a PRO tier setup prompt service
 */
export function createPROTierSetupPrompt(): PROTierSetupPromptService {
  return new PROTierSetupPromptService();
}

/**
 * Quick analysis and prompt generation
 */
export async function analyzeAndPromptForSetup(repoPath: string): Promise<SetupPromptContent> {
  const service = new PROTierSetupPromptService();
  return service.analyzeAndPrompt(repoPath);
}

/**
 * Get simple setup status (for API responses)
 */
export async function getSetupStatus(repoPath: string): Promise<{
  setupRequired: boolean;
  framework: string;
  monorepoType: string;
  packageManager: string;
  commands: string[];
}> {
  const service = new PROTierSetupPromptService();
  const prompt = await service.analyzeAndPrompt(repoPath);

  return {
    setupRequired: prompt.json.setupRequired,
    framework: (prompt.json as any).framework.name,
    monorepoType: (prompt.json as any).monorepo.type,
    packageManager: (prompt.json as any).monorepo.packageManager,
    commands: prompt.commands.map(c => c.command),
  };
}
