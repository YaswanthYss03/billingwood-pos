'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { hasPageAccess, getDefaultPageForRole } from '@/lib/permissions';
import toast from 'react-hot-toast';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { checkAuth, loading } = useAuthStore();

  useEffect(() => {
    checkAuth();
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    // Check page permissions
    if (user && pathname && pathname !== '/login') {
      const hasAccess = hasPageAccess(user.role, pathname);
      
      if (!hasAccess) {
        toast.error('You do not have permission to access this page');
        const defaultPage = getDefaultPageForRole(user.role as any);
        router.push(defaultPage);
      }
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
