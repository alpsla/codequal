# CodeQual

CodeQual is an intelligent code review system that analyzes pull requests, educates developers based on identified issues, and tracks individual and team growth over time.

## Overview

CodeQual uses a flexible, adaptive multi-agent architecture to provide:

- Code quality analysis
- Security vulnerability detection
- Performance optimization suggestions
- Educational content tailored to developers
- Skill tracking and professional growth insights

## Features

- **Two-Tier Analysis**: Choose between quick (1-3 minutes) or comprehensive (5-10 minutes) analysis
- **Multi-Agent Architecture**: Uses several AI models to provide the best analysis for each context
- **Repository Analysis Caching**: Stores deep repository analysis for efficient reuse
- **Skills Tracking**: Monitors developer growth across various skill categories
- **Visualization**: Grafana dashboards for insight visualization

## Installation

1. Clone the repository
   ```bash
   git clone https://github.com/your-username/codequal.git
   cd codequal
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.sample .env
   # Edit .env with your Supabase and API credentials
   ```

4. Set up the database
   ```bash
   ./scripts/make-scripts-executable.sh
   ./scripts/migrate-database.sh
   ```

## Environment Variables

CodeQual requires the following environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| SUPABASE_URL | URL for your Supabase project | Yes |
| SUPABASE_SERVICE_ROLE_KEY | Service role key for Supabase | Yes |
| PUBLIC_SUPABASE_ANON_KEY | Anonymous key for Supabase | No |
| GITHUB_TOKEN | GitHub API token | No* |
| OPENAI_API_KEY | OpenAI API key for GPT models | No* |
| ANTHROPIC_API_KEY | Anthropic API key for Claude models | No* |
| DEEPSEEK_API_KEY | DeepSeek API key | No* |
| GEMINI_API_KEY | Google Gemini API key | No* |

\* At least one model API key is required for functionality.

For local development, create a `.env` file in the project root with these variables. For production, set them in your deployment environment.

## Usage

```bash
# Start the CLI
npm run cli

# Run analysis on a PR
codequal analyze-pr --repo owner/repo --pr 123 --mode quick
```

## Architecture

The project uses a TypeScript monorepo structure with the following packages:

- `agents`: AI agent integrations and orchestration
- `cli`: Command-line interface
- `core`: Core types and utilities
- `database`: Database models and Supabase integration
- `testing`: Testing utilities and test repositories
- `ui`: User interface components

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.