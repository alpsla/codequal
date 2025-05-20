-- Function to reset repository calibration status
CREATE OR REPLACE FUNCTION reset_repository_calibration_status()
RETURNS void AS $$
BEGIN
    -- Reset any calibration-related fields in the repositories table
    -- This assumes you have calibration-related fields in the repositories table
    -- Modify this as needed based on your actual schema
    
    ALTER TABLE repositories 
    DROP COLUMN IF EXISTS calibrated,
    DROP COLUMN IF EXISTS last_calibration_date,
    DROP COLUMN IF EXISTS calibration_model;
    
    -- Add the columns back with default values
    ALTER TABLE repositories
    ADD COLUMN IF NOT EXISTS calibrated BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_calibration_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS calibration_model JSONB;
    
    -- Update any existing records
    UPDATE repositories SET
        calibrated = FALSE,
        last_calibration_date = NULL,
        calibration_model = NULL;
END;
$$ LANGUAGE plpgsql;