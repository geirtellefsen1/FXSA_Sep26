import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App.js';
import { TenantProvider } from './tenants.js';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
});

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <App />
      </TenantProvider>
    </QueryClientProvider>
  </StrictMode>,
);
