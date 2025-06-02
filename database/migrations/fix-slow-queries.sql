-- Fix Slow Queries in Supabase
-- Generated: 2025-06-01

-- 1. Create indexes for the most expensive queries

-- For functions query (pg_proc lookups)
CREATE INDEX IF NOT EXISTS idx_pg_proc_prokind_pronamespace 
ON pg_proc(prokind, pronamespace);

-- For table metadata queries
CREATE INDEX IF NOT EXISTS idx_pg_class_relkind_relnamespace 
ON pg_class(relkind, relnamespace);

-- For constraint lookups
CREATE INDEX IF NOT EXISTS idx_pg_constraint_contype_conrelid 
ON pg_constraint(contype, conrelid);

-- 2. Create materialized views for frequently accessed system data

-- Materialized view for timezone names (called 131 times!)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_timezone_names AS
SELECT name FROM pg_timezone_names;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_timezone_names_name 
ON mv_timezone_names(name);

-- Refresh the materialized view periodically (can be scheduled)
REFRESH MATERIALIZED VIEW mv_timezone_names;

-- 3. Create a more efficient function for table metadata
CREATE OR REPLACE FUNCTION get_table_metadata(schema_names text[])
RETURNS TABLE (
    id bigint,
    schema text,
    name text,
    rls_enabled boolean,
    rls_forced boolean,
    replica_identity text,
    bytes bigint,
    size text,
    live_rows_estimate bigint,
    dead_rows_estimate bigint,
    comment text,
    primary_keys jsonb,
    relationships jsonb
) AS $$
BEGIN
    RETURN QUERY
    WITH base_tables AS (
        SELECT
            c.oid::int8 AS id,
            nc.nspname AS schema,
            c.relname AS name,
            c.relrowsecurity AS rls_enabled,
            c.relforcerowsecurity AS rls_forced,
            CASE
                WHEN c.relreplident = 'd' THEN 'DEFAULT'
                WHEN c.relreplident = 'n' THEN 'NOTHING'
                WHEN c.relreplident = 'f' THEN 'FULL'
                ELSE 'INDEX'
            END AS replica_identity,
            pg_total_relation_size(c.oid)::int8 AS bytes,
            pg_size_pretty(pg_total_relation_size(c.oid)) AS size,
            pg_stat_get_live_tuples(c.oid) AS live_rows_estimate,
            pg_stat_get_dead_tuples(c.oid) AS dead_rows_estimate,
            obj_description(c.oid) AS comment
        FROM pg_namespace nc
        JOIN pg_class c ON nc.oid = c.relnamespace
        WHERE c.relkind IN ('r', 'p')
            AND NOT pg_is_other_temp_schema(nc.oid)
            AND nc.nspname = ANY(schema_names)
            AND (
                pg_has_role(c.relowner, 'USAGE')
                OR has_table_privilege(c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
                OR has_any_column_privilege(c.oid, 'SELECT, INSERT, UPDATE, REFERENCES')
            )
    ),
    primary_keys AS (
        SELECT
            i.indrelid AS table_id,
            jsonb_agg(jsonb_build_object(
                'schema', n.nspname,
                'table_name', c.relname,
                'name', a.attname,
                'table_id', c.oid::int8
            )) AS primary_keys
        FROM pg_index i
        JOIN pg_class c ON i.indrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
        WHERE i.indisprimary
            AND n.nspname = ANY(schema_names)
        GROUP BY i.indrelid
    ),
    relationships AS (
        SELECT
            CASE
                WHEN csa.relnamespace = ANY(ARRAY(SELECT oid FROM pg_namespace WHERE nspname = ANY(schema_names))) 
                THEN c.conrelid
                ELSE c.confrelid
            END AS table_id,
            jsonb_build_object(
                'id', c.oid::int8,
                'constraint_name', c.conname,
                'source_schema', nsa.nspname,
                'source_table_name', csa.relname,
                'source_column_name', sa.attname,
                'target_table_schema', nta.nspname,
                'target_table_name', cta.relname,
                'target_column_name', ta.attname
            ) AS relationship
        FROM pg_constraint c
        JOIN pg_attribute sa ON sa.attrelid = c.conrelid AND sa.attnum = ANY(c.conkey)
        JOIN pg_class csa ON sa.attrelid = csa.oid
        JOIN pg_namespace nsa ON csa.relnamespace = nsa.oid
        JOIN pg_attribute ta ON ta.attrelid = c.confrelid AND ta.attnum = ANY(c.confkey)
        JOIN pg_class cta ON ta.attrelid = cta.oid
        JOIN pg_namespace nta ON cta.relnamespace = nta.oid
        WHERE c.contype = 'f'
            AND (nsa.nspname = ANY(schema_names) OR nta.nspname = ANY(schema_names))
    )
    SELECT
        bt.*,
        COALESCE(pk.primary_keys, '[]'::jsonb) AS primary_keys,
        COALESCE(
            (SELECT jsonb_agg(r.relationship) FROM relationships r WHERE r.table_id = bt.id),
            '[]'::jsonb
        ) AS relationships
    FROM base_tables bt
    LEFT JOIN primary_keys pk ON pk.table_id = bt.id;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Create a function to get table definitions more efficiently
CREATE OR REPLACE FUNCTION get_table_definitions(
    schema_names text[],
    limit_count int DEFAULT 100,
    offset_count int DEFAULT 0
)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    WITH records AS (
        SELECT
            c.oid::int8 AS id,
            CASE c.relkind
                WHEN 'r' THEN pg_temp.pg_get_tabledef(
                    nc.nspname::text,
                    c.relname::text,
                    'FKEYS',
                    'INCLUDE_TRIGGERS',
                    NULL
                )
                WHEN 'v' THEN concat(
                    'CREATE OR REPLACE VIEW ', nc.nspname, '.', c.relname, ' AS ',
                    pg_get_viewdef(c.oid, true)
                )
                WHEN 'm' THEN concat(
                    'CREATE MATERIALIZED VIEW ', nc.nspname, '.', c.relname, ' AS ',
                    pg_get_viewdef(c.oid, true)
                )
                WHEN 'S' THEN concat('CREATE SEQUENCE ', nc.nspname, '.', c.relname, ';')
                WHEN 'p' THEN pg_temp.pg_get_tabledef(
                    nc.nspname::text,
                    c.relname::text,
                    'FKEYS',
                    'INCLUDE_TRIGGERS',
                    NULL
                )
            END AS sql
        FROM pg_namespace nc
        JOIN pg_class c ON nc.oid = c.relnamespace
        WHERE c.relkind IN ('r', 'v', 'm', 'S', 'p')
            AND NOT pg_is_other_temp_schema(nc.oid)
            AND nc.nspname = ANY(schema_names)
            AND (
                pg_has_role(c.relowner, 'USAGE')
                OR has_table_privilege(c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
                OR has_any_column_privilege(c.oid, 'SELECT, INSERT, UPDATE, REFERENCES')
            )
        ORDER BY c.relname ASC
        LIMIT limit_count
        OFFSET offset_count
    )
    SELECT jsonb_build_object(
        'data', COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', r.id,
                    'sql', r.sql
                )
            ),
            '[]'::jsonb
        )
    ) INTO result
    FROM records r;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Create indexes for your application tables

