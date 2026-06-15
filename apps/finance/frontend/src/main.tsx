import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import CustomerPortalView from './features/portal/CustomerPortalView';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// The customer portal is a public, login-free view reached at #/portal?token=…
// Decide once at load so it renders entirely outside the authed app.
const isPortal = window.location.hash.replace(/^#/, '').startsWith('/portal');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isPortal ? <CustomerPortalView /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>,
);
