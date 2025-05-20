#!/bin/bash
# Script to document DeepWiki CLI capabilities
# Created: May 15, 2025

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

DOC_DIR="deepwiki_documentation"
mkdir -p "$DOC_DIR"

cat > "$DOC_DIR/README.md" << EOF
# DeepWiki CLI Documentation
**Generated:** $(date)

This documentation captures the command-line interface capabilities of DeepWiki
running in our Kubernetes cluster. This information is essential for integrating
DeepWiki with CodeQual.

## Environment

- **Kubernetes Cluster:** DigitalOcean
- **DeepWiki Version:** [To be filled in]
- **Last Updated:** $(date)

## Table of Contents

1. [Available Commands](#available-commands)
2. [Authentication](#authentication)
3. [Configuration Options](#configuration-options)
4. [Analysis Modes](#analysis-modes)
5. [Output Structure](#output-structure)
6. [Chat Capabilities](#chat-capabilities)
7. [Examples](#examples)
8. [Integration Approach](#integration-approach)

## Available Commands

*Document the commands discovered during exploration*

## Authentication

*Document the authentication mechanisms and API key configuration*

## Configuration Options

*Document the configuration options available*

## Analysis Modes

*Document the different analysis modes (comprehensive, concise, etc.)*

## Output Structure

*Document the structure of the output for different modes*

## Chat Capabilities

*Document how the chat capabilities work via CLI*

## Examples

*Provide examples of commonly used commands*

## Integration Approach

*Document how we plan to integrate with CodeQual*
EOF

cat > "$DOC_DIR/command_template.md" << EOF
# Command: [COMMAND_NAME]

## Description
[Brief description of what this command does]

## Syntax
\`\`\`
[Command syntax]
\`\`\`

## Parameters
- \`--param1\`: [Description of parameter 1]
- \`--param2\`: [Description of parameter 2]

## Examples
\`\`\`
[Example command 1]
\`\`\`
[Example description 1]

\`\`\`
[Example command 2]
\`\`\`
[Example description 2]

## Output Structure
\`\`\`
[Output format description or example]
\`\`\`

## Notes
[Any additional notes or caveats]
EOF

cat > "$DOC_DIR/k8s_integration.md" << EOF
# Kubernetes Integration Approach

## Pod Access Method
[Document how we'll access the DeepWiki pod from our service]

## Command Execution
[Document how we'll execute commands]

## Error Handling
[Document error handling strategies]

## Authentication
[Document how we'll handle authentication]

## Resource Considerations
[Document resource considerations]

## Monitoring
[Document monitoring approach]
EOF

echo -e "${GREEN}Documentation templates created in ${YELLOW}$DOC_DIR${NC}"
echo -e "Please use these templates to document your findings during the DeepWiki CLI investigation."
