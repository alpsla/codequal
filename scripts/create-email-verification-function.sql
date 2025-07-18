-- Function to check if a user's email is verified
-- This function needs to be created by a service role since auth.users is restricted

CREATE OR REPLACE FUNCTION public.check_user_email_verified(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the user exists and has a confirmed email
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = user_id 
    AND email_confirmed_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_user_email_verified(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.check_user_email_verified(UUID) IS 'Check if a user has verified their email address';