-- CodeQual Schema
CREATE SCHEMA IF NOT EXISTS codequal;

-- Agent Evaluation
CREATE TABLE IF NOT EXISTS codequal.agent_evaluations (
    id SERIAL PRIMARY KEY,
    agent_provider VARCHAR(50) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL,
    language VARCHAR(50) NOT NULL,
    score FLOAT NOT NULL,
    evaluation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parameters JSONB
);

-- Repository Analysis
CREATE TABLE IF NOT EXISTS codequal.repository_analysis (
    id SERIAL PRIMARY KEY,
    repository_url VARCHAR(255) NOT NULL,
    branch VARCHAR(100) NOT NULL,
    analysis_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cached_until TIMESTAMP,
    architecture_analysis JSONB,
    dependency_analysis JSONB,
    quality_metrics JSONB
);

-- Pull Request Analysis
CREATE TABLE IF NOT EXISTS codequal.pr_analysis (
    id SERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES codequal.repository_analysis(id),
    pr_number INTEGER,
    pr_title VARCHAR(255),
    analysis_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    analysis_mode VARCHAR(20),
    agent_selections JSONB,
    findings JSONB,
    performance_metrics JSONB
);

-- DeepWiki Schema
CREATE SCHEMA IF NOT EXISTS deepwiki;

-- Repository Documents
CREATE TABLE IF NOT EXISTS deepwiki.documents (
    id SERIAL PRIMARY KEY,
    repository_url VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    content TEXT,
    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Chunks
CREATE TABLE IF NOT EXISTS deepwiki.knowledge_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES deepwiki.documents(id),
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_repo_url ON deepwiki.documents(repository_url);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id ON deepwiki.knowledge_chunks(document_id);
