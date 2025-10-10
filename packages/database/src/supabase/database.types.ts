export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      _backup_metadata: {
        Row: {
          backup_date: string | null
          has_rls: boolean | null
          id: number
          row_count: number | null
          table_name: string | null
        }
        Insert: {
          backup_date?: string | null
          has_rls?: boolean | null
          id?: number
          row_count?: number | null
          table_name?: string | null
        }
        Update: {
          backup_date?: string | null
          has_rls?: boolean | null
          id?: number
          row_count?: number | null
          table_name?: string | null
        }
        Relationships: []
      }
      agent_activity: {
        Row: {
          agent_role: string
          cost: number | null
          created_at: string | null
          duration_ms: number | null
          error: string | null
          id: string
          input_tokens: number | null
          is_fallback: boolean | null
          language: string | null
          metadata: Json | null
          model_config_id: string | null
          model_used: string
          model_version: string | null
          operation: string
          output_tokens: number | null
          pr_number: string | null
          repository_size: string | null
          repository_url: string | null
          retry_count: number | null
          success: boolean | null
          timestamp: number
          updated_at: string | null
        }
        Insert: {
          agent_role: string
          cost?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          input_tokens?: number | null
          is_fallback?: boolean | null
          language?: string | null
          metadata?: Json | null
          model_config_id?: string | null
          model_used: string
          model_version?: string | null
          operation: string
          output_tokens?: number | null
          pr_number?: string | null
          repository_size?: string | null
          repository_url?: string | null
          retry_count?: number | null
          success?: boolean | null
          timestamp: number
          updated_at?: string | null
        }
        Update: {
          agent_role?: string
          cost?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          input_tokens?: number | null
          is_fallback?: boolean | null
          language?: string | null
          metadata?: Json | null
          model_config_id?: string | null
          model_used?: string
          model_version?: string | null
          operation?: string
          output_tokens?: number | null
          pr_number?: string | null
          repository_size?: string | null
          repository_url?: string | null
          retry_count?: number | null
          success?: boolean | null
          timestamp?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      analysis_chunks: {
        Row: {
          access_count: number | null
          chunk_index: number | null
          content: string
          created_at: string
          embedding: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json
          quality_score: number | null
          relevance_score: number | null
          repository_id: string
          source_id: string | null
          source_type: string
          storage_type: string
          total_chunks: number | null
          ttl: string | null
          updated_at: string
        }
        Insert: {
          access_count?: number | null
          chunk_index?: number | null
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json
          quality_score?: number | null
          relevance_score?: number | null
          repository_id: string
          source_id?: string | null
          source_type: string
          storage_type?: string
          total_chunks?: number | null
          ttl?: string | null
          updated_at?: string
        }
        Update: {
          access_count?: number | null
          chunk_index?: number | null
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json
          quality_score?: number | null
          relevance_score?: number | null
          repository_id?: string
          source_id?: string | null
          source_type?: string
          storage_type?: string
          total_chunks?: number | null
          ttl?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_chunks_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_chunks_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "v_active_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_configs: {
        Row: {
          complexity: string | null
          created_at: string | null
          features: Json | null
          id: string
          language: string | null
          model_preferences: Json | null
          repo_type: string | null
          team_id: string | null
          team_size: number | null
          thresholds: Json | null
          updated_at: string | null
          user_id: string
          version: string | null
          weights: Json | null
        }
        Insert: {
          complexity?: string | null
          created_at?: string | null
          features?: Json | null
          id?: string
          language?: string | null
          model_preferences?: Json | null
          repo_type?: string | null
          team_id?: string | null
          team_size?: number | null
          thresholds?: Json | null
          updated_at?: string | null
          user_id: string
          version?: string | null
          weights?: Json | null
        }
        Update: {
          complexity?: string | null
          created_at?: string | null
          features?: Json | null
          id?: string
          language?: string | null
          model_preferences?: Json | null
          repo_type?: string | null
          team_id?: string | null
          team_size?: number | null
          thresholds?: Json | null
          updated_at?: string | null
          user_id?: string
          version?: string | null
          weights?: Json | null
        }
        Relationships: []
      }
      analysis_history: {
        Row: {
          analysis_duration_seconds: number | null
          created_at: string | null
          disk_usage_mb: number | null
          error_message: string | null
          id: number
          metadata: Json | null
          repository_name: string
          repository_url: string
          status: string | null
        }
        Insert: {
          analysis_duration_seconds?: number | null
          created_at?: string | null
          disk_usage_mb?: number | null
          error_message?: string | null
          id?: number
          metadata?: Json | null
          repository_name: string
          repository_url: string
          status?: string | null
        }
        Update: {
          analysis_duration_seconds?: number | null
          created_at?: string | null
          disk_usage_mb?: number | null
          error_message?: string | null
          id?: number
          metadata?: Json | null
          repository_name?: string
          repository_url?: string
          status?: string | null
        }
        Relationships: []
      }
      analysis_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          metadata: Json
          pr_review_id: string | null
          priority: number
          repository_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["analysis_status"]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json
          pr_review_id?: string | null
          priority?: number
          repository_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["analysis_status"]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json
          pr_review_id?: string | null
          priority?: number
          repository_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["analysis_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_queue_pr_review_id_fkey"
            columns: ["pr_review_id"]
            isOneToOne: false
            referencedRelation: "pr_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_queue_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_queue_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "v_active_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_reports: {
        Row: {
          analysis_id: string
          created_at: string | null
          id: string
          issues: Json | null
          markdown_report: string | null
          metadata: Json | null
          pr_id: string | null
          pr_number: number | null
          repo_url: string | null
          report_data: Json
          repository_url: string
          score: number | null
          status: string | null
          team_id: string | null
          timestamp: string | null
          updated_at: string | null
          user_id: string | null
          vector_ids: string[] | null
        }
        Insert: {
          analysis_id: string
          created_at?: string | null
          id?: string
          issues?: Json | null
          markdown_report?: string | null
          metadata?: Json | null
          pr_id?: string | null
          pr_number?: number | null
          repo_url?: string | null
          report_data: Json
          repository_url: string
          score?: number | null
          status?: string | null
          team_id?: string | null
          timestamp?: string | null
          updated_at?: string | null
          user_id?: string | null
          vector_ids?: string[] | null
        }
        Update: {
          analysis_id?: string
          created_at?: string | null
          id?: string
          issues?: Json | null
          markdown_report?: string | null
          metadata?: Json | null
          pr_id?: string | null
          pr_number?: number | null
          repo_url?: string | null
          report_data?: Json
          repository_url?: string
          score?: number | null
          status?: string | null
          team_id?: string | null
          timestamp?: string | null
          updated_at?: string | null
          user_id?: string | null
          vector_ids?: string[] | null
        }
        Relationships: []
      }
      analysis_results: {
        Row: {
          created_at: string
          educational: Json | null
          execution_time_ms: number | null
          id: string
          insights: Json
          metadata: Json | null
          pr_review_id: string
          provider: string
          role: string
          suggestions: Json
          token_count: number | null
        }
        Insert: {
          created_at?: string
          educational?: Json | null
          execution_time_ms?: number | null
          id?: string
          insights: Json
          metadata?: Json | null
          pr_review_id: string
          provider: string
          role: string
          suggestions: Json
          token_count?: number | null
        }
        Update: {
          created_at?: string
          educational?: Json | null
          execution_time_ms?: number | null
          id?: string
          insights?: Json
          metadata?: Json | null
          pr_review_id?: string
          provider?: string
          role?: string
          suggestions?: Json
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_results_pr_review_id_fkey"
            columns: ["pr_review_id"]
            isOneToOne: false
            referencedRelation: "pr_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          active: boolean
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string | null
          last_used_at: string | null
          metadata: Json | null
          name: string
          organization_id: string | null
          permissions: Json | null
          rate_limit_per_hour: number | null
          rate_limit_per_minute: number | null
          revoked_at: string | null
          updated_at: string | null
          usage_count: number
          usage_limit: number
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix?: string | null
          last_used_at?: string | null
          metadata?: Json | null
          name: string
          organization_id?: string | null
          permissions?: Json | null
          rate_limit_per_hour?: number | null
          rate_limit_per_minute?: number | null
          revoked_at?: string | null
          updated_at?: string | null
          usage_count?: number
          usage_limit?: number
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string | null
          last_used_at?: string | null
          metadata?: Json | null
          name?: string
          organization_id?: string | null
          permissions?: Json | null
          rate_limit_per_hour?: number | null
          rate_limit_per_minute?: number | null
          revoked_at?: string | null
          updated_at?: string | null
          usage_count?: number
          usage_limit?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      api_usage: {
        Row: {
          api_calls_count: number
          created_at: string | null
          id: string
          last_used_at: string | null
          month_start: string
          subscription_tier: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_calls_count?: number
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          month_start: string
          subscription_tier?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_calls_count?: number
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          month_start?: string
          subscription_tier?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          api_key_id: string | null
          cost_usd: number | null
          endpoint: string
          error_message: string | null
          id: string
          ip_address: unknown | null
          method: string
          request_headers: Json | null
          request_params: Json | null
          response_time_ms: number | null
          status_code: number | null
          timestamp: string | null
          tokens_used: number | null
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          cost_usd?: number | null
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          method: string
          request_headers?: Json | null
          request_params?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          timestamp?: string | null
          tokens_used?: number | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          cost_usd?: number | null
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          method?: string
          request_headers?: Json | null
          request_params?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          timestamp?: string | null
          tokens_used?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          created_at: string | null
          data: Json | null
          event_type: string
          id: string
          stripe_event_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          event_type: string
          id?: string
          stripe_event_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          event_type?: string
          id?: string
          stripe_event_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      billing_test: {
        Row: {
          created_at: string | null
          id: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          user_id?: string | null
        }
        Relationships: []
      }
      cache_entries: {
        Row: {
          created_at: string | null
          expires_at: string | null
          key: string
          tags: string[] | null
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          key: string
          tags?: string[] | null
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          key?: string
          tags?: string[] | null
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      cached_timezones: {
        Row: {
          abbrev: string | null
          cached_at: string | null
          is_dst: boolean | null
          name: string
          utc_offset: unknown | null
        }
        Insert: {
          abbrev?: string | null
          cached_at?: string | null
          is_dst?: boolean | null
          name: string
          utc_offset?: unknown | null
        }
        Update: {
          abbrev?: string | null
          cached_at?: string | null
          is_dst?: boolean | null
          name?: string
          utc_offset?: unknown | null
        }
        Relationships: []
      }
      calibration_data: {
        Row: {
          analysis_id: string | null
          baseline_value: number | null
          calibration_notes: string | null
          created_at: string | null
          current_value: number | null
          deviation_percentage: number | null
          id: string
          metric_name: string
        }
        Insert: {
          analysis_id?: string | null
          baseline_value?: number | null
          calibration_notes?: string | null
          created_at?: string | null
          current_value?: number | null
          deviation_percentage?: number | null
          id?: string
          metric_name: string
        }
        Update: {
          analysis_id?: string | null
          baseline_value?: number | null
          calibration_notes?: string | null
          created_at?: string | null
          current_value?: number | null
          deviation_percentage?: number | null
          id?: string
          metric_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "calibration_data_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "deepwiki_analysis"
            referencedColumns: ["id"]
          },
        ]
      }
      calibration_results: {
        Row: {
          created_at: string | null
          id: string
          results: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          results: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          results?: Json
        }
        Relationships: []
      }
      calibration_runs: {
        Row: {
          created_at: string
          id: string
          metrics: Json
          model_versions: Json
          run_id: string
          timestamp: string
        }
        Insert: {
          created_at?: string
          id?: string
          metrics: Json
          model_versions: Json
          run_id: string
          timestamp: string
        }
        Update: {
          created_at?: string
          id?: string
          metrics?: Json
          model_versions?: Json
          run_id?: string
          timestamp?: string
        }
        Relationships: []
      }
      calibration_test_results: {
        Row: {
          architecture: string
          created_at: string
          id: string
          languages: string[]
          repository_id: string
          results: Json
          run_id: string
          size: string
        }
        Insert: {
          architecture: string
          created_at?: string
          id?: string
          languages: string[]
          repository_id: string
          results: Json
          run_id: string
          size: string
        }
        Update: {
          architecture?: string
          created_at?: string
          id?: string
          languages?: string[]
          repository_id?: string
          results?: Json
          run_id?: string
          size?: string
        }
        Relationships: [
          {
            foreignKeyName: "calibration_test_results_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibration_test_results_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "v_active_repositories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibration_test_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "calibration_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      chunk_relationships: {
        Row: {
          child_chunk_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          parent_chunk_id: string | null
          relationship_type: string
          source_chunk_id: string | null
          strength: number | null
          target_chunk_id: string | null
        }
        Insert: {
          child_chunk_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          parent_chunk_id?: string | null
          relationship_type: string
          source_chunk_id?: string | null
          strength?: number | null
          target_chunk_id?: string | null
        }
        Update: {
          child_chunk_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          parent_chunk_id?: string | null
          relationship_type?: string
          source_chunk_id?: string | null
          strength?: number | null
          target_chunk_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chunk_relationships_child_chunk_id_fkey"
            columns: ["child_chunk_id"]
            isOneToOne: false
            referencedRelation: "analysis_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chunk_relationships_parent_chunk_id_fkey"
            columns: ["parent_chunk_id"]
            isOneToOne: false
            referencedRelation: "analysis_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      combined_results: {
        Row: {
          created_at: string
          educational: Json | null
          id: string
          insights: Json
          metadata: Json | null
          pr_review_id: string
          suggestions: Json
        }
        Insert: {
          created_at?: string
          educational?: Json | null
          id?: string
          insights: Json
          metadata?: Json | null
          pr_review_id: string
          suggestions: Json
        }
        Update: {
          created_at?: string
          educational?: Json | null
          id?: string
          insights?: Json
          metadata?: Json | null
          pr_review_id?: string
          suggestions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "combined_results_pr_review_id_fkey"
            columns: ["pr_review_id"]
            isOneToOne: false
            referencedRelation: "pr_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      cve_database: {
        Row: {
          cached_at: string | null
          cpe_entries: Json | null
          cve_id: string
          cvss_v2_score: number | null
          cvss_v3_score: number | null
          cvss_v3_vector: string | null
          cwe_id: string | null
          description: string
          id: string
          last_modified_date: string | null
          published_date: string | null
          reference_urls: Json | null
          severity: string | null
          updated_at: string | null
        }
        Insert: {
          cached_at?: string | null
          cpe_entries?: Json | null
          cve_id: string
          cvss_v2_score?: number | null
          cvss_v3_score?: number | null
          cvss_v3_vector?: string | null
          cwe_id?: string | null
          description: string
          id?: string
          last_modified_date?: string | null
          published_date?: string | null
          reference_urls?: Json | null
          severity?: string | null
          updated_at?: string | null
        }
        Update: {
          cached_at?: string | null
          cpe_entries?: Json | null
          cve_id?: string
          cvss_v2_score?: number | null
          cvss_v3_score?: number | null
          cvss_v3_vector?: string | null
          cwe_id?: string | null
          description?: string
          id?: string
          last_modified_date?: string | null
          published_date?: string | null
          reference_urls?: Json | null
          severity?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cve_update_log: {
        Row: {
          api_requests_made: number | null
          completed_at: string | null
          cves_added: number | null
          cves_total: number | null
          cves_updated: number | null
          duration_seconds: number | null
          error_details: Json | null
          error_message: string | null
          id: string
          nvd_last_modified_date: string | null
          server_info: Json | null
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          api_requests_made?: number | null
          completed_at?: string | null
          cves_added?: number | null
          cves_total?: number | null
          cves_updated?: number | null
          duration_seconds?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          nvd_last_modified_date?: string | null
          server_info?: Json | null
          started_at: string
          status: string
          triggered_by?: string | null
        }
        Update: {
          api_requests_made?: number | null
          completed_at?: string | null
          cves_added?: number | null
          cves_total?: number | null
          cves_updated?: number | null
          duration_seconds?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          nvd_last_modified_date?: string | null
          server_info?: Json | null
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      data_collection_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          data_types: string[]
          error: string | null
          id: string
          priority: number
          repository_id: string | null
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          data_types: string[]
          error?: string | null
          id?: string
          priority?: number
          repository_id?: string | null
          retry_count?: number
          started_at?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          data_types?: string[]
          error?: string | null
          id?: string
          priority?: number
          repository_id?: string | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_collection_jobs_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_collection_jobs_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "v_active_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      deepwiki_analysis: {
        Row: {
          analysis_type: string
          calibration_data: Json | null
          created_at: string | null
          id: string
          repository_name: string
          results: Json | null
          updated_at: string | null
        }
        Insert: {
          analysis_type: string
          calibration_data?: Json | null
          created_at?: string | null
          id?: string
          repository_name: string
          results?: Json | null
          updated_at?: string | null
        }
        Update: {
          analysis_type?: string
          calibration_data?: Json | null
          created_at?: string | null
          id?: string
          repository_name?: string
          results?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      deepwiki_cleanups: {
        Row: {
          cleanup_status: string | null
          cleanup_time: string | null
          created_at: string | null
          disk_freed_mb: number | null
          error_message: string | null
          id: number
          repositories_cleaned: number | null
        }
        Insert: {
          cleanup_status?: string | null
          cleanup_time?: string | null
          created_at?: string | null
          disk_freed_mb?: number | null
          error_message?: string | null
          id?: number
          repositories_cleaned?: number | null
        }
        Update: {
          cleanup_status?: string | null
          cleanup_time?: string | null
          created_at?: string | null
          disk_freed_mb?: number | null
          error_message?: string | null
          id?: number
          repositories_cleaned?: number | null
        }
        Relationships: []
      }
      deepwiki_configurations: {
        Row: {
          config_data: Json
          config_type: string
          created_at: string | null
          expires_at: string | null
          fallback_model: string
          id: string
          primary_model: string
          repository_url: string | null
          updated_at: string | null
        }
        Insert: {
          config_data: Json
          config_type: string
          created_at?: string | null
          expires_at?: string | null
          fallback_model: string
          id: string
          primary_model: string
          repository_url?: string | null
          updated_at?: string | null
        }
        Update: {
          config_data?: Json
          config_type?: string
          created_at?: string | null
          expires_at?: string | null
          fallback_model?: string
          id?: string
          primary_model?: string
          repository_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      deepwiki_metrics: {
        Row: {
          active_repositories: number | null
          created_at: string | null
          disk_available_gb: number
          disk_total_gb: number
          disk_usage_percent: number
          disk_used_gb: number
          id: number
          metadata: Json | null
        }
        Insert: {
          active_repositories?: number | null
          created_at?: string | null
          disk_available_gb: number
          disk_total_gb: number
          disk_usage_percent: number
          disk_used_gb: number
          id?: number
          metadata?: Json | null
        }
        Update: {
          active_repositories?: number | null
          created_at?: string | null
          disk_available_gb?: number
          disk_total_gb?: number
          disk_usage_percent?: number
          disk_used_gb?: number
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      developer_metrics: {
        Row: {
          average_score: number | null
          avg_architecture_score: number | null
          avg_code_quality_score: number | null
          avg_dependency_score: number | null
          avg_performance_score: number | null
          avg_security_score: number | null
          badges: Json | null
          best_score: number | null
          best_streak: number | null
          created_at: string | null
          current_score: number | null
          current_streak: number | null
          developer_email: string
          developer_name: string | null
          first_analysis_at: string | null
          id: string
          last_analysis_at: string | null
          total_issues_introduced: number | null
          total_issues_resolved: number | null
          total_prs_analyzed: number | null
          updated_at: string | null
        }
        Insert: {
          average_score?: number | null
          avg_architecture_score?: number | null
          avg_code_quality_score?: number | null
          avg_dependency_score?: number | null
          avg_performance_score?: number | null
          avg_security_score?: number | null
          badges?: Json | null
          best_score?: number | null
          best_streak?: number | null
          created_at?: string | null
          current_score?: number | null
          current_streak?: number | null
          developer_email: string
          developer_name?: string | null
          first_analysis_at?: string | null
          id?: string
          last_analysis_at?: string | null
          total_issues_introduced?: number | null
          total_issues_resolved?: number | null
          total_prs_analyzed?: number | null
          updated_at?: string | null
        }
        Update: {
          average_score?: number | null
          avg_architecture_score?: number | null
          avg_code_quality_score?: number | null
          avg_dependency_score?: number | null
          avg_performance_score?: number | null
          avg_security_score?: number | null
          badges?: Json | null
          best_score?: number | null
          best_streak?: number | null
          created_at?: string | null
          current_score?: number | null
          current_streak?: number | null
          developer_email?: string
          developer_name?: string | null
          first_analysis_at?: string | null
          id?: string
          last_analysis_at?: string | null
          total_issues_introduced?: number | null
          total_issues_resolved?: number | null
          total_prs_analyzed?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      developer_skills: {
        Row: {
          architecture_score: number | null
          category_id: string
          code_quality_score: number | null
          created_at: string | null
          dependencies_score: number | null
          email: string | null
          experience_points: number
          id: string
          issues_fixed_critical: number | null
          issues_fixed_high: number | null
          issues_fixed_low: number | null
          issues_fixed_medium: number | null
          issues_introduced_critical: number | null
          issues_introduced_high: number | null
          issues_introduced_low: number | null
          issues_introduced_medium: number | null
          last_assessed_at: string | null
          last_updated: string | null
          level_current: string | null
          level_numeric: number | null
          level_title: string | null
          overall_score: number | null
          performance_score: number | null
          security_score: number | null
          skill_level: number
          team_id: string | null
          testing_score: number | null
          total_prs: number | null
          trend_change: number | null
          trend_direction: string | null
          trend_period: string | null
          updated_at: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          architecture_score?: number | null
          category_id: string
          code_quality_score?: number | null
          created_at?: string | null
          dependencies_score?: number | null
          email?: string | null
          experience_points?: number
          id?: string
          issues_fixed_critical?: number | null
          issues_fixed_high?: number | null
          issues_fixed_low?: number | null
          issues_fixed_medium?: number | null
          issues_introduced_critical?: number | null
          issues_introduced_high?: number | null
          issues_introduced_low?: number | null
          issues_introduced_medium?: number | null
          last_assessed_at?: string | null
          last_updated?: string | null
          level_current?: string | null
          level_numeric?: number | null
          level_title?: string | null
          overall_score?: number | null
          performance_score?: number | null
          security_score?: number | null
          skill_level?: number
          team_id?: string | null
          testing_score?: number | null
          total_prs?: number | null
          trend_change?: number | null
          trend_direction?: string | null
          trend_period?: string | null
          updated_at?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          architecture_score?: number | null
          category_id?: string
          code_quality_score?: number | null
          created_at?: string | null
          dependencies_score?: number | null
          email?: string | null
          experience_points?: number
          id?: string
          issues_fixed_critical?: number | null
          issues_fixed_high?: number | null
          issues_fixed_low?: number | null
          issues_fixed_medium?: number | null
          issues_introduced_critical?: number | null
          issues_introduced_high?: number | null
          issues_introduced_low?: number | null
          issues_introduced_medium?: number | null
          last_assessed_at?: string | null
          last_updated?: string | null
          level_current?: string | null
          level_numeric?: number | null
          level_title?: string | null
          overall_score?: number | null
          performance_score?: number | null
          security_score?: number | null
          skill_level?: number
          team_id?: string | null
          testing_score?: number | null
          total_prs?: number | null
          trend_change?: number | null
          trend_direction?: string | null
          trend_period?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "developer_skills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "skill_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "developer_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          amount_off: number | null
          code: string
          created_at: string | null
          currency: string | null
          duration: string | null
          duration_in_months: number | null
          expires_at: string | null
          id: string
          max_redemptions: number | null
          percent_off: number | null
          stripe_coupon_id: string | null
          times_redeemed: number | null
          valid: boolean | null
        }
        Insert: {
          amount_off?: number | null
          code: string
          created_at?: string | null
          currency?: string | null
          duration?: string | null
          duration_in_months?: number | null
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          percent_off?: number | null
          stripe_coupon_id?: string | null
          times_redeemed?: number | null
          valid?: boolean | null
        }
        Update: {
          amount_off?: number | null
          code?: string
          created_at?: string | null
          currency?: string | null
          duration?: string | null
          duration_in_months?: number | null
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          percent_off?: number | null
          stripe_coupon_id?: string | null
          times_redeemed?: number | null
          valid?: boolean | null
        }
        Relationships: []
      }
      discount_redemptions: {
        Row: {
          discount_code_id: string
          id: string
          organization_id: string
          redeemed_at: string | null
          subscription_id: string | null
        }
        Insert: {
          discount_code_id: string
          id?: string
          organization_id: string
          redeemed_at?: string | null
          subscription_id?: string | null
        }
        Update: {
          discount_code_id?: string
          id?: string
          organization_id?: string
          redeemed_at?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_redemptions_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "billing_summary"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "discount_redemptions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      educational_patterns: {
        Row: {
          after_code: string | null
          before_code: string | null
          created_at: string
          description: string
          difficulty: string | null
          embedding: string | null
          explanation: string | null
          framework: string | null
          id: string
          language: string
          pattern_type: string
          prerequisites: string[] | null
          quality_score: number | null
          tags: string[] | null
          title: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          after_code?: string | null
          before_code?: string | null
          created_at?: string
          description: string
          difficulty?: string | null
          embedding?: string | null
          explanation?: string | null
          framework?: string | null
          id?: string
          language: string
          pattern_type: string
          prerequisites?: string[] | null
          quality_score?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          after_code?: string | null
          before_code?: string | null
          created_at?: string
          description?: string
          difficulty?: string | null
          embedding?: string | null
          explanation?: string | null
          framework?: string | null
          id?: string
          language?: string
          pattern_type?: string
          prerequisites?: string[] | null
          quality_score?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      embedding_configurations: {
        Row: {
          cost_per_million: number | null
          created_at: string | null
          dimensions: number
          embedding_type: string | null
          id: string
          is_active: boolean | null
          max_tokens: number | null
          metadata: Json | null
          model_key: string
          model_name: string
          provider: string
          updated_at: string | null
        }
        Insert: {
          cost_per_million?: number | null
          created_at?: string | null
          dimensions: number
          embedding_type?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          metadata?: Json | null
          model_key: string
          model_name: string
          provider: string
          updated_at?: string | null
        }
        Update: {
          cost_per_million?: number | null
          created_at?: string | null
          dimensions?: number
          embedding_type?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          metadata?: Json | null
          model_key?: string
          model_name?: string
          provider?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      embedding_configurations_old: {
        Row: {
          api_key_env_var: string | null
          avg_latency_ms: number | null
          base_url: string | null
          config_name: string
          content_type_preference: string | null
          cost_per_1k_tokens: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          dimensions: number
          id: number
          is_active: boolean | null
          is_default: boolean | null
          last_updated: string
          max_tokens: number
          model_name: string
          provider: string
          quality_score: number | null
          updated_at: string | null
        }
        Insert: {
          api_key_env_var?: string | null
          avg_latency_ms?: number | null
          base_url?: string | null
          config_name: string
          content_type_preference?: string | null
          cost_per_1k_tokens?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dimensions: number
          id?: number
          is_active?: boolean | null
          is_default?: boolean | null
          last_updated: string
          max_tokens: number
          model_name: string
          provider: string
          quality_score?: number | null
          updated_at?: string | null
        }
        Update: {
          api_key_env_var?: string | null
          avg_latency_ms?: number | null
          base_url?: string | null
          config_name?: string
          content_type_preference?: string | null
          cost_per_1k_tokens?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dimensions?: number
          id?: number
          is_active?: boolean | null
          is_default?: boolean | null
          last_updated?: string
          max_tokens?: number
          model_name?: string
          provider?: string
          quality_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      embedding_model_metrics: {
        Row: {
          avg_latency_ms: number | null
          config_id: number | null
          error_count: number | null
          id: number
          metric_window: string
          p95_latency_ms: number | null
          p99_latency_ms: number | null
          relevance_score: number | null
          requests_count: number
          timestamp: string | null
          total_cost_usd: number | null
          total_tokens_used: number | null
          user_satisfaction_score: number | null
          window_end: string
          window_start: string
        }
        Insert: {
          avg_latency_ms?: number | null
          config_id?: number | null
          error_count?: number | null
          id?: number
          metric_window: string
          p95_latency_ms?: number | null
          p99_latency_ms?: number | null
          relevance_score?: number | null
          requests_count?: number
          timestamp?: string | null
          total_cost_usd?: number | null
          total_tokens_used?: number | null
          user_satisfaction_score?: number | null
          window_end: string
          window_start: string
        }
        Update: {
          avg_latency_ms?: number | null
          config_id?: number | null
          error_count?: number | null
          id?: number
          metric_window?: string
          p95_latency_ms?: number | null
          p99_latency_ms?: number | null
          relevance_score?: number | null
          requests_count?: number
          timestamp?: string | null
          total_cost_usd?: number | null
          total_tokens_used?: number | null
          user_satisfaction_score?: number | null
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "embedding_model_metrics_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "embedding_configurations_old"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          endpoint: string | null
          error_code: string
          id: string
          message: string
          method: string | null
          stack_trace: string | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          endpoint?: string | null
          error_code: string
          id?: string
          message: string
          method?: string | null
          stack_trace?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          endpoint?: string | null
          error_code?: string
          id?: string
          message?: string
          method?: string | null
          stack_trace?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      knowledge_items: {
        Row: {
          category: string
          code_snippet: string | null
          confidence_score: number | null
          content: string
          created_at: string
          embedding: string | null
          expires_at: string | null
          helpful_count: number | null
          id: string
          item_type: string
          last_used_at: string | null
          metadata: Json | null
          not_helpful_count: number | null
          retention_policy: string | null
          source_reference: string | null
          source_type: string | null
          tags: string[] | null
          title: string
          updated_at: string
          usage_count: number | null
          verification_status: string | null
        }
        Insert: {
          category: string
          code_snippet?: string | null
          confidence_score?: number | null
          content: string
          created_at?: string
          embedding?: string | null
          expires_at?: string | null
          helpful_count?: number | null
          id?: string
          item_type: string
          last_used_at?: string | null
          metadata?: Json | null
          not_helpful_count?: number | null
          retention_policy?: string | null
          source_reference?: string | null
          source_type?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          usage_count?: number | null
          verification_status?: string | null
        }
        Update: {
          category?: string
          code_snippet?: string | null
          confidence_score?: number | null
          content?: string
          created_at?: string
          embedding?: string | null
          expires_at?: string | null
          helpful_count?: number | null
          id?: string
          item_type?: string
          last_used_at?: string | null
          metadata?: Json | null
          not_helpful_count?: number | null
          retention_policy?: string | null
          source_reference?: string | null
          source_type?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          usage_count?: number | null
          verification_status?: string | null
        }
        Relationships: []
      }
      model_configurations: {
        Row: {
          fallback_model: string
          fallback_provider: string
          id: string
          language: string
          last_updated: string | null
          min_requirements: Json | null
          primary_model: string
          primary_provider: string
          reasoning: string[] | null
          role: string
          size_category: string
          updated_by: string | null
          weights: Json
        }
        Insert: {
          fallback_model: string
          fallback_provider: string
          id?: string
          language: string
          last_updated?: string | null
          min_requirements?: Json | null
          primary_model: string
          primary_provider: string
          reasoning?: string[] | null
          role: string
          size_category: string
          updated_by?: string | null
          weights?: Json
        }
        Update: {
          fallback_model?: string
          fallback_provider?: string
          id?: string
          language?: string
          last_updated?: string | null
          min_requirements?: Json | null
          primary_model?: string
          primary_provider?: string
          reasoning?: string[] | null
          role?: string
          size_category?: string
          updated_by?: string | null
          weights?: Json
        }
        Relationships: []
      }
      model_configurations_backup: {
        Row: {
          created_at: string | null
          id: string
          language: string
          model: string
          notes: string | null
          provider: string
          size_category: string
          test_results: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          language: string
          model: string
          notes?: string | null
          provider: string
          size_category: string
          test_results?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          language?: string
          model?: string
          notes?: string | null
          provider?: string
          size_category?: string
          test_results?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          can_manage_billing: boolean | null
          can_manage_members: boolean | null
          can_manage_settings: boolean | null
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          can_manage_billing?: boolean | null
          can_manage_members?: boolean | null
          can_manage_settings?: boolean | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          can_manage_billing?: boolean | null
          can_manage_members?: boolean | null
          can_manage_settings?: boolean | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          organization_id: string
          permissions: Json | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id?: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          allowed_email_domains: string[] | null
          created_at: string
          github_installation_id: string | null
          github_org_name: string | null
          gitlab_group_id: string | null
          gitlab_group_name: string | null
          id: string
          max_members: number | null
          member_count: number
          name: string
          owner_id: string
          quotas: Json
          repository_access: Json | null
          settings: Json | null
          slug: string
          stripe_customer_id: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          allowed_email_domains?: string[] | null
          created_at?: string
          github_installation_id?: string | null
          github_org_name?: string | null
          gitlab_group_id?: string | null
          gitlab_group_name?: string | null
          id?: string
          max_members?: number | null
          member_count?: number
          name: string
          owner_id: string
          quotas?: Json
          repository_access?: Json | null
          settings?: Json | null
          slug: string
          stripe_customer_id?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          allowed_email_domains?: string[] | null
          created_at?: string
          github_installation_id?: string | null
          github_org_name?: string | null
          gitlab_group_id?: string | null
          gitlab_group_name?: string | null
          id?: string
          max_members?: number | null
          member_count?: number
          name?: string
          owner_id?: string
          quotas?: Json
          repository_access?: Json | null
          settings?: Json | null
          slug?: string
          stripe_customer_id?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          brand: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          last_four: string | null
          stripe_payment_method_id: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          last_four?: string | null
          stripe_payment_method_id: string
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          last_four?: string | null
          stripe_payment_method_id?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          description: string | null
          id: string
          organization_id: string
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          subscription_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          organization_id: string
          status: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          organization_id?: string
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "billing_summary"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_indicators: {
        Row: {
          id: string
          indicators: Json
          last_updated: string
          repository_id: string | null
        }
        Insert: {
          id?: string
          indicators: Json
          last_updated?: string
          repository_id?: string | null
        }
        Update: {
          id?: string
          indicators?: Json
          last_updated?: string
          repository_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_indicators_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_indicators_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "v_active_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      pr_analyses: {
        Row: {
          analysis_id: string
          completed_at: string | null
          created_at: string | null
          error: string | null
          id: string
          pr_number: number
          progress: number | null
          repository_url: string
          results: Json | null
          status: string | null
        }
        Insert: {
          analysis_id: string
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          pr_number: number
          progress?: number | null
          repository_url: string
          results?: Json | null
          status?: string | null
        }
        Update: {
          analysis_id?: string
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          pr_number?: number
          progress?: number | null
          repository_url?: string
          results?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      pr_analysis_history: {
        Row: {
          analysis_duration_ms: number | null
          analyzed_at: string | null
          app_architecture_score: number | null
          app_code_quality_score: number | null
          app_dependency_score: number | null
          app_overall_score: number | null
          app_performance_score: number | null
          app_security_score: number | null
          base_branch: string | null
          blocking_issues_count: number | null
          branch: string | null
          confidence: number | null
          created_at: string | null
          decision: string
          existing_issues_count: number | null
          full_report_json: Json | null
          grade: string | null
          id: string
          language: string | null
          markdown_report: string | null
          new_issues_count: number | null
          pr_author: string | null
          pr_number: number
          pr_title: string | null
          quality_score: number | null
          reason: string | null
          repo_name: string
          resolved_issues_count: number | null
          tools_used: string[] | null
          updated_at: string | null
        }
        Insert: {
          analysis_duration_ms?: number | null
          analyzed_at?: string | null
          app_architecture_score?: number | null
          app_code_quality_score?: number | null
          app_dependency_score?: number | null
          app_overall_score?: number | null
          app_performance_score?: number | null
          app_security_score?: number | null
          base_branch?: string | null
          blocking_issues_count?: number | null
          branch?: string | null
          confidence?: number | null
          created_at?: string | null
          decision: string
          existing_issues_count?: number | null
          full_report_json?: Json | null
          grade?: string | null
          id?: string
          language?: string | null
          markdown_report?: string | null
          new_issues_count?: number | null
          pr_author?: string | null
          pr_number: number
          pr_title?: string | null
          quality_score?: number | null
          reason?: string | null
          repo_name: string
          resolved_issues_count?: number | null
          tools_used?: string[] | null
          updated_at?: string | null
        }
        Update: {
          analysis_duration_ms?: number | null
          analyzed_at?: string | null
          app_architecture_score?: number | null
          app_code_quality_score?: number | null
          app_dependency_score?: number | null
          app_overall_score?: number | null
          app_performance_score?: number | null
          app_security_score?: number | null
          base_branch?: string | null
          blocking_issues_count?: number | null
          branch?: string | null
          confidence?: number | null
          created_at?: string | null
          decision?: string
          existing_issues_count?: number | null
          full_report_json?: Json | null
          grade?: string | null
          id?: string
          language?: string | null
          markdown_report?: string | null
          new_issues_count?: number | null
          pr_author?: string | null
          pr_number?: number
          pr_title?: string | null
          quality_score?: number | null
          reason?: string | null
          repo_name?: string
          resolved_issues_count?: number | null
          tools_used?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pr_review_metrics: {
        Row: {
          complexity_score: number | null
          created_at: string | null
          findings: Json | null
          id: string
          pr_number: number
          repository_name: string
          review_depth: number | null
          review_duration: unknown | null
        }
        Insert: {
          complexity_score?: number | null
          created_at?: string | null
          findings?: Json | null
          id?: string
          pr_number: number
          repository_name: string
          review_depth?: number | null
          review_duration?: unknown | null
        }
        Update: {
          complexity_score?: number | null
          created_at?: string | null
          findings?: Json | null
          id?: string
          pr_number?: number
          repository_name?: string
          review_depth?: number | null
          review_duration?: unknown | null
        }
        Relationships: []
      }
      pr_reviews: {
        Row: {
          analysis_mode: string
          author: string
          base_branch: string
          closed_at: string | null
          created_at: string
          description: string | null
          head_branch: string
          id: string
          is_draft: boolean
          merged_at: string | null
          metadata: Json
          number: number
          repository_id: string
          state: string
          title: string
          updated_at: string
        }
        Insert: {
          analysis_mode?: string
          author: string
          base_branch: string
          closed_at?: string | null
          created_at?: string
          description?: string | null
          head_branch: string
          id?: string
          is_draft?: boolean
          merged_at?: string | null
          metadata?: Json
          number: number
          repository_id: string
          state?: string
          title: string
          updated_at?: string
        }
        Update: {
          analysis_mode?: string
          author?: string
          base_branch?: string
          closed_at?: string | null
          created_at?: string
          description?: string | null
          head_branch?: string
          id?: string
          is_draft?: boolean
          merged_at?: string | null
          metadata?: Json
          number?: number
          repository_id?: string
          state?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pull_requests_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pull_requests_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "v_active_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_accounts: {
        Row: {
          access_token: string | null
          created_at: string | null
          id: string
          provider: string
          provider_avatar_url: string | null
          provider_email: string | null
          provider_profile_url: string | null
          provider_user_id: string
          provider_username: string | null
          raw_user_data: Json | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          provider: string
          provider_avatar_url?: string | null
          provider_email?: string | null
          provider_profile_url?: string | null
          provider_user_id: string
          provider_username?: string | null
          raw_user_data?: Json | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          provider?: string
          provider_avatar_url?: string | null
          provider_email?: string | null
          provider_profile_url?: string | null
          provider_user_id?: string
          provider_username?: string | null
          raw_user_data?: Json | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      query_performance_log: {
        Row: {
          avg_time_ms: number | null
          calls_count: number | null
          created_at: string | null
          execution_time_ms: number | null
          id: string
          last_executed: string | null
          query_hash: string
          query_pattern: string | null
          total_time_ms: number | null
        }
        Insert: {
          avg_time_ms?: number | null
          calls_count?: number | null
          created_at?: string | null
          execution_time_ms?: number | null
          id?: string
          last_executed?: string | null
          query_hash: string
          query_pattern?: string | null
          total_time_ms?: number | null
        }
        Update: {
          avg_time_ms?: number | null
          calls_count?: number | null
          created_at?: string | null
          execution_time_ms?: number | null
          id?: string
          last_executed?: string | null
          query_hash?: string
          query_pattern?: string | null
          total_time_ms?: number | null
        }
        Relationships: []
      }
      rag_educational_content: {
        Row: {
          applicable_patterns: string[] | null
          content: string
          content_embedding: string | null
          content_type: string
          created_at: string | null
          difficulty_level: string | null
          frameworks: Json | null
          id: number
          programming_language: string | null
          quality_score: number | null
          source_type: string | null
          source_url: string | null
          title: string
          topic_tags: string[] | null
          updated_at: string | null
          usage_count: number | null
          use_cases: string[] | null
          version: string | null
        }
        Insert: {
          applicable_patterns?: string[] | null
          content: string
          content_embedding?: string | null
          content_type: string
          created_at?: string | null
          difficulty_level?: string | null
          frameworks?: Json | null
          id?: number
          programming_language?: string | null
          quality_score?: number | null
          source_type?: string | null
          source_url?: string | null
          title: string
          topic_tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          use_cases?: string[] | null
          version?: string | null
        }
        Update: {
          applicable_patterns?: string[] | null
          content?: string
          content_embedding?: string | null
          content_type?: string
          created_at?: string | null
          difficulty_level?: string | null
          frameworks?: Json | null
          id?: number
          programming_language?: string | null
          quality_score?: number | null
          source_type?: string | null
          source_url?: string | null
          title?: string
          topic_tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          use_cases?: string[] | null
          version?: string | null
        }
        Relationships: []
      }
      rag_query_patterns: {
        Row: {
          created_at: string | null
          id: number
          query_embedding: string | null
          query_text: string
          query_type: string | null
          repository_id: string | null
          result_count: number | null
          search_duration_ms: number | null
          user_context: Json | null
          user_feedback_score: number | null
          was_successful: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          query_embedding?: string | null
          query_text: string
          query_type?: string | null
          repository_id?: string | null
          result_count?: number | null
          search_duration_ms?: number | null
          user_context?: Json | null
          user_feedback_score?: number | null
          was_successful?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: number
          query_embedding?: string | null
          query_text?: string
          query_type?: string | null
          repository_id?: string | null
          result_count?: number | null
          search_duration_ms?: number | null
          user_context?: Json | null
          user_feedback_score?: number | null
          was_successful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_query_patterns_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rag_query_patterns_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "v_active_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          id: string
          last_request: string
          operation: string
          reset_time: string
          user_id: string
        }
        Insert: {
          count?: number
          id?: string
          last_request?: string
          operation: string
          reset_time: string
          user_id: string
        }
        Update: {
          count?: number
          id?: string
          last_request?: string
          operation?: string
          reset_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      repositories: {
        Row: {
          analysis_count: number | null
          collected_data_types: string[] | null
          created_at: string
          data_collection_status: string | null
          default_branch: string
          description: string | null
          fingerprint: string | null
          free_tier_analysis_limit: number | null
          github_id: number
          id: string
          is_private: boolean
          language: string | null
          languages: Json | null
          last_analyzed_at: string | null
          last_data_collection: string | null
          last_synced_at: string | null
          metadata: Json
          name: string
          owner: string
          platform: string | null
          primary_language: string | null
          size: number | null
          topics: Json | null
          updated_at: string
          url: string | null
        }
        Insert: {
          analysis_count?: number | null
          collected_data_types?: string[] | null
          created_at?: string
          data_collection_status?: string | null
          default_branch?: string
          description?: string | null
          fingerprint?: string | null
          free_tier_analysis_limit?: number | null
          github_id: number
          id?: string
          is_private?: boolean
          language?: string | null
          languages?: Json | null
          last_analyzed_at?: string | null
          last_data_collection?: string | null
          last_synced_at?: string | null
          metadata?: Json
          name: string
          owner: string
          platform?: string | null
          primary_language?: string | null
          size?: number | null
          topics?: Json | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          analysis_count?: number | null
          collected_data_types?: string[] | null
          created_at?: string
          data_collection_status?: string | null
          default_branch?: string
          description?: string | null
          fingerprint?: string | null
          free_tier_analysis_limit?: number | null
          github_id?: number
          id?: string
          is_private?: boolean
          language?: string | null
          languages?: Json | null
          last_analyzed_at?: string | null
          last_data_collection?: string | null
          last_synced_at?: string | null
          metadata?: Json
          name?: string
          owner?: string
          platform?: string | null
          primary_language?: string | null
          size?: number | null
          topics?: Json | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      repository_access_logs: {
        Row: {
          access_level: string
          granted_at: string
          granted_by: string
          id: string
          organization_id: string
          repository_id: string
          revoked_at: string | null
          revoked_by: string | null
        }
        Insert: {
          access_level: string
          granted_at?: string
          granted_by: string
          id?: string
          organization_id: string
          repository_id: string
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Update: {
          access_level?: string
          granted_at?: string
          granted_by?: string
          id?: string
          organization_id?: string
          repository_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repository_access_logs_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repository_access_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repository_access_logs_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      repository_analysis: {
        Row: {
          analysis_data: Json
          analyzer: string
          cached_until: string
          created_at: string
          execution_time_ms: number | null
          id: string
          metadata: Json | null
          repository_id: string
          token_count: number | null
          updated_at: string
        }
        Insert: {
          analysis_data: Json
          analyzer: string
          cached_until: string
          created_at?: string
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          repository_id: string
          token_count?: number | null
          updated_at?: string
        }
        Update: {
          analysis_data?: Json
          analyzer?: string
          cached_until?: string
          created_at?: string
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          repository_id?: string
          token_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repository_analysis_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repository_analysis_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "v_active_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      repository_dependencies: {
        Row: {
          dev_dependencies: Json
          direct_dependencies: Json
          id: string
          last_updated: string
          package_managers: string[]
          repository_id: string | null
          transitive_dependencies: Json | null
          vulnerabilities: Json | null
        }
        Insert: {
          dev_dependencies: Json
          direct_dependencies: Json
          id?: string
          last_updated?: string
          package_managers: string[]
          repository_id?: string | null
          transitive_dependencies?: Json | null
          vulnerabilities?: Json | null
        }
        Update: {
          dev_dependencies?: Json
          direct_dependencies?: Json
          id?: string
          last_updated?: string
          package_managers?: string[]
          repository_id?: string | null
          transitive_dependencies?: Json | null
          vulnerabilities?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "repository_dependencies_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repository_dependencies_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "v_active_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      repository_schedules: {
        Row: {
          can_be_disabled: boolean | null
          created_at: string | null
          cron_expression: string | null
          enabled: boolean | null
          frequency: string
          id: string
          is_active: boolean | null
          last_run_at: string | null
          metadata: Json | null
          next_run_at: string | null
          reason: string | null
          repository_url: string
          schedule_config: Json | null
          updated_at: string | null
        }
        Insert: {
          can_be_disabled?: boolean | null
          created_at?: string | null
          cron_expression?: string | null
          enabled?: boolean | null
          frequency: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          metadata?: Json | null
          next_run_at?: string | null
          reason?: string | null
          repository_url: string
          schedule_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          can_be_disabled?: boolean | null
          created_at?: string | null
          cron_expression?: string | null
          enabled?: boolean | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          metadata?: Json | null
          next_run_at?: string | null
          reason?: string | null
          repository_url?: string
          schedule_config?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      repository_structures: {
        Row: {
          file_types: Json
          id: string
          last_updated: string
          repository_id: string | null
          root_directories: Json
          special_directories: Json | null
        }
        Insert: {
          file_types: Json
          id?: string
          last_updated?: string
          repository_id?: string | null
          root_directories: Json
          special_directories?: Json | null
        }
        Update: {
          file_types?: Json
          id?: string
          last_updated?: string
          repository_id?: string | null
          root_directories?: Json
          special_directories?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "repository_structures_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repository_structures_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "v_active_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      repository_trial_usage: {
        Row: {
          created_at: string | null
          first_scan_at: string | null
          first_scan_user_id: string
          id: string
          last_scan_at: string | null
          organization_id: string | null
          pay_per_scan_count: number | null
          pay_per_scan_enabled: boolean | null
          repository_url: string
          scans_used: number | null
          trial_exhausted: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_scan_at?: string | null
          first_scan_user_id: string
          id?: string
          last_scan_at?: string | null
          organization_id?: string | null
          pay_per_scan_count?: number | null
          pay_per_scan_enabled?: boolean | null
          repository_url: string
          scans_used?: number | null
          trial_exhausted?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_scan_at?: string | null
          first_scan_user_id?: string
          id?: string
          last_scan_at?: string | null
          organization_id?: string | null
          pay_per_scan_count?: number | null
          pay_per_scan_enabled?: boolean | null
          repository_url?: string
          scans_used?: number | null
          trial_exhausted?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repository_trial_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_records: {
        Row: {
          billing_type: string
          branch: string | null
          commit_sha: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          issues_found: number | null
          organization_id: string | null
          quality_score: number | null
          repository_url: string
          scan_duration_ms: number | null
          scan_type: string | null
          stripe_payment_intent_id: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          billing_type: string
          branch?: string | null
          commit_sha?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          issues_found?: number | null
          organization_id?: string | null
          quality_score?: number | null
          repository_url: string
          scan_duration_ms?: number | null
          scan_type?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          billing_type?: string
          branch?: string | null
          commit_sha?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          issues_found?: number | null
          organization_id?: string | null
          quality_score?: number | null
          repository_url?: string
          scan_duration_ms?: number | null
          scan_type?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_records_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "billing_summary"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "scan_records_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      search_cache: {
        Row: {
          created_at: string
          expires_at: string
          hit_count: number | null
          id: string
          last_accessed_at: string
          metadata: Json | null
          query_embedding: string | null
          query_hash: string
          query_text: string
          result_ids: string[]
          result_scores: number[]
        }
        Insert: {
          created_at?: string
          expires_at: string
          hit_count?: number | null
          id?: string
          last_accessed_at?: string
          metadata?: Json | null
          query_embedding?: string | null
          query_hash: string
          query_text: string
          result_ids: string[]
          result_scores: number[]
        }
        Update: {
          created_at?: string
          expires_at?: string
          hit_count?: number | null
          id?: string
          last_accessed_at?: string
          metadata?: Json | null
          query_embedding?: string | null
          query_hash?: string
          query_text?: string
          result_ids?: string[]
          result_scores?: number[]
        }
        Relationships: []
      }
      security_events: {
        Row: {
          agent_role: string | null
          correlation_id: string | null
          details: Json | null
          device_fingerprint: Json | null
          event_id: string
          geo_location: Json | null
          id: string
          ip_address: unknown
          repository_id: string | null
          risk_score: number | null
          session_id: string
          severity: Database["public"]["Enums"]["security_severity"]
          timestamp: string
          type: Database["public"]["Enums"]["security_event_type"]
          user_agent: string
          user_id: string | null
        }
        Insert: {
          agent_role?: string | null
          correlation_id?: string | null
          details?: Json | null
          device_fingerprint?: Json | null
          event_id: string
          geo_location?: Json | null
          id?: string
          ip_address: unknown
          repository_id?: string | null
          risk_score?: number | null
          session_id: string
          severity?: Database["public"]["Enums"]["security_severity"]
          timestamp?: string
          type: Database["public"]["Enums"]["security_event_type"]
          user_agent: string
          user_id?: string | null
        }
        Update: {
          agent_role?: string | null
          correlation_id?: string | null
          details?: Json | null
          device_fingerprint?: Json | null
          event_id?: string
          geo_location?: Json | null
          id?: string
          ip_address?: unknown
          repository_id?: string | null
          risk_score?: number | null
          session_id?: string
          severity?: Database["public"]["Enums"]["security_severity"]
          timestamp?: string
          type?: Database["public"]["Enums"]["security_event_type"]
          user_agent?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_info: {
        Row: {
          findings: Json
          id: string
          last_updated: string
          repository_id: string | null
        }
        Insert: {
          findings: Json
          id?: string
          last_updated?: string
          repository_id?: string | null
        }
        Update: {
          findings?: Json
          id?: string
          last_updated?: string
          repository_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_info_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_info_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "v_active_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "skill_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_progression: {
        Row: {
          analysis_id: string | null
          category_id: string
          created_at: string | null
          experience_points: number
          id: string
          pr_url: string | null
          repository_name: string | null
          skill_level: number
          timestamp: string | null
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          category_id: string
          created_at?: string | null
          experience_points?: number
          id?: string
          pr_url?: string | null
          repository_name?: string | null
          skill_level: number
          timestamp?: string | null
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          category_id?: string
          created_at?: string | null
          experience_points?: number
          id?: string
          pr_url?: string | null
          repository_name?: string | null
          skill_level?: number
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_progression_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "skill_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_progression_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      skill_recommendations: {
        Row: {
          category_id: string
          completed: boolean | null
          created_at: string | null
          description: string | null
          id: string
          priority: number | null
          recommendation_type: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id: string
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: number | null
          recommendation_type: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: number | null
          recommendation_type?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_recommendations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "skill_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      skill_scores: {
        Row: {
          analysis_duration_ms: number | null
          analyzed_at: string
          architecture_score: number | null
          branch: string | null
          code_quality_score: number | null
          created_at: string | null
          critical_issues_count: number | null
          dependency_score: number | null
          developer_email: string
          developer_name: string | null
          high_issues_count: number | null
          id: string
          language: string | null
          low_issues_count: number | null
          medium_issues_count: number | null
          new_issues_count: number | null
          overall_score: number
          performance_score: number | null
          pr_number: number
          quality_score: number | null
          repo_name: string
          resolved_issues_count: number | null
          security_score: number | null
          updated_at: string | null
        }
        Insert: {
          analysis_duration_ms?: number | null
          analyzed_at?: string
          architecture_score?: number | null
          branch?: string | null
          code_quality_score?: number | null
          created_at?: string | null
          critical_issues_count?: number | null
          dependency_score?: number | null
          developer_email: string
          developer_name?: string | null
          high_issues_count?: number | null
          id?: string
          language?: string | null
          low_issues_count?: number | null
          medium_issues_count?: number | null
          new_issues_count?: number | null
          overall_score: number
          performance_score?: number | null
          pr_number: number
          quality_score?: number | null
          repo_name: string
          resolved_issues_count?: number | null
          security_score?: number | null
          updated_at?: string | null
        }
        Update: {
          analysis_duration_ms?: number | null
          analyzed_at?: string
          architecture_score?: number | null
          branch?: string | null
          code_quality_score?: number | null
          created_at?: string | null
          critical_issues_count?: number | null
          dependency_score?: number | null
          developer_email?: string
          developer_name?: string | null
          high_issues_count?: number | null
          id?: string
          language?: string | null
          low_issues_count?: number | null
          medium_issues_count?: number | null
          new_issues_count?: number | null
          overall_score?: number
          performance_score?: number | null
          pr_number?: number
          quality_score?: number | null
          repo_name?: string
          resolved_issues_count?: number | null
          security_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      skill_updates: {
        Row: {
          adjustments: Json | null
          category_changes: Json | null
          created_at: string | null
          id: string
          new_score: number | null
          pr_id: string | null
          pr_metadata: Json | null
          previous_score: number | null
          score_change: number | null
          skill_id: string | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          adjustments?: Json | null
          category_changes?: Json | null
          created_at?: string | null
          id?: string
          new_score?: number | null
          pr_id?: string | null
          pr_metadata?: Json | null
          previous_score?: number | null
          score_change?: number | null
          skill_id?: string | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          adjustments?: Json | null
          category_changes?: Json | null
          created_at?: string | null
          id?: string
          new_score?: number | null
          pr_id?: string | null
          pr_metadata?: Json | null
          previous_score?: number | null
          score_change?: number | null
          skill_id?: string | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stripe_customers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          stripe_customer_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          stripe_customer_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          stripe_customer_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_tiers: {
        Row: {
          created_at: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          limits: Json | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          slug: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          limits?: Json | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          slug: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          limits?: Json | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          slug?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount_cents: number
          billing_cycle: string
          cancel_at_period_end: boolean | null
          created_at: string
          currency: string
          current_period_end: string
          current_period_start: string
          id: string
          organization_id: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          billing_cycle?: string
          cancel_at_period_end?: boolean | null
          created_at?: string
          currency?: string
          current_period_end: string
          current_period_start: string
          id?: string
          organization_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          billing_cycle?: string
          cancel_at_period_end?: boolean | null
          created_at?: string
          currency?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          organization_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      trial_usage: {
        Row: {
          id: string
          pr_number: number | null
          repository_url: string
          scan_type: string | null
          scanned_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          pr_number?: number | null
          repository_url: string
          scan_type?: string | null
          scanned_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          pr_number?: number | null
          repository_url?: string
          scan_type?: string | null
          scanned_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      usage_records: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          metric_name: string
          organization_id: string
          quantity: number
          subscription_id: string | null
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_name: string
          organization_id: string
          quantity: number
          subscription_id?: string | null
          timestamp?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_name?: string
          organization_id?: string
          quantity?: number
          subscription_id?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_records_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "billing_summary"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "usage_records_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_billing: {
        Row: {
          created_at: string | null
          id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          trial_ends_at: string | null
          trial_scans_limit: number | null
          trial_scans_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          trial_scans_limit?: number | null
          trial_scans_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          trial_scans_limit?: number | null
          trial_scans_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          auth_provider: string | null
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string
          email: string
          email_notifications: boolean | null
          email_verified: boolean | null
          full_name: string | null
          github_id: string | null
          github_username: string | null
          gitlab_id: string | null
          gitlab_username: string | null
          id: string
          last_login_at: string | null
          last_sign_in_at: string | null
          location: string | null
          magic_link_sent_at: string | null
          metadata: Json | null
          name: string | null
          organization_id: string | null
          organizations: string[] | null
          preferred_language: string | null
          primary_organization_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          sign_in_count: number | null
          status: Database["public"]["Enums"]["user_status"]
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          theme: string | null
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          auth_provider?: string | null
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          email: string
          email_notifications?: boolean | null
          email_verified?: boolean | null
          full_name?: string | null
          github_id?: string | null
          github_username?: string | null
          gitlab_id?: string | null
          gitlab_username?: string | null
          id?: string
          last_login_at?: string | null
          last_sign_in_at?: string | null
          location?: string | null
          magic_link_sent_at?: string | null
          metadata?: Json | null
          name?: string | null
          organization_id?: string | null
          organizations?: string[] | null
          preferred_language?: string | null
          primary_organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          sign_in_count?: number | null
          status?: Database["public"]["Enums"]["user_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          theme?: string | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          auth_provider?: string | null
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          email?: string
          email_notifications?: boolean | null
          email_verified?: boolean | null
          full_name?: string | null
          github_id?: string | null
          github_username?: string | null
          gitlab_id?: string | null
          gitlab_username?: string | null
          id?: string
          last_login_at?: string | null
          last_sign_in_at?: string | null
          location?: string | null
          magic_link_sent_at?: string | null
          metadata?: Json | null
          name?: string | null
          organization_id?: string | null
          organizations?: string[] | null
          preferred_language?: string | null
          primary_organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          sign_in_count?: number | null
          status?: Database["public"]["Enums"]["user_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          theme?: string | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_profiles_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_repositories: {
        Row: {
          access_level: string | null
          added_at: string | null
          default_branch: string | null
          id: string
          is_private: boolean | null
          last_accessed_at: string | null
          provider: string
          provider_repo_id: string | null
          repo_name: string | null
          repo_owner: string | null
          repository_url: string
          user_id: string
        }
        Insert: {
          access_level?: string | null
          added_at?: string | null
          default_branch?: string | null
          id?: string
          is_private?: boolean | null
          last_accessed_at?: string | null
          provider: string
          provider_repo_id?: string | null
          repo_name?: string | null
          repo_owner?: string | null
          repository_url: string
          user_id: string
        }
        Update: {
          access_level?: string | null
          added_at?: string | null
          default_branch?: string | null
          id?: string
          is_private?: boolean | null
          last_accessed_at?: string | null
          provider?: string
          provider_repo_id?: string | null
          repo_name?: string | null
          repo_owner?: string | null
          repository_url?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          fingerprint: string
          id: string
          ip_address: unknown
          last_activity: string
          revoked_at: string | null
          session_id: string
          user_agent: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          fingerprint: string
          id?: string
          ip_address: unknown
          last_activity?: string
          revoked_at?: string | null
          session_id: string
          user_agent: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          fingerprint?: string
          id?: string
          ip_address?: unknown
          last_activity?: string
          revoked_at?: string | null
          session_id?: string
          user_agent?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skills: {
        Row: {
          confidence: number
          created_at: string
          domain: string
          id: string
          interactions: number | null
          language: string
          last_interaction_at: string | null
          skill_level: string
          successful_applications: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          domain: string
          id?: string
          interactions?: number | null
          language: string
          last_interaction_at?: string | null
          skill_level: string
          successful_applications?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          domain?: string
          id?: string
          interactions?: number | null
          language?: string
          last_interaction_at?: string | null
          skill_level?: string
          successful_applications?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_trial_repository: {
        Row: {
          id: string
          repository_url: string
          selected_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          repository_url: string
          selected_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          repository_url?: string
          selected_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          github_id: string | null
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          github_id?: string | null
          id?: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          github_id?: string | null
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vector_chunks: {
        Row: {
          analysis_type: string | null
          chunk_index: number
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          repository_id: string
          source_id: string
          tool_name: string | null
          updated_at: string | null
        }
        Insert: {
          analysis_type?: string | null
          chunk_index: number
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          repository_id: string
          source_id: string
          tool_name?: string | null
          updated_at?: string | null
        }
        Update: {
          analysis_type?: string | null
          chunk_index?: number
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          repository_id?: string
          source_id?: string
          tool_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vector_embeddings: {
        Row: {
          content_hash: string
          created_at: string
          embedding: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          repository_id: string
          user_id: string | null
        }
        Insert: {
          content_hash: string
          created_at?: string
          embedding?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          repository_id: string
          user_id?: string | null
        }
        Update: {
          content_hash?: string
          created_at?: string
          embedding?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          repository_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vector_embeddings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_operation_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          operation: string
          success: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          operation: string
          success: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          operation?: string
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      billing_summary: {
        Row: {
          amount_cents: number | null
          billing_cycle: string | null
          currency: string | null
          current_period_end: string | null
          organization_id: string | null
          payment_count: number | null
          status: string | null
          stripe_subscription_id: string | null
          subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"] | null
          total_paid_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_timezone_names: {
        Row: {
          name: string | null
        }
        Relationships: []
      }
      rag_document_embeddings: {
        Row: {
          class_names: string[] | null
          content_chunk: string | null
          content_language: string | null
          content_type: string | null
          created_at: string | null
          dependencies: string[] | null
          embedding: string | null
          expires_at: string | null
          file_path: string | null
          file_size_bytes: number | null
          framework_references: string[] | null
          function_names: string[] | null
          git_commit_hash: string | null
          id: number | null
          importance_score: number | null
          last_modified_at: string | null
          metadata: Json | null
          repository_id: number | null
          updated_at: string | null
        }
        Insert: {
          class_names?: never
          content_chunk?: string | null
          content_language?: never
          content_type?: never
          created_at?: string | null
          dependencies?: never
          embedding?: string | null
          expires_at?: string | null
          file_path?: never
          file_size_bytes?: never
          framework_references?: never
          function_names?: never
          git_commit_hash?: never
          id?: never
          importance_score?: never
          last_modified_at?: never
          metadata?: Json | null
          repository_id?: never
          updated_at?: string | null
        }
        Update: {
          class_names?: never
          content_chunk?: string | null
          content_language?: never
          content_type?: never
          created_at?: string | null
          dependencies?: never
          embedding?: string | null
          expires_at?: string | null
          file_path?: never
          file_size_bytes?: never
          framework_references?: never
          function_names?: never
          git_commit_hash?: never
          id?: never
          importance_score?: never
          last_modified_at?: never
          metadata?: Json | null
          repository_id?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      rag_repositories: {
        Row: {
          analysis_frequency: string | null
          created_at: string | null
          framework_stack: Json | null
          id: number | null
          last_analyzed_at: string | null
          primary_language: string | null
          repository_name: string | null
          repository_size_bytes: number | null
          repository_url: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      recent_critical_cves: {
        Row: {
          cpe_entries: Json | null
          cve_id: string | null
          cvss_v3_score: number | null
          description: string | null
          published_date: string | null
          severity: string | null
        }
        Insert: {
          cpe_entries?: Json | null
          cve_id?: string | null
          cvss_v3_score?: number | null
          description?: string | null
          published_date?: string | null
          severity?: string | null
        }
        Update: {
          cpe_entries?: Json | null
          cve_id?: string | null
          cvss_v3_score?: number | null
          description?: string | null
          published_date?: string | null
          severity?: string | null
        }
        Relationships: []
      }
      skill_history: {
        Row: {
          adjustments: Json | null
          category_changes: Json | null
          created_at: string | null
          id: string | null
          new_score: number | null
          pr_id: string | null
          pr_metadata: Json | null
          previous_score: number | null
          score_change: number | null
          skill_id: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          adjustments?: Json | null
          category_changes?: Json | null
          created_at?: string | null
          id?: string | null
          new_score?: number | null
          pr_id?: string | null
          pr_metadata?: Json | null
          previous_score?: number | null
          score_change?: number | null
          skill_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          adjustments?: Json | null
          category_changes?: Json | null
          created_at?: string | null
          id?: string | null
          new_score?: number | null
          pr_id?: string | null
          pr_metadata?: Json | null
          previous_score?: number | null
          score_change?: number | null
          skill_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      update_statistics: {
        Row: {
          avg_duration_seconds: number | null
          failed_updates: number | null
          successful_updates: number | null
          total_cves_added: number | null
          total_cves_updated: number | null
          total_updates: number | null
          update_date: string | null
        }
        Relationships: []
      }
      v_active_repositories: {
        Row: {
          analysis_count: number | null
          created_at: string | null
          data_collection_status: string | null
          id: string | null
          is_private: boolean | null
          last_analyzed_at: string | null
          name: string | null
          owner: string | null
          platform: string | null
          primary_language: string | null
          size: number | null
        }
        Insert: {
          analysis_count?: number | null
          created_at?: string | null
          data_collection_status?: string | null
          id?: string | null
          is_private?: boolean | null
          last_analyzed_at?: string | null
          name?: string | null
          owner?: string | null
          platform?: string | null
          primary_language?: string | null
          size?: number | null
        }
        Update: {
          analysis_count?: number | null
          created_at?: string | null
          data_collection_status?: string | null
          id?: string | null
          is_private?: boolean | null
          last_analyzed_at?: string | null
          name?: string | null
          owner?: string | null
          platform?: string | null
          primary_language?: string | null
          size?: number | null
        }
        Relationships: []
      }
      vector_operation_summary: {
        Row: {
          avg_duration_ms: number | null
          failed: number | null
          hour: string | null
          operation: string | null
          success_rate: number | null
          successful: number | null
          total_operations: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      adapt_embedding_dimension: {
        Args: { embedding_vector: number[]; target_dimension?: number }
        Returns: number[]
      }
      add_user_to_organization: {
        Args:
          | {
              org_uuid: string
              user_role?: Database["public"]["Enums"]["user_role"]
              user_uuid: string
            }
          | { p_organization_id: string; p_role?: string; p_user_id: string }
        Returns: undefined
      }
      can_scan_repository: {
        Args: {
          p_organization_id: string
          p_repository_url: string
          p_user_id: string
        }
        Returns: Json
      }
      can_user_scan_repository: {
        Args: { p_repository_url: string; p_user_id: string }
        Returns: boolean
      }
      check_embedding_dimension: {
        Args: { embedding_vector: number[] }
        Returns: {
          dimension: number
          is_standard: boolean
          recommended_action: string
        }[]
      }
      clean_expired_content: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_error_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      enable_pay_per_scan: {
        Args: { p_repository_url: string; p_user_id: string }
        Returns: boolean
      }
      get_model_configuration: {
        Args: { p_language: string; p_role: string; p_size_category: string }
        Returns: {
          fallback_model: string
          fallback_provider: string
          primary_model: string
          primary_provider: string
          reasoning: string[]
          weights: Json
        }[]
      }
      get_timezone_names: {
        Args: Record<PropertyKey, never>
        Returns: {
          abbrev: string
          is_dst: boolean
          name: string
          utc_offset: unknown
        }[]
      }
      grant_repository_access: {
        Args:
          | {
              access_level: string
              granted_by_uuid: string
              org_uuid: string
              repo_id: string
            }
          | {
              p_access_level: string
              p_repository_id: string
              p_user_id: string
            }
        Returns: undefined
      }
      increment_api_usage: {
        Args: {
          p_api_key_id: string
          p_cost_usd?: number
          p_tokens_used?: number
        }
        Returns: boolean
      }
      is_service_role: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_slow_query: {
        Args: { p_execution_time_ms: number; p_query_text: string }
        Returns: undefined
      }
      rag_cleanup_expired_embeddings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      rag_maintain_vector_limits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      rag_search_documents: {
        Args:
          | {
              content_type_filter?: string
              framework_filter?: string
              language_filter?: string
              match_count?: number
              match_threshold?: number
              min_importance?: number
              query_embedding: string
              repository_filter?: number
            }
          | {
              match_count?: number
              match_threshold?: number
              query_embedding: string
              repository_ids?: string[]
            }
        Returns: {
          content_chunk: string
          content_language: string
          content_type: string
          file_path: string
          id: number
          importance_score: number
          metadata: Json
          repository_id: number
          similarity: number
        }[]
      }
      rag_search_educational_content: {
        Args:
          | {
              content_category?: string
              match_count?: number
              match_threshold?: number
              query_embedding: string
              skill_level?: string
            }
          | {
              difficulty_filter?: string
              framework_filter?: string
              language_filter?: string
              match_count?: number
              match_threshold?: number
              query_embedding: string
            }
        Returns: {
          code_examples: Json
          content: string
          id: string
          metadata: Json
          similarity: number
          title: string
        }[]
      }
      record_scan: {
        Args: {
          p_branch?: string
          p_commit_sha?: string
          p_organization_id: string
          p_repository_url: string
          p_scan_type?: string
          p_user_id: string
        }
        Returns: string
      }
      search_similar_chunks: {
        Args:
          | {
              limit_count?: number
              min_score?: number
              query_embedding: string
              repo_id?: string
            }
          | {
              match_count?: number
              match_threshold?: number
              query_embedding: string
            }
          | {
              match_count?: number
              match_threshold?: number
              query_embedding: string
              repository_uuid: string
            }
          | {
              match_count?: number
              min_similarity?: number
              query_embedding: string
              repo_id: string
            }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      update_developer_score: {
        Args: {
          p_adjustments: Json
          p_category_changes: Json
          p_issues_fixed: Json
          p_issues_introduced: Json
          p_new_score: number
          p_pr_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      update_user_last_login: {
        Args: { user_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      analysis_status: "pending" | "in_progress" | "completed" | "failed"
      security_event_type:
        | "AUTH_SUCCESS"
        | "AUTH_FAILURE"
        | "ACCESS_DENIED"
        | "PERMISSION_ESCALATION"
        | "SESSION_EXPIRED"
        | "RATE_LIMIT_HIT"
      security_severity: "low" | "medium" | "high" | "critical"
      subscription_tier: "free" | "pro" | "enterprise" | "individual" | "team"
      user_role:
        | "user"
        | "admin"
        | "system_admin"
        | "org_owner"
        | "org_member"
        | "service_account"
      user_status:
        | "active"
        | "suspended"
        | "pending_verification"
        | "password_reset_required"
        | "locked"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      analysis_status: ["pending", "in_progress", "completed", "failed"],
      security_event_type: [
        "AUTH_SUCCESS",
        "AUTH_FAILURE",
        "ACCESS_DENIED",
        "PERMISSION_ESCALATION",
        "SESSION_EXPIRED",
        "RATE_LIMIT_HIT",
      ],
      security_severity: ["low", "medium", "high", "critical"],
      subscription_tier: ["free", "pro", "enterprise", "individual", "team"],
      user_role: [
        "user",
        "admin",
        "system_admin",
        "org_owner",
        "org_member",
        "service_account",
      ],
      user_status: [
        "active",
        "suspended",
        "pending_verification",
        "password_reset_required",
        "locked",
      ],
    },
  },
} as const
