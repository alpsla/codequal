import * as fs from 'fs';
import * as path from 'path';
// These imports are used in documentation only
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AgentProvider, AgentRole, createLogger } from '@codequal/core';

/**
 * Logger for prompt loader
 */
const logger = createLogger('PromptLoader');

/**
 * Cache for loaded templates
 */
const templateCache: Record<string, string> = {};

/**
 * Cache for loaded components
 */
const componentCache: Record<string, string> = {};

/**
 * Template directory path
 */
const TEMPLATE_DIR = path.join(__dirname, 'templates');

/**
 * Components directory path
 */
const COMPONENTS_DIR = path.join(__dirname, 'components');

/**
 * Base components directory path
 * Used in future implementation for advanced component loading
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BASE_COMPONENTS_DIR = path.join(COMPONENTS_DIR, 'base');

/**
 * Focus components directory path
 * Used in future implementation for advanced component loading
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FOCUS_COMPONENTS_DIR = path.join(COMPONENTS_DIR, 'focus');

/**
 * Load a prompt template by name
 * @param templateName Template name
 * @returns Template content
 */
export function loadPromptTemplate(templateName: string): string {
  // Check if template is already cached
  if (templateCache[templateName]) {
    return templateCache[templateName];
  }
  
  // Ensure template name ends with .txt
  const fileName = templateName.endsWith('.txt') ? templateName : `${templateName}.txt`;
  const filePath = path.join(TEMPLATE_DIR, fileName);
  
  try {
    // Load template from file
    const template = fs.readFileSync(filePath, 'utf-8');
    
    // Cache template
    templateCache[templateName] = template;
    
    return template;
  } catch (error) {
    // If template doesn't exist, try to assemble it from components
    try {
      const assembledTemplate = assemblePromptFromComponents(templateName);
      templateCache[templateName] = assembledTemplate;
      return assembledTemplate;
    } catch (assembleError) {
      throw new Error(`Failed to load prompt template '${templateName}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Load a prompt component by name
 * @param componentName Component name
 * @param subDir Optional subdirectory within components
 * @returns Component content
 */
export function loadPromptComponent(componentName: string, subDir?: string): string {
  const cacheKey = subDir ? `${subDir}/${componentName}` : componentName;
  
  // Check if component is already cached
  if (componentCache[cacheKey]) {
    return componentCache[cacheKey];
  }
  
  // Ensure component name ends with .txt
  const fileName = componentName.endsWith('.txt') ? componentName : `${componentName}.txt`;
  
  // Determine the component path
  let componentPath = COMPONENTS_DIR;
  if (subDir) {
    componentPath = path.join(COMPONENTS_DIR, subDir);
  }
  
  const filePath = path.join(componentPath, fileName);
  
  try {
    // Load component from file
    const component = fs.readFileSync(filePath, 'utf-8');
    
    // Cache component
    componentCache[cacheKey] = component;
    
    return component;
  } catch (error) {
    throw new Error(`Failed to load prompt component '${componentName}' from '${filePath}': ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get role type from template name
 * @param templateName Template name
 * @returns Role type
 */
function getRoleTypeFromTemplateName(templateName: string): string {
  if (templateName.includes('code_quality')) {
    return 'code quality';
  } else if (templateName.includes('security')) {
    return 'security';
  } else if (templateName.includes('performance')) {
    return 'performance';
  } else if (templateName.includes('dependency')) {
    return 'dependency';
  } else if (templateName.includes('educational')) {
    return 'educational content';
  } else if (templateName.includes('report')) {
    return 'report';
  } else if (templateName.includes('orchestration')) {
    return 'orchestrator';
  }
  
  return 'code review';
}

/**
 * Get focus component name from template name
 * @param templateName Template name
 * @returns Focus component name
 */
function getFocusComponentFromTemplateName(templateName: string): string {
  if (templateName.includes('code_quality')) {
    return 'code-quality';
  } else if (templateName.includes('security')) {
    return 'security';
  } else if (templateName.includes('performance')) {
    return 'performance';
  } else if (templateName.includes('dependency')) {
    return 'dependencies';
  } else if (templateName.includes('educational')) {
    return 'educational';
  } else if (templateName.includes('report')) {
    return 'report';
  } else if (templateName.includes('orchestration')) {
    return 'orchestrator';
  }
  
  return 'code-quality'; // Default
}

/**
 * Assemble a prompt template from components based on role and provider
 * @param templateName Template name (e.g., 'claude_code_quality_template')
 * @returns Assembled template
 */
export function assemblePromptFromComponents(templateName: string): string {
  // Parse template name to extract provider and role
  const nameParts = templateName.replace(/\.txt$/, '').split('_');
  const provider = nameParts[0];
  
  // Determine the role type and focus
  const roleType = getRoleTypeFromTemplateName(templateName);
  const focusComponent = getFocusComponentFromTemplateName(templateName);
  
  // Assemble components
  let template = '';
  
  // 1. Add base role with the role type replaced
  try {
    let baseRole = loadPromptComponent('reviewer-role', 'base');
    baseRole = baseRole.replace('{{ROLE_TYPE}}', roleType);
    template += baseRole;
    template += '\n\n';
  } catch (error) {
    logger.warn(`Failed to load base role component: ${error instanceof Error ? error.message : String(error)}`);
    // Continue without base role
  }
  
  // 2. Add focus areas
  try {
    template += loadPromptComponent(focusComponent, 'focus');
    template += '\n\n';
  } catch (error) {
    logger.warn(`Failed to load focus component '${focusComponent}': ${error instanceof Error ? error.message : String(error)}`);
    // Continue without focus
  }
  
  // 3. Add PR info template
  template += loadPromptComponent('pr-info-template');
  template += '\n\n';
  
  // 4. Add response format
  template += loadPromptComponent('response-format');
  template += '\n\n';
  
  // 5. Add provider-specific instructions if available
  try {
    template += loadPromptComponent(`${provider}-specific`);
  } catch (error) {
    // If no provider-specific instructions, continue without them
  }
  
  return template;
}

/**
 * Get list of available templates
 * @returns List of template names
 */
export function listAvailableTemplates(): string[] {
  try {
    return fs.readdirSync(TEMPLATE_DIR)
      .filter(file => file.endsWith('.txt'))
      .map(file => file.replace(/\.txt$/, ''));
  } catch (error) {
    logger.error(`Failed to list templates: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Get list of available components
 * @returns List of component names
 */
export function listAvailableComponents(): string[] {
  try {
    return fs.readdirSync(COMPONENTS_DIR)
      .filter(file => file.endsWith('.txt'))
      .map(file => file.replace(/\.txt$/, ''));
  } catch (error) {
    logger.error(`Failed to list components: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}