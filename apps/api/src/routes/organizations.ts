import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSupabase } from '@codequal/database/supabase/client';
import { AuthenticatedRequest } from '../middleware/auth-middleware';
import { authMiddlewareWorkaround } from '../middleware/auth-middleware-workaround';
import { ensureUserProfile } from '../middleware/ensure-profile';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Debug endpoint (before auth middleware)
router.get('/debug', (req: Request, res: Response) => {
  res.json({ 
    version: 'v2-with-detailed-errors',
    timestamp: new Date().toISOString()
  });
});

// Apply workaround auth middleware to all organization routes
router.use(authMiddlewareWorkaround);
router.use(ensureUserProfile);

// Validation schemas
const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  allowed_email_domains: z.array(z.string()).optional(),
});

const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  allowed_email_domains: z.array(z.string()).optional(),
  github_org_name: z.string().optional(),
  gitlab_group_name: z.string().optional(),
});

// Settings schemas
const scanSettingsSchema = z.object({
  auto_scan_enabled: z.boolean().optional(),
  scan_frequency: z.enum(['hourly', 'daily', 'weekly', 'manual']).optional(),
  scan_schedule: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(), // HH:MM format
  scan_on_push: z.boolean().optional(),
  scan_draft_prs: z.boolean().optional(),
  ignored_paths: z.array(z.string()).optional(),
  custom_rules_enabled: z.boolean().optional(),
});

const notificationSettingsSchema = z.object({
  email_notifications: z.boolean().optional(),
  slack_enabled: z.boolean().optional(),
  slack_webhook_url: z.string().url().nullable().optional(),
  notify_on_critical: z.boolean().optional(),
  notify_on_high: z.boolean().optional(),
  notify_on_medium: z.boolean().optional(),
  notify_on_low: z.boolean().optional(),
  daily_summary: z.boolean().optional(),
  weekly_report: z.boolean().optional(),
});

const integrationSettingsSchema = z.object({
  github_checks_enabled: z.boolean().optional(),
  gitlab_pipeline_enabled: z.boolean().optional(),
  auto_comment_on_pr: z.boolean().optional(),
  block_merge_on_critical: z.boolean().optional(),
  require_approval_on_high: z.boolean().optional(),
});

const displaySettingsSchema = z.object({
  default_theme: z.enum(['light', 'dark', 'system']).optional(),
  show_code_snippets: z.boolean().optional(),
  show_learning_resources: z.boolean().optional(),
  compact_view: z.boolean().optional(),
  default_language: z.string().optional(),
});

const limitsSchema = z.object({
  max_file_size_mb: z.number().min(1).max(50).optional(),
  max_files_per_scan: z.number().min(10).max(5000).optional(),
  retention_days: z.number().min(7).max(365).optional(),
  concurrent_scans: z.number().min(1).max(10).optional(),
});

const updateOrgSettingsSchema = z.object({
  scan_settings: scanSettingsSchema.optional(),
  notification_settings: notificationSettingsSchema.optional(),
  integration_settings: integrationSettingsSchema.optional(),
  display_settings: displaySettingsSchema.optional(),
  limits: limitsSchema.optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
  can_manage_billing: z.boolean().optional(),
  can_manage_members: z.boolean().optional(),
  can_manage_settings: z.boolean().optional(),
});

// Middleware to check organization membership
const checkOrgMembership = async (req: Request, res: Response, next: Function) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { organizationId } = req.params;

    const { data: membership, error } = await getSupabase()
      .from('organization_members')
      .select('role, can_manage_billing, can_manage_members, can_manage_settings')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (error || !membership) {
      console.error('Membership check failed:', {
        organizationId,
        userId: user.id,
        error: error?.message,
        found: !!membership
      });
      return res.status(403).json({ error: 'Not a member of this organization' });
    }

    (req as any).membership = membership;
    next();
  } catch (error) {
    console.error('Error checking organization membership:', error);
    res.status(500).json({ error: 'Failed to verify membership' });
  }
};

// Middleware to check admin/owner permissions
const checkAdminPermission = async (req: Request, res: Response, next: Function) => {
  const membership = (req as any).membership;
  
  if (!['owner', 'admin'].includes(membership.role)) {
    return res.status(403).json({ error: 'Admin permissions required' });
  }
  
  next();
};

