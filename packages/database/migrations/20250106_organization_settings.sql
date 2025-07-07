-- Add comprehensive organization settings
-- This migration adds settings for scan frequency, notifications, and other preferences

-- Add settings column to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Add default settings
UPDATE organizations 
SET settings = jsonb_build_object(
  'scan_settings', jsonb_build_object(
    'auto_scan_enabled', true,
    'scan_frequency', 'daily',
    'scan_schedule', '02:00',
    'scan_on_push', true,
    'scan_draft_prs', false,
    'ignored_paths', ARRAY[]::text[],
    'custom_rules_enabled', false
  ),
  'notification_settings', jsonb_build_object(
    'email_notifications', true,
    'slack_enabled', false,
    'slack_webhook_url', null,
    'notify_on_critical', true,
    'notify_on_high', true,
    'notify_on_medium', false,
    'notify_on_low', false,
    'daily_summary', true,
    'weekly_report', true
  ),
  'integration_settings', jsonb_build_object(
    'github_checks_enabled', true,
    'gitlab_pipeline_enabled', true,
    'auto_comment_on_pr', true,
    'block_merge_on_critical', true,
    'require_approval_on_high', false
  ),
  'display_settings', jsonb_build_object(
    'default_theme', 'light',
    'show_code_snippets', true,
    'show_learning_resources', true,
    'compact_view', false,
    'default_language', 'en'
  ),
  'limits', jsonb_build_object(
    'max_file_size_mb', 10,
    'max_files_per_scan', 1000,
    'retention_days', 90,
    'concurrent_scans', 3
  )
)
WHERE settings = '{}'::jsonb;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_organizations_settings_scan ON organizations ((settings->'scan_settings'->>'auto_scan_enabled'));
CREATE INDEX IF NOT EXISTS idx_organizations_settings_notifications ON organizations ((settings->'notification_settings'->>'email_notifications'));

-- Add validation function for settings
CREATE OR REPLACE FUNCTION validate_organization_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate scan frequency
  IF NEW.settings->'scan_settings'->>'scan_frequency' IS NOT NULL 
     AND NEW.settings->'scan_settings'->>'scan_frequency' NOT IN ('hourly', 'daily', 'weekly', 'manual') THEN
    RAISE EXCEPTION 'Invalid scan_frequency. Must be: hourly, daily, weekly, or manual';
  END IF;
  
  -- Validate retention days
  IF (NEW.settings->'limits'->>'retention_days')::int IS NOT NULL 
     AND (NEW.settings->'limits'->>'retention_days')::int NOT BETWEEN 7 AND 365 THEN
    RAISE EXCEPTION 'retention_days must be between 7 and 365';
  END IF;
  
  -- Validate max file size
  IF (NEW.settings->'limits'->>'max_file_size_mb')::int IS NOT NULL 
     AND (NEW.settings->'limits'->>'max_file_size_mb')::int NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'max_file_size_mb must be between 1 and 50';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
CREATE TRIGGER validate_org_settings_trigger
  BEFORE INSERT OR UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION validate_organization_settings();

-- Add helper function to get organization settings with defaults
CREATE OR REPLACE FUNCTION get_organization_settings(org_id UUID)
RETURNS JSONB AS $$
DECLARE
  org_settings JSONB;
  default_settings JSONB;
BEGIN
  -- Define default settings
  default_settings := '{
    "scan_settings": {
      "auto_scan_enabled": true,
      "scan_frequency": "daily",
      "scan_schedule": "02:00",
      "scan_on_push": true,
      "scan_draft_prs": false,
      "ignored_paths": [],
      "custom_rules_enabled": false
    },
    "notification_settings": {
      "email_notifications": true,
      "slack_enabled": false,
      "slack_webhook_url": null,
      "notify_on_critical": true,
      "notify_on_high": true,
      "notify_on_medium": false,
      "notify_on_low": false,
      "daily_summary": true,
      "weekly_report": true
    },
    "integration_settings": {
      "github_checks_enabled": true,
      "gitlab_pipeline_enabled": true,
      "auto_comment_on_pr": true,
      "block_merge_on_critical": true,
      "require_approval_on_high": false
    },
    "display_settings": {
      "default_theme": "light",
      "show_code_snippets": true,
      "show_learning_resources": true,
      "compact_view": false,
      "default_language": "en"
    },
    "limits": {
      "max_file_size_mb": 10,
      "max_files_per_scan": 1000,
      "retention_days": 90,
      "concurrent_scans": 3
    }
  }'::jsonb;
  
  -- Get organization settings
  SELECT COALESCE(settings, '{}'::jsonb) INTO org_settings
  FROM organizations
  WHERE id = org_id;
  
  -- Merge with defaults (organization settings override defaults)
  RETURN default_settings || org_settings;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON COLUMN organizations.settings IS 'JSON object containing all organization-specific settings including scan frequency, notifications, integrations, and limits';