/**
 * Build Tool Detector for Repository Analysis
 *
 * Detects build tools and compilation requirements for different languages.
 * Used by V9ToolOrchestrator to determine if bytecode-based analysis tools
 * (like SpotBugs for Java) can be enabled.
 *
 * Architecture:
 * - V9ToolOrchestrator calls detectBuildTools(repoPath) once per repository
 * - Result cached and passed to language-specific orchestrators
 * - Language orchestrators decide which tools need compilation
 *
 * @module build-tool-detector
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';

// ============================================================
// TYPES
// ============================================================

export interface BuildToolInfo {
  // Build tool identification
  tool: 'gradle' | 'maven' | 'ant' | 'bazel' | 'cargo' | 'npm' | 'none';
  version?: string;

  // Build commands
  compileCommand: string | null;      // Command to compile source code
  cleanCommand: string | null;        // Command to clean build artifacts
  testCommand: string | null;         // Command to run tests

  // Build artifacts
  outputDir: string | null;           // Where compiled files are placed
  classPath: string[];                // Classpath for analysis tools

  // Metadata
  configFile: string;                 // Path to build config file
  detected: boolean;                  // Was a build tool found?
  requiresCompilation: boolean;       // Does this project need compilation?
}

export interface RepositoryBuildInfo {
  language: 'java' | 'python' | 'javascript' | 'typescript' | 'go' | 'rust' | 'unknown';
  buildTool: BuildToolInfo;
  supportsSpotBugs: boolean;          // Can SpotBugs be used?
  supportsErrorProne: boolean;        // Can Error Prone be used?
  compilationRequired: boolean;       // Is compilation needed for any tools?
}

// ============================================================
// BUILD TOOL DETECTION
// ============================================================

/**
 * Detect build tool for Java projects
 */
async function detectJavaBuildTool(repoPath: string): Promise<BuildToolInfo> {
  const defaultResult: BuildToolInfo = {
    tool: 'none',
    compileCommand: null,
    cleanCommand: null,
    testCommand: null,
    outputDir: null,
    classPath: [],
    configFile: '',
    detected: false,
    requiresCompilation: true  // Java always needs compilation
  };

  // Check for Gradle
  const gradlewPath = path.join(repoPath, 'gradlew');
  const buildGradlePath = path.join(repoPath, 'build.gradle');
  const buildGradleKtsPath = path.join(repoPath, 'build.gradle.kts');

  try {
    await fs.access(gradlewPath);

    return {
      tool: 'gradle',
      compileCommand: './gradlew compileJava --no-daemon',
      cleanCommand: './gradlew clean --no-daemon',
      testCommand: './gradlew test --no-daemon',
      outputDir: 'build/classes/java/main',
      classPath: [
        'build/classes/java/main',
        'build/classes/java/test'
      ],
      configFile: await fs.access(buildGradleKtsPath).then(() => buildGradleKtsPath).catch(() => buildGradlePath),
      detected: true,
      requiresCompilation: true
    };
  } catch {
    // Gradle not found, continue checking
  }

  // Check for Maven
  const pomPath = path.join(repoPath, 'pom.xml');
  try {
    await fs.access(pomPath);

    return {
      tool: 'maven',
      compileCommand: 'mvn compile -q',
      cleanCommand: 'mvn clean -q',
      testCommand: 'mvn test -q',
      outputDir: 'target/classes',
      classPath: [
        'target/classes',
        'target/test-classes'
      ],
      configFile: pomPath,
      detected: true,
      requiresCompilation: true
    };
  } catch {
    // Maven not found, continue checking
  }

  // Check for Ant
  const buildXmlPath = path.join(repoPath, 'build.xml');
  try {
    await fs.access(buildXmlPath);

    return {
      tool: 'ant',
      compileCommand: 'ant compile',
      cleanCommand: 'ant clean',
      testCommand: 'ant test',
      outputDir: 'build/classes',  // Common convention
      classPath: ['build/classes'],
      configFile: buildXmlPath,
      detected: true,
      requiresCompilation: true
    };
  } catch {
    // Ant not found, continue checking
  }

  // Check for Bazel
  const workspacePath = path.join(repoPath, 'WORKSPACE');
  const buildPath = path.join(repoPath, 'BUILD');
  try {
    await fs.access(workspacePath);

    return {
      tool: 'bazel',
      compileCommand: 'bazel build //...',
      cleanCommand: 'bazel clean',
      testCommand: 'bazel test //...',
      outputDir: 'bazel-bin',
      classPath: ['bazel-bin'],
      configFile: workspacePath,
      detected: true,
      requiresCompilation: true
    };
  } catch {
    // Bazel not found
  }

  logger.warn('No Java build tool detected in repository');
  return defaultResult;
}

