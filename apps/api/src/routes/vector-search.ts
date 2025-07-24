import { Router, Request, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth-middleware';
import { authenticatedVectorService } from '@codequal/core/services/vector-db/authenticated-vector-service';
import { z } from 'zod';

const router = Router();

// Validation schemas
const searchSchema = z.object({
  query: z.string().min(3).max(1000),
  repositoryId: z.number().optional(),
  contentType: z.enum(['code', 'documentation', 'config', 'test']).optional(),
  language: z.string().optional(),
  minImportance: z.number().min(0).max(1).optional(),
  includeOrganization: z.boolean().optional(),
  includePublic: z.boolean().optional(),
  limit: z.number().min(1).max(50).optional()
});

const embedDocumentsSchema = z.object({
  repositoryId: z.number(),
  documents: z.array(z.object({
    filePath: z.string(),
    content: z.string(),
    contentType: z.string(),
    language: z.string().optional(),
    metadata: z.record(z.unknown()).optional()
  })).min(1).max(100)
});

const shareAccessSchema = z.object({
  repositoryId: z.number(),
  granteeUserId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  accessType: z.enum(['read', 'write', 'admin']),
  expiresAt: z.string().datetime().optional()
});

const similarUsersSchema = z.object({
  skillCategory: z.string().optional(),
  minSimilarity: z.coerce.number().min(0).max(1).optional(),
  limit: z.coerce.number().min(1).max(50).optional()
});

/**
 * Search documents with vector similarity
 * POST /vector/search
 */
router.post('/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const validatedData = searchSchema.parse(req.body);

    const results = await authenticatedVectorService.searchDocuments({
      userId: user.id,
      ...validatedData
    });

    return res.json({
      success: true,
      ...results
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    console.error('Vector search error:', error);
    return res.status(500).json({
      error: 'Search failed'
    });
  }
});

/**
 * Embed documents for a repository
 * POST /vector/embed
 */
router.post('/embed', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const validatedData = embedDocumentsSchema.parse(req.body);

    const result = await authenticatedVectorService.embedRepositoryDocuments(
      user.id,
      validatedData.repositoryId,
      validatedData.documents
    );

    return res.json(result);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: error.message
      });
    }

    console.error('Document embedding error:', error);
    return res.status(500).json({
      error: 'Embedding failed'
    });
  }
});

/**
 * Find users with similar skills
 * GET /vector/similar-users
 */
router.get('/similar-users', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const validatedData = similarUsersSchema.parse(req.query);

    const results = await authenticatedVectorService.findSimilarUsers({
      userId: user.id,
      ...validatedData
    });

    return res.json({
      success: true,
      ...results
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    console.error('Similar users search error:', error);
    return res.status(500).json({
      error: 'Search failed'
    });
  }
});

/**
 * Get personalized educational content
 * GET /vector/educational-content
 */
router.get('/educational-content', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { skillCategory, limit } = req.query;

    const results = await authenticatedVectorService.getPersonalizedContent({
      userId: user.id,
      skillCategory: skillCategory as string,
      limit: limit ? parseInt(limit as string) : undefined
    });

    return res.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('Educational content fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch content'
    });
  }
});

/**
 * Share repository access
 * POST /vector/share-access
 */
router.post('/share-access', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const validatedData = shareAccessSchema.parse(req.body);

    if (!validatedData.granteeUserId && !validatedData.organizationId) {
      return res.status(400).json({
        error: 'Either granteeUserId or organizationId must be provided'
      });
    }

    const result = await authenticatedVectorService.shareRepositoryAccess(
      user.id,
      validatedData.repositoryId,
      validatedData.granteeUserId || null,
      validatedData.organizationId || null,
      validatedData.accessType,
      validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined
    );

    return res.json(result);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: error.message
      });
    }

    console.error('Share access error:', error);
    return res.status(500).json({
      error: 'Failed to share access'
    });
  }
});

/**
 * Update user skill embeddings
 * POST /vector/update-skills
 */
router.post('/update-skills', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { skillCategoryId, codeExamples, skillLevel } = req.body;

    if (!skillCategoryId || !Array.isArray(codeExamples) || !skillLevel) {
      return res.status(400).json({
        error: 'Invalid request data'
      });
    }

    const result = await authenticatedVectorService.updateUserSkillEmbeddings(
      user.id,
      skillCategoryId,
      codeExamples,
      skillLevel
    );

    return res.json(result);

  } catch (error) {
    console.error('Skill update error:', error);
    return res.status(500).json({
      error: 'Failed to update skills'
    });
  }
});

/**
 * Get user's accessible repositories
 * GET /vector/repositories
 */
router.get('/repositories', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { includeOrganization = true, includePublic = true } = req.query;

    // Query repositories the user has access to
    const query = `
      SELECT 
        r.*,
        CASE 
          WHEN r.user_id = $1 THEN 'owner'
          WHEN r.is_public THEN 'public'
          WHEN r.organization_id IS NOT NULL THEN 'organization'
          ELSE 'shared'
        END as access_type,
        (
          SELECT COUNT(*) 
          FROM rag_document_embeddings 
          WHERE repository_id = r.id
        ) as document_count
      FROM rag_repositories r
      WHERE 
        r.user_id = $1
        OR ($2 AND r.is_public = true)
        OR ($3 AND r.organization_id IN (
          SELECT organization_id FROM organization_members WHERE user_id = $1
        ))
        OR EXISTS (
          SELECT 1 FROM rag_repository_access 
          WHERE repository_id = r.id AND user_id = $1
        )
      ORDER BY r.updated_at DESC
    `;

    const { data, error } = await authenticatedVectorService['supabase']
      .rpc('execute_query', {
        query_text: query,
        params: [user.id, includePublic === 'true', includeOrganization === 'true']
      });

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      repositories: data || []
    });

  } catch (error) {
    console.error('Get repositories error:', error);
    return res.status(500).json({
      error: 'Failed to fetch repositories'
    });
  }
});

export default router;