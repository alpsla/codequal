import { createClient } from '@supabase/supabase-js';

// Define types for database tables
export type Tables = {
  repositories: {
    id: string;
    provider: string;
    name: string;
    url: string;
    private: boolean;
    created_at: string;
    updated_at: string;
  };
  pr_reviews: {
    id: string;
    pr_url: string;
    pr_title?: string;
    pr_description?: string;
    repository_id: string;
    user_id: string;
    created_at: string;
    updated_at: string;
  };
  analysis_results: {
    id: string;
    pr_review_id: string;
    role: string;
    provider: string;
    insights: any[];
    suggestions: any[];
    educational?: any[];
    metadata?: Record<string, any>;
    execution_time_ms?: number;
    token_count?: number;
    created_at: string;
  };
  combined_results: {
    id: string;
    pr_review_id: string;
    insights: any[];
    suggestions: any[];
    educational?: any[];
    metadata?: Record<string, any>;
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
    const supabaseKey = process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and key must be provided in environment variables');
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
