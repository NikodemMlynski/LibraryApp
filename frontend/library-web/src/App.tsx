// src/App.tsx
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { AuthLayout, RootLayout } from './layouts/Layouts';
import { ProtectedRoute } from './components/ProtectedRoute';
import { getUserRoles } from './utils/auth';
import DashboardPage from './pages/librarian/DashboardPage';
import ProfilePage from './pages/librarian/ProfilePage';
import BooksPage from './pages/librarian/BooksPage';
import LoansPage from './pages/librarian/LoansPage';

// Prosty komponent wywołujący logowanie
const SignInPage = () => {
  const auth = useAuth();
  
  return (
    <div className="w-full">
      {auth.error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm break-words">
          Błąd logowania: {auth.error.message}
        </div>
      )}
      <button 
        onClick={() => void auth.signinRedirect()} 
        className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700 transition"
      >
        Zaloguj się przez Keycloak
      </button>
    </div>
  );
};

const AppRedirector = () => {
  const auth = useAuth();
  const roles = getUserRoles(auth.user);
  if (roles.includes("admin")) return <Navigate to="/app/admin" replace />;
  if (roles.includes("librarian")) return <Navigate to="/app/librarian" replace />;
  return <div className="p-8">Oczekiwanie na przydział ról od Administratora. Uruchom ponownie logowanie po zmianach.</div>;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <AuthLayout />,
    children: [
      { index: true, element: <Navigate to="/signin" replace /> },
      { path: 'signin', element: <SignInPage /> },
      { path: 'signup', element: <div>Signup (waiting for admin)</div> },
    ]
  },
  {
    path: "/app",
    // 1. Zabezpieczamy WEJŚCIE do /app (wymaga ZALOGOWANIA)
    element: <ProtectedRoute />, 
    children: [
      {
        element: <RootLayout />,
        children: [
          { index: true, element: <Navigate to="/app/redirect" replace /> },
          {
            path: 'redirect',
            element: <AppRedirector />
          },
          {
            path: 'admin',
            // 2. Zabezpieczamy ścieżkę /app/admin (tylko ADMIN)
            element: <ProtectedRoute allowedRoles={['admin']} />,
            children: [
              { index: true, element: <div>dashboard (admin)</div> },
              { path: 'profile', element: <div>profile (admin)</div> },
              { path: 'user-management', element: <div>user management (admin)</div> },
              { path: 'settings', element: <div>settings (admin)</div> },
              { path: 'logs', element: <div>system logs (admin)</div> }
            ]
          }, 
          {
            path: 'librarian',
            // 3. Zabezpieczamy ścieżkę /app/librarian (tylko LIBRARIAN)
            element: <ProtectedRoute allowedRoles={['librarian']} />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'profile', element: <ProfilePage/> },
              { path: 'books', element: <BooksPage/> },
              { path: 'loans', element: <LoansPage/> }
            ]
          }
        ]
      }
    ]
  },
  {
    // Obsługa nieznanych ścieżek
    path: "*",
    element: <Navigate to="/" replace />
  }
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;