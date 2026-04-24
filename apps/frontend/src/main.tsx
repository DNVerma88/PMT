import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { store } from './app/store';
import { queryClient } from './app/queryClient';
import { App } from './app/App';

// ── PWA Service Worker registration ──────────────────────────────────────────
// vite-plugin-pwa auto-generates /sw.js. We use the virtual module helper so
// we can hook into the "new content available" lifecycle and show a snackbar.
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      onNeedRefresh() {
        // Show a non-blocking notification — the user can dismiss or refresh
        const event = new CustomEvent('pwa:update-available');
        window.dispatchEvent(event);
      },
      onOfflineReady() {
        const event = new CustomEvent('pwa:offline-ready');
        window.dispatchEvent(event);
      },
    });
  }).catch(() => { /* SW not available in dev/test */ });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <App />
        {import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS === 'true' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
);

