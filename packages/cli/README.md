# CodeQual CLI

Command-line interface for the CodeQual PR review tool.

## Installation

For local development:

```bash
# Build the package
npm run build

# Link it globally
npm link
```

## Available Commands

### PR Review

Analyze a pull request for code quality, security issues, and best practices.

```bash
codequal review --repo <owner/repo> --pr <number> --token <github-token> [--snyk-token <token>]
```

Options:
- `--repo, -r`: Repository name in format "owner/repo" 
- `--pr, -p`: Pull request number
- `--token, -t`: GitHub token with repo access
- `--snyk-token`: Optional Snyk API token for security scanning

#### Example

```bash
# Analyze PR #1 in the CodeQual repository
codequal review --repo alpsla/codequal --pr 1 --token ghp_yourgithubtoken123456789

# Output
Starting PR review for alpsla/codequal#1
Initializing analysis services
Analyzing PR #1 in repository alpsla/codequal
Storing analysis results
PR review completed successfully

CodeQual Analysis Results for alpsla/codequal#1:
Total issues found: 0
View detailed results: http://localhost:3000/analysis/1682688421234
```

When adding the Snyk token for security scanning:

```bash
codequal review --repo alpsla/codequal --pr 1 --token ghp_yourgithubtoken123456789 --snyk-token snyk_yoursnykapitoken123456789

# Output will include additional security scanning
Starting PR review for alpsla/codequal#1
Initializing analysis services
Configuring Snyk agent with provided token
Analyzing PR #1 in repository alpsla/codequal
Storing analysis results
PR review completed successfully

CodeQual Analysis Results for alpsla/codequal#1:
Total issues found: 0
View detailed results: http://localhost:3000/analysis/1682688421234
```

### Version

Display the current version of the CLI.

```bash
codequal --version
```

## Future Commands

The following commands are planned for future releases:

### Analysis Report

Get a detailed report of a previously run analysis.

```bash
codequal report <analysis-id>
```

### User Skills

Display developer skill analytics based on PR review history.

```bash
codequal skills <user-id> [--timeframe <week|month|year>]
```

### Agent Management

Manage and configure analysis agents.

```bash
codequal agents list
codequal agents enable <agent-name>
codequal agents disable <agent-name>
codequal agents configure <agent-name>
```

## Development

To add a new command:

1. Create a new file in `src/commands/<command-name>.ts`
2. Implement the command logic
3. Register the command in `src/index.ts`
4. Build and test the CLI

## Configuration

The CLI uses the following configuration sources:

1. Command-line arguments (highest priority)
2. Environment variables (e.g., `GITHUB_TOKEN`, `SNYK_TOKEN`)
3. Configuration file (`.codequalrc` in user's home directory)

## Integration

The CLI integrates with:

- GitHub/GitLab API for PR data
- Multiple AI-powered code analysis agents
- Snyk API for security scanning
- CodeQual database for storing analysis results
