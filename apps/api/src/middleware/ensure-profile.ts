import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '@codequal/database/supabase/client';
import { AuthenticatedRequest } from './auth-middleware';

/**
 * Middleware to ensure user profile exists after authentication
 * This handles cases where the database trigger might fail
 */
export const ensureUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    
    // Skip if no authenticated user
    if (!authReq.user) {
      return next();
    }

    const supabase = getSupabase();
    
    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', authReq.user.id)
      .single();


    // Profile exists, continue
    if (existingProfile && !checkError) {
      return next();
    }

    // Profile doesn't exist, create it
    
    // Create basic profile data from what we have in the auth request
    const profileData = {
      user_id: authReq.user.id,
      email: authReq.user.email,
      full_name: authReq.user.email.split('@')[0], // Use email prefix as default name
      avatar_url: '',
      bio: '',
      location: '',
      website: '',
      company: '',
      preferred_language: 'en',
      theme: 'light',
      email_notifications: true
    };

    // Insert profile
    const { error: createError } = await supabase
      .from('user_profiles')
      .insert(profileData);

    if (createError) {
      console.error('Failed to create user profile:', {
        error: createError,
        code: createError.code,
        message: createError.message,
        details: createError.details,
        hint: createError.hint,
        profileData
      });
      // Continue anyway - the user is authenticated, just missing profile
    }

    next();
  } catch (error) {
    console.error('Error in ensureUserProfile middleware:', error);
    // Don't block the request, just log the error
    next();
  }
};