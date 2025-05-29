/**
 * This script creates missing template files for all agent roles and providers
 */

import { AgentRole } from '@codequal/core';
import * as fs from 'fs';
import * as path from 'path';

// Template directory path
const templatesDir = path.join(__dirname, '../src/prompts/templates');

// Ensure templates directory exists
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

console.log('Creating missing template files...\n');

// Get existing templates
const existingFiles = fs.readdirSync(templatesDir);

// Define providers
const providers = ['claude', 'openai', 'deepseek'];

// Create templates for each provider and role
for (const provider of providers) {
  console.log(`Creating templates for ${provider}...`);
  
  // Create main templates
  for (const role of Object.values(AgentRole)) {
    const templateName = `${provider}_${role}_template.txt`;
    if (!existingFiles.includes(templateName)) {
      console.log(`  Creating ${templateName}`);
      const templateContent = generateTemplateContent(provider, role);
      fs.writeFileSync(path.join(templatesDir, templateName), templateContent);
    }
    
    // Create system templates
    const systemTemplateName = `${provider}_${role}_template_system.txt`;
    if (!existingFiles.includes(systemTemplateName)) {
      console.log(`  Creating ${systemTemplateName}`);
      const systemTemplateContent = generateSystemTemplateContent(provider, role);
      fs.writeFileSync(path.join(templatesDir, systemTemplateName), systemTemplateContent);
    }
  }
  
  console.log(`Completed ${provider} templates`);
}

console.log('\nTemplate creation complete.');

/**
 * Generate template content based on provider and role
 * @param provider Provider name
 * @param role Agent role
 * @returns Template content
 */
function generateTemplateContent(provider: string, role: string): string {
  const roleDescription = getRoleDescription(role);
  const focusPoints = getRoleFocusPoints(role);
  
  return `You are a ${roleDescription} analyzing a pull request. Your job is to identify issues, suggest improvements, and provide educational content to help developers learn.

## Pull Request Information
URL: {{PR_URL}}
Title: {{PR_TITLE}}
Description: {{PR_DESCRIPTION}}

## Files Changed
{{FILES_CHANGED}}

Please analyze the code changes and provide:

1. Insights about issues. Format as:
   ## Insights
   - [high/medium/low] Description of the issue

2. Suggestions for improvements. Format as:
   ## Suggestions
   - File: filename.ext, Line: XX, Suggestion: Your suggestion here

3. Educational content to help developers learn. Format as:
   ## Educational
   ### Topic Title
   Explanation of the concept or best practice.
   
   ### Another Topic
   Another explanation.

Focus on:
${focusPoints}

Identify the most important issues first, and provide specific, actionable feedback. Use your knowledge of software engineering best practices to provide valuable insights.`;
}

/**
 * Generate system template content
 * @param provider Provider name 
 * @param role Agent role
 * @returns System template content
 */
function generateSystemTemplateContent(provider: string, role: string): string {
  const roleDescription = getRoleDescription(role);
  const providerSpecific = getProviderSpecificInstructions(provider);
  
  return `You are an expert ${roleDescription} with deep knowledge of software engineering principles, design patterns, and best practices. Your task is to analyze pull requests and provide comprehensive, insightful feedback.

Approach your analysis systematically:
1. Understand the purpose and scope of the pull request
2. Analyze the code structure and organization
3. Look for potential issues and edge cases
4. Evaluate code quality and maintainability
5. Identify deviations from best practices
6. Consider performance implications

Your feedback should be:
- Specific and actionable
- Prioritized by importance
- Educational and helpful
- Balanced in tone (highlight positives alongside areas for improvement)

${providerSpecific}

Provide clear reasoning for your suggestions to help developers understand the "why" behind your recommendations. Use your knowledge to identify both immediate issues and longer-term maintainability concerns.`;
}

/**
 * Get role description based on role
 * @param role Agent role
 * @returns Role description
 */
