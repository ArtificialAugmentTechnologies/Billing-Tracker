import { useState } from 'react';
import { CatalogSettings } from '@/components/settings/CatalogSettings';
import { CompanySettings } from '@/components/settings/CompanySettings';
import { PasswordSettings } from '@/components/settings/PasswordSettings';
import { UserSettings } from '@/components/settings/UserSettings';
import { Button } from '@/components/ui/button';
import { ErrorState, ListSkeleton } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/page';
import { useCurrentUser } from '@/lib/auth';
import { useSettings } from '@/lib/queries';

const ADMIN_TABS = [
  ['company', 'Company'],
  ['catalogue', 'Catalogue'],
  ['users', 'Users'],
  ['password', 'My password'],
] as const;

type Tab = (typeof ADMIN_TABS)[number][0];

export function SettingsPage() {
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === 'ADMIN';
  const settings = useSettings(isAdmin);
  const [tab, setTab] = useState<Tab>('company');

  // Everything except a person's own password is for admins.
  if (!isAdmin) {
    return (
      <>
        <PageHeader label="Account" title="Settings" />
        <PasswordSettings />
      </>
    );
  }

  return (
    <>
      <PageHeader label="Configuration" title="Settings" />

      <div role="tablist" aria-label="Settings sections" className="mb-4 flex flex-wrap gap-2">
        {ADMIN_TABS.map(([key, label]) => (
          <Button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            variant={tab === key ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === 'company' &&
        (settings.isPending ? (
          <ListSkeleton />
        ) : settings.isError ? (
          <ErrorState message="We couldn't load the settings." onRetry={() => settings.refetch()} />
        ) : (
          <CompanySettings settings={settings.data} />
        ))}
      {tab === 'catalogue' && <CatalogSettings />}
      {tab === 'users' && <UserSettings />}
      {tab === 'password' && <PasswordSettings />}
    </>
  );
}
