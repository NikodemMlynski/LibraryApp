import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from 'react-oidc-context'
import { WebStorageStateStore } from 'oidc-client-ts'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient();
// Konfiguracja Keycloaka
const oidcConfig = {
  authority: "http://localhost/auth/realms/library-system", // Adres Twojego Realmu
  client_id: "library-web-client",                           // ID Klienta z Keycloaka
  redirect_uri: window.location.origin + "/signin",              // Zmieniono na /signin, aby React Router nie zgubił parametrów ?code=
  post_logout_redirect_uri: window.location.origin + "/",      // Dodano: Gdzie Keycloak ma wrócić po pomyślnym wylogowaniu na serwerze
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>

    <AuthProvider {...oidcConfig}>
      <App />
    </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)