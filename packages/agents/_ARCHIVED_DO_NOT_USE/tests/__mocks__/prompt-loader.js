/**
 * Mock prompt loader for testing
 */

export const loadPromptTemplate = jest.fn((templateName) => {
  if (templateName.includes('system')) {
    return 'Mock system prompt for ' + templateName;
  }
  return 'Mock prompt template for ' + templateName;
});

export const loadPromptComponent = jest.fn((componentName, subDir) => {
  return 'Mock component for ' + (subDir ? `${subDir}/${componentName}` : componentName);
});

export const assemblePromptFromComponents = jest.fn((templateName) => {
  return 'Mock assembled prompt for ' + templateName;
});

export const listAvailableTemplates = jest.fn(() => {
  return ['template1', 'template2', 'template3'];
});

export const listAvailableComponents = jest.fn(() => {
  return ['component1', 'component2', 'component3'];
});