-- Migration: Add indexes for tool result queries
-- Date: 2025-06-15
-- Description: Optimize Vector DB for tool result storage and retrieval

-- Create index for tool result queries by agent role
CREATE INDEX IF NOT EXISTS idx_analysis_chunks_tool_agent 
ON analysis_chunks((metadata->>'agent_role'), (metadata->>'tool_id'))
WHERE metadata->>'content_type' = 'tool_result';

-- Create index for tool result queries by tool name
CREATE INDEX IF NOT EXISTS idx_analysis_chunks_tool_name 
ON analysis_chunks((metadata->>'tool_name'))
WHERE metadata->>'content_type' = 'tool_result';

-- Create index for PR-specific tool results
CREATE INDEX IF NOT EXISTS idx_analysis_chunks_tool_pr 
ON analysis_chunks(repository_id, (metadata->>'pr_number'))
WHERE metadata->>'content_type' = 'tool_result' AND metadata->>'pr_number' IS NOT NULL;

-- Create composite index for efficient agent context retrieval
CREATE INDEX IF NOT EXISTS idx_analysis_chunks_agent_context 
ON analysis_chunks(repository_id, (metadata->>'agent_role'), created_at DESC)
WHERE storage_type = 'permanent';

-- Add comment to document the tool result structure
COMMENT ON TABLE analysis_chunks IS 'Stores both DeepWiki analysis chunks and tool execution results. Tool results have metadata.content_type = ''tool_result'' and include tool_name, agent_role, and metrics.';
