import { changePasswordSchema, type ChangePasswordInput } from '@a2/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useChangePassword } from '@/lib/queries';

export function PasswordSettings() {
  const change = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  const onSubmit = (values: ChangePasswordInput) =>
    change.mutate(values, {
      onSuccess: () => {
        toast.success('Password changed');
        reset();
      },
      onError: (error) => toast.error(error.message),
    });

  return (
    <Card className="max-w-md p-5">
      <h2 className="section-label mb-4">Change my password</h2>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field
          id="current-password"
          label="Current password"
          error={errors.currentPassword?.message}
        >
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.currentPassword)}
            {...register('currentPassword')}
          />
        </Field>
        <Field id="new-password" label="New password" error={errors.newPassword?.message}>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.newPassword)}
            {...register('newPassword')}
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Any other devices signed in to your account will be signed out.
        </p>
        <Button type="submit" disabled={change.isPending}>
          Change password
        </Button>
      </form>
    </Card>
  );
}
