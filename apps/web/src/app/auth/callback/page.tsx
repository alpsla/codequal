'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('Auth error:', error);
      router.push('/login?error=' + error);
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
        .then(data => {
          if (data.success) {
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
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Completing authentication...
        </h2>
        <p className="text-gray-600">Please wait while we log you in.</p>
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