"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRepositoryAccess = exports.authMiddleware = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const authMiddleware = async (req, res, next) => {
    try {
        // Skip auth for health check
        if (req.path === '/health') {
            return next();
        }
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Authorization token required' });
            return;
        }
        const token = authHeader.substring(7);
        // Verify token with Supabase
        const { data: session, error } = await supabase.auth.getSession();
        if (error || !session.session) {
            // Try to get user from token directly
            const { data: userData, error: userError } = await supabase.auth.getUser(token);
            if (userError || !userData.user) {
                res.status(401).json({ error: 'Invalid or expired token' });
                return;
            }
            // Validate email is present
            if (!userData.user.email) {
                res.status(401).json({ error: 'Invalid or expired token' });
                return;
            }
            // Create authenticated user object
            const authenticatedUser = {
                id: userData.user.id,
                email: userData.user.email,
                organizationId: userData.user.user_metadata?.organization_id,
                permissions: userData.user.user_metadata?.permissions || [],
                role: userData.user.user_metadata?.role || 'user',
                status: 'active',
                session: {
                    token,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
                }
            };
            req.user = authenticatedUser;
            return next();
        }
        // Validate email is present
        if (!session.session.user.email) {
            res.status(401).json({ error: 'Invalid or expired token' });
            return;
        }
        // Create authenticated user from session
        const authenticatedUser = {
            id: session.session.user.id,
            email: session.session.user.email,
            organizationId: session.session.user.user_metadata?.organization_id,
            permissions: session.session.user.user_metadata?.permissions || [],
            role: session.session.user.user_metadata?.role || 'user',
            status: 'active',
            session: {
                token: session.session.access_token,
                expiresAt: new Date(session.session.expires_at * 1000)
            }
        };
        req.user = authenticatedUser;
        next();
    }
    catch (error) {
        console.error('Authentication middleware error:', error);
        res.status(500).json({ error: 'Authentication service error' });
    }
};
exports.authMiddleware = authMiddleware;
const checkRepositoryAccess = async (user, repositoryUrl) => {
    try {
        // Query user's accessible repositories
        const { data: repositories, error } = await supabase
            .from('user_repositories')
            .select('repository_url')
            .eq('user_id', user.id)
            .eq('repository_url', repositoryUrl);
        if (error) {
            console.error('Repository access check error:', error);
            return false;
        }
        return repositories && repositories.length > 0;
    }
    catch (error) {
        console.error('Repository access check error:', error);
        return false;
    }
};
exports.checkRepositoryAccess = checkRepositoryAccess;
//# sourceMappingURL=auth-middleware.js.map