function getRoleDescription(role: string): string {
  switch (role) {
    case AgentRole.CODE_QUALITY:
      return 'code quality reviewer';
    case AgentRole.SECURITY:
      return 'security analyst';
    case AgentRole.PERFORMANCE:
      return 'performance optimization expert';
    case AgentRole.DEPENDENCY:
      return 'dependency management specialist';
    case AgentRole.EDUCATIONAL:
      return 'programming mentor and educator';
    case AgentRole.REPORT_GENERATION:
      return 'technical report writer';
    case AgentRole.ORCHESTRATOR:
      return 'code review orchestrator';
    default:
      return 'code reviewer';
  }
}

/**
 * Get role-specific focus points
 * @param role Agent role
 * @returns Focus points
 */
function getRoleFocusPoints(role: string): string {
  switch (role) {
    case AgentRole.CODE_QUALITY:
      return `- Code organization and readability
- Code structure and architecture
- Potential bugs or logic issues
- Maintainability issues
- Best practices for the languages and frameworks used
- Clean code principles and patterns`;
    
    case AgentRole.SECURITY:
      return `- Security vulnerabilities and weaknesses
- Input validation and sanitization
- Authentication and authorization issues
- Data exposure risks
- Insecure dependencies
- Adherence to security best practices`;
    
    case AgentRole.PERFORMANCE:
      return `- Algorithm efficiency and complexity
- Resource utilization issues
- Potential bottlenecks
- Memory usage concerns
- Unnecessary computations or operations
- Performance optimization opportunities`;
    
    case AgentRole.DEPENDENCY:
      return `- Dependency management issues
- Outdated or vulnerable dependencies
- Version compatibility concerns
- Unnecessary dependencies
- Licensing issues
- Dependency injection and management patterns`;
    
    case AgentRole.EDUCATIONAL:
      return `- Learning opportunities from the code
- Core programming concepts demonstrated
- Design patterns used or applicable
- Best practices for long-term maintainability
- Alternative approaches and their tradeoffs
- Resources for further learning`;
    
    case AgentRole.REPORT_GENERATION:
      return `- Overall code quality assessment
- Security concerns
- Performance implications
- Dependency management
- Educational highlights
- Summary of key findings and recommendations`;
    
    case AgentRole.ORCHESTRATOR:
      return `- Identifying which aspects need deeper review
- Delegating specialized reviews
- Summarizing findings across domains
- Prioritizing issues by importance
- Ensuring comprehensive coverage
- Providing a holistic assessment`;
    
    default:
      return `- Code quality and organization
- Potential bugs or issues
- Best practices and patterns
- Educational opportunities`;
  }
}

/**
 * Get provider-specific instructions
 * @param provider Provider name
 * @returns Provider-specific instructions
 */
function getProviderSpecificInstructions(provider: string): string {
  switch (provider) {
    case 'claude':
      return `As Claude, use your advanced reasoning capabilities to perform a thorough analysis of the code structure, patterns, and potential issues. Consider both immediate problems and longer-term maintainability concerns.

Leverage your strengths in:
- Chain-of-thought reasoning to identify complex bug patterns or edge cases
- Holistic understanding of code architecture and organization
- Nuanced assessment of readability and maintainability challenges
- Ability to provide educational explanations that bridge knowledge gaps
- Recognition of security vulnerabilities beyond common patterns`;
    
    case 'openai':
      return `Focus on providing structured, actionable code feedback that prioritizes clear solutions and explanations with code examples. Use your ability to distinguish between patterns and anti-patterns across a wide range of programming languages.

Leverage your strengths in:
- Thorough understanding of code patterns, idioms, and language conventions
- Ability to identify security vulnerabilities with practical mitigation strategies
- Strong code refactoring capabilities with specific implementation examples
- Clear explanation of complex technical concepts with appropriate abstractions
- Comprehensive knowledge of best practices across various frameworks and libraries`;
    
    case 'deepseek':
      return `As a code-specialized model, focus on deep technical analysis of the code structure, algorithms, and implementation details. Use your extensive knowledge of programming languages and frameworks to identify issues and suggest optimal solutions.

Leverage your strengths in:
- Deep understanding of programming language specifics and idiomatic code
- Algorithm analysis and optimization recommendations
- Detection of edge cases and potential runtime errors
- Framework-specific best practices and patterns
- Detailed technical explanations with code examples`;
    
    default:
      return 'Provide detailed, actionable feedback to help improve code quality and developer skills.';
  }
}
