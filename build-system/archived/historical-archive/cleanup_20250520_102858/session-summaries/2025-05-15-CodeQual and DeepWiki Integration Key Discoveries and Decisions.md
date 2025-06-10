Session Summary: CodeQual and DeepWiki Integration
Key Discoveries and Decisions
Understanding DeepWiki

DeepWiki is a powerful tool for generating documentation from code repositories
It has been deployed successfully in Kubernetes on DigitalOcean
We identified a disk space issue as the primary blocker (100% usage on the 5Gi PVC)
Solution implemented: Created a new 30Gi PVC and updated deployment to use it

Three-Tier PR Analysis Structure

Tier 1: Deep Repository Analysis + PR Review

Full DeepWiki repository analysis with CodeQual PR review
Most comprehensive but takes longest (5-10 minutes)
Access to advanced features like DeepResearch


Tier 2: PR-Only Analysis + Cached DeepWiki Data

Focused on PR changes with vectorized cached DeepWiki data
Faster (1-3 minutes) but relies on potentially older repository info
Uses internal RAG system for chat functionality


Tier 3: Concise DeepWiki Mode + PR Review

Uses DeepWiki's "Concise" mode for simplified documentation
Provides essential information while being faster than full analysis
Alternative to targeted analysis which may not be well-supported



Model Selection Architecture

DeepWiki uses a provider-based model selection system rather than automatic selection
Supports four main providers: Google (Gemini), OpenAI, OpenRouter, and Ollama
Configuration happens through JSON files (generator.json) and environment variables
No built-in automatic model selection based on repository characteristics

Integration Approach

We should leverage CodeQual's calibration system to inform model selection for both:

DeepWiki analysis configuration
Internal multi-agent analyzing flow


For DeepWiki, we'll:

Use the console/command-line version for better integration
Pass configuration parameters based on orchestrator's repository analysis
Store results in vector database for future retrieval


For chat functionality:

Use DeepWiki's chat directly for Tier 1 (including DeepResearch)
Implement our own RAG system using vectorized DeepWiki data for Tier 2
Explore chat capabilities in Concise mode for Tier 3



Next Steps

Implement DeepWiki Client Integration:

Create a service that interfaces with DeepWiki CLI/API
Pass configuration parameters based on repository analysis
Handle storage of generated documentation


Design Vector Database Schema:

Structure for storing DeepWiki documentation in vector format
Implement extraction and embedding process
Create efficient retrieval mechanisms


Develop Three-Tier Analysis Workflow:

Implement decision logic for tier selection
Create unified chat interface that adapts to available context
Establish caching and invalidation strategy


Implement Automated Configuration:

Extend the orchestrator to analyze repositories and select optimal models
Create configuration mapping logic between CodeQual analysis and DeepWiki parameters
Implement a system to track which configurations work best for different repository types