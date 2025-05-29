-- Researcher Performance Validation and Tracking Schema
-- Tracks how well our research agents perform over time

-- Track researcher predictions vs actual performance
CREATE TABLE researcher_performance_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Research context
  researcher_model TEXT NOT NULL, -- e.g., 'deepseek-v3', 'claude-4'
  research_task_type TEXT NOT NULL, -- e.g., 'initial_pr', 'weekly_update', 'on_demand'
  prediction_date TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- What the researcher predicted
  predicted_model TEXT NOT NULL,
  predicted_performance JSONB NOT NULL, -- {speed: 'fast', quality: 'high', cost: 'low'}
  predicted_cost_per_1k_tokens DECIMAL(10,6),
  prediction_confidence DECIMAL(3,2), -- 0.0 to 1.0
  
  -- What actually happened (filled in later)
  actual_model_used TEXT,
  actual_performance JSONB, -- {speed: 8.5, quality: 9.2, cost: 0.15}
  actual_cost_per_1k_tokens DECIMAL(10,6),
  actual_execution_time_ms INTEGER,
  
  -- Validation results
  accuracy_score DECIMAL(3,2), -- How close prediction was to reality
  cost_prediction_accuracy DECIMAL(3,2),
  performance_prediction_accuracy DECIMAL(3,2),
  
  -- Context for analysis
  analysis_parameters JSONB NOT NULL, -- Original parameters that triggered research
  validation_date TIMESTAMP, -- When we validated the prediction
  validation_method TEXT, -- 'cross_check', 'performance_tracking', 'expert_review'
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX idx_researcher_performance_researcher_date 
ON researcher_performance_tracking(researcher_model, prediction_date DESC);

CREATE INDEX idx_researcher_performance_task_type 
ON researcher_performance_tracking(research_task_type, prediction_date DESC);

-- Track cross-validation results (when multiple researchers analyze same task)
CREATE TABLE researcher_cross_validation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Task being validated
  research_task_id TEXT NOT NULL, -- Common ID for same task across researchers
  research_task_type TEXT NOT NULL,
  task_parameters JSONB NOT NULL,
  validation_date TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Researcher recommendations
  primary_researcher TEXT NOT NULL,
  primary_recommendation JSONB NOT NULL,
  
  fallback_researcher TEXT NOT NULL,
  fallback_recommendation JSONB NOT NULL,
  
  validation_researcher TEXT NOT NULL,
  validation_recommendation JSONB NOT NULL,
  
  -- Agreement analysis
  agreement_score DECIMAL(3,2) NOT NULL, -- 0.0 to 1.0
  consensus_reached BOOLEAN NOT NULL,
  winning_recommendation JSONB, -- Final recommendation chosen
  conflict_areas JSONB, -- Where researchers disagreed
  
  -- Outcome
  requires_human_review BOOLEAN DEFAULT false,
  human_review_result JSONB, -- If human reviewed, what they decided
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Track A/B test results for researcher comparison
CREATE TABLE researcher_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Test setup
  test_name TEXT NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  test_duration_days INTEGER NOT NULL,
  
  -- Researchers being tested
  researchers_config JSONB NOT NULL, -- {researcher: 'deepseek-v3', traffic: 0.4}
  
  -- Results
  total_predictions INTEGER NOT NULL,
  researcher_results JSONB NOT NULL, -- {researcher: {accuracy: 0.85, cost: 0.12, speed: 150ms}}
  
  -- Analysis
  winning_researcher TEXT NOT NULL,
  confidence_interval DECIMAL(3,2) NOT NULL,
  statistical_significance BOOLEAN NOT NULL,
  
  -- Metrics
  accuracy_improvement DECIMAL(3,2),
  cost_improvement DECIMAL(3,2),
  speed_improvement DECIMAL(3,2),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Track expert review sessions