// Create new organization
router.post('/', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const orgData = createOrgSchema.parse(req.body);

    // Check if slug is already taken
    const { data: existingOrg } = await getSupabase()
      .from('organizations')
      .select('id')
      .eq('slug', orgData.slug)
      .single();

    if (existingOrg) {
      return res.status(400).json({ error: 'Organization slug already taken' });
    }

    // Create organization
    const { data: newOrg, error: createError } = await getSupabase()
      .from('organizations')
      .insert({
        ...orgData,
        owner_id: user.id,
        id: uuidv4()
      })
      .select()
      .single() as { data: any; error: any };

    if (createError) {
      console.error('Organization creation error:', {
        code: createError.code,
        details: createError.details,
        hint: createError.hint,
        message: createError.message
      });
      return res.status(500).json({ 
        error: 'Failed to create organization',
        details: createError.message 
      });
    }

    // Add owner as member
    const { error: memberError } = await getSupabase()
      .from('organization_members')
      .insert({
        organization_id: newOrg.id,
        user_id: user.id,
        role: 'owner',
        can_manage_billing: true,
        can_manage_members: true,
        can_manage_settings: true
      });

    if (memberError) {
      console.error('Member creation error:', {
        code: memberError.code,
        details: memberError.details,
        hint: memberError.hint,
        message: memberError.message
      });
      
      // Rollback organization creation
      await getSupabase()
        .from('organizations')
        .delete()
        .eq('id', newOrg.id);
      
      return res.status(500).json({ 
        error: 'Failed to create organization', 
        details: 'Member creation failed: ' + memberError.message 
      });
    }

    // Update user's primary organization if they don't have one
    await getSupabase()
      .from('user_profiles')
      .update({ organization_id: newOrg.id })
      .eq('user_id', user.id)
      .is('organization_id', null);

    res.status(201).json({
      message: 'Organization created successfully',
      organization: newOrg || {}
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating organization:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Get user's organizations
router.get('/', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;

    const { data: memberships, error } = await getSupabase()
      .from('organization_members')
      .select(`
        role,
        joined_at,
        organization:organizations (
          id,
          name,
          slug,
          subscription_tier,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Organizations fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch organizations' });
    }

    res.json({
      organizations: memberships?.map(m => Object.assign(
        {},
        m.organization || {},
        {
          role: m.role,
          joined_at: m.joined_at
        }
      )) || []
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Get organization details
router.get('/:organizationId', checkOrgMembership, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    const { data: organization, error } = await getSupabase()
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get member count
    const { count } = await getSupabase()
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    res.json({
      organization: Object.assign(
        {},
        organization || {},
        {
          member_count: count || 0,
          user_role: (req as any).membership.role
        }
      )
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Update organization
router.put('/:organizationId', checkOrgMembership, checkAdminPermission, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const updates = updateOrgSchema.parse(req.body);

    const { data: updatedOrg, error } = await getSupabase()
      .from('organizations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update organization' });
    }

    res.json({
      message: 'Organization updated successfully',
      organization: updatedOrg || {}
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating organization:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Get organization members
router.get('/:organizationId/members', checkOrgMembership, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    const { data: members, error } = await getSupabase()
      .from('organization_members')
      .select(`
        id,
        user_id,
        role,
        joined_at,
        can_manage_billing,
        can_manage_members,
        can_manage_settings
      `)
      .eq('organization_id', organizationId)
      .order('joined_at', { ascending: true });
    
    if (error) {
      console.error('Members fetch error:', {
        organizationId,
        code: error.code,
        message: error.message,
        details: error.details
      });
      return res.status(500).json({ error: 'Failed to fetch members' });
    }
    
    // Fetch user profiles separately
    const userIds = members?.map(m => m.user_id) || [];
    const { data: profiles } = await getSupabase()
      .from('user_profiles')
      .select('user_id, email, full_name, avatar_url')
      .in('user_id', userIds);
    
    // Merge the data
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    const membersWithProfiles = members?.map(member => ({
      ...member,
      user: profileMap.get(member.user_id) || { user_id: member.user_id }
    })) || [];

    res.json({
      members: membersWithProfiles
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Invite member to organization
router.post('/:organizationId/members', checkOrgMembership, checkAdminPermission, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { organizationId } = req.params;
    const { email, role } = inviteMemberSchema.parse(req.body);

    // Check if user exists
    const { data: invitedUser } = await getSupabase()
      .from('user_profiles')
      .select('user_id')
      .eq('email', email)
      .single();

    if (!invitedUser) {
      return res.status(404).json({ error: 'User not found. They must sign up first.' });
    }

    // Check if already a member
    const { data: existingMember } = await getSupabase()
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', (invitedUser as any).user_id)
      .single();

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    // Add member
    const { error } = await getSupabase()
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: (invitedUser as any).user_id,
        role,
        invited_by: user.id,
        can_manage_billing: false,
        can_manage_members: role === 'admin',
        can_manage_settings: role === 'admin'
      } as any);

    if (error) {
      return res.status(500).json({ error: 'Failed to add member' });
    }

    // TODO: Send invitation email

    res.status(201).json({
      message: 'Member invited successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error inviting member:', error);
    res.status(500).json({ error: 'Failed to invite member' });
  }
});

// Update member role
router.put('/:organizationId/members/:userId', checkOrgMembership, checkAdminPermission, async (req: Request, res: Response) => {
  try {
    const { organizationId, userId } = req.params;
    const updates = updateMemberRoleSchema.parse(req.body);

    // Can't change owner role
    const { data: org } = await getSupabase()
      .from('organizations')
      .select('owner_id')
      .eq('id', organizationId)
      .single();

    if (org?.owner_id === userId) {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    const { error } = await getSupabase()
      .from('organization_members')
      .update(updates)
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: 'Failed to update member' });
    }

    res.json({
      message: 'Member updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating member:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// Remove member from organization
router.delete('/:organizationId/members/:userId', checkOrgMembership, checkAdminPermission, async (req: Request, res: Response) => {
  try {
    const { organizationId, userId } = req.params;

    // Can't remove owner
    const { data: org } = await getSupabase()
      .from('organizations')
      .select('owner_id')
      .eq('id', organizationId)
      .single();

    if (org?.owner_id === userId) {
      return res.status(400).json({ error: 'Cannot remove organization owner' });
    }

    const { error } = await getSupabase()
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: 'Failed to remove member' });
    }

    res.json({
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Leave organization
router.post('/:organizationId/leave', checkOrgMembership, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { organizationId } = req.params;

    // Check if user is owner
    const { data: org } = await getSupabase()
      .from('organizations')
      .select('owner_id')
      .eq('id', organizationId)
      .single();

    if (org?.owner_id === user.id) {
      return res.status(400).json({ error: 'Organization owner cannot leave. Transfer ownership first.' });
    }

    const { error } = await getSupabase()
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', user.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to leave organization' });
    }

    res.json({
      message: 'Left organization successfully'
    });
  } catch (error) {
    console.error('Error leaving organization:', error);
    res.status(500).json({ error: 'Failed to leave organization' });
  }
});

// Get organization settings
router.get('/:organizationId/settings', checkOrgMembership, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    const { data: org, error } = await getSupabase()
      .from('organizations')
      .select('settings')
      .eq('id', organizationId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Default settings structure
    const defaultSettings = {
      scan_settings: {
        auto_scan_enabled: true,
        scan_frequency: 'daily',
        scan_schedule: '02:00',
        scan_on_push: true,
        scan_draft_prs: false,
        ignored_paths: [],
        custom_rules_enabled: false
      },
      notification_settings: {
        email_notifications: true,
        slack_enabled: false,
        slack_webhook_url: null,
        notify_on_critical: true,
        notify_on_high: true,
        notify_on_medium: false,
        notify_on_low: false,
        daily_summary: true,
        weekly_report: true
      },
      integration_settings: {
        github_checks_enabled: true,
        gitlab_pipeline_enabled: true,
        auto_comment_on_pr: true,
        block_merge_on_critical: true,
        require_approval_on_high: false
      },
      display_settings: {
        default_theme: 'light',
        show_code_snippets: true,
        show_learning_resources: true,
        compact_view: false,
        default_language: 'en'
      },
      limits: {
        max_file_size_mb: 10,
        max_files_per_scan: 1000,
        retention_days: 90,
        concurrent_scans: 3
      }
    };

    // Merge organization settings with defaults
    const settings = {
      ...defaultSettings,
      ...(org?.settings || {})
    };

    res.json({ settings });
  } catch (error) {
    console.error('Error fetching organization settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update organization settings
router.put('/:organizationId/settings', checkOrgMembership, checkAdminPermission, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const updates = updateOrgSettingsSchema.parse(req.body);

    // Get current settings
    const { data: currentOrg } = await getSupabase()
      .from('organizations')
      .select('settings')
      .eq('id', organizationId)
      .single();

    // Deep merge settings
    const currentSettings = currentOrg?.settings as any || {};
    const updatedSettings = {
      ...currentSettings,
      ...updates,
      // Ensure nested objects are properly merged
      scan_settings: {
        ...(currentSettings.scan_settings || {}),
        ...(updates.scan_settings || {})
      },
      notification_settings: {
        ...(currentSettings.notification_settings || {}),
        ...(updates.notification_settings || {})
      },
      integration_settings: {
        ...(currentSettings.integration_settings || {}),
        ...(updates.integration_settings || {})
      },
      display_settings: {
        ...(currentSettings.display_settings || {}),
        ...(updates.display_settings || {})
      },
      limits: {
        ...(currentSettings.limits || {}),
        ...(updates.limits || {})
      }
    };

    const { error } = await getSupabase()
      .from('organizations')
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId);

    if (error) {
      return res.status(500).json({ error: 'Failed to update settings' });
    }

    res.json({
      message: 'Settings updated successfully',
      settings: updatedSettings
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating organization settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;