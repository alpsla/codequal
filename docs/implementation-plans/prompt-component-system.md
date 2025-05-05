# Prompt Component System

## Overview

The CodeQual PR review tool uses a highly modular component-based prompt system to generate model prompts. This approach allows us to:

1. Reuse prompt components across different models and roles
2. Maintain consistency between models performing the same role
3. Easily add support for new models without duplicating prompt engineering work
4. Make targeted improvements to specific components
5. Minimize duplication of content across prompts

## Component Types

The prompt system uses the following component types:

### Base Components

Located in `/components/base/`, these define the core structure for different agent types.

Examples:
- `reviewer-role.txt` - Base template for all reviewer roles with a {{ROLE_TYPE}} placeholder

### Focus Components

Located in `/components/focus/`, these define the specific areas to focus on for each role.

Examples:
- `code-quality.txt`
- `security.txt`
- `performance.txt`
- `dependencies.txt`
- `educational.txt`
- `report.txt`
- `orchestrator.txt`

### Shared Components

Used across multiple models and roles for consistent formatting and structure.

Examples:
- `pr-info-template.txt` - Template for PR metadata 
- `response-format.txt` - Defines the expected response structure

### Model-Specific Components

Contain special instructions or formatting for different models, allowing us to leverage unique capabilities of each model.

Examples:
- `claude-specific.txt`
- `deepseek-specific.txt`

## How Prompts Are Assembled

The `prompt-loader.ts` module assembles prompts from components based on the requested template name. When a specific template file is not found, it dynamically assembles one from components using this process:

1. Parse the template name to extract provider/model and role
2. Load the base reviewer role and replace the {{ROLE_TYPE}} placeholder
3. Add the appropriate focus component based on the role
4. Add the PR info template
5. Add the response format instructions
6. Add model-specific instructions if available

For example, requesting `claude_code_quality_template` would assemble:
1. Base `reviewer-role.txt` with "code quality" as the role type
2. `code-quality.txt` focus areas
3. `pr-info-template.txt`
4. `response-format.txt`
5. `claude-specific.txt`

## Benefits of Modular Components

This highly modular approach offers several advantages:

1. **Eliminates Duplication**: Each focus area is defined once and reused across prompts
2. **Promotes Consistency**: Changes to a focus area are automatically applied to all relevant prompts
3. **Simplifies Updates**: Add new focus areas or modify existing ones without touching other components
4. **Easy Maintenance**: Components are small, focused, and easy to understand
5. **Flexible Combination**: Components can be mixed and matched as needed for different roles and models

## Adding New Components

To add support for a new model or role:

1. Add a focus component in `/components/focus/` if needed
2. Add model-specific components if the model has unique capabilities
3. The template loader will automatically assemble a prompt using these components

## Template Caching

For performance, both full templates and individual components are cached after first load.

## Future Improvements

Potential enhancements to the component system:

1. Add version tracking for components
2. Implement A/B testing for different prompt formulations
3. Create a prompt management UI for non-technical users
4. Add support for model-specific response parsing
5. Create conditional components based on file types or languages in PRs