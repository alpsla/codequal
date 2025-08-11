/**
 * Session State Manager
 * 
 * Shared utility for managing development session state
 * Used by both codequal-session-starter and dev-cycle-orchestrator
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface Bug {
  id: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  fix: string;
}

export interface Feature {
  status: 'working' | 'broken' | 'not-implemented';
  confidence: number;
  issues?: string[];
}

export interface SystemState {
  version: string;
  lastSession: string;
  environment: Record<string, any>;
  features: Record<string, Feature>;
  bugs: Bug[];
  nextTasks: string[];
}

export interface SessionAchievements {
  featuresImplemented?: string[];
  featuresImproved?: string[];
  bugsFixed?: string[];
  bugsDiscovered?: Bug[];
  confidenceChanges?: Record<string, number>;
  tasksCompleted?: string[];
  newTasks?: string[];
}

export class SessionStateManager {
  private stateFilePath: string;
  
  constructor(
    stateFilePath = path.join(
      __dirname,
      '../../tests/integration/production-ready-state-test.ts'
    )
  ) {
    this.stateFilePath = stateFilePath;
  }
  
  /**
   * Read current state from the test file
   */
  async readState(): Promise<SystemState> {
    try {
      const content = await fs.readFile(this.stateFilePath, 'utf-8');
      
      // Extract SYSTEM_STATE object from the file
      const stateMatch = content.match(/const SYSTEM_STATE = ({[\s\S]*?})\s*;/);
      if (!stateMatch) {
        throw new Error('Could not find SYSTEM_STATE in file');
      }
      
      // Parse the state (simplified - in production use proper AST parsing)
      const stateStr = stateMatch[1];
      const state = eval(`(${stateStr})`); // In production, use safer parsing
      
      return state;
    } catch (error) {
      console.error('Error reading state:', error);
      return this.getDefaultState();
    }
  }
  
  /**
   * Update state after session
   */
  async updateState(achievements: SessionAchievements): Promise<void> {
    const currentState = await this.readState();
    const updatedState = this.applyAchievements(currentState, achievements);
    
    await this.writeState(updatedState);
  }
  
  /**
   * Apply session achievements to current state
   */
  private applyAchievements(
    state: SystemState,
    achievements: SessionAchievements
  ): SystemState {
    const updated = { ...state };
    
    // Update version
    updated.version = this.incrementVersion(state.version);
    
    // Update session date
    updated.lastSession = new Date().toISOString().split('T')[0];
    
    // Update features
    if (achievements.featuresImplemented) {
      for (const feature of achievements.featuresImplemented) {
        updated.features[feature] = {
          status: 'working',
          confidence: 50 // Start at 50% for new features
        };
      }
    }
    
    if (achievements.featuresImproved) {
      for (const feature of achievements.featuresImproved) {
        if (updated.features[feature]) {
          updated.features[feature].confidence = Math.min(
            95,
            updated.features[feature].confidence + 10
          );
        }
      }
    }
    
    if (achievements.confidenceChanges) {
      for (const [feature, change] of Object.entries(achievements.confidenceChanges)) {
        if (updated.features[feature]) {
          updated.features[feature].confidence = Math.max(
            0,
            Math.min(100, updated.features[feature].confidence + change)
          );
        }
      }
    }
    
    // Update bugs
    if (achievements.bugsFixed) {
      updated.bugs = updated.bugs.filter(
        bug => !achievements.bugsFixed!.includes(bug.id)
      );
    }
    
    if (achievements.bugsDiscovered) {
      updated.bugs.push(...achievements.bugsDiscovered);
    }
    
    // Update tasks
    if (achievements.tasksCompleted) {
      updated.nextTasks = updated.nextTasks.filter(
        task => !achievements.tasksCompleted!.includes(task)
      );
    }
    
    if (achievements.newTasks) {
      updated.nextTasks.push(...achievements.newTasks);
    }
    
    return updated;
  }
  
  /**
   * Write updated state back to file
   */
  private async writeState(state: SystemState): Promise<void> {
    const content = await fs.readFile(this.stateFilePath, 'utf-8');
    
    // Convert state to formatted string
    const stateStr = this.formatState(state);
    
    // Replace SYSTEM_STATE in file
    const updated = content.replace(
      /const SYSTEM_STATE = {[\s\S]*?};/,
      `const SYSTEM_STATE = ${stateStr};`
    );
    
    await fs.writeFile(this.stateFilePath, updated, 'utf-8');
  }
  
  /**
   * Format state object as TypeScript code
   */
  private formatState(state: SystemState): string {
    // In production, use proper code formatting
    return JSON.stringify(state, null, 2)
      .replace(/"([^"]+)":/g, '$1:') // Remove quotes from keys
      .replace(/"/g, "'"); // Use single quotes
  }
  
  /**
   * Increment version number
   */
  private incrementVersion(version: string): string {
    const [major, minor, patch] = version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }
  
  /**
   * Get default state if file doesn't exist
   */
  private getDefaultState(): SystemState {
    return {
      version: '1.0.0',
      lastSession: new Date().toISOString().split('T')[0],
      environment: {
        redis: { required: true, status: 'external' },
        deepwiki: { required: true, status: 'kubernetes' },
        supabase: { required: true, status: 'cloud' },
        openrouter: { required: true, status: 'api' }
      },
      features: {
        deepwikiAnalysis: { status: 'working', confidence: 95 },
        aiLocationFinder: { status: 'working', confidence: 90 },
        v7ReportGenerator: { status: 'working', confidence: 85 },
        comparisonAgent: { status: 'working', confidence: 80 },
        modelVersionSync: { status: 'broken', confidence: 30 }
      },
      bugs: [],
      nextTasks: []
    };
  }
  
  /**
   * Generate session summary
   */
  async generateSessionSummary(achievements: SessionAchievements): Promise<string> {
    const lines: string[] = [
      '## Session Summary',
      `Date: ${new Date().toISOString()}`,
      ''
    ];
    
    if (achievements.featuresImplemented?.length) {
      lines.push('### Features Implemented');
      achievements.featuresImplemented.forEach(f => lines.push(`- ${f}`));
      lines.push('');
    }
    
    if (achievements.featuresImproved?.length) {
      lines.push('### Features Improved');
      achievements.featuresImproved.forEach(f => lines.push(`- ${f}`));
      lines.push('');
    }
    
    if (achievements.bugsFixed?.length) {
      lines.push('### Bugs Fixed');
      achievements.bugsFixed.forEach(b => lines.push(`- ${b}`));
      lines.push('');
    }
    
    if (achievements.bugsDiscovered?.length) {
      lines.push('### New Bugs Discovered');
      achievements.bugsDiscovered.forEach(b => 
        lines.push(`- [${b.severity.toUpperCase()}] ${b.id}: ${b.description}`)
      );
      lines.push('');
    }
    
    if (achievements.tasksCompleted?.length) {
      lines.push('### Tasks Completed');
      achievements.tasksCompleted.forEach(t => lines.push(`- ${t}`));
      lines.push('');
    }
    
    if (achievements.newTasks?.length) {
      lines.push('### New Tasks Added');
      achievements.newTasks.forEach(t => lines.push(`- ${t}`));
      lines.push('');
    }
    
    return lines.join('\n');
  }
  
  /**
   * Check if state needs migration
   */
  async checkStateMigration(): Promise<boolean> {
    const state = await this.readState();
    
    // Check if state has all required fields
    const requiredFields = ['version', 'lastSession', 'features', 'bugs', 'nextTasks'];
    return requiredFields.every(field => field in state);
  }
}

// Export singleton instance
export const sessionStateManager = new SessionStateManager();