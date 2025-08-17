#!/usr/bin/env node

/**
 * CodeQual Session Starter
 * 
 * Specialized environment setup specialist for the CodeQual project
 * Mission: Prepare development environment and provide complete session context in under 2 minutes
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { loadEnvironment } from '../utils/env-loader';
import { sessionStateManager } from '../utils/session-state-manager';

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  message?: string;
}

interface SessionStatus {
  lastSession: string;
  gitStatus: { clean: boolean; uncommittedFiles: number };
  services: ServiceStatus[];
  activeBugs: number;
  currentPhase: string;
  priorityTask: string;
  quickCommands: string[];
  continueFrom: string;
}

class CodeQualSessionStarter {
  private projectRoot: string;
  private agentsDir: string;
  private quickSetupScript: string;

  constructor() {
    this.projectRoot = path.resolve(__dirname, '../../../../../');
    this.agentsDir = path.join(this.projectRoot, 'packages/agents');
    this.quickSetupScript = path.join(this.projectRoot, '.claude/quick-setup.sh');
  }

  /**
   * Main execution entry point
   */
  async start(): Promise<void> {
    console.log(chalk.bold.cyan('\n🚀 CodeQual Session Starter\n'));
    
    // Step 1: Load environment using centralized loader
    console.log(chalk.yellow('📦 Loading environment configuration...'));
    const envLoaded = await this.loadEnvironmentConfig();
    
    if (!envLoaded) {
      console.log(chalk.red('❌ Failed to load environment. Running setup...'));
      await this.runQuickSetup();
    }

    // Step 2: Run quick setup if needed
    const setupNeeded = await this.checkSetupRequired();
    if (setupNeeded) {
      console.log(chalk.yellow('🔧 Running quick setup...'));
      await this.runQuickSetup();
    }

    // Step 3: Gather session information
    console.log(chalk.yellow('📊 Gathering session information...\n'));
    const status = await this.gatherSessionStatus();

    // Step 4: Display session status
    this.displaySessionStatus(status);

    // Step 5: Show quick commands
    this.displayQuickCommands(status);
  }

  /**
   * Load environment using centralized loader
   */
  private async loadEnvironmentConfig(): Promise<boolean> {
    try {
      loadEnvironment();
      return true;
    } catch (error) {
      console.error(chalk.red('Error loading environment:'), error);
      return false;
    }
  }

  /**
   * Check if setup is required
   */
  private async checkSetupRequired(): Promise<boolean> {
    // Check key services
    const checks = [
      this.checkDeepWikiPod(),
      this.checkPortForwarding(),
      this.checkRedis(),
      this.checkBuildExists()
    ];

    const results = await Promise.all(checks);
    return results.some(r => !r);
  }

  /**
   * Run the quick setup script
   */
  private async runQuickSetup(): Promise<void> {
    try {
      if (fs.existsSync(this.quickSetupScript)) {
        console.log(chalk.gray('Running quick-setup.sh...'));
        execSync(`bash ${this.quickSetupScript}`, { 
          cwd: this.projectRoot,
          stdio: 'inherit'
        });
      } else {
        // Run manual setup commands
        console.log(chalk.gray('Running manual setup...'));
        
        // Load environment
        if (fs.existsSync(path.join(this.projectRoot, '.env'))) {
          loadEnvironment();
        }

        // Start Redis if not running
        try {
          execSync('redis-cli ping', { stdio: 'pipe' });
        } catch {
          console.log(chalk.gray('Starting Redis...'));
          execSync('redis-server --daemonize yes', { stdio: 'pipe' });
        }

        // Setup port forwarding
        try {
          execSync('curl -s http://localhost:8001/health', { stdio: 'pipe' });
        } catch {
          console.log(chalk.gray('Setting up port forwarding...'));
          execSync('pkill -f "port-forward.*8001"', { stdio: 'pipe' }).toString();
          execSync('kubectl port-forward -n codequal-dev svc/deepwiki-api 8001:8001 &', { 
            stdio: 'pipe' 
          });
        }

        // Build if needed
        if (!fs.existsSync(path.join(this.agentsDir, 'dist'))) {
          console.log(chalk.gray('Building project...'));
          execSync('npm run build', { cwd: this.agentsDir, stdio: 'inherit' });
        }
      }
    } catch (error) {
      console.error(chalk.red('Setup error:'), error);
    }
  }

  /**
   * Gather comprehensive session status
   */
  private async gatherSessionStatus(): Promise<SessionStatus> {
    const [
      lastSession,
      gitStatus,
      services,
      activeBugs,
      currentPhase,
      priorityTask,
      continueFrom
    ] = await Promise.all([
      this.getLastSessionInfo(),
      this.getGitStatus(),
      this.checkAllServices(),
      this.getActiveBugs(),
      this.getCurrentPhase(),
      this.getPriorityTask(),
      this.getContinueFrom()
    ]);

    const quickCommands = this.generateQuickCommands(services);

    return {
      lastSession,
      gitStatus,
      services,
      activeBugs,
      currentPhase,
      priorityTask,
      quickCommands,
      continueFrom
    };
  }

  /**
   * Get last session information from NEXT_SESSION_PLAN.md
   */
  private async getLastSessionInfo(): Promise<string> {
    try {
      // First check NEXT_SESSION_PLAN.md as per SESSION_MANAGEMENT.md rules
      const nextPlanPath = path.join(this.agentsDir, 'src/standard/docs/session_summary/NEXT_SESSION_PLAN.md');
      if (fs.existsSync(nextPlanPath)) {
        const content = fs.readFileSync(nextPlanPath, 'utf-8');
        const lines = content.split('\n');
        
        // Extract the updated date and previous session status
        const updatedLine = lines.find(l => l.includes('**Updated:**')) || '';
        const statusLine = lines.find(l => l.includes('**Previous Session Status:**')) || '';
        
        const dateMatch = updatedLine.match(/(\d{4}[-_]\d{2}[-_]\d{2})/);
        const date = dateMatch ? dateMatch[1].replace(/_/g, '-') : 'Unknown';
        
        const status = statusLine.replace(/\*\*Previous Session Status:\*\*/, '').trim() || 
                       'Check NEXT_SESSION_PLAN.md for details';
        
        return `${date} - ${status.substring(0, 100)}`;
      }

      // Fallback to latest session summary if NEXT_SESSION_PLAN.md doesn't exist
      const sessionDir = path.join(this.agentsDir, 'src/standard/docs/session_summary');
      if (!fs.existsSync(sessionDir)) {
        return 'No previous session found';
      }

      const files = fs.readdirSync(sessionDir)
        .filter(f => f.startsWith('SESSION_SUMMARY'))
        .sort()
        .reverse();

      if (files.length === 0) {
        return 'No previous session found';
      }

      const latestFile = path.join(sessionDir, files[0]);
      const content = fs.readFileSync(latestFile, 'utf-8');
      const lines = content.split('\n').slice(0, 5);
      const dateMatch = files[0].match(/(\d{4}_\d{2}_\d{2})/);
      const summaryLine = lines.find(l => l.includes('Summary:')) || lines[2] || '';
      
      return `${dateMatch ? dateMatch[1].replace(/_/g, '-') : 'Unknown'} - ${summaryLine.replace(/^#+\s*/, '').substring(0, 80)}`;
    } catch {
      return 'Unable to read session summary';
    }
  }

  /**
   * Get git status
   */
  private async getGitStatus(): Promise<{ clean: boolean; uncommittedFiles: number }> {
    try {
      const output = execSync('git status --porcelain', { 
        cwd: this.projectRoot,
        encoding: 'utf-8'
      });
      const files = output.split('\n').filter(l => l.trim()).length;
      return { clean: files === 0, uncommittedFiles: files };
    } catch {
      return { clean: false, uncommittedFiles: 0 };
    }
  }

  /**
   * Check all services
   */
  private async checkAllServices(): Promise<ServiceStatus[]> {
    const services: ServiceStatus[] = [];

    // DeepWiki
    const deepwikiStatus = await this.checkDeepWikiPod();
    services.push({
      name: 'DeepWiki',
      status: deepwikiStatus ? 'running' : 'stopped',
      message: deepwikiStatus ? 'Pod running' : 'Pod not found'
    });

    // Port Forward
    const portForwardStatus = await this.checkPortForwarding();
    services.push({
      name: 'Port Forward',
      status: portForwardStatus ? 'running' : 'stopped',
      message: portForwardStatus ? 'localhost:8001 active' : 'Not forwarding'
    });

    // Redis
    const redisStatus = await this.checkRedis();
    services.push({
      name: 'Redis',
      status: redisStatus ? 'running' : 'stopped',
      message: redisStatus ? 'localhost:6379 connected' : 'Not running'
    });

    // Build
    const buildStatus = await this.checkBuildExists();
    services.push({
      name: 'Build',
      status: buildStatus ? 'running' : 'stopped',
      message: buildStatus ? 'dist/ ready' : 'Build required'
    });

    return services;
  }

  /**
   * Check DeepWiki pod status
   */
  private async checkDeepWikiPod(): Promise<boolean> {
    try {
      const output = execSync('kubectl get pods -n codequal-dev -l app=deepwiki --no-headers', {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      return output.includes('Running');
    } catch {
      return false;
    }
  }

  /**
   * Check port forwarding
   */
  private async checkPortForwarding(): Promise<boolean> {
    try {
      execSync('curl -s http://localhost:8001/health', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check Redis
   */
  private async checkRedis(): Promise<boolean> {
    try {
      const output = execSync('redis-cli ping', { 
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      return output.trim() === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Check if build exists
   */
  private async checkBuildExists(): Promise<boolean> {
    return fs.existsSync(path.join(this.agentsDir, 'dist'));
  }

  /**
   * Get active bugs count
   */
  private async getActiveBugs(): Promise<number> {
    try {
      const bugsFile = path.join(this.agentsDir, 'src/standard/bugs/BUGS.md');
      if (!fs.existsSync(bugsFile)) {
        return 0;
      }
      const content = fs.readFileSync(bugsFile, 'utf-8');
      const bugMatches = content.match(/^##\s+BUG-\d+/gm);
      return bugMatches ? bugMatches.length : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get current phase from operational plan
   */
  private async getCurrentPhase(): Promise<string> {
    try {
      const planFile = path.join(this.agentsDir, 'src/standard/docs/planning/OPERATIONAL-PLAN.md');
      if (!fs.existsSync(planFile)) {
        return 'No operational plan found';
      }
      const content = fs.readFileSync(planFile, 'utf-8');
      const phaseMatch = content.match(/##\s*PHASE\s+(\d+[A-Z]?):\s*([^\n]+)/);
      return phaseMatch ? `Phase ${phaseMatch[1]}: ${phaseMatch[2]}` : 'Unknown phase';
    } catch {
      return 'Unable to read operational plan';
    }
  }

  /**
   * Get priority task from NEXT_SESSION_PLAN.md
   */
  private async getPriorityTask(): Promise<string> {
    try {
      // First check NEXT_SESSION_PLAN.md as per SESSION_MANAGEMENT.md rules
      const nextPlanPath = path.join(this.agentsDir, 'src/standard/docs/session_summary/NEXT_SESSION_PLAN.md');
      if (fs.existsSync(nextPlanPath)) {
        const content = fs.readFileSync(nextPlanPath, 'utf-8');
        
        // Look for PRIMARY FOCUS or Priority section
        const focusMatch = content.match(/PRIMARY FOCUS:\s*([^\n]+)/);
        if (focusMatch) {
          return focusMatch[1].trim();
        }
        
        // Look for numbered priority items
        const priorityMatch = content.match(/^1\.\s+(.+)$/m);
        if (priorityMatch) {
          return priorityMatch[1].trim();
        }
      }
      
      // Fallback to session state
      const state = await sessionStateManager.readState();
      if (state.nextTasks && state.nextTasks.length > 0) {
        return state.nextTasks[0];
      }
      return 'No priority tasks defined';
    } catch {
      return 'Check NEXT_SESSION_PLAN.md for priorities';
    }
  }

  /**
   * Get continue from task from NEXT_SESSION_PLAN.md
   */
  private async getContinueFrom(): Promise<string> {
    try {
      // Read from NEXT_SESSION_PLAN.md
      const nextPlanPath = path.join(this.agentsDir, 'src/standard/docs/session_summary/NEXT_SESSION_PLAN.md');
      if (fs.existsSync(nextPlanPath)) {
        const content = fs.readFileSync(nextPlanPath, 'utf-8');
        
        // Look for Quick Session Startup Commands section
        const startupMatch = content.match(/Quick Session Startup Commands[\s\S]*?```bash\n([\s\S]*?)```/);
        if (startupMatch) {
          const commands = startupMatch[1].split('\n').filter(l => l.trim() && !l.startsWith('#'));
          if (commands.length > 0) {
            return commands[0].trim();
          }
        }
        
        // Look for Investigation Plan
        const investigationMatch = content.match(/Investigation Plan[\s\S]*?```bash\n([\s\S]*?)```/);
        if (investigationMatch) {
          const commands = investigationMatch[1].split('\n').filter(l => l.trim() && !l.startsWith('#'));
          if (commands.length > 0) {
            return 'Run: ' + commands[0].trim();
          }
        }
      }
      
      // Fallback to session state
      const state = await sessionStateManager.readState();
      if (state.nextTasks && state.nextTasks.length > 0) {
        return state.nextTasks[0];
      }
      return 'Start with priority task from NEXT_SESSION_PLAN.md';
    } catch {
      return 'Check NEXT_SESSION_PLAN.md for next steps';
    }
  }

  /**
   * Generate context-aware quick commands
   */
  private generateQuickCommands(services: ServiceStatus[]): string[] {
    const commands: string[] = [];

    // Add setup command if any service is down
    const hasIssues = services.some(s => s.status !== 'running');
    if (hasIssues) {
      commands.push('npm run setup  # Fix all environment issues');
    }

    // Add test commands with new shortcuts
    commands.push('npm run test:pr:small  # Test with small PR (vercel/next.js#60000)');
    commands.push('npm run test:pr:large  # Test with large PR (kubernetes/kubernetes#120000)');

    // Add specific fixes for down services
    services.forEach(service => {
      if (service.status !== 'running') {
        switch (service.name) {
          case 'Port Forward':
            commands.push('npm run setup:port-forward  # Fix port forwarding');
            break;
          case 'Redis':
            commands.push('redis-server --daemonize yes  # Start Redis');
            break;
          case 'Build':
            commands.push('npm run build  # Build project');
            break;
          case 'DeepWiki':
            commands.push('kubectl rollout restart deployment/deepwiki -n codequal-dev  # Restart DeepWiki');
            break;
        }
      }
    });

    // Add standard run command if all services are up
    if (!hasIssues) {
      commands.push('npm run analyze -- --owner facebook --repo react --pr 28000  # Run full analysis');
    }

    return commands;
  }

  /**
   * Display formatted session status
   */
  private displaySessionStatus(status: SessionStatus): void {
    console.log(chalk.bold('📅 Last Session:'), status.lastSession);
    console.log(chalk.bold('📁 Git Status:'), 
      status.gitStatus.clean 
        ? chalk.green('clean') 
        : chalk.yellow(`${status.gitStatus.uncommittedFiles} uncommitted files`)
    );
    
    console.log('\n' + chalk.bold('🔧 Services:'));
    status.services.forEach(service => {
      const icon = service.status === 'running' ? '✅' : '❌';
      const color = service.status === 'running' ? chalk.green : chalk.red;
      console.log(`${icon} ${service.name}: ${color(service.message || service.status)}`);
    });

    console.log('\n' + chalk.bold('🐛 Active Bugs:'), 
      status.activeBugs > 0 
        ? chalk.yellow(`${status.activeBugs} open bugs`) 
        : chalk.green('No open bugs')
    );
    
    console.log(chalk.bold('📋 Current Phase:'), status.currentPhase);
    console.log(chalk.bold('⭐ Priority:'), chalk.cyan(status.priorityTask));
    console.log(chalk.bold('📌 Continue from:'), chalk.magenta(status.continueFrom));
  }

  /**
   * Display quick commands
   */
  private displayQuickCommands(status: SessionStatus): void {
    console.log('\n' + chalk.bold('⚡ Quick Commands:'));
    status.quickCommands.forEach(cmd => {
      const [command, description] = cmd.split('  # ');
      if (description) {
        console.log(chalk.cyan(command) + chalk.gray('  # ' + description));
      } else {
        console.log(chalk.cyan(cmd));
      }
    });

    console.log('\n' + chalk.bold('📊 Reference Report:'), 
      chalk.gray('packages/test-integration/reports/codequal_deepwiki-pr-analysis-report.md')
    );

    // Display environment status
    console.log('\n' + chalk.bold('🌍 Environment:'));
    const envVars = [
      'DEEPWIKI_API_URL',
      'REDIS_URL',
      'SUPABASE_URL',
      'OPENROUTER_API_KEY'
    ];
    
    envVars.forEach(varName => {
      const value = process.env[varName];
      const icon = value ? '✅' : '❌';
      const status = value ? chalk.green('configured') : chalk.red('missing');
      console.log(`${icon} ${varName}: ${status}`);
    });
  }
}

// Main execution
if (require.main === module) {
  const starter = new CodeQualSessionStarter();
  starter.start().catch(error => {
    console.error(chalk.red('Session starter failed:'), error);
    process.exit(1);
  });
}

export { CodeQualSessionStarter };