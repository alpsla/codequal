# Understanding CodeQual's Smart Agent System

**Last Updated: May 4, 2025**

CodeQual uses an intelligent multi-agent system to provide optimal code analysis for your projects. This document explains how our smart agent selection works and what factors influence the analysis process.

## How CodeQual Selects the Best AI Models for Your Code

When you submit a repository or pull request for analysis, CodeQual uses a sophisticated system to automatically select the most appropriate AI models based on your specific codebase characteristics and requirements. This happens behind the scenes to ensure you get the most accurate and helpful analysis possible.

### Language Support Tiers

Each AI model provider in our system has different strengths when it comes to analyzing various programming languages. We've categorized these strengths into four tiers:

1. **Full Support** - Languages where the model excels with highest proficiency
2. **Good Support** - Languages where the model performs well but not at its best
3. **Basic Support** - Languages with adequate but limited capabilities
4. **Limited Support** - Languages with minimal capabilities, may struggle with complex tasks

### Provider-Language Specializations

Our system includes the following AI model providers, each with different language specializations:

#### Claude
- **Full Support**: JavaScript, TypeScript, Python, Java
- **Good Support**: Go, Ruby, PHP, C#
- **Basic Support**: C++, Rust, Swift
- **Limited Support**: Kotlin, Scala, Perl

#### OpenAI/GPT
- **Full Support**: JavaScript, Python, Java, C#
- **Good Support**: TypeScript, Go, Ruby, PHP
- **Basic Support**: C++, Swift, Rust
- **Limited Support**: Haskell, Scala, R

#### DeepSeek Coder
- **Full Support**: C++, C, Rust, Go
- **Good Support**: Python, Java, TypeScript
- **Basic Support**: JavaScript, C#, Ruby
- **Limited Support**: PHP, Swift, Kotlin

#### Gemini 2.5 Pro
- **Full Support**: JavaScript, TypeScript, Python, Kotlin
- **Good Support**: Java, Go, Swift, C#
- **Basic Support**: C++, Ruby, PHP
- **Limited Support**: Rust, Dart, Scala

### Best Provider by Language

Based on our internal evaluation data, these are the current best-performing AI models for different languages:

- **JavaScript/TypeScript**: Claude (93/90 score)
- **Python**: Gemini 2.5 Pro (93 score) or OpenAI (90 score)
- **Java**: Gemini 2.5 Pro (90 score)
- **C#**: OpenAI (90 score)
- **C++**: DeepSeek Coder (95 score)
- **Rust**: DeepSeek Coder (92 score)
- **Go**: DeepSeek Coder (85 score)
- **Swift**: Gemini 2.5 Pro (88 score)
- **SQL**: OpenAI (92 score)
- **Kotlin**: Gemini 2.5 Pro (90 score)

## Beyond Languages: How Context Shapes Analysis

While programming language is a critical factor, our system considers many other important contextual parameters when configuring the optimal analysis approach for your code:

### Repository Characteristics

These factors relate to the overall structure and nature of your codebase:

#### Repository Size
- **Small** (<100 files)
- **Medium** (100-1000 files)
- **Large** (1000-10000 files)
- **Enterprise** (>10000 files)

Larger repositories may trigger different analysis strategies, including potential use of our Model Control Plane (MCP) for enhanced coordination, and adjustments to token limits and processing depth.

#### Codebase Complexity
Our system calculates a complexity score (0-100) based on factors like cyclomatic complexity, dependency depth, and architectural patterns. This score influences agent selection and configuration parameters.

#### Architecture Type
Different AI models have strengths with various architecture patterns:
- Monolith
- Microservices
- Serverless
- Hybrid approaches

### PR/Change Characteristics

These factors apply specifically to pull request analysis:

#### Change Type
- **Feature** - New functionality
- **Bugfix** - Corrections to existing code
- **Refactoring** - Structural improvements without changing behavior
- **Documentation** - Changes to documentation only
- **Infrastructure** - Changes to build, deployment, or configuration

#### File Types
The ratio of different file types influences agent selection:
- Code files
- Configuration files
- Documentation files
- Test files

