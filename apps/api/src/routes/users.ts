import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSupabase } from '@codequal/database/supabase/client';
import { AuthenticatedRequest } from '../middleware/auth-middleware';
import { authMiddlewareWorkaround } from '../middleware/auth-middleware-workaround';
import { ensureUserProfile } from '../middleware/ensure-profile';
import { v4 as uuidv4 } from 'uuid';

// Type definitions for multer (since package not installed)
interface MulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

interface MulterRequest extends Request {
  file?: MulterFile;
}

// Mock multer for now
const multer = {
  memoryStorage: () => ({}),
  default: function() {
    return {
      single: (fieldName: string) => (req: Request, res: Response, next: Function) => {
        next();
      }
    };
  }
};

const upload = multer.default();

const router = Router();

// Apply workaround auth middleware to all user routes
router.use(authMiddlewareWorkaround);
router.use(ensureUserProfile);


// Validation schemas
const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  company: z.string().max(100).optional(),
});

const updateSettingsSchema = z.object({
  preferred_language: z.enum(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  email_notifications: z.boolean().optional(),
});

// Get current user profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;

    const { data: profile, error } = await getSupabase()
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Profile fetch error:', error);
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get user's organization memberships (optional - may not exist)
    const { data: memberships } = await getSupabase()
      .from('organization_members')
      .select(`
        role,
        joined_at,
        organization:organizations (
          id,
          name,
          slug
        )
      `)
      .eq('user_id', user.id);

    res.json({
      profile: {
        ...profile,
        memberships: memberships || []
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const profileData = updateProfileSchema.parse(req.body);

    const { data: updatedProfile, error } = await getSupabase()
      .from('user_profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    res.json({
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload avatar
router.post('/avatar', upload.single('avatar'), async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const multerReq = req as MulterRequest;

    if (!multerReq.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate unique filename
    const fileExt = multerReq.file.originalname.split('.').pop();
    const fileName = `${user.id}/${uuidv4()}.${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await getSupabase()
      .storage
      .from('avatars')
      .upload(fileName, multerReq.file.buffer, {
        contentType: multerReq.file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      return res.status(500).json({ error: 'Failed to upload avatar' });
    }

    // Get public URL
    const { data: { publicUrl } } = getSupabase()
      .storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Update user profile with new avatar URL
    const { error: updateError } = await getSupabase()
      .from('user_profiles')
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      // Try to delete uploaded file if profile update fails
      await getSupabase().storage.from('avatars').remove([fileName]);
      return res.status(500).json({ error: 'Failed to update avatar' });
    }

    res.json({
      message: 'Avatar uploaded successfully',
      avatar_url: publicUrl
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Update user settings
router.patch('/settings', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const settings = updateSettingsSchema.parse(req.body);

    const { data: updatedProfile, error } = await getSupabase()
      .from('user_profiles')
      .update({
        ...settings,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select('preferred_language, theme, email_notifications')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update settings' });
    }

    res.json({
      message: 'Settings updated successfully',
      settings: updatedProfile
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Delete user account
router.delete('/account', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { confirmation } = req.body;

    // Require explicit confirmation
    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({ 
        error: 'Please confirm account deletion by sending confirmation: "DELETE_MY_ACCOUNT"' 
      });
    }

    // Check if user owns any organizations
    const { data: ownedOrgs } = await getSupabase()
      .from('organizations')
      .select('id, name')
      .eq('owner_id', user.id);

    if (ownedOrgs && ownedOrgs.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete account while owning organizations. Please transfer ownership first.',
        organizations: ownedOrgs
      });
    }

    // Delete user from Supabase Auth (this will cascade delete profile due to foreign key)
    // Delete user from Supabase Auth
    const supabase = getSupabase();
    const { error } = await supabase.rpc('delete_user', { user_id: user.id });

    if (error) {
      return res.status(500).json({ error: 'Failed to delete account' });
    }

    res.json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Get user's accessible repositories
router.get('/repositories', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { provider } = req.query;

    let query = getSupabase()
      .from('user_repositories')
      .select('*')
      .eq('user_id', user.id)
      .order('last_accessed_at', { ascending: false, nullsFirst: false });

    if (provider) {
      query = query.eq('provider', provider);
    }

    const { data: repositories, error } = await query;

    if (error) {
      console.error('Repository fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch repositories' });
    }

    res.json({
      repositories: repositories || []
    });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Sync repositories from provider
router.post('/repositories/sync', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { provider } = req.body;

    if (!['github', 'gitlab'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    // TODO: Implement actual repository sync from GitHub/GitLab APIs
    // For now, return a placeholder response
    res.json({
      message: `Repository sync for ${provider} initiated`,
      status: 'pending'
    });
  } catch (error) {
    console.error('Error syncing repositories:', error);
    res.status(500).json({ error: 'Failed to sync repositories' });
  }
});

export default router;