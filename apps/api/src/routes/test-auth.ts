import { Router, Request, Response } from 'express';

const router = Router();

// Test endpoint to debug auth
router.get('/debug', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    res.json({
      success: true,
      hasUser: !!user,
      userId: user?.id || null,
      userEmail: user?.email || null,
      headers: {
        authorization: req.headers.authorization ? 'present' : 'missing'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Debug endpoint error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;