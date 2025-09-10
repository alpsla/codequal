/**
 * Load a prompt template by name
 * @param templateName Template name
 * @returns Template content
 */
export declare function loadPromptTemplate(templateName: string): string;
/**
 * Load a prompt component by name
 * @param componentName Component name
 * @param subDir Optional subdirectory within components
 * @returns Component content
 */
export declare function loadPromptComponent(componentName: string, subDir?: string): string;
/**
 * Assemble a prompt template from components based on role and provider
 * @param templateName Template name (e.g., 'claude_code_quality_template')
 * @returns Assembled template
 */
export declare function assemblePromptFromComponents(templateName: string): string;
/**
 * Get list of available templates
 * @returns List of template names
 */
export declare function listAvailableTemplates(): string[];
/**
 * Get list of available components
 * @returns List of component names
 */
export declare function listAvailableComponents(): string[];
