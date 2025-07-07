import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '@codequal/database/supabase/client';
import { AuthenticatedRequest } from './auth-middleware';
import { v4 as uuidv4 } from 'uuid';

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

    console.log('Profile check result:', {
      userId: authReq.user.id,
      email: authReq.user.email,
      found: !!existingProfile,
      error: checkError ? { code: checkError.code, message: checkError.message } : null
    });

    // Profile exists, continue
    if (existingProfile && !checkError) {
      return next();
    }

    // Profile doesn't exist, create it
    console.log(`Creating profile for user ${authReq.user.email}`);
    
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
    } else {
      console.log(`Profile created for user ${authReq.user.email}`);
    }

    next();
  } catch (error) {
    console.error('Error in ensureUserProfile middleware:', error);
    // Don't block the request, just log the error
    next();
  }
};