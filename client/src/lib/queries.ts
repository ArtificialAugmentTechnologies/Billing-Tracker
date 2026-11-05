import type {
  ClientDetail,
  ClientPayload,
  ClientRecord,
  ClientSort,
  ClientSummary,
  ClientType,
  MilestonePayload,
  MilestoneRecord,
  ProjectDetail,
  ProjectPayload,
  ProjectStatus,
  ProjectSummary,
} from '@a2/shared';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { api } from './api';

function toQueryString(params: Record<string, string | undefined>) {
  const entries = Object.entries(params).filter((entry): entry is [string, string] =>
    Boolean(entry[1]),
  );
  return entries.length ? `?${new URLSearchParams(entries)}` : '';
}

/** Clients and projects show each other's data, so a change refreshes both. */
function refreshAll(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['clients'] });
  queryClient.invalidateQueries({ queryKey: ['projects'] });
}

const send = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

export interface ClientFilters {
  search?: string;
  type?: ClientType;
  sort?: ClientSort;
}

export function useClients(filters: ClientFilters = {}) {
  return useQuery({
    queryKey: ['clients', 'list', filters],
    queryFn: () => api<ClientSummary[]>(`/clients${toQueryString({ ...filters })}`),
    placeholderData: keepPreviousData,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', 'detail', id],
    queryFn: () => api<ClientDetail>(`/clients/${id}`),
  });
}

export function useSaveClient(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ClientPayload) =>
      id
        ? api<ClientRecord>(`/clients/${id}`, send('PUT', input))
        : api<ClientRecord>('/clients', send('POST', input)),
    onSuccess: () => refreshAll(queryClient),
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/clients/${id}`, send('DELETE')),
    onSuccess: () => refreshAll(queryClient),
  });
}

export interface ProjectFilters {
  search?: string;
  status?: ProjectStatus;
  clientId?: string;
}

export function useProjects(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: ['projects', 'list', filters],
    queryFn: () => api<ProjectSummary[]>(`/projects${toQueryString({ ...filters })}`),
    placeholderData: keepPreviousData,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', 'detail', id],
    queryFn: () => api<ProjectDetail>(`/projects/${id}`),
  });
}

export function useSaveProject(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectPayload) =>
      id
        ? api<{ id: string }>(`/projects/${id}`, send('PUT', input))
        : api<{ id: string }>('/projects', send('POST', input)),
    onSuccess: () => refreshAll(queryClient),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/projects/${id}`, send('DELETE')),
    onSuccess: () => refreshAll(queryClient),
  });
}

export function useSaveMilestone(projectId: string, id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MilestonePayload) =>
      id
        ? api<MilestoneRecord>(`/milestones/${id}`, send('PUT', input))
        : api<MilestoneRecord>(`/projects/${projectId}/milestones`, send('POST', input)),
    onSuccess: () => refreshAll(queryClient),
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/milestones/${id}`, send('DELETE')),
    onSuccess: () => refreshAll(queryClient),
  });
}
