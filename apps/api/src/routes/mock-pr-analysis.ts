import { Router, Request, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth-middleware';
import { getSupabase } from '@codequal/database/supabase/client';
import { normalizeRepositoryUrl } from '../utils/repository-utils';
import Stripe from 'stripe';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Mock PR analysis endpoint that returns results similar to the screenshot
router.post('/mock-pr-analysis', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { repositoryUrl, prNumber } = req.body;

    if (!repositoryUrl || !prNumber) {
      return res.status(400).json({ error: 'Repository URL and PR number are required' });
    }
    
    // Normalize the repository URL for consistent comparison
    const normalizedUrl = normalizeRepositoryUrl(repositoryUrl);

    // Check payment method and billing (same as simple-scan)
    const { data: paymentMethods } = await getSupabase()
      .from('payment_methods')
      .select('stripe_payment_method_id')
      .eq('user_id', user.id)
      .limit(1);
    
    const hasPaymentMethod = paymentMethods && paymentMethods.length > 0;

    const { data: billing } = await getSupabase()
      .from('user_billing')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const trialScansUsed = (billing?.trial_scans_used as number) || 0;
    const trialScansLimit = (billing?.trial_scans_limit as number) || 10;
    const canUseTrial = trialScansUsed < trialScansLimit;

    if (!hasPaymentMethod && !canUseTrial) {
      return res.status(403).json({
        error: 'Trial limit reached',
        code: 'TRIAL_LIMIT_REACHED',
        details: {
          scans_used: trialScansUsed,
          scans_limit: trialScansLimit
        }
      });
    }

    // Check trial repository restriction (only for users without payment)
    if (!hasPaymentMethod) {
      const { data: trialRepo, error: trialRepoError } = await getSupabase()
        .from('user_trial_repository')
        .select('repository_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (trialRepo && trialRepo.repository_url) {
        // User already has a trial repository set
        // Normalize the stored URL for comparison
        const normalizedTrialUrl = normalizeRepositoryUrl(trialRepo.repository_url as string);
        
        if (normalizedTrialUrl !== normalizedUrl) {
          return res.status(403).json({
            error: 'Trial limited to one repository',
            code: 'TRIAL_REPOSITORY_LIMIT',
            details: {
              allowed_repository: trialRepo.repository_url,
              requested_repository: repositoryUrl
            }
          });
        }
      } else {
        // First scan - set this as the trial repository
        const { error: insertError } = await getSupabase()
          .from('user_trial_repository')
          .insert({
            user_id: user.id,
            repository_url: normalizedUrl
          });
        
        if (insertError) {
          console.error('Error setting trial repository:', insertError);
          // Continue anyway - don't block the scan
        } else {
          console.log(`Set trial repository for user ${user.id}: ${normalizedUrl}`);
        }
      }
    }

    // Generate analysis ID
    const analysisId = `abc-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 3)}`;
    
    // Handle billing
    if (hasPaymentMethod && billing?.stripe_customer_id) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: 50, // $0.50
          currency: 'usd',
          customer: billing.stripe_customer_id as string,
          payment_method: paymentMethods[0].stripe_payment_method_id as string,
          confirm: true,
          off_session: true,
          description: `PR analysis: ${repositoryUrl} #${prNumber}`,
          metadata: {
            user_id: user.id,
            repository_url: repositoryUrl,
            pr_number: prNumber.toString(),
            analysis_id: analysisId
          }
        });
        
        console.log(`Charged $0.50 for PR analysis: ${paymentIntent.id}`);
      } catch (error) {
        console.error('Payment failed:', error);
      }
    } else {
      await getSupabase()
        .from('user_billing')
        .update({ 
          trial_scans_used: trialScansUsed + 1
        })
        .eq('user_id', user.id);
    }

    // Return mock PR analysis result similar to the screenshot
    res.json({
      analysisId,
      status: 'complete',
      reportUrl: `http://localhost:3000/pr-analysis/${analysisId}`,
      repository: {
        url: repositoryUrl,
        name: repositoryUrl.split('/').slice(-2).join('/'),
        primaryLanguage: 'TypeScript'
      },
      pr: {
        number: prNumber,
        title: 'awesome-project',
        filesChanged: 12,
        additions: 345,
        deletions: 123,
        branch: 'feature/awesome-feature'
      },
      decision: {
        status: 'BLOCKED',
        reason: 'This PR cannot be merged due to critical security issues.',
        confidence: 25
      },
      blockingIssues: [
        {
          severity: 'CRITICAL',
          type: 'SQL Injection Vulnerability',
          description: 'User input is directly concatenated into SQL query without sanitization.',
          file: 'src/api/users.ts',
          line: 42
        },
        {
          severity: 'HIGH',
          type: 'Exposed API keys in configuration',
          description: 'API keys found in configuration file should be moved to environment variables.',
          file: 'config/settings.js',
          line: 15
        }
      ],
      positiveFindings: [
        {
          icon: '✅',
          text: 'Good test coverage (85%)'
        },
        {
          icon: '✅',
          text: 'Follows established coding patterns'
        },
        {
          icon: '✅',
          text: 'Proper error handling implemented'
        }
      ],
      metrics: {
        codeQuality: 75,
        security: 25,
        performance: 80,
        testCoverage: 85
      },
      summary: 'This PR introduces critical security vulnerabilities that must be addressed before merging. While the code quality and test coverage are good, the SQL injection vulnerability poses a significant risk.',
      recommendations: [
        'Use parameterized queries or prepared statements to prevent SQL injection',
        'Move API keys to environment variables and add them to .gitignore',
        'Add input validation and sanitization for all user inputs',
        'Consider adding security-focused unit tests'
      ]
    });

  } catch (error) {
    console.error('Mock PR analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;