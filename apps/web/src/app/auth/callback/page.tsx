'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useAuth } from '../../../contexts/auth-context';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setToken } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Handle Supabase magic link authentication
    const handleSupabaseAuth = async () => {
      // Get the redirect URL from search params
      const redirectTo = searchParams.get('redirect') || '/';
      
      // Check if we have access_token in the hash
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        // Parse the hash parameters
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          try {
            // Send tokens to our backend to set cookies
            const response = await fetch('/api/auth/session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                access_token: accessToken,
                refresh_token: refreshToken,
              }),
              credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
              // Store both tokens
              setToken(accessToken);
              localStorage.setItem('refresh_token', refreshToken);
              // Redirect to the intended page
              router.push(redirectTo);
            } else {
              router.push('/login?error=session_failed');
            }
          } catch (err) {
            console.error('Session error:', err);
            router.push('/login?error=session_failed');
          }
        }
      } else {
        // Handle OAuth callback (GitHub, GitLab)
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          console.error('Auth error:', error);
          const errorDescription = searchParams.get('error_description');
          console.error('Error description:', errorDescription);
          
          // Handle specific GitLab OAuth errors
          if (error === 'server_error' && errorDescription) {
            // GitLab OAuth often returns server_error for configuration issues
            console.error('GitLab OAuth configuration error detected');
            router.push('/login?error=gitlab_config&details=' + encodeURIComponent(errorDescription || 'Check Supabase URL configuration'));
          } else {
            router.push('/login?error=' + error);
          }
          return;
        }

        if (code && state) {
          // Exchange code for token
          fetch('/api/auth/callback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, state }),
            credentials: 'include'
          })
            .then(res => res.json())
            .then(async data => {
              if (data.success && data.session) {
                // Store the access token from OAuth
                setToken(data.session.access_token);
                // Wait a bit for state to update
                await new Promise(resolve => setTimeout(resolve, 100));
                // Redirect to intended page or dashboard
                const redirect = data.redirect || '/dashboard';
                router.push(redirect);
              } else {
                router.push('/login?error=auth_failed');
              }
            })
            .catch(err => {
              console.error('Callback error:', err);
              router.push('/login?error=callback_failed');
            });
        }
      }
    };

    handleSupabaseAuth();
  }, [searchParams, router, setToken, mounted]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Completing authentication...
        </h2>
        <p className="text-gray-600">Please wait while we log you in.</p>
        <div className="mt-4">
          <svg className="animate-spin h-8 w-8 mx-auto text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CallbackContent />
    </Suspense>
  );
}