#### Impact Areas
The system identifies which parts of your application are affected:
- Authentication/authorization
- Database interaction
- API endpoints
- UI components
- Core business logic
- Infrastructure components

### Business Context

These factors relate to the business importance of your code:

#### Business Criticality
How important the code is to your operations, which affects security analysis thresholds and fallback configuration.

#### Change Impact Score
A 0-100 score indicating how significant the change is, which influences analysis depth and secondary agent selection.

### User Preferences

You can also influence the agent selection through explicit preferences:

#### Preferred Providers
You can specify if you prefer certain AI providers, and the system will respect this while balancing with optimal performance.

#### Quality Preference
Balance between speed and thoroughness (0-100), affecting temperature settings and token allocation.

#### Priority Concerns
You can specify which aspects of code analysis are most important to you:
- Security
- Performance
- Code quality
- Documentation
- Educational content

#### Cost Budget
Maximum cost allowed for analysis, which affects model selection and analysis depth.

## How Our Dynamic Configuration System Works

CodeQual uses a weighted scoring approach to select the optimal agent configuration:

1. **Base Score Calculation**:
   - Each parameter contributes to a score for each model
   - The `calculateAgentScores()` function combines all factors

2. **Contextual Adjustments**:
   - Each context factor adds or subtracts from model scores
   - For example: `score += (languageScore - 50) * 0.3`

3. **Threshold-Based Decisions**:
   - Boolean decisions like "use secondary agent or not" are based on thresholds
   - The `shouldUseSecondaryAgent()` function evaluates relevant factors

4. **Parameter Optimization**:
   - Configuration parameters are fine-tuned based on context
   - The `optimizeForLanguage()` function adjusts token limits and other settings

5. **Multi-Factor Selection**:
   - Factors are dynamically weighted based on importance
   - Security concerns get higher weight for financial code
   - Performance concerns get higher weight for real-time applications

## Example Configuration

Here's an example of how our system might configure analysis for a specific context:

**For a large, complex, security-sensitive financial application written in JavaScript:**

- **Primary agent**: Claude (for JavaScript analysis)
- **Secondary agent**: OpenAI (for security-specific analysis)
- **Fallback agent**: DeepSeek (for specialized components)
- **Lower temperature**: For more deterministic, conservative analysis
- **Higher token limits**: For deeper analysis
- **MCP enabled**: For coordinated analysis
- **Additional security-focused processing**: Extra checks for authentication, data validation, etc.

This configuration would be automatically determined based on repository size, complexity, domain, and importance - without requiring any manual setup.

## Multi-Agent Workflow

When analyzing your code, CodeQual may employ multiple AI agents working together:

1. **Primary Agent**: Performs comprehensive analysis in its area of expertise
2. **Secondary Agent**: Complements the primary agent, focusing on its specialties
3. **Fallback Agent**: Activated only if the primary or secondary agent encounters issues
4. **Orchestrator**: Combines, deduplicates, and organizes results from all agents
5. **Reporter**: Formats the final analysis in a clear, actionable report

## Repository-First Analysis

For more comprehensive analysis, CodeQual offers an optional repository-first approach:

1. The system analyzes your entire codebase first
2. It builds understanding of your architecture, patterns, and dependencies
3. PR analysis is then performed with this broader context
4. Results highlight how changes relate to your overall codebase

This provides more contextual insights but requires additional processing time (3-5 minutes for larger repositories). Results are cached to minimize reprocessing time on subsequent analyses.

## Continuous Improvement

Our agent evaluation system continuously learns from performance metrics and user feedback to improve selection accuracy over time. This includes:

- Tracking agent performance across different contexts
- Learning from user satisfaction ratings
- Adjusting selection weights based on success patterns
- Optimizing for cost-efficiency and quality

## Questions or Feedback?

If you have questions about how our agent selection system works or would like to provide feedback to improve it, please reach out to our support team at support@codequal.ai.

For technical details on our implementation, developers can refer to our architecture documentation at `/docs/architecture/multi-agent-architecture.md`.