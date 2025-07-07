import { Router, Request, Response } from 'express';
import { getSupabase } from '@codequal/database/supabase/client';

const router = Router();

// Test endpoint to create/view profile without auth
router.post('/create-test-profile', async (req: Request, res: Response) => {
  try {
    const { userId, email } = req.body;
    
    if (!userId || !email) {
      return res.status(400).json({ error: 'userId and email required' });
    }

    const supabase = getSupabase();
    
    // Check if profile exists
    const { data: existing, error: checkError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (existing && !checkError) {
      return res.json({
        message: 'Profile already exists',
        profile: existing
      });
    }
    
    // Create profile
    const profileData = {
      user_id: userId,
      email: email,
      full_name: email.split('@')[0],
      avatar_url: '',
      bio: '',
      location: '',
      website: '',
      company: '',
      preferred_language: 'en',
      theme: 'light',
      email_notifications: true
    };
    
    const { data: newProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single();
      
    if (createError) {
      console.error('Profile creation error:', createError);
      return res.status(500).json({ 
        error: 'Failed to create profile',
        details: createError 
      });
    }
    
    res.json({
      message: 'Profile created successfully',
      profile: newProfile
    });
  } catch (error) {
    console.error('Test profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get profile without auth (for testing)
router.get('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const { data: profile, error } = await getSupabase()
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;