'use client';

import Navigation from './navigation';
import ProtectedRoute from './protected-route';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Navigation />
      <main>{children}</main>
    </ProtectedRoute>
  );
}