import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { store } from './app/store';
import { STORAGE_KEYS } from './config';
import { loggedOut, tokenRefreshed } from './features/auth/authSlice';
import { ThemeController } from './app/ThemeController';
import { AppToaster } from './components/AppToaster';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkActivityBar } from './components/NetworkActivityBar';
import { OfflineBanner } from './components/OfflineBanner';
import { captureAttribution } from './lib/attribution';
import { installErrorReporting } from './lib/errorReporting';
import { installPrintSupport } from './lib/print';
import { TooltipProvider } from './components/ui/Tooltip';
import { ConsentLayer } from './features/consent/ConsentLayer';
import { ContactLayer } from './features/contact/ContactLayer';
import './index.css';

installErrorReporting();
// Before anything renders: read (and tidy away) campaign tags from the address.
captureAttribution();
installPrintSupport();

// Keep tabs in step: signing in, out, or changing the password in one tab applies to the others.
window.addEventListener('storage', (e) => {
  if (e.key !== STORAGE_KEYS.token) return;
  if (!e.newValue) {
    if (store.getState().auth.token) store.dispatch(loggedOut());
    return;
  }
  try {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.user) ?? 'null');
    if (user && e.newValue !== store.getState().auth.token) store.dispatch(tokenRefreshed({ token: e.newValue, user }));
  } catch {
    /* ignore unreadable storage */
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeController />
        <NetworkActivityBar />
        <TooltipProvider>
          <BrowserRouter>
            <App />
            <ConsentLayer />
            <ContactLayer />
            <OfflineBanner />
          </BrowserRouter>
        </TooltipProvider>
        <AppToaster />
      </Provider>
    </ErrorBoundary>
  </StrictMode>,
);
