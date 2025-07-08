import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '@codequal/database/supabase/client';
import { AuthenticatedRequest } from './auth-middleware';

interface TrialCheckRequest extends AuthenticatedRequest {
  body: {
    repository_url?: string;
    repositoryUrl?: string;
  };
}

export async function enforceTrialLimits(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { user } = req as AuthenticatedRequest;
    const trialsReq = req as TrialCheckRequest;
    const repositoryUrl = trialsReq.body.repository_url || trialsReq.body.repositoryUrl;

    if (!repositoryUrl) {
      return res.status(400).json({ 
        error: 'Repository URL is required',
        code: 'REPOSITORY_URL_REQUIRED'
      });
    }

    // Check if user can scan this repository
    const { data: canScan, error: checkError } = await getSupabase()
      .rpc('can_user_scan_repository', {
        p_user_id: user.id,
        p_repository_url: repositoryUrl
      });

    if (checkError) {
      console.error('Error checking scan permissions:', checkError);
      return res.status(500).json({ 
        error: 'Failed to check scan permissions',
        code: 'SCAN_CHECK_FAILED'
      });
    }

    if (!canScan) {
      // Get user's trial repository to provide helpful error
      const { data: trialRepo } = await getSupabase()
        .from('user_trial_repository')
        .select('repository_url')
        .eq('user_id', user.id)
        .single();

      const { data: billing } = await getSupabase()
        .from('user_billing')
        .select('trial_scans_used, trial_scans_limit')
        .eq('user_id', user.id)
        .single();

      if (trialRepo && trialRepo.repository_url !== repositoryUrl) {
        return res.status(403).json({
          error: 'Trial limited to one repository',
          code: 'TRIAL_REPOSITORY_LIMIT',
          details: {
            allowed_repository: trialRepo.repository_url,
            requested_repository: repositoryUrl
          }
        });
      }

      if (billing && (billing as any).trial_scans_used >= (billing as any).trial_scans_limit) {
        return res.status(403).json({
          error: 'Trial scan limit reached',
          code: 'TRIAL_LIMIT_REACHED',
          details: {
            scans_used: (billing as any).trial_scans_used,
            scans_limit: (billing as any).trial_scans_limit,
            upgrade_required: true
          }
        });
      }
    }

    // If this is their first scan and no trial repo set, set it now
    const { data: existingTrialRepo } = await getSupabase()
      .from('user_trial_repository')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!existingTrialRepo) {
      await getSupabase()
        .from('user_trial_repository')
        .insert({
          user_id: user.id,
          repository_url: repositoryUrl
        });
    }

    // Continue to next middleware
    next();
  } catch (error) {
    console.error('Trial enforcement error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'TRIAL_CHECK_ERROR'
    });
  }
}

// Middleware to increment scan count after successful scan
export async function incrementScanCount(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // This will be called after the scan is complete
  // We'll hook it into the response
  const originalSend = res.send;
  
  res.send = function(data: any): Response {
    if (res.statusCode === 200) {
      const { user } = req as AuthenticatedRequest;
      const trialsReq = req as TrialCheckRequest;
      const repositoryUrl = trialsReq.body.repository_url || trialsReq.body.repositoryUrl;

      // Increment scan count asynchronously
      (async () => {
        try {
          // Get current scan count
          const { data: currentBilling } = await getSupabase()
            .from('user_billing')
            .select('trial_scans_used')
            .eq('user_id', user.id)
            .single();

          const currentCount = (currentBilling as any)?.trial_scans_used || 0;

          // Update scan count
          await getSupabase()
            .from('user_billing')
            .update({ 
              trial_scans_used: currentCount + 1
            })
            .eq('user_id', user.id);

          // Log the scan
          await getSupabase()
            .from('trial_usage')
            .insert({
              user_id: user.id,
              repository_url: repositoryUrl,
              scan_type: req.path.includes('pull-request') ? 'pull_request' : 'repository'
            });
        } catch (err) {
          console.error('Error updating scan count:', err);
        }
      })();
    }
    
    return originalSend.call(this, data);
  };

  next();
}