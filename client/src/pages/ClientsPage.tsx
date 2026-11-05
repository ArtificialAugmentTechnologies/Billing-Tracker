import {
  CLIENT_TYPE_LABELS,
  CLIENT_TYPES,
  formatINR,
  type ClientSort,
  type ClientType,
} from '@a2/shared';
import { Building2, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/feedback';
import { Select } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PageHeader, Table, tdClass, thClass } from '@/components/ui/page';
import { StatusBadge } from '@/components/ui/status-badge';
import { useClients } from '@/lib/queries';
import { useDebouncedValue } from '@/lib/use-debounced-value';

export function ClientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<ClientType | ''>('');
  const [sort, setSort] = useState<ClientSort>('name');
  const [creating, setCreating] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const clients = useClients({ search: debouncedSearch, type: type || undefined, sort });
  const filtered = Boolean(debouncedSearch || type);

  const newClientButton = (
    <Button onClick={() => setCreating(true)}>
      <Plus className="h-4 w-4" aria-hidden />
      New client
    </Button>
  );

  return (
    <>
      <PageHeader label="Directory" title="Clients" actions={newClientButton} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, alias, contact, email or city"
            aria-label="Search clients"
            className="pl-9"
          />
        </div>
        <Select
          value={type}
          onChange={(event) => setType(event.target.value as ClientType | '')}
          aria-label="Filter by type"
          className="sm:w-40"
        >
          <option value="">All types</option>
          {CLIENT_TYPES.map((option) => (
            <option key={option} value={option}>
              {CLIENT_TYPE_LABELS[option]}
            </option>
          ))}
        </Select>
        <Select
          value={sort}
          onChange={(event) => setSort(event.target.value as ClientSort)}
          aria-label="Sort clients"
          className="sm:w-48"
        >
          <option value="name">Sort: Name</option>
          <option value="recent">Sort: Recently added</option>
          <option value="outstanding">Sort: Outstanding</option>
        </Select>
      </div>

      {clients.isPending ? (
        <ListSkeleton />
      ) : clients.isError ? (
        <ErrorState message="We couldn't load your clients." onRetry={() => clients.refetch()} />
      ) : clients.data.length === 0 ? (
        <Card>
          {filtered ? (
            <EmptyState
              icon={Search}
              title="No matching clients"
              description="Try a different search or filter."
            />
          ) : (
            <EmptyState
              icon={Building2}
              title="No clients yet"
              description="Add your first client to start creating projects and invoices."
              action={newClientButton}
            />
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <th className={thClass}>Client</th>
                <th className={`${thClass} hidden sm:table-cell`}>Type</th>
                <th className={`${thClass} hidden lg:table-cell`}>Contact</th>
                <th className={`${thClass} hidden text-right md:table-cell`}>Projects</th>
                <th className={`${thClass} hidden text-right md:table-cell`}>Billed</th>
                <th className={`${thClass} text-right`}>Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {clients.data.map((client) => (
                <tr key={client.id} className="hover:bg-muted/40">
                  <td className={tdClass}>
                    <Link to={`/clients/${client.id}`} className="font-medium hover:text-orange">
                      {client.name}
                    </Link>
                    {client.alias && (
                      <p className="text-xs text-muted-foreground">{client.alias}</p>
                    )}
                  </td>
                  <td className={`${tdClass} hidden sm:table-cell`}>
                    <StatusBadge>{CLIENT_TYPE_LABELS[client.type]}</StatusBadge>
                  </td>
                  <td className={`${tdClass} hidden lg:table-cell`}>
                    {client.contactPerson ?? '—'}
                    {client.phone && (
                      <p className="text-xs text-muted-foreground">{client.phone}</p>
                    )}
                  </td>
                  <td className={`${tdClass} hidden text-right md:table-cell`}>
                    {client.projectCount}
                  </td>
                  <td className={`${tdClass} hidden whitespace-nowrap text-right md:table-cell`}>
                    {formatINR(client.billed)}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-right font-medium`}>
                    {formatINR(client.outstanding)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <ClientFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(client) => navigate(`/clients/${client.id}`)}
      />
    </>
  );
}
