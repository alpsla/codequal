-- Check existing function signatures before dropping
-- This helps identify the exact signatures to drop

SELECT 
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    pg_get_functiondef(p.oid) AS full_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'clean_expired_content',
    'update_updated_at_column',
    'search_similar_chunks',
    'rag_search_documents',
    'rag_search_educational_content',
    'rag_cleanup_expired_embeddings',
    'rag_maintain_vector_limits',
    'update_user_last_login',
    'add_user_to_organization',
    'grant_repository_access',
    'cleanup_expired_sessions'
)
ORDER BY p.proname, p.oid;