/**
 * Detect build tool for Python projects
 */
async function detectPythonBuildTool(repoPath: string): Promise<BuildToolInfo> {
  // Python is interpreted, no compilation needed
  return {
    tool: 'none',
    compileCommand: null,
    cleanCommand: null,
    testCommand: 'pytest',  // Common test framework
    outputDir: null,
    classPath: [],
    configFile: '',
    detected: true,  // Python doesn't need build tools
    requiresCompilation: false
  };
}

/**
 * Detect build tool for JavaScript/TypeScript projects
 */
async function detectJavaScriptBuildTool(repoPath: string): Promise<BuildToolInfo> {
  const packageJsonPath = path.join(repoPath, 'package.json');

  try {
    await fs.access(packageJsonPath);

    return {
      tool: 'npm',
      compileCommand: 'npm run build',  // Common convention
      cleanCommand: 'npm run clean',
      testCommand: 'npm test',
      outputDir: 'dist',  // Common convention
      classPath: [],
      configFile: packageJsonPath,
      detected: true,
      requiresCompilation: false  // ESLint works on source files
    };
  } catch {
    // No package.json found
  }

  return {
    tool: 'none',
    compileCommand: null,
    cleanCommand: null,
    testCommand: null,
    outputDir: null,
    classPath: [],
    configFile: '',
    detected: false,
    requiresCompilation: false
  };
}

// ============================================================
// LANGUAGE DETECTION
// ============================================================

/**
 * Detect primary language of repository
 */
async function detectLanguage(repoPath: string): Promise<RepositoryBuildInfo['language']> {
  try {
    const files = await fs.readdir(repoPath);

    // Check for language-specific files
    if (files.some(f => f === 'pom.xml' || f === 'build.gradle' || f === 'gradlew')) {
      return 'java';
    }

    if (files.some(f => f === 'package.json')) {
      // Check if TypeScript
      const packageJson = await fs.readFile(path.join(repoPath, 'package.json'), 'utf-8');
      if (packageJson.includes('typescript')) {
        return 'typescript';
      }
      return 'javascript';
    }

    if (files.some(f => f === 'setup.py' || f === 'pyproject.toml' || f === 'requirements.txt')) {
      return 'python';
    }

    if (files.some(f => f === 'go.mod')) {
      return 'go';
    }

    if (files.some(f => f === 'Cargo.toml')) {
      return 'rust';
    }

  } catch (error: any) {
    logger.error('Failed to detect language:', error);
  }

  return 'unknown';
}

// ============================================================
// MAIN API
// ============================================================

/**
 * Detect build tools and compilation requirements for a repository
 *
 * This is the main entry point called by V9ToolOrchestrator
 *
 * @param repoPath - Absolute path to repository
 * @returns Complete build information for the repository
 */
