-- Create agent_prompts table for storing fix suggestion prompts
CREATE TABLE IF NOT EXISTS agent_prompts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  prompt_template TEXT NOT NULL,
  language_templates JSONB DEFAULT '{}',
  model_requirements JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index on role
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_prompts_role ON agent_prompts(role) WHERE is_active = true;

-- Insert default fix-suggestion prompt
INSERT INTO agent_prompts (role, prompt_template, language_templates, model_requirements)
VALUES (
  'fix-suggestion',
  'You are an expert software engineer specializing in fixing code issues.

Given an issue in {language} code{framework}, generate a precise fix that:
1. Solves the identified problem
2. Follows {language} best practices
3. Maintains consistency with existing code style
4. Is production-ready and secure

Issue Details:
{issue_description}

Issue Category: {issue_category}
Severity: {issue_severity}
File: {file_path}
Line: {line_number}

Current Code:
```{language}
{current_code}
```

Generate a fix that:
- Addresses the root cause, not symptoms
- Includes necessary imports if needed
- Handles edge cases
- Is properly typed (for typed languages)
- Includes brief inline comments if complex

Return the fixed code in this format:
```{language}
[fixed code here]
```

Then provide a brief explanation (1-2 sentences) of what was changed and why.',
  
  '{
    "typescript": {
      "validation_pattern": "if (!{var} || typeof {var} !== \"string\") { throw new Error(`Invalid {var}`); }",
      "error_pattern": "try { {code} } catch (error) { console.error(error); throw error; }",
      "null_pattern": "if ({var} === null || {var} === undefined) { return defaultValue; }"
    },
    "python": {
      "validation_pattern": "if not {var} or not isinstance({var}, str): raise ValueError(f\"Invalid {var}\")",
      "error_pattern": "try:\\n    {code}\\nexcept Exception as e:\\n    logger.error(e)\\n    raise",
      "null_pattern": "if {var} is None: return default_value"
    },
    "java": {
      "validation_pattern": "if ({var} == null || {var}.isEmpty()) { throw new IllegalArgumentException(\"Invalid \" + {var}); }",
      "error_pattern": "try { {code} } catch (Exception e) { logger.error(e); throw e; }",
      "null_pattern": "if ({var} == null) { return defaultValue; }"
    },
    "go": {
      "validation_pattern": "if {var} == \"\" { return fmt.Errorf(\"invalid {var}\") }",
      "error_pattern": "if err != nil { return nil, fmt.Errorf(\"error: %w\", err) }",
      "null_pattern": "if {var} == nil { return defaultValue }"
    }
  }'::jsonb,
  
  '{
    "min_context": 8000,
    "preferred_models": [
      "anthropic/claude-3-opus",
      "openai/gpt-4-turbo-preview",
      "anthropic/claude-3-sonnet",
      "google/gemini-pro"
    ],
    "capabilities": ["code_generation", "language_understanding", "security_awareness"],
    "temperature": 0.3,
    "max_tokens": 1000
  }'::jsonb
)
ON CONFLICT (role) WHERE is_active = true
DO UPDATE SET 
  updated_at = CURRENT_TIMESTAMP;