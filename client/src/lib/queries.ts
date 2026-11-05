import type {
  CatalogItemRecord,
  ClientDetail,
  ClientPayload,
  ClientRecord,
  ClientSort,
  ClientSummary,
  ClientType,
  InvoiceBuilderDefaults,
  InvoiceDocument,
  InvoicePayload,
  InvoicePayments,
  InvoiceRecord,
  InvoiceRow,
  PaymentMode,
  PaymentPayload,
  PaymentRow,
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
    enabled: Boolean(id),
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
    enabled: Boolean(id),
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

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices', 'list'],
    queryFn: () => api<InvoiceRow[]>('/invoices'),
  });
}

export function useInvoiceDocument(id: string) {
  return useQuery({
    queryKey: ['invoices', 'document', id],
    queryFn: () => api<InvoiceDocument>(`/invoices/${id}/document`),
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['invoices', 'record', id],
    queryFn: () => api<InvoiceRecord>(`/invoices/${id}`),
    enabled: Boolean(id),
    staleTime: 0,
    gcTime: 0,
  });
}

export function useBuilderDefaults() {
  return useQuery({
    queryKey: ['invoices', 'builder-defaults'],
    queryFn: () => api<InvoiceBuilderDefaults>('/invoices/builder-defaults'),
  });
}

export function useNextInvoiceNo(date: string) {
  return useQuery({
    queryKey: ['invoices', 'next-number', date],
    queryFn: () => api<{ invoiceNo: string }>(`/invoices/next-number?date=${date}`),
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(date),
    placeholderData: keepPreviousData,
  });
}

export function useCatalog() {
  return useQuery({
    queryKey: ['catalog'],
    queryFn: () => api<CatalogItemRecord[]>('/catalog'),
  });
}

/** Invoices feed the client and project totals, so a change refreshes those too. */
function refreshInvoices(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['invoices'] });
  refreshAll(queryClient);
}

export function useSaveInvoice(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InvoicePayload) =>
      id
        ? api<{ id: string }>(`/invoices/${id}`, send('PUT', input))
        : api<{ id: string }>('/invoices', send('POST', input)),
    onSuccess: () => refreshInvoices(queryClient),
  });
}

export function useDuplicateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<{ id: string }>(`/invoices/${id}/duplicate`, send('POST')),
    onSuccess: () => refreshInvoices(queryClient),
  });
}

export function useFinalizeInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ id: string; invoiceNo: string }>(`/invoices/${id}/finalize`, send('POST')),
    onSuccess: () => refreshInvoices(queryClient),
  });
}

export function useReviseInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<{ id: string }>(`/invoices/${id}/revise`, send('POST')),
    onSuccess: () => refreshInvoices(queryClient),
  });
}

export function useInvoicePayments(id: string, enabled = true) {
  return useQuery({
    queryKey: ['invoices', 'payments', id],
    queryFn: () => api<InvoicePayments>(`/invoices/${id}/payments`),
    enabled,
  });
}

export interface PaymentFilters {
  search?: string;
  mode?: PaymentMode;
}

export function usePayments(filters: PaymentFilters = {}) {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: () => api<PaymentRow[]>(`/payments${toQueryString({ ...filters })}`),
    placeholderData: keepPreviousData,
  });
}

function refreshPayments(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['payments'] });
  refreshInvoices(queryClient);
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, input }: { invoiceId: string; input: PaymentPayload }) =>
      api<{ id: string }>(`/invoices/${invoiceId}/payments`, send('POST', input)),
    onSuccess: () => refreshPayments(queryClient),
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/payments/${id}`, send('DELETE')),
    onSuccess: () => refreshPayments(queryClient),
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/invoices/${id}`, send('DELETE')),
    onSuccess: () => refreshInvoices(queryClient),
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
