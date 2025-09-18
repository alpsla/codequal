/**
 * V9 Repository Manager
 * Handles repository cloning, file selection, and workspace management
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { getRepoManager, getFileSelector } from '../utils/repository-utils-factory';
import type { CloudRepositoryManager } from '../utils/cloud-repository-manager';
import type { SmartFileSelector, SelectedFiles } from '../utils/smart-file-selector';
import { logger } from '../utils/logger';

export interface RepositoryConfig {
  useSmartSelection: boolean;
  maxFiles: number;
  forceFullAnalysis: boolean;
}

export class V9RepositoryManager {
  private repoManager: CloudRepositoryManager;
  private fileSelector: SmartFileSelector;
  private cachedWorkspacePath = '';
  
  constructor(private config: RepositoryConfig) {
    this.repoManager = getRepoManager();
    this.fileSelector = getFileSelector();
  }
  
  /**
   * Prepare repositories for analysis
   */
  async prepareRepositories(
    repoUrl: string, 
    prNumber: number
  ): Promise<{ mainPath: string; prPath: string }> {
    logger.info(`🔄 Preparing repositories for PR #${prNumber}`);
    
    // Parse repo URL to get owner and repo name
    const urlParts = repoUrl.replace('https://github.com/', '').split('/');
    const owner = urlParts[0];
    const repo = urlParts[1];
    
    // Create PR workspace in cloud
    const workspace = await this.repoManager.createPRWorkspace(
      repoUrl,
      prNumber
    );

    this.cachedWorkspacePath = workspace.cloudPath;

    // Log repository stats
    logger.info(`📊 Repository contains ${workspace.filesCount} files`);

    // Setup main workspace too
    const mainWorkspace = await this.repoManager.setupRepository(repoUrl, 'main');

    return {
      mainPath: mainWorkspace.cloudPath,
      prPath: workspace.cloudPath
    };
  }
  
  /**
   * Get modified files between main and PR branches
   */
  async getModifiedFiles(mainPath: string, prPath: string): Promise<string[]> {
    try {
      const diff = execSync(`diff -qr "${mainPath}" "${prPath}" | grep -E "^Files.*differ$" | awk '{print $2}' | sed "s|^${mainPath}/||"`, {
        maxBuffer: 10 * 1024 * 1024
      }).toString();
      
      return diff.split('\n').filter(f => f.trim() !== '');
    } catch (error) {
      logger.warn('Failed to get modified files, analyzing entire PR branch');
      return [];
    }
  }
  
  /**
   * Select files for analysis based on configuration
   */
  async selectFilesForAnalysis(
    repoPath: string,
    languageExtensions: string[]
  ): Promise<SelectedFiles | null> {
    if (this.config.forceFullAnalysis) {
      logger.info('🔍 Force full analysis enabled - analyzing all files');
      return null;
    }
    
    const shouldUseSmartSelection = await this.shouldUseSmartSelection(repoPath);
    
    if (!shouldUseSmartSelection) {
      logger.info('📁 Repository size allows full analysis');
      return null;
    }
    
    logger.info(`🎯 Using smart file selection (max ${this.config.maxFiles} files)`);
    
    try {
      const selectedFiles = await this.fileSelector.selectFiles({
        repoPath,
        repository: 'unknown/repo', // Will be set by caller if available
        prNumber: 0,
        baseBranch: 'main',
        prBranch: 'pr-branch',
        language: languageExtensions[0]?.replace('.', '') || 'java',
        maxFiles: this.config.maxFiles
      });
      
      logger.info(`✅ Selected ${selectedFiles.totalSelected} files for analysis`);
      logger.info(`   - Critical files: ${selectedFiles.criticalFiles.length}`);
      logger.info(`   - Test files: ${selectedFiles.testFiles.length}`);
      logger.info(`   - Config files: ${selectedFiles.configFiles.length}`);
      
      return selectedFiles;
    } catch (error) {
      logger.error('Smart file selection failed, falling back to full analysis', error);
      return null;
    }
  }
  
  /**
   * Determine if smart selection should be used
   */
  private async shouldUseSmartSelection(repoPath: string): Promise<boolean> {
    if (!this.config.useSmartSelection) {
      return false;
    }
    
    try {
      const fileCount = await this.countFiles(repoPath);
      
      // Use smart selection for large repositories (>10,000 files)
      if (fileCount > 10000) {
        logger.info(`🔍 Large repository detected (${fileCount} files > 10,000) - using smart selection`);
        return true;
      }
      
      // Check repository size in MB
      const sizeOutput = execSync(`du -sm "${repoPath}" | cut -f1`).toString().trim();
      const sizeInMB = parseInt(sizeOutput, 10);
      
      if (sizeInMB > 100) {
        logger.info(`🔍 Large repository detected (${sizeInMB}MB) - using smart selection`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.warn('Could not determine repository size, using smart selection as fallback');
      return true;
    }
  }
  
  /**
   * Count files in directory
   */
  private async countFiles(dirPath: string): Promise<number> {
    try {
      const output = execSync(`find "${dirPath}" -type f | wc -l`).toString().trim();
      return parseInt(output, 10);
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Get code snippet from file
   */
  async getCodeSnippet(file: string, line: number, contextLines = 3): Promise<string> {
    try {
      const fullPath = path.join(this.cachedWorkspacePath, file);
      if (!fs.existsSync(fullPath)) {
        return '';
      }
      
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      
      const startLine = Math.max(0, line - contextLines - 1);
      const endLine = Math.min(lines.length, line + contextLines);
      
      return lines.slice(startLine, endLine).join('\n');
    } catch (error) {
      logger.error(`Failed to get code snippet from ${file}:${line}`, error);
      return '';
    }
  }
  
  /**
   * Get cached workspace path
   */
  getWorkspacePath(): string {
    return this.cachedWorkspacePath;
  }
}