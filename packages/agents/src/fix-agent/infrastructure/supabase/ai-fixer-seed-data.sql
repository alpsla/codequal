-- ================================================================================
-- AI Fixer Seed Data - Weight Configurations and Recommendations ONLY
-- Generated: 2025-12-01
-- ================================================================================
--
-- IMPORTANT: This file does NOT contain model configurations!
-- Model configurations (model_configurations table) are populated ONLY by:
--   - AIFixerResearcherService (quarterly research)
--   - run-quarterly-research.ts --ai-fixer-only
--
-- This file seeds ONLY:
--   1. ai_fixer_research - Weight configuration research results
--   2. ai_fixer_recommendations - Use case recommendations
--
-- Before AI Fixer can be used, you MUST run:
--   npx ts-node src/two-branch/research-services/run-quarterly-research.ts --ai-fixer-only
--
-- ================================================================================

BEGIN;

-- =============================================================================
-- AI FIXER WEIGHT CONFIGURATIONS
-- =============================================================================
-- These are the predefined weight configurations that the system can recommend
-- based on different use cases. The actual model selection happens via research.

-- Quality-First Configuration (for production environments)
INSERT INTO ai_fixer_research (
  id,
  config_name,
  weights,
  avg_fix_accuracy,
  avg_compilation_rate,
  avg_test_pass_rate,
  avg_response_time,
  avg_cost,
  research_date,
  next_research_date
) VALUES (
  'weight-quality-first',
  'qualityFirst',
  '{"quality": 0.70, "speed": 0.15, "cost": 0.10, "accuracy": 0.05}',
  0.00,  -- To be populated by research
  0.00,
  0.00,
  0,
  0.00,
  NOW(),
  NOW() + INTERVAL '90 days'
) ON CONFLICT (id) DO UPDATE SET
  weights = EXCLUDED.weights,
  updated_at = NOW();

-- Speed-First Configuration (for real-time IDE integration)
INSERT INTO ai_fixer_research (
  id,
  config_name,
  weights,
  avg_fix_accuracy,
  avg_compilation_rate,
  avg_test_pass_rate,
  avg_response_time,
  avg_cost,
  research_date,
  next_research_date
) VALUES (
  'weight-speed-first',
  'speedFirst',
  '{"quality": 0.25, "speed": 0.45, "cost": 0.20, "accuracy": 0.10}',
  0.00,
  0.00,
  0.00,
  0,
  0.00,
  NOW(),
  NOW() + INTERVAL '90 days'
) ON CONFLICT (id) DO UPDATE SET
  weights = EXCLUDED.weights,
  updated_at = NOW();

-- Cost-First Configuration (for bulk processing)
INSERT INTO ai_fixer_research (
  id,
  config_name,
  weights,
  avg_fix_accuracy,
  avg_compilation_rate,
  avg_test_pass_rate,
  avg_response_time,
  avg_cost,
  research_date,
  next_research_date
) VALUES (
  'weight-cost-first',
  'costFirst',
  '{"quality": 0.30, "speed": 0.20, "cost": 0.40, "accuracy": 0.10}',
  0.00,
  0.00,
  0.00,
  0,
  0.00,
  NOW(),
  NOW() + INTERVAL '90 days'
) ON CONFLICT (id) DO UPDATE SET
  weights = EXCLUDED.weights,
  updated_at = NOW();

-- Accuracy-First Configuration (for critical security fixes)
INSERT INTO ai_fixer_research (
  id,
  config_name,
  weights,
  avg_fix_accuracy,
  avg_compilation_rate,
  avg_test_pass_rate,
  avg_response_time,
  avg_cost,
  research_date,
  next_research_date
) VALUES (
  'weight-accuracy-first',
  'accuracyFirst',
  '{"quality": 0.35, "speed": 0.10, "cost": 0.05, "accuracy": 0.50}',
  0.00,
  0.00,
  0.00,
  0,
  0.00,
  NOW(),
  NOW() + INTERVAL '90 days'
) ON CONFLICT (id) DO UPDATE SET
  weights = EXCLUDED.weights,
  updated_at = NOW();

-- Balanced Configuration (default fallback)
INSERT INTO ai_fixer_research (
  id,
  config_name,
  weights,
  avg_fix_accuracy,
  avg_compilation_rate,
  avg_test_pass_rate,
  avg_response_time,
  avg_cost,
  research_date,
  next_research_date
) VALUES (
  'weight-balanced',
  'balanced',
  '{"quality": 0.40, "speed": 0.25, "cost": 0.20, "accuracy": 0.15}',
  0.00,
  0.00,
  0.00,
  0,
  0.00,
  NOW(),
  NOW() + INTERVAL '90 days'
) ON CONFLICT (id) DO UPDATE SET
  weights = EXCLUDED.weights,
  updated_at = NOW();

-- =============================================================================
-- AI FIXER RECOMMENDATIONS (Singleton)
-- =============================================================================
-- Maps use cases to weight configurations

INSERT INTO ai_fixer_recommendations (
  id,
  recommendations,
  updated_at
) VALUES (
  'current',
  '{
    "production": "qualityFirst",
    "realtime": "speedFirst",
    "bulk": "costFirst",
    "critical": "accuracyFirst",
    "default": "balanced"
  }',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  recommendations = EXCLUDED.recommendations,
  updated_at = NOW();

COMMIT;

-- =============================================================================
-- IMPORTANT: NEXT STEPS
-- =============================================================================
--
-- After running this seed file, you MUST run quarterly research to populate
-- the model_configurations table with AI fixer models:
--
--   cd packages/agents
--   npx ts-node src/two-branch/research-services/run-quarterly-research.ts --ai-fixer-only
--
-- Without this step, the AI Fixer will throw AIFixerConfigurationError because
-- there are no model configurations in the database.
--
-- The research will:
--   1. Query available models from providers
--   2. Benchmark them for code fixing quality
--   3. Insert configurations into model_configurations with role='ai_fixer'
--
-- =============================================================================
