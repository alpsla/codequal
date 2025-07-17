import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth-middleware';
import { getSupabase } from '@codequal/database/supabase/client';
import { createLogger } from '@codequal/core/utils';

const router = Router();
const logger = createLogger('UsageStatsAPI');

/**
 * GET /api/usage-stats
 * Get comprehensive usage statistics for the authenticated user
 */
router.get('/usage-stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // Get user's subscription info
    const { data: billingData } = await getSupabase()
      .from('user_billing')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // Get API usage for current month
    const { data: apiUsage } = await getSupabase()
      .from('api_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('month', currentMonth)
      .single();
    
    // Get web scan count
    const { count: webScans } = await getSupabase()
      .from('scans')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', `${currentMonth}-01`);
    
    // Get API key usage
    const { data: apiKeys } = await getSupabase()
      .from('api_keys')
      .select('name, usage_count, usage_limit, created_at')
      .eq('user_id', userId)
      .eq('active', true);
    
    // Get recent analyses
    const { data: recentAnalyses } = await getSupabase()
      .from('scans')
      .select('id, repository_url, pr_number, quality_score, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Calculate limits based on subscription
    const subscriptionTier = billingData?.subscription_tier || 'free';
    const limits = {
      free: { api: 0, webScans: 10 },
      api: { api: 200, webScans: 0 },
      individual: { api: 200, webScans: 50 },
      team: { api: -1, webScans: -1 } // -1 means unlimited
    };
    
    const currentLimits = limits[subscriptionTier as keyof typeof limits] || limits.free;
    
    // Prepare usage summary
    const usageStats = {
      subscription: {
        tier: subscriptionTier,
        status: billingData?.subscription_status || 'inactive',
        currentPeriodEnd: billingData?.current_period_end
      },
      usage: {
        api: {
          used: apiUsage?.usage_count || 0,
          limit: currentLimits.api,
          remaining: currentLimits.api === -1 ? -1 : Math.max(0, currentLimits.api - ((apiUsage?.usage_count as number) || 0)),
          percentage: currentLimits.api === -1 ? 0 : Math.round((((apiUsage?.usage_count as number) || 0) / currentLimits.api) * 100)
        },
        webScans: {
          used: webScans || 0,
          limit: currentLimits.webScans,
          remaining: currentLimits.webScans === -1 ? -1 : Math.max(0, currentLimits.webScans - ((webScans as number) || 0)),
          percentage: currentLimits.webScans === -1 ? 0 : Math.round((((webScans as number) || 0) / currentLimits.webScans) * 100)
        },
        trial: {
          used: billingData?.trial_scans_used || 0,
          limit: 10,
          remaining: Math.max(0, 10 - ((billingData?.trial_scans_used as number) || 0))
        }
      },
      apiKeys: apiKeys || [],
      recentAnalyses: recentAnalyses || [],
      recommendations: [] as Array<{type: string; message: string; action: string;}>
    };
    
    // Add recommendations based on usage
    if (subscriptionTier === 'free' && usageStats.usage.trial.remaining <= 2) {
      usageStats.recommendations.push({
        type: 'upgrade',
        message: 'You have only ' + usageStats.usage.trial.remaining + ' trial scans left. Upgrade to continue analyzing code.',
        action: 'upgrade_to_individual'
      });
    }
    
    if (subscriptionTier === 'individual' && usageStats.usage.api.percentage > 80) {
      usageStats.recommendations.push({
        type: 'warning',
        message: 'You have used ' + usageStats.usage.api.percentage + '% of your API calls this month.',
        action: 'monitor_usage'
      });
    }
    
    if (subscriptionTier === 'individual' && usageStats.usage.webScans.percentage > 90) {
      usageStats.recommendations.push({
        type: 'upgrade',
        message: 'You are approaching your web scan limit. Consider upgrading to Team plan for unlimited scans.',
        action: 'upgrade_to_team'
      });
    }
    
    res.json(usageStats);
    
  } catch (error) {
    logger.error('Error fetching usage stats', { error, userId: req.user?.id });
    res.status(500).json({ 
      error: 'Failed to fetch usage statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/usage-stats/history
 * Get historical usage data for charts
 */
router.get('/usage-stats/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const months = 6; // Last 6 months
    
    // Generate list of last 6 months
    const monthsList = [];
    const now = new Date();
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsList.push(d.toISOString().slice(0, 7));
    }
    
    // Get API usage history
    const { data: apiHistory } = await getSupabase()
      .from('api_usage')
      .select('month, usage_count')
      .eq('user_id', userId)
      .in('month', monthsList)
      .order('month', { ascending: true });
    
    // Get web scan history by month
    const scanHistory = await Promise.all(
      monthsList.map(async (month) => {
        const { count } = await getSupabase()
          .from('scans')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .gte('created_at', `${month}-01`)
          .lt('created_at', `${month}-31`);
        
        return { month, count: count || 0 };
      })
    );
    
    res.json({
      apiUsage: apiHistory || [],
      webScans: scanHistory.sort((a, b) => a.month.localeCompare(b.month))
    });
    
  } catch (error) {
    logger.error('Error fetching usage history', { error, userId: req.user?.id });
    res.status(500).json({ 
      error: 'Failed to fetch usage history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;