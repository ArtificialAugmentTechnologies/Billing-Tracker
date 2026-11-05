import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { App } from './App';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { ApiError } from './lib/api';
import { ME_KEY } from './lib/auth';
import { applyStoredTheme } from './lib/theme';
import './styles/globals.css';

applyStoredTheme();

/** A session can end while the app is open, so any 401 sends the user back to sign in. */
function onError(error: Error) {
  if (error instanceof ApiError && error.status === 401) {
    queryClient.setQueryData(ME_KEY, null);
  }
}

const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failures, error) =>
        failures < 1 && !(error instanceof ApiError && error.status < 500),
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
        <Toaster position="top-center" richColors />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
