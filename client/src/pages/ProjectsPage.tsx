import { PROJECT_STATUS_LABELS, PROJECT_STATUSES, type ProjectStatus } from '@a2/shared';
import { FolderKanban, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { ProjectTable } from '@/components/projects/ProjectTable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/feedback';
import { Select } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page';
import { useProjects } from '@/lib/queries';
import { useDebouncedValue } from '@/lib/use-debounced-value';

export function ProjectsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [creating, setCreating] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const projects = useProjects({ search: debouncedSearch, status: status || undefined });
  const filtered = Boolean(debouncedSearch || status);

  const newProjectButton = (
    <Button onClick={() => setCreating(true)}>
      <Plus className="h-4 w-4" aria-hidden />
      New project
    </Button>
  );

  return (
    <>
      <PageHeader label="Work" title="Projects" actions={newProjectButton} />

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
            placeholder="Search by project, reference or client"
            aria-label="Search projects"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value as ProjectStatus | '')}
          aria-label="Filter by status"
          className="sm:w-44"
        >
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((option) => (
            <option key={option} value={option}>
              {PROJECT_STATUS_LABELS[option]}
            </option>
          ))}
        </Select>
      </div>

      {projects.isPending ? (
        <ListSkeleton />
      ) : projects.isError ? (
        <ErrorState message="We couldn't load your projects." onRetry={() => projects.refetch()} />
      ) : projects.data.length === 0 ? (
        <Card>
          {filtered ? (
            <EmptyState
              icon={Search}
              title="No matching projects"
              description="Try a different search or filter."
            />
          ) : (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Add a project to track its contract value and milestones."
              action={newProjectButton}
            />
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ProjectTable projects={projects.data} />
        </Card>
      )}

      <ProjectFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(id) => navigate(`/projects/${id}`)}
      />
    </>
  );
}
