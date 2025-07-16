import { Router, Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getConfig } from '@codequal/core/config/index';
import rateLimit from 'express-rate-limit';

const router = Router();

// CORS middleware for auth routes
router.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
  } else if (origin) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

// Rate limiting for auth endpoints
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // In production, decode the JWT to get user ID
      return `user_${token.substring(0, 10)}`;
    }
    return req.ip || 'unknown';
  }
});

// Apply rate limiting to sensitive endpoints
router.use('/signin', authRateLimiter);
router.use('/signup', authRateLimiter);
router.use('/oauth/:provider', authRateLimiter);

// Lazy initialization of config and Supabase client
let config: ReturnType<typeof getConfig>;
let supabase: SupabaseClient;

function initializeAuth() {
  if (!config) {
    config = getConfig();
    supabase = createClient(
      config.supabase.url,
      config.supabase.anonKey
    );
  }
}

// Validation schemas
const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().optional(),
});

const magicLinkSchema = z.object({
  email: z.string().email(),
  redirectTo: z.string().url().optional(),
});

const oauthCallbackSchema = z.object({
  code: z.string(),
  state: z.string().optional(),
});

// Sign up with email/password
router.post('/signup', async (req, res) => {
  try {
    initializeAuth();
    const { email, password, fullName } = signUpSchema.parse(req.body);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      message: 'User created successfully. Please check your email to verify your account.',
      user: data.user 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign in with email/password
router.post('/signin', async (req, res) => {
  try {
    initializeAuth();
    const { email, password } = signInSchema.parse(req.body);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({ 
      message: 'Sign in successful',
      session: data.session,
      user: data.user 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Magic link sign in
router.post('/magic-link', async (req, res) => {
  try {
    initializeAuth();
    const { email, redirectTo } = magicLinkSchema.parse(req.body);
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo || `${config.app.url}/auth/callback`,
      },
    });
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ 
      message: 'Magic link sent! Check your email to sign in.',
      email 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});


// GET OAuth endpoint for direct browser redirects
router.get('/:provider', async (req, res) => {
  try {
    initializeAuth();
    const { provider } = req.params;
    const redirect = req.query.redirect as string || '/';
    
    if (!['github', 'gitlab'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid OAuth provider. Supported: github, gitlab' });
    }

    // Check if provider is enabled
    if ((provider === 'github' && !config.features.githubAuth) ||
        (provider === 'gitlab' && !config.features.gitlabAuth)) {
      return res.status(400).json({ error: 'Provider is not enabled' });
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as 'github' | 'gitlab',
      options: {
        redirectTo: `${config.app.url}/auth/callback`,
        queryParams: {
          redirect_to: redirect
        },
        scopes: provider === 'github' 
          ? 'read:user user:email'
          : 'read_user',
      },
    });

    if (error || !data.url) {
      return res.status(500).json({ error: 'Failed to initiate OAuth flow' });
    }

    // Redirect the user to the OAuth provider
    res.redirect(data.url);
  } catch (error: any) {
    console.error('OAuth error:', error);
    if (error.message && error.message.includes('ECONNREFUSED')) {
      return res.status(503).json({ error: 'Authentication service unavailable' });
    }
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
});

// OAuth sign in
router.post('/oauth/:provider', async (req, res) => {
  try {
    initializeAuth();
    const { provider } = req.params;
    const { redirectTo } = req.body;
    
    if (!['github', 'gitlab'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid OAuth provider. Supported: github, gitlab' });
    }

    // Check if provider is enabled
    if ((provider === 'github' && !config.features.githubAuth) ||
        (provider === 'gitlab' && !config.features.gitlabAuth)) {
      return res.status(400).json({ error: 'Provider is not enabled' });
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as 'github' | 'gitlab',
      options: {
        redirectTo: `${config.app.url}/auth/callback`,
        queryParams: redirectTo ? {
          redirect_to: redirectTo
        } : undefined,
        scopes: provider === 'github' 
          ? 'read:user user:email'
          : 'read_user',
      },
    });

    if (error) {
      return res.status(500).json({ error: 'Failed to initiate OAuth flow' });
    }

    res.json({ 
      url: data.url,
      provider: provider 
    });
  } catch (error: any) {
    console.error('OAuth error:', error);
    if (error.message && error.message.includes('ECONNREFUSED')) {
      return res.status(503).json({ error: 'Authentication service unavailable' });
    }
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
});

// OAuth callback handler (POST)
router.post('/callback', async (req, res) => {
  try {
    initializeAuth();
    
    const { code, state } = oauthCallbackSchema.parse(req.body);
    
    console.log('OAuth callback received:', { code: code.substring(0, 10) + '...', state });
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('OAuth exchange error:', error);
      // Use safe stringify to handle potential circular references in error objects
      const safeErrorString = (() => {
        const seen = new WeakSet();
        try {
          return JSON.stringify(error, (key, value) => {
            if (typeof value === 'object' && value !== null) {
              if (seen.has(value)) {
                return '[Circular Reference]';
              }
              seen.add(value);
            }
            return value;
          }, 2);
        } catch (err) {
          return `[Unable to stringify error: ${err instanceof Error ? err.message : 'Unknown error'}]`;
        }
      })();
      console.error('Error details:', safeErrorString);
      return res.status(401).json({ 
        error: 'Authentication failed', 
        details: error.message,
        errorCode: error.code || 'unknown',
        provider: 'gitlab' // Assume GitLab for now based on the error
      });
    }

    // Return session data
    res.json({ 
      success: true,
      session: data.session,
      user: data.user,
      redirect: state || '/dashboard'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid callback parameters' });
    }
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// OAuth callback handler (GET - for direct browser redirects)
router.get('/callback', async (req, res) => {
  try {
    initializeAuth();
    
    // Check if code is present
    if (!req.query.code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }
    
    const { code, state } = oauthCallbackSchema.parse(req.query);
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Profile syncing is handled by database triggers

    // Get the original redirectTo from query params
    const redirectTo = req.query.redirect_to as string || `${config.app.url}/dashboard`;
    
    // Redirect to app with token in URL
    const redirectUrl = new URL(redirectTo);
    redirectUrl.searchParams.append('token', data.session.access_token);
    
    res.redirect(redirectUrl.toString());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid callback parameters' });
    }
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Create session from magic link tokens
router.post('/session', async (req, res) => {
  try {
    initializeAuth();
    const { access_token, refresh_token } = req.body;
    
    if (!access_token || !refresh_token) {
      return res.status(400).json({ error: 'Missing tokens' });
    }
    
    // Verify the tokens with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(access_token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid tokens' });
    }
    
    // Set cookies for the session
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
      domain: isProduction ? '.codequal.dev' : undefined,
    };
    
    res.cookie('sb-access-token', access_token, cookieOptions);
    res.cookie('sb-refresh-token', refresh_token, cookieOptions);
    
    res.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata
      }
    });
  } catch (error) {
    console.error('Error in POST /session endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get session status
router.get('/session', async (req, res) => {
  try {
    initializeAuth();
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <token>' });
    }

    const token = authHeader.substring(7);
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return res.status(401).json({ 
          authenticated: false,
          error: 'Invalid or expired session' 
        });
      }

      res.json({ 
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          app_metadata: user.app_metadata,
          user_metadata: user.user_metadata
        }
      });
    } catch (error) {
      // Handle JWT malformed errors
      return res.status(401).json({ 
        error: 'Invalid token format' 
      });
    }
  } catch (error) {
    console.error('Error in /session endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign out
router.post('/signout', async (req, res) => {
  try {
    initializeAuth();
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(500).json({ error: 'Failed to sign out' });
    }

    res.json({ 
      success: true,
      message: 'Signed out successfully' 
    });
  } catch (error) {
    console.error('Error in /signout endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    initializeAuth();
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile with additional data
    const { data: profile } = await supabase
      .from('user_profiles')
      .select(`
        *,
        organizations!primary_organization_id (
          id,
          name,
          slug
        )
      `)
      .eq('user_id', user.id)
      .single();

    res.json({ 
      user: {
        ...user,
        profile
      }
    });
  } catch (error) {
    console.error('Error in /me endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    initializeAuth();
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({ 
      session: data.session,
      user: data.user 
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Link OAuth provider to existing account
router.post('/link/:provider', async (req, res) => {
  try {
    initializeAuth();
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.substring(7);
    const { provider } = req.params;
    
    if (!['github', 'gitlab'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Generate OAuth URL for linking
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as 'github' | 'gitlab',
      options: {
        redirectTo: `${config.app.url}/auth/link-callback`,
        scopes: provider === 'github' 
          ? 'read:user user:email'
          : 'read_user api',
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ url: data.url });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available auth providers
router.get('/providers', (req, res) => {
  initializeAuth();
  const providers = [];
  
  if (config.features.emailAuth) {
    providers.push({
      name: 'email',
      displayName: 'Email',
      enabled: true,
    });
  }
  
  if (config.features.githubAuth) {
    providers.push({
      name: 'github',
      displayName: 'GitHub',
      enabled: true,
    });
  }
  
  if (config.features.gitlabAuth) {
    providers.push({
      name: 'gitlab',
      displayName: 'GitLab',
      enabled: true,
    });
  }
  
  res.json({ providers });
});

export default router;