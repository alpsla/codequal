import { createClient } from '@supabase/supabase-js';

// Create Supabase client for auth operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Check if token is expired or about to expire
export function isTokenExpired(token: string | null): boolean {
  if (!token) {
    console.log('[Token Check] No token provided');
    return true;
  }
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('[Token Check] Invalid token format');
      return true;
    }
    
    const payload = JSON.parse(atob(parts[1].replace(/_/g, '/').replace(/-/g, '+')));
    const expiryTime = payload.exp * 1000;
    const now = Date.now();
    
    // Consider token expired if it expires in less than 5 minutes
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    const timeUntilExpiry = expiryTime - now;
    const isExpired = now + bufferTime >= expiryTime;
    
    console.log('[Token Check] Token status:', {
      expiresAt: new Date(expiryTime).toLocaleString(),
      timeUntilExpiry: `${Math.floor(timeUntilExpiry / 1000 / 60)} minutes`,
      isExpired,
      needsRefresh: isExpired
    });
    
    return isExpired;
  } catch (error) {
    console.error('[Token Check] Error parsing token:', error);
    return true;
  }
}

// Refresh the access token using the refresh token
export async function refreshAccessToken(): Promise<TokenInfo | null> {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      console.log('No refresh token available');
      return null;
    }

    console.log('Refreshing access token...');
    
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) {
      console.error('Error refreshing token:', error);
      return null;
    }

    if (data.session) {
      // Store the new tokens
      localStorage.setItem('access_token', data.session.access_token);
      localStorage.setItem('refresh_token', data.session.refresh_token);
      
      console.log('✅ Token refreshed successfully');
      
      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at!
      };
    }

    return null;
  } catch (error) {
    console.error('Error in token refresh:', error);
    return null;
  }
}

// Set up automatic token refresh
export function setupTokenRefresh() {
  console.log('[Token Refresh] Setting up automatic token refresh');
  
  // Check token immediately
  const token = localStorage.getItem('access_token');
  if (token) {
    isTokenExpired(token); // This will log the current status
  }
  
  // Check token every minute
  const checkInterval = setInterval(async () => {
    console.log('[Token Refresh] Running periodic token check...');
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      console.log('[Token Refresh] No token found, skipping check');
      return;
    }
    
    if (isTokenExpired(token)) {
      console.log('[Token Refresh] Token needs refresh, attempting...');
      const newTokenInfo = await refreshAccessToken();
      
      if (!newTokenInfo) {
        console.error('[Token Refresh] Refresh failed, logging out');
        // Refresh failed, clear interval and redirect to login
        clearInterval(checkInterval);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        console.log('[Token Refresh] ✅ Token refreshed successfully');
      }
    } else {
      console.log('[Token Refresh] Token still valid, no refresh needed');
    }
  }, 60 * 1000); // Check every minute

  console.log('[Token Refresh] Automatic refresh configured (checking every 60 seconds)');

  // Return cleanup function
  return () => {
    console.log('[Token Refresh] Cleaning up token refresh interval');
    clearInterval(checkInterval);
  };
}

// Manual token refresh function for immediate use
export async function ensureValidToken(): Promise<string | null> {
  const token = localStorage.getItem('access_token');
  
  if (!token) return null;
  
  if (isTokenExpired(token)) {
    const newTokenInfo = await refreshAccessToken();
    return newTokenInfo?.accessToken || null;
  }
  
  return token;
}