import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/lib/auth';

export function RequireAuth() {
  const location = useLocation();
  const { data: user, isPending, isError, refetch } = useCurrentUser();

  if (isPending) {
    return <div className="h-dvh bg-background" aria-busy="true" />;
  }

  if (isError) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background p-4 text-center">
        <p>We couldn&apos;t reach the server.</p>
        <Button onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
