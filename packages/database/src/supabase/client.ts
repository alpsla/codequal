import { createClient } from '@supabase/supabase-js';

// Define types for database tables
export type Tables = {
  repositories: {
    id: string;
    provider: string;
    name: string;
    url: string;
    private: boolean;
    primary_language?: string;
    languages?: Record<string, number>;
    size?: number; // repository size in bytes
    created_at: string;
    updated_at: string;
  };
  pull_requests: {
    id: string;
    pr_url: string;
    pr_title?: string;
    pr_description?: string;
    repository_id: string;
    user_id: string;
    analysis_mode: string; // 'quick' or 'comprehensive'
    created_at: string;
    updated_at: string;
  };
  analysis_results: {
    id: string;
    pull_request_id: string;
    role: string;
    provider: string;
    insights: Array<{ category: string; description: string; impact?: string; severity?: string }>;
    suggestions: Array<{ title: string; description: string; priority?: string; effort?: string }>;
    educational?: Array<{ topic: string; content: string; resources?: string[] }>;
    metadata?: Record<string, unknown>;
    execution_time_ms?: number;
    token_count?: number;
    created_at: string;
  };
  combined_results: {
    id: string;
    pull_request_id: string;
    insights: Array<{ category: string; description: string; impact?: string; severity?: string }>;
    suggestions: Array<{ title: string; description: string; priority?: string; effort?: string }>;
    educational?: Array<{ topic: string; content: string; resources?: string[] }>;
    metadata?: Record<string, unknown>;
    created_at: string;
  };
  repository_analysis: {
    id: string;
    repository_id: string;
    analyzer: string; // e.g., 'deepwiki'
    analysis_data: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    cached_until: string; // TTL for cache
    execution_time_ms?: number;
    token_count?: number;
    created_at: string;
    updated_at: string;
  };
  calibration_runs: {
    id: string;
    run_id: string;
    timestamp: string;
    model_versions: Record<string, string>;
    metrics: Record<string, unknown>[];
    created_at: string;
  };
  calibration_test_results: {
    id: string;
    run_id: string;
    repository_id: string;
    size: string; // small, medium, large, enterprise
    languages: string[];
    architecture: string;
    results: Record<string, Record<string, number>>;
    created_at: string;
  };
  skill_categories: {
    id: string;
    name: string;
    description?: string;
    parent_id?: string;
    created_at: string;
  };
  developer_skills: {
    id: string;
    user_id: string;
    category_id: string;
    level: number;
    last_updated: string;
    created_at: string;
  };
  skill_history: {
    id: string;
    skill_id: string;
    level: number;
    evidence_type: string;
    evidence_id?: string;
    created_at: string;
  };
};

// Singleton instance
let supabaseInstance: ReturnType<typeof createClient> | null = null;

/**
 * Get Supabase client instance.
 * Creates a new instance if one doesn't exist.
 */
export function getSupabase() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and service role key must be provided in environment variables');
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  
  return supabaseInstance;
}

/**
 * Initialize Supabase client with specific URL and key.
 * Useful for testing or when environment variables are not available.
 */
export function initSupabase(url: string, key: string) {
  supabaseInstance = createClient(url, key);
  return supabaseInstance;
}
