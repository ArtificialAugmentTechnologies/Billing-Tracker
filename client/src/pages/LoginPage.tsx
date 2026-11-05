import { loginSchema, type LoginInput } from '@a2/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCurrentUser, useLogin } from '@/lib/auth';

export function LoginPage() {
  const location = useLocation();
  const { data: user } = useCurrentUser();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-navy p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo variant="reversed" className="text-2xl" />
        </div>

        <Card className="p-6 sm:p-8">
          <p className="section-label">Billing Tracker</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Sign in</h1>

          <form
            noValidate
            onSubmit={handleSubmit((values) => login.mutate(values))}
            className="mt-6 space-y-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-orange">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                {...register('password')}
              />
              {errors.password && <p className="text-xs text-orange">{errors.password.message}</p>}
            </div>

            {login.isError && (
              <p role="alert" className="text-sm text-orange">
                {login.error.message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
