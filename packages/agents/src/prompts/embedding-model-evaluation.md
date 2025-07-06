# Embedding Model Evaluation Prompt

## Objective
Research and evaluate the most recent text embedding models (released within the last 3-6 months) for use in a code analysis and documentation platform. We need models that excel at both code understanding and general text embedding.

## Evaluation Criteria and Weights

### 1. Quality (40% weight)
- **MTEB Benchmark Score**: Overall ranking on Massive Text Embedding Benchmark
- **Code-specific performance**: Performance on code retrieval and similarity tasks
- **Multilingual support**: Ability to handle multiple programming languages
- **Context window size**: Maximum tokens the model can process
- **Semantic accuracy**: Precision in capturing meaning and relationships

### 2. Speed/Performance (30% weight)
- **Inference latency**: Time to generate embeddings (ms per request)
- **Throughput**: Requests per second capability
- **Batch processing**: Efficiency with bulk operations
- **API reliability**: Uptime and consistency metrics
- **Rate limits**: API quotas and restrictions

### 3. Cost (30% weight)
- **Price per 1K tokens**: Direct API costs
- **Storage efficiency**: Embedding dimension size (affects vector DB costs)
- **Self-hosting option**: Availability and feasibility of running locally
- **Free tier availability**: Options for development/testing
- **Volume discounts**: Pricing at scale

## Research Requirements

### Time Frame
- **Primary focus**: Models released in the last 3-6 months
- **Include**: Major updates to existing models within this timeframe
- **Exclude**: Models older than 6 months unless they received significant updates

### Sources to Check
1. **Benchmarks**:
   - MTEB Leaderboard (https://huggingface.co/spaces/mteb/leaderboard)
   - BEIR Benchmark results
   - Code embedding specific benchmarks

2. **Model Providers**:
   - OpenAI (latest beyond text-embedding-3-*)
   - Anthropic (Claude embeddings if available)
   - Google (Vertex AI, PaLM embeddings)
   - Cohere (latest embed models)
   - Voyage AI (especially voyage-code-*)
   - Jina AI
   - Nomic AI
   - Together AI
   - Mistral AI

3. **Open Source**:
   - Hugging Face recent releases
   - GitHub trending ML repositories
   - ArXiv papers (last 6 months)

## Output Format

### Model Comparison Table
```
| Model Name | Provider | Release Date | Quality Score | Speed Score | Cost Score | Total Score | Recommended For |
|------------|----------|--------------|---------------|-------------|------------|-------------|-----------------|
| [Name]     | [Provider]| [Date]      | [0-10]       | [0-10]     | [0-10]    | [Weighted]  | [Use Case]     |
```

### Detailed Analysis per Model
For each top 5 model, provide:
1. **Overview**: Brief description and key innovations
2. **Strengths**: What makes this model stand out
3. **Limitations**: Known issues or constraints
4. **Integration complexity**: How easy to implement
5. **Best use cases**: When to choose this model

### Scoring Calculation
```
Total Score = (Quality × 0.4) + (Speed × 0.3) + (Cost × 0.3)
```

### Recommendations
1. **Best Overall**: Highest total score
2. **Best for Code**: Optimized for code embeddings
3. **Best Value**: Best cost-performance ratio
4. **Best Open Source**: Self-hostable option
5. **Enterprise Choice**: Best for large-scale deployments

## Special Considerations

### For Code Embeddings
- Support for syntax understanding
- Ability to capture code semantics
- Performance on function/variable name matching
- Understanding of code structure and patterns

### For Documentation
- Long context support (>8K tokens)
- Markdown/structured text understanding
- Technical terminology accuracy
- Cross-reference capability

## Migration Impact Assessment
For each recommended model, assess:
- **API compatibility**: Changes needed from current implementation
- **Dimension changes**: Vector database migration requirements
- **Cost impact**: Projected monthly costs at current usage
- **Performance impact**: Expected latency changes
- **Risk assessment**: Potential issues during migration

## Final Deliverable Structure
1. Executive Summary (1 paragraph)
2. Top 5 Models Comparison Table
3. Detailed Analysis (per model)
4. Cost Projections (3, 6, 12 months)
5. Migration Recommendation
6. Implementation Timeline
7. Risk Mitigation Strategies