CREATE TABLE researcher_expert_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Review context
  review_date TIMESTAMP NOT NULL DEFAULT NOW(),
  review_period_start TIMESTAMP NOT NULL,
  review_period_end TIMESTAMP NOT NULL,
  reviewer_type TEXT NOT NULL, -- 'ai_expert', 'software_architect', 'devops_engineer'
  
  -- What was reviewed
  researcher_model TEXT NOT NULL,
  sample_predictions JSONB NOT NULL, -- Sample of predictions reviewed
  
  -- Expert assessment
  expert_rating DECIMAL(3,2) NOT NULL, -- 1.0 to 10.0
  strengths TEXT[],
  weaknesses TEXT[],
  recommendations TEXT[],
  
  -- Specific metrics
  model_selection_accuracy DECIMAL(3,2),
  cost_optimization_effectiveness DECIMAL(3,2),
  performance_prediction_accuracy DECIMAL(3,2),
  emerging_model_awareness DECIMAL(3,2),
  
  -- Outcome
  expert_recommendation TEXT NOT NULL, -- 'continue', 'recalibrate', 'replace'
  suggested_improvements JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Track recalibration events
CREATE TABLE researcher_recalibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- When and why
  recalibration_date TIMESTAMP NOT NULL DEFAULT NOW(),
  trigger_reason TEXT NOT NULL, -- 'performance_drop', 'expert_review', 'new_models_available'
  performance_metrics JSONB NOT NULL, -- Metrics that triggered recalibration
  
  -- What changed
  old_primary_researcher TEXT NOT NULL,
  new_primary_researcher TEXT NOT NULL,
  configuration_changes JSONB, -- What prompts/parameters changed
  
  -- Results
  immediate_improvement BOOLEAN,
  improvement_metrics JSONB, -- Before/after comparison
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Views for easy monitoring
CREATE VIEW researcher_performance_summary AS
SELECT 
  researcher_model,
  COUNT(*) as total_predictions,
  AVG(accuracy_score) as avg_accuracy,
  AVG(cost_prediction_accuracy) as avg_cost_accuracy,
  AVG(performance_prediction_accuracy) as avg_performance_accuracy,
  COUNT(*) FILTER (WHERE validation_date >= NOW() - INTERVAL '30 days') as recent_predictions,
  AVG(accuracy_score) FILTER (WHERE validation_date >= NOW() - INTERVAL '30 days') as recent_accuracy
FROM researcher_performance_tracking 
WHERE validation_date IS NOT NULL
GROUP BY researcher_model;

CREATE VIEW researcher_cross_validation_summary AS
SELECT 
  research_task_type,
  COUNT(*) as total_validations,
  AVG(agreement_score) as avg_agreement,
  COUNT(*) FILTER (WHERE consensus_reached = true) as consensus_count,
  COUNT(*) FILTER (WHERE requires_human_review = true) as human_review_count
FROM researcher_cross_validation
GROUP BY research_task_type;

-- Functions for automatic validation
CREATE OR REPLACE FUNCTION check_researcher_performance()
RETURNS TABLE(researcher_model TEXT, needs_attention BOOLEAN, reason TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rpt.researcher_model,
    CASE 
      WHEN AVG(rpt.accuracy_score) < 0.75 THEN true
      WHEN COUNT(*) FILTER (WHERE rpt.validation_date >= NOW() - INTERVAL '7 days') = 0 THEN true
      ELSE false
    END as needs_attention,
    CASE 
      WHEN AVG(rpt.accuracy_score) < 0.75 THEN 'Low accuracy: ' || ROUND(AVG(rpt.accuracy_score)::numeric, 2)
      WHEN COUNT(*) FILTER (WHERE rpt.validation_date >= NOW() - INTERVAL '7 days') = 0 THEN 'No recent validations'
      ELSE 'Performance OK'
    END as reason
  FROM researcher_performance_tracking rpt
  WHERE rpt.validation_date >= NOW() - INTERVAL '90 days'
  GROUP BY rpt.researcher_model;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE researcher_performance_tracking IS 'Tracks researcher predictions vs actual performance for validation';
COMMENT ON TABLE researcher_cross_validation IS 'Cross-validation results when multiple researchers analyze same task';
COMMENT ON TABLE researcher_ab_tests IS 'A/B test results comparing different researchers';
COMMENT ON TABLE researcher_expert_reviews IS 'Expert human review of researcher performance';
COMMENT ON TABLE researcher_recalibrations IS 'Record of researcher recalibration events';