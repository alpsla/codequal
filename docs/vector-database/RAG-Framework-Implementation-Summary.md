# Selective RAG Framework Implementation Summary

## Overview

I've implemented a sophisticated **Selective Retrieval-Augmented Generation (RAG) Framework** that enhances CodeQual's ability to provide intelligent, context-aware search and analysis of code repositories. This system goes beyond simple keyword matching to understand the intent behind queries and retrieve the most relevant information.

## Key Components Developed

### 1. **Enhanced Vector Database Schema** (`create-vector-database-schema.sql`)

I created a comprehensive PostgreSQL schema with pgvector extension that includes:

- **`rag_repositories`** - Stores repository metadata with analysis frequency tracking
- **`rag_document_embeddings`** - Rich document storage with:
  - Vector embeddings (1536 dimensions for OpenAI embeddings)
  - Content type classification (code, documentation, config, test)
  - Programming language detection
  - Importance scoring (0-1 scale)
  - Code complexity metrics
  - Framework detection
  - Function/class name extraction
  - Automatic expiration for storage optimization
  
- **`rag_analysis_results`** - Stores AI analysis summaries with embeddings
- **`rag_educational_content`** - Curated learning resources with difficulty levels
- **`rag_query_patterns`** - Query history for continuous improvement

The schema includes optimized indexes for both vector similarity search and metadata filtering, enabling sub-second queries even with millions of documents.

### 2. **Intelligent Query Analyzer** (`query-analyzer.ts`)

This component transforms natural language queries into structured search parameters:

**Features:**
- **Query Type Detection**: Automatically identifies if user is looking for:
  - Code examples
  - Documentation
  - Troubleshooting help
  - Architecture information
  - Best practices
  - API references
  - Configuration help

- **Metadata Extraction**:
  - Programming language detection (TypeScript, Python, Java, etc.)
  - Framework identification (React, Express, Django, etc.)
  - Difficulty level inference (beginner, intermediate, advanced)
  - Content type preferences

- **Intent Analysis**:
  - Detects if user wants examples
  - Identifies documentation needs
  - Recognizes troubleshooting patterns

- **Query Enhancement**:
  - Removes stop words for better semantic search
  - Extracts technical keywords
  - Generates refinement suggestions for vague queries

**Example:**
```typescript
Query: "how to implement JWT authentication in Express"
Analysis Result: {
  queryType: "CODE_SEARCH",
  programmingLanguage: "javascript",
  frameworks: ["express"],
  contentTypes: ["code", "example"],
  isLookingForExamples: false,
  semanticQuery: "implement JWT authentication Express",
  keywordFilters: ["JWT"],
  analysisConfidence: 0.85
}
```

### 3. **Selective RAG Service** (`selective-rag-service.ts`)

The core search engine that combines vector similarity with intelligent filtering:

**Key Capabilities:**

- **Hybrid Search**: Combines:
  - Semantic similarity (vector search)
  - Metadata filtering (language, framework, type)
  - Importance scoring
  - Recency boosting
  - Framework matching

- **Multi-Source Results**:
  - Repository documents (actual code)
  - Educational content (tutorials, guides)
  - Analysis summaries (architectural insights)

- **Intelligent Re-ranking**: Results are re-ranked based on:
  - Base similarity score
  - Document importance
  - Framework relevance
  - Content freshness
  - User context (skill level)

- **Search Insights**: Provides:
  - Query refinement suggestions
  - Alternative query ideas
  - Missing context identification

**Example Search Flow:**
1. User queries: "React hooks error handling"
2. Query analyzer extracts: React framework, error handling intent
3. Vector search finds semantically similar content
4. Filters apply: React-only, preferring error-related content
5. Re-ranking boosts React-specific and recent content
6. Results include both code examples and educational resources

### 4. **Incremental Update Service** (`incremental-update-service.ts`)

Efficiently processes repository changes without full re-indexing:

**Features:**

- **Change Detection**: Processes git commits to identify:
  - Added files
  - Modified files
  - Deleted files

- **Smart Chunking**:
  - Breaks large files into digestible chunks
  - Maintains context with overlap
  - Limits chunks per file to prevent explosion

- **Metadata Extraction**:
  - Extracts function/class names
  - Identifies imports and dependencies
  - Detects framework usage
  - Calculates code complexity

- **Importance Scoring**: Prioritizes:
  - Entry points (index.*, main.*)
  - API/Service files
  - Configuration files
  - Large, complex files

- **Storage Optimization**:
  - Automatic expiration of old embeddings
  - Maintains top 1000 vectors per repository
  - Batch processing for efficiency

**Example Update Flow:**
```typescript
// When a commit is pushed:
1. Detect changed files
2. Filter by include/exclude patterns
3. Process in batches of 10 files
4. Extract metadata and generate embeddings
5. Store with TTL and importance scores
6. Clean up expired embeddings
```

## Functional Benefits

### 1. **Context-Aware Search**
Instead of simple keyword matching, the system understands:
- What type of information you're looking for
- Your skill level and preferences
- The technology stack context
- Related concepts and patterns

### 2. **Intelligent Filtering**
Automatically filters results by:
- Programming language
- Framework compatibility
- Content type (code vs docs vs config)
- Importance and relevance

### 3. **Learning Integration**
Seamlessly includes educational content when beneficial:
- Tutorials for beginners
- Best practices for specific patterns
- Examples from similar implementations

### 4. **Performance Optimization**
- Incremental updates (only process changes)
- Smart storage limits (1000 vectors per repo)
- Automatic cleanup of old data
- Optimized indexes for fast queries

### 5. **Continuous Improvement**
- Tracks query patterns
- Learns from user interactions
- Provides insights for refinement
- Suggests better queries

## Use Cases

### Developer Looking for Examples
```
Query: "show me how to use React hooks for data fetching"
Result: Actual code examples from the repository + relevant tutorials
```

### Troubleshooting Errors
```
Query: "TypeError: Cannot read property 'map' of undefined in React"
Result: Similar error patterns + solutions + educational content about null checking
```

### Architecture Understanding
```
Query: "how is the authentication system structured?"
Result: Architecture documents + actual auth code + related components
```

### Best Practices Search
```
Query: "MongoDB connection pooling best practices Node.js"
Result: Config examples + performance tips + implementation patterns
```

## Integration with Existing System

The RAG framework integrates seamlessly with CodeQual's existing:
- **DeepWiki Integration**: For comprehensive repository analysis
- **Multi-Agent System**: Agents can use RAG for enhanced context
- **PR Review Service**: Better understanding of code changes
- **Skill Assessment**: More accurate skill evaluation based on code patterns

## Technical Implementation Details

- **Embedding Model**: OpenAI text-embedding-3-large (1536 dimensions)
- **Vector Database**: PostgreSQL with pgvector extension
- **Similarity Metric**: Cosine similarity with configurable threshold
- **Storage Strategy**: Tiered (permanent, cached, temporary)
- **Index Type**: IVFFlat for efficient approximate search
- **Batch Size**: 10 files for incremental updates
- **Chunk Size**: 1000 characters with 200 character overlap

This RAG framework transforms CodeQual from a static analysis tool into an intelligent, context-aware development assistant that understands not just what code does, but why it matters and how it fits into the bigger picture.