-- Repositories table
CREATE INDEX IF NOT EXISTS idx_repositories_github_id ON repositories(github_id);
CREATE INDEX IF NOT EXISTS idx_repositories_owner_name ON repositories(owner, name);
CREATE INDEX IF NOT EXISTS idx_repositories_last_analyzed ON repositories(last_analyzed_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_repositories_platform ON repositories(platform);

-- PR Reviews table
CREATE INDEX IF NOT EXISTS idx_pr_reviews_repository_id ON pr_reviews(repository_id);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_number ON pr_reviews(repository_id, number);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_state ON pr_reviews(state);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_created_at ON pr_reviews(created_at DESC);

-- Analysis Queue table
CREATE INDEX IF NOT EXISTS idx_analysis_queue_status ON analysis_queue(status);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_repository_id ON analysis_queue(repository_id);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_pr_review_id ON analysis_queue(pr_review_id);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_priority ON analysis_queue(priority DESC, created_at ASC);

-- Analysis Chunks table (Vector DB)
CREATE INDEX IF NOT EXISTS idx_analysis_chunks_repository_id ON analysis_chunks(repository_id);
CREATE INDEX IF NOT EXISTS idx_analysis_chunks_source_type ON analysis_chunks(source_type);
CREATE INDEX IF NOT EXISTS idx_analysis_chunks_storage_type ON analysis_chunks(storage_type);
CREATE INDEX IF NOT EXISTS idx_analysis_chunks_ttl ON analysis_chunks(ttl) WHERE ttl IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analysis_chunks_quality_score ON analysis_chunks(quality_score DESC) WHERE quality_score IS NOT NULL;

-- For vector similarity search
CREATE INDEX IF NOT EXISTS idx_analysis_chunks_embedding ON analysis_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Educational Patterns table
CREATE INDEX IF NOT EXISTS idx_educational_patterns_pattern_type ON educational_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_educational_patterns_language ON educational_patterns(language);
CREATE INDEX IF NOT EXISTS idx_educational_patterns_framework ON educational_patterns(framework) WHERE framework IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_educational_patterns_difficulty ON educational_patterns(difficulty) WHERE difficulty IS NOT NULL;

-- For vector similarity search
CREATE INDEX IF NOT EXISTS idx_educational_patterns_embedding ON educational_patterns 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 50);

-- Knowledge Items table
CREATE INDEX IF NOT EXISTS idx_knowledge_items_item_type ON knowledge_items(item_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_category ON knowledge_items(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_verification_status ON knowledge_items(verification_status) WHERE verification_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_items_expires_at ON knowledge_items(expires_at) WHERE expires_at IS NOT NULL;

-- For vector similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_items_embedding ON knowledge_items 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 50);

-- 6. Create composite indexes for common queries

-- For finding repositories by user (assuming user_repositories table exists)
CREATE INDEX IF NOT EXISTS idx_user_repositories_composite 
ON user_repositories(user_id, repository_id);

-- For finding latest analyses
CREATE INDEX IF NOT EXISTS idx_repository_analysis_composite 
ON repository_analysis(repository_id, created_at DESC);

-- For calibration queries
CREATE INDEX IF NOT EXISTS idx_calibration_test_results_composite 
ON calibration_test_results(run_id, repository_id);

-- 7. Update table statistics for better query planning
ANALYZE repositories;
ANALYZE pr_reviews;
ANALYZE analysis_queue;
ANALYZE analysis_chunks;
ANALYZE educational_patterns;
ANALYZE knowledge_items;

-- 8. Create a function to refresh materialized views (can be called periodically)
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_timezone_names;
    -- Add more materialized views here as needed
END;
$$ LANGUAGE plpgsql;

-- 9. Create a function to maintain indexes (rebuild if needed)
CREATE OR REPLACE FUNCTION maintain_indexes()
RETURNS void AS $$
BEGIN
    -- Reindex tables with heavy write activity
    REINDEX TABLE CONCURRENTLY analysis_chunks;
    REINDEX TABLE CONCURRENTLY chunk_relationships;
    -- Add more tables as needed
END;
$$ LANGUAGE plpgsql;

-- 10. Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_table_metadata(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_definitions(text[], int, int) TO authenticated;
GRANT SELECT ON mv_timezone_names TO authenticated;
