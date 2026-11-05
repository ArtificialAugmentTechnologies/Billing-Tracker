import type { AuthUser, LoginInput } from '@a2/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api';

const ME_KEY = ['auth', 'me'];

async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    return await api<AuthUser>('/auth/me');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function useCurrentUser() {
  return useQuery({ queryKey: ME_KEY, queryFn: fetchCurrentUser, staleTime: 5 * 60 * 1000 });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      api<AuthUser>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (user) => queryClient.setQueryData(ME_KEY, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      // Keep the user query itself: clearing it would disconnect RequireAuth from the update.
      queryClient.setQueryData(ME_KEY, null);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== ME_KEY[0] });
    },
  });
}
