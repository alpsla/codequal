-- Add missing cron_expression column to repository_schedules

ALTER TABLE public.repository_schedules 
ADD COLUMN IF NOT EXISTS cron_expression VARCHAR(100);

-- Update existing records with default cron expressions based on frequency
UPDATE public.repository_schedules 
SET cron_expression = 
  CASE frequency
    WHEN 'daily' THEN '0 9 * * *'      -- Daily at 9 AM
    WHEN 'weekly' THEN '0 9 * * 1'     -- Weekly on Monday at 9 AM
    WHEN 'monthly' THEN '0 9 1 * *'    -- Monthly on 1st at 9 AM
    ELSE NULL
  END
WHERE cron_expression IS NULL;