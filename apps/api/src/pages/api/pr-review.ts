import { NextApiRequest, NextApiResponse } from 'next';
import { PRReviewService } from '@codequal/core/services/pr-review-service';
import { DEFAULT_AGENTS } from '@codequal/core/config/agent-registry';

/**
 * API endpoint for PR review
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get request body
    const { prUrl, userId, agentSelection = DEFAULT_AGENTS } = req.body;
    
    // Validate request
    if (!prUrl) {
      return res.status(400).json({ error: 'PR URL is required' });
    }
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Create PR review service
    const prReviewService = new PRReviewService();
    
    // Analyze PR
    const result = await prReviewService.analyzePR(
      prUrl,
      userId,
      agentSelection
    );
    
    // Return result
    return res.status(200).json({
      prReviewId: result.prReviewId,
      insights: result.combinedResult.insights.length,
      suggestions: result.combinedResult.suggestions.length,
      educational: result.combinedResult.educational?.length || 0
    });
  } catch (error: unknown) {
    console.error('Error handling PR review request:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: errorMessage });
  }
}