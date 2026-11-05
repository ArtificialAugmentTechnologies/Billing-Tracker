import {
  newUserSchema,
  resetPasswordSchema,
  ROLES,
  type NewUserInput,
  type Role,
  type UserRecord,
} from '@a2/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog } from '@/components/ui/dialog';
import { Field, Select } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { SectionCard, Table, tdClass, thClass } from '@/components/ui/page';
import { useCurrentUser } from '@/lib/auth';
import {
  useCreateUser,
  useDeleteUser,
  useResetPassword,
  useUpdateUser,
  useUsers,
} from '@/lib/queries';

const ROLE_LABELS: Record<Role, string> = { ADMIN: 'Admin', STAFF: 'Staff' };

const EMPTY: NewUserInput = { name: '', email: '', role: 'STAFF', password: '' };

function NewUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateUser();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewUserInput>({ resolver: zodResolver(newUserSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (open) reset(EMPTY);
  }, [open, reset]);

  const onSubmit = (values: NewUserInput) =>
    create.mutate(values, {
      onSuccess: () => {
        toast.success('User added');
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="New user">
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <Field id="user-name" label="Name" error={errors.name?.message}>
          <Input id="user-name" aria-invalid={Boolean(errors.name)} {...register('name')} />
        </Field>
        <Field id="user-email" label="Email" error={errors.email?.message}>
          <Input
            id="user-email"
            type="email"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </Field>
        <Field id="user-role" label="Role">
          <Select id="user-role" {...register('role')}>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="user-password" label="Temporary password" error={errors.password?.message}>
          <Input
            id="user-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            Add user
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: UserRecord | null; onClose: () => void }) {
  const reset = useResetPassword();
  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<{ password: string }>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '' },
  });

  useEffect(() => {
    if (user) resetForm({ password: '' });
  }, [user, resetForm]);

  const onSubmit = ({ password }: { password: string }) => {
    if (!user) return;
    reset.mutate(
      { id: user.id, password },
      {
        onSuccess: () => {
          toast.success(`Password reset for ${user.name}`);
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Dialog
      open={user !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Reset password"
      description={`${user?.name ?? 'This person'} will be signed out everywhere.`}
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <Field id="reset-password" label="New password" error={errors.password?.message}>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={reset.isPending}>
            Reset password
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function UserSettings() {
  const { data: me } = useCurrentUser();
  const { data: users = [] } = useUsers(true);
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<UserRecord | null>(null);
  const [toDelete, setToDelete] = useState<UserRecord | null>(null);

  const changeRole = (user: UserRecord, role: Role) =>
    updateUser.mutate(
      { id: user.id, name: user.name, role },
      {
        onSuccess: () => toast.success('Role updated'),
        onError: (error) => toast.error(error.message),
      },
    );

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteUser.mutate(toDelete.id, {
      onSuccess: () => toast.success('User deleted'),
      onError: (error) => toast.error(error.message),
      onSettled: () => setToDelete(null),
    });
  };

  return (
    <>
      <SectionCard
        label="Users"
        action={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            New user
          </Button>
        }
      >
        <Table>
          <thead>
            <tr>
              <th className={thClass}>User</th>
              <th className={thClass}>Role</th>
              <th className={thClass}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isMe = user.id === me?.id;
              return (
                <tr key={user.id}>
                  <td className={tdClass}>
                    <p className="font-medium">
                      {user.name}
                      {isMe && <span className="ml-1 text-muted-foreground">(you)</span>}
                    </p>
                    <p className="break-all text-xs text-muted-foreground">{user.email}</p>
                  </td>
                  <td className={tdClass}>
                    <Select
                      value={user.role}
                      aria-label={`Role for ${user.name}`}
                      className="h-8 w-24"
                      onChange={(event) => changeRole(user, event.target.value as Role)}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-right`}>
                    {!isMe && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Reset password for ${user.name}`}
                          onClick={() => setResetting(user)}
                        >
                          <KeyRound className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${user.name}`}
                          onClick={() => setToDelete(user)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </SectionCard>

      <NewUserDialog open={adding} onOpenChange={setAdding} />
      <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this user?"
        description={`${toDelete?.name ?? 'This person'} will lose access immediately. Invoices and history stay.`}
        confirmLabel="Delete user"
        pending={deleteUser.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
