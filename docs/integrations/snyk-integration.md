# Snyk Integration

This document outlines how to set up and use the Snyk integration in CodeQual.

## Overview

CodeQual integrates with Snyk in two ways:

1. **Snyk Agent**: Direct integration with Snyk CLI using the Model Context Protocol (MCP)
2. **CI Pipeline**: Integration with Snyk during continuous integration

## Prerequisites

- Snyk CLI v1.1296.2 or later installed
- Snyk account with API token
- Node.js 18+ for running the Snyk CLI

## Setting Up Snyk CLI

1. Install the Snyk CLI:
   ```bash
   npm install -g snyk@latest
   ```

2. Authenticate with your Snyk token:
   ```bash
   snyk auth <your-token>
   ```
   
   Alternatively, you can set the `SNYK_TOKEN` environment variable in your `.env.local` file.

## Integrating with CodeQual

### 1. Snyk Agent Configuration

The Snyk Agent in CodeQual uses the Model Context Protocol (MCP) to directly communicate with the Snyk CLI. This agent can perform:

- **Software Composition Analysis (SCA)**: Checks dependencies for vulnerabilities
- **Static Application Security Testing (SAST)**: Analyzes code for security issues
- **Container Security Scanning**: Checks container images for vulnerabilities
- **Infrastructure as Code (IaC) Security**: Analyzes infrastructure code for security issues

You can configure the agent by setting:

```typescript
// Using Snyk for dependency analysis
const agent = AgentFactory.createAgent(
  AgentRole.DEPENDENCY,
  AgentProvider.SNYK,
  {
    snykToken: process.env.SNYK_TOKEN,
    transportType: 'stdio' // or 'sse' for HTTP Server-Sent Events
  }
);

// Using Snyk for security analysis
const agent = AgentFactory.createAgent(
  AgentRole.SECURITY,
  AgentProvider.SNYK,
  {
    snykToken: process.env.SNYK_TOKEN
  }
);
```

### 2. CI Pipeline Integration

The CodeQual CI pipeline includes a Snyk security scanning step that:

1. Checks for vulnerabilities in dependencies
2. Performs static code analysis for security issues
3. Reports findings back to the PR

This integration happens automatically when you set up the CI pipeline and provide a `SNYK_TOKEN` as a repository secret.

## How Snyk MCP Works

The Snyk agent uses the Model Context Protocol to facilitate communication between AI agents and the Snyk CLI:

1. The agent starts a Snyk MCP server using `snyk mcp`
2. It sends commands to the MCP server (e.g., `snyk_sca_test`, `snyk_code_test`)
3. The MCP server executes the commands and returns results
4. The agent parses the results and converts them to the standard CodeQual format

This integration lets us leverage Snyk's advanced security scanning capabilities without needing a direct network connection to Snyk's services for each scan (though the Snyk CLI itself will connect to Snyk's backend).

## Available Scan Types

| Scan Type | Agent Role | Description |
|-----------|------------|-------------|
| `SnykScanType.SCA_TEST` | `DEPENDENCY` | Analyzes dependencies for known vulnerabilities |
| `SnykScanType.CODE_TEST` | `SECURITY` | Analyzes source code for security issues |
| `SnykScanType.CONTAINER_TEST` | `SECURITY` | Analyzes container images for vulnerabilities |
| `SnykScanType.IAC_TEST` | `SECURITY` | Analyzes infrastructure code (Terraform, etc.) |

## Example Results

The Snyk agent produces standardized results that include:

- **Insights**: Detected vulnerabilities and security issues
- **Suggestions**: Recommended fixes for issues
- **Educational Content**: Information about vulnerabilities and best practices

Each vulnerability includes:
- Severity level (high, medium, low)
- Affected component or file
- Description of the vulnerability
- Suggested fix or upgrade path

## Troubleshooting

### Common Issues

1. **Snyk CLI Not Found**
   - Ensure Snyk CLI is installed globally: `npm install -g snyk@latest`
   - Verify it's in your PATH: `which snyk`

2. **Authentication Errors**
   - Verify your Snyk token is correct
   - Try running `snyk auth` manually
   - Check if your token has the necessary permissions

3. **MCP Communication Issues**
   - Ensure you're using Snyk CLI v1.1296.2 or later
   - Try using the 'stdio' transport instead of 'sse'
   - Check for firewall issues if using the 'sse' transport

### Debugging

The Snyk agent includes detailed logging. Set the debug flag to see more information:

```typescript
const agent = AgentFactory.createAgent(
  AgentRole.SECURITY,
  AgentProvider.SNYK,
  {
    snykToken: process.env.SNYK_TOKEN,
    debug: true
  }
);
```

## References

- [Snyk CLI Documentation](https://docs.snyk.io/snyk-cli)
- [Snyk MCP Documentation](https://docs.snyk.io/integrate-with-snyk/strategic-partner-integrations/model-context-protocol-mcp/mcp-overview)
- [Model Context Protocol Specification](https://modelcontextprotocol.github.io/)