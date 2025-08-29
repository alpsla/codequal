#!/usr/bin/env node

/**
 * CodeQual Session Starter
 * 
 * Specialized environment setup specialist for the CodeQual project
 * Mission: Prepare development environment and provide complete session context in under 2 minutes
 * Updated: 2025-08-28 - Migrated from DeepWiki to MCP tools infrastructure
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
      this.checkDockerRunning(),
      this.checkMCPServices(),
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

        // Start MCP services if not running
        try {
          execSync('curl -s http://localhost:3000/health', { stdio: 'pipe' });
        } catch {
          console.log(chalk.gray('Starting MCP services...'));
          const dockerScript = path.join(this.agentsDir, 'start-secure-mcp-stack.sh');
          if (fs.existsSync(dockerScript)) {
            execSync(`bash ${dockerScript}`, { stdio: 'pipe' });
          }
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
      const nextPlanPath = path.join(this.agentsDir, 'src/two-branch/docs/session-summary/NEXT_SESSION_PLAN.md');
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
      const sessionDir = path.join(this.agentsDir, 'src/two-branch/docs/session-summary');
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

    // Docker
    const dockerStatus = await this.checkDockerRunning();
    services.push({
      name: 'Docker',
      status: dockerStatus ? 'running' : 'stopped',
      message: dockerStatus ? 'Docker Desktop running' : 'Docker Desktop not running'
    });

    // MCP Services (check multiple ports)
    const mcpPorts = [
      { port: 3000, name: 'MCP-Scan' },
      { port: 3001, name: 'DevSecOps-MCP' },
      { port: 3002, name: 'ESLint-MCP' },
      { port: 3003, name: 'FileScopeMCP' },
      { port: 3004, name: 'K6-MCP' },
      { port: 3005, name: 'BrowserTools-MCP' }
    ];

    for (const { port, name } of mcpPorts) {
      const status = await this.checkServicePort(port);
      services.push({
        name,
        status: status ? 'running' : 'stopped',
        message: status ? `localhost:${port} active` : 'Not running'
      });
    }

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
   * Check Docker running
   */
  private async checkDockerRunning(): Promise<boolean> {
    try {
      execSync('docker info', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check MCP services
   */
  private async checkMCPServices(): Promise<boolean> {
    try {
      // Check if at least one MCP service is running
      const ports = [3000, 3001, 3002, 3003, 3004, 3005];
      for (const port of ports) {
        try {
          execSync(`curl -s http://localhost:${port}/health`, { stdio: 'pipe' });
          return true; // At least one service is running
        } catch {
          // Continue checking other ports
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check service port
   */
  private async checkServicePort(port: number): Promise<boolean> {
    try {
      execSync(`curl -s http://localhost:${port}/health`, { stdio: 'pipe' });
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
      const planFile = path.join(this.agentsDir, 'src/two-branch/docs/OPERATIONAL-PLAN.md');
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
      const nextPlanPath = path.join(this.agentsDir, 'src/two-branch/docs/session-summary/NEXT_SESSION_PLAN.md');
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
      const nextPlanPath = path.join(this.agentsDir, 'src/two-branch/docs/session-summary/NEXT_SESSION_PLAN.md');
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

    // Check for GitHub token
    if (!process.env.GITHUB_TOKEN) {
      commands.push('export GITHUB_TOKEN=your_token_here  # Set GitHub token (REQUIRED)');
    }

    // Add setup command if any service is down
    const hasIssues = services.some(s => s.status !== 'running');
    if (hasIssues) {
      // Check if Docker is not running
      const dockerDown = services.find(s => s.name === 'Docker' && s.status !== 'running');
      if (dockerDown) {
        commands.push('open -a Docker  # Start Docker Desktop (REQUIRED)');
      }
      
      // Check if MCP services are down
      const mcpDown = services.some(s => s.name.includes('MCP') && s.status !== 'running');
      if (mcpDown && !dockerDown) {
        commands.push('./start-secure-mcp-stack.sh  # Start all MCP services');
      }
    }

    // Add test commands for MCP integration
    if (!hasIssues) {
      commands.push('npx ts-node test-mcp-integration.ts  # Test MCP tools integration');
      commands.push('npm run test:two-branch  # Test Two-Branch PR analysis');
    }

    // Add specific fixes for down services
    services.forEach(service => {
      if (service.status !== 'running') {
        switch (service.name) {
          case 'Redis':
            commands.push('redis-server --daemonize yes  # Start Redis');
            break;
          case 'Build':
            commands.push('npm run build  # Build project');
            break;
        }
      }
    });

    // Add service health check command
    commands.push('for port in 3000 3001 3002 3003 3004 3005; do curl -s http://localhost:$port/health; done  # Check all MCP services');

    // Add standard run command if all services are up
    if (!hasIssues && process.env.GITHUB_TOKEN) {
      commands.push('USE_DEEPWIKI_MOCK=true npx ts-node src/two-branch/test-simple-pr.ts  # Run PR analysis with MCP tools');
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
      'GITHUB_TOKEN',
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

    // Display MCP Tools Info
    console.log('\n' + chalk.bold('🔧 MCP Tools Configuration:'));
    console.log(chalk.gray('• MCP-Scan (3000): Security vulnerability scanning'));
    console.log(chalk.gray('• DevSecOps-MCP (3001): Integrated security tools'));
    console.log(chalk.gray('• ESLint-MCP (3002): Official ESLint integration'));
    console.log(chalk.gray('• FileScopeMCP (3003): Architecture analysis'));
    console.log(chalk.gray('• K6-MCP (3004): Performance testing'));
    console.log(chalk.gray('• BrowserTools-MCP (3005): Web performance'));
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