export async function detectBuildTools(repoPath: string): Promise<RepositoryBuildInfo> {
  logger.info(`🔍 Detecting build tools in: ${repoPath}`);

  // Detect language first
  const language = await detectLanguage(repoPath);
  logger.info(`   Language detected: ${language}`);

  // Detect build tool based on language
  let buildTool: BuildToolInfo;

  switch (language) {
    case 'java':
      buildTool = await detectJavaBuildTool(repoPath);
      break;

    case 'python':
      buildTool = await detectPythonBuildTool(repoPath);
      break;

    case 'javascript':
    case 'typescript':
      buildTool = await detectJavaScriptBuildTool(repoPath);
      break;

    default:
      buildTool = {
        tool: 'none',
        compileCommand: null,
        cleanCommand: null,
        testCommand: null,
        outputDir: null,
        classPath: [],
        configFile: '',
        detected: false,
        requiresCompilation: false
      };
  }

  logger.info(`   Build tool: ${buildTool.detected ? buildTool.tool : 'none'}`);
  logger.info(`   Compilation required: ${buildTool.requiresCompilation ? 'yes' : 'no'}`);

  // Determine tool support
  const supportsSpotBugs = language === 'java' && buildTool.detected;
  const supportsErrorProne = language === 'java' && buildTool.tool === 'maven';
  const compilationRequired = buildTool.requiresCompilation && buildTool.detected;

  return {
    language,
    buildTool,
    supportsSpotBugs,
    supportsErrorProne,
    compilationRequired
  };
}

/**
 * Compile repository if needed
 *
 * Called by V9ToolOrchestrator before running bytecode-based analysis tools
 *
 * @param repoPath - Absolute path to repository
 * @param buildInfo - Build information from detectBuildTools()
 * @returns Success status and compilation time
 */
export async function compileRepository(
  repoPath: string,
  buildInfo: RepositoryBuildInfo
): Promise<{ success: boolean; duration: number; error?: string }> {

  if (!buildInfo.compilationRequired) {
    logger.info('⏭️  Compilation not required for this repository');
    return { success: true, duration: 0 };
  }

  if (!buildInfo.buildTool.compileCommand) {
    logger.warn('⚠️  Compilation required but no compile command available');
    return {
      success: false,
      duration: 0,
      error: 'No compile command available'
    };
  }

  logger.info(`🔨 Compiling repository with: ${buildInfo.buildTool.tool}`);
  logger.info(`   Command: ${buildInfo.buildTool.compileCommand}`);

  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  const startTime = Date.now();

  try {
    await execAsync(buildInfo.buildTool.compileCommand, {
      cwd: repoPath,
      timeout: 300000  // 5 minutes max
    });

    const duration = Date.now() - startTime;
    logger.info(`✅ Compilation successful in ${Math.round(duration / 1000)}s`);

    return { success: true, duration };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`❌ Compilation failed after ${Math.round(duration / 1000)}s`);
    logger.error(`   Error: ${error.message}`);

    return {
      success: false,
      duration,
      error: error.message
    };
  }
}

/**
 * Check if compiled classes exist (to skip re-compilation)
 *
 * @param repoPath - Absolute path to repository
 * @param buildInfo - Build information from detectBuildTools()
 * @returns True if compiled classes exist
 */
export async function hasCompiledClasses(
  repoPath: string,
  buildInfo: RepositoryBuildInfo
): Promise<boolean> {

  if (!buildInfo.buildTool.outputDir) {
    return false;
  }

  const outputPath = path.join(repoPath, buildInfo.buildTool.outputDir);

  try {
    await fs.access(outputPath);
    const files = await fs.readdir(outputPath);

    // Check if directory has content
    const hasContent = files.length > 0;

    if (hasContent) {
      logger.info(`✅ Compiled classes found in: ${buildInfo.buildTool.outputDir}`);
    } else {
      logger.info(`⚠️  Output directory exists but is empty: ${buildInfo.buildTool.outputDir}`);
    }

    return hasContent;

  } catch {
    logger.info(`⚠️  Compiled classes not found in: ${buildInfo.buildTool.outputDir}`);
    return false;
  }
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  detectBuildTools,
  compileRepository,
  hasCompiledClasses
};
