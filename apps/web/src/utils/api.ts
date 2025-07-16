import { ensureValidToken, refreshAccessToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  // Ensure we have a valid token
  const token = await ensureValidToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Ensure URL is absolute
  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;

  let response = await fetch(fullUrl, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle 401 unauthorized - try refresh once
  if (response.status === 401 && typeof window !== 'undefined') {
    console.log('Got 401, attempting token refresh...');
    
    const newTokenInfo = await refreshAccessToken();
    
    if (newTokenInfo) {
      // Retry with new token
      headers['Authorization'] = `Bearer ${newTokenInfo.accessToken}`;
      
      response = await fetch(fullUrl, {
        ...options,
        headers,
        credentials: 'include',
      });
    }
    
    // If still 401 after refresh, redirect to login
    if (response.status === 401) {
      console.log('Token refresh failed, redirecting to login');
      
      // Clear stored auth data
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
      // Redirect to login
      window.location.href = '/login';
    }
  }

  return response;
}