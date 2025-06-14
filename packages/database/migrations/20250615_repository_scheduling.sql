-- Migration: Create repository scheduling tables
-- Date: 2025-06-15
-- Description: Tables for managing repository analysis schedules

-- Create enum for schedule frequency
CREATE TYPE schedule_frequency AS ENUM (
  'every-6-hours',
  'daily',
  'weekly',
  'monthly',
  'on-demand'
);

-- Create enum for priority levels
CREATE TYPE schedule_priority AS ENUM (
  'critical',
  'high',
  'medium',
  'low',
  'minimal'
);

-- Create repository_schedules table
CREATE TABLE IF NOT EXISTS repository_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_url TEXT NOT NULL UNIQUE,
  cron_expression TEXT,
  frequency schedule_frequency NOT NULL,
  enabled_tools TEXT[] NOT NULL DEFAULT '{}',
  notification_channels TEXT[] DEFAULT '{}',
  priority schedule_priority NOT NULL DEFAULT 'medium',
  reason TEXT,
  can_be_disabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT valid_cron_when_active CHECK (
    (is_active = false) OR 
    (is_active = true AND cron_expression IS NOT NULL AND cron_expression != '')
  )
);

-- Create indexes for better query performance
CREATE INDEX idx_repository_schedules_active ON repository_schedules(is_active) WHERE is_active = true;
CREATE INDEX idx_repository_schedules_next_run ON repository_schedules(next_run_at) WHERE is_active = true;
CREATE INDEX idx_repository_schedules_repository_url ON repository_schedules(repository_url);

-- Create schedule_runs table for tracking execution history
CREATE TABLE IF NOT EXISTS schedule_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES repository_schedules(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'error')),
  findings_count INTEGER,
  critical_findings INTEGER,
  execution_time_ms INTEGER,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for schedule_runs
CREATE INDEX idx_schedule_runs_schedule_id ON schedule_runs(schedule_id);
CREATE INDEX idx_schedule_runs_status ON schedule_runs(status);
CREATE INDEX idx_schedule_runs_started_at ON schedule_runs(started_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_repository_schedules_updated_at 
  BEFORE UPDATE ON repository_schedules 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE repository_schedules IS 'Stores scheduled analysis configurations for repositories';
COMMENT ON COLUMN repository_schedules.repository_url IS 'The full URL of the repository';
COMMENT ON COLUMN repository_schedules.cron_expression IS 'Standard cron expression for scheduling (UTC)';
COMMENT ON COLUMN repository_schedules.frequency IS 'Human-readable frequency of the schedule';
COMMENT ON COLUMN repository_schedules.enabled_tools IS 'Array of tool names to run during scheduled analysis';
COMMENT ON COLUMN repository_schedules.notification_channels IS 'Array of notification channels (email, in-app, etc.)';
COMMENT ON COLUMN repository_schedules.priority IS 'Priority level of the schedule';
COMMENT ON COLUMN repository_schedules.reason IS 'Explanation of why this schedule was chosen';
COMMENT ON COLUMN repository_schedules.can_be_disabled IS 'Whether users can disable this schedule (false for critical issues)';
COMMENT ON COLUMN repository_schedules.is_active IS 'Whether the schedule is currently active';
COMMENT ON COLUMN repository_schedules.last_run_at IS 'Timestamp of the last successful run';
COMMENT ON COLUMN repository_schedules.next_run_at IS 'Calculated timestamp of the next scheduled run';

COMMENT ON TABLE schedule_runs IS 'History of scheduled analysis executions';
COMMENT ON COLUMN schedule_runs.schedule_id IS 'Reference to the repository schedule';
COMMENT ON COLUMN schedule_runs.status IS 'Status of the execution: running, success, failed, or error';
COMMENT ON COLUMN schedule_runs.findings_count IS 'Total number of findings from the analysis';
COMMENT ON COLUMN schedule_runs.critical_findings IS 'Number of critical findings from the analysis';
COMMENT ON COLUMN schedule_runs.execution_time_ms IS 'Time taken to complete the analysis in milliseconds';
COMMENT ON COLUMN schedule_runs.error IS 'Error message if the execution failed';
