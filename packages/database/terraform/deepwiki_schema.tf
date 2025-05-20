terraform {
  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 0.1.0"
    }
  }
}

provider "supabase" {
  project_ref = var.supabase_project_ref
  access_token = var.supabase_access_token
}

variable "supabase_project_ref" {
  description = "The reference ID of the Supabase project"
  type        = string
}

variable "supabase_access_token" {
  description = "The access token for the Supabase project"
  type        = string
  sensitive   = true
}

resource "supabase_sql" "deepwiki_schema" {
  name        = "deepwiki_schema"
  description = "DeepWiki analysis schema"
  
  sql = file("${path.module}/../../database/migrations/20250513_deepwiki_schema.sql")
}

# Extension for vector search in case we want to enable it for code embedding later
resource "supabase_sql" "enable_pgvector" {
  name        = "enable_pgvector"
  description = "Enable pgvector extension for code embeddings"
  
  sql = <<-EOT
    CREATE EXTENSION IF NOT EXISTS vector;
  EOT
  
  depends_on = [supabase_sql.deepwiki_schema]
}

# Create RLS policies to secure the tables
resource "supabase_sql" "deepwiki_rls_policies" {
  name        = "deepwiki_rls_policies"
  description = "Row-level security policies for DeepWiki tables"
  
  sql = <<-EOT
    -- Enable RLS on all tables
    ALTER TABLE repository_analyses ENABLE ROW LEVEL SECURITY;
    ALTER TABLE pr_analyses ENABLE ROW LEVEL SECURITY;
    ALTER TABLE perspective_analyses ENABLE ROW LEVEL SECURITY;
    ALTER TABLE repository_cache_status ENABLE ROW LEVEL SECURITY;
    ALTER TABLE model_performance_metrics ENABLE ROW LEVEL SECURITY;
    ALTER TABLE size_category_thresholds ENABLE ROW LEVEL SECURITY;
    ALTER TABLE language_model_recommendations ENABLE ROW LEVEL SECURITY;

    -- Create policies for authenticated users
    -- Repository analyses can be read by authenticated users
    CREATE POLICY "Repository analyses can be read by authenticated users" 
      ON repository_analyses FOR SELECT
      TO authenticated
      USING (true);

    -- PR analyses can be read by authenticated users
    CREATE POLICY "PR analyses can be read by authenticated users" 
      ON pr_analyses FOR SELECT
      TO authenticated
      USING (true);

    -- Perspective analyses can be read by authenticated users
    CREATE POLICY "Perspective analyses can be read by authenticated users" 
      ON perspective_analyses FOR SELECT
      TO authenticated
      USING (true);

    -- Cache status can be read by authenticated users
    CREATE POLICY "Cache status can be read by authenticated users" 
      ON repository_cache_status FOR SELECT
      TO authenticated
      USING (true);

    -- Model metrics can be read by authenticated users
    CREATE POLICY "Model metrics can be read by authenticated users" 
      ON model_performance_metrics FOR SELECT
      TO authenticated
      USING (true);

    -- Size thresholds can be read by authenticated users
    CREATE POLICY "Size thresholds can be read by authenticated users" 
      ON size_category_thresholds FOR SELECT
      TO authenticated
      USING (true);

    -- Language recommendations can be read by authenticated users
    CREATE POLICY "Language recommendations can be read by authenticated users" 
      ON language_model_recommendations FOR SELECT
      TO authenticated
      USING (true);

    -- Create policies for service role (API service)
    -- Repository analyses can be managed by service role
    CREATE POLICY "Repository analyses can be managed by service role" 
      ON repository_analyses FOR ALL
      TO service_role
      USING (true);

    -- PR analyses can be managed by service role
    CREATE POLICY "PR analyses can be managed by service role" 
      ON pr_analyses FOR ALL
      TO service_role
      USING (true);

    -- Perspective analyses can be managed by service role
    CREATE POLICY "Perspective analyses can be managed by service role" 
      ON perspective_analyses FOR ALL
      TO service_role
      USING (true);

    -- Cache status can be managed by service role
    CREATE POLICY "Cache status can be managed by service role" 
      ON repository_cache_status FOR ALL
      TO service_role
      USING (true);

    -- Model metrics can be managed by service role
    CREATE POLICY "Model metrics can be managed by service role" 
      ON model_performance_metrics FOR ALL
      TO service_role
      USING (true);

    -- Size thresholds can be managed by service role
    CREATE POLICY "Size thresholds can be managed by service role" 
      ON size_category_thresholds FOR ALL
      TO service_role
      USING (true);

    -- Language recommendations can be managed by service role
    CREATE POLICY "Language recommendations can be managed by service role" 
      ON language_model_recommendations FOR ALL
      TO service_role
      USING (true);
  EOT
  
  depends_on = [supabase_sql.deepwiki_schema]
}

# Create indexes for performance optimization
resource "supabase_sql" "deepwiki_performance_indexes" {
  name        = "deepwiki_performance_indexes"
  description = "Additional indexes for DeepWiki tables"
  
  sql = <<-EOT
    -- Additional repository analyses indexes
    CREATE INDEX IF NOT EXISTS idx_repository_analyses_combined_repo 
      ON repository_analyses (repository_owner, repository_name, branch);
    
    CREATE INDEX IF NOT EXISTS idx_repository_analyses_provider_model 
      ON repository_analyses (provider, model);
    
    -- Additional PR analyses indexes
    CREATE INDEX IF NOT EXISTS idx_pr_analyses_provider_model 
      ON pr_analyses (provider, model);
    
    CREATE INDEX IF NOT EXISTS idx_pr_analyses_depth 
      ON pr_analyses (analysis_depth);
    
    -- Additional perspective analyses indexes
    CREATE INDEX IF NOT EXISTS idx_perspective_analyses_provider_model 
      ON perspective_analyses (provider, model);
    
    CREATE INDEX IF NOT EXISTS idx_perspective_analyses_repo_pr 
      ON perspective_analyses (repository_owner, repository_name, pr_number);
  EOT
  
  depends_on = [supabase_sql.deepwiki_schema]
}

# Output the project URL for reference
output "supabase_project_url" {
  description = "The URL of the Supabase project"
  value       = "https://app.supabase.com/project/${var.supabase_project_ref}"
}
