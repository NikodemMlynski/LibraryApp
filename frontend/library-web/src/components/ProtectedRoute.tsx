// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { getUserRoles } from "../utils/auth";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const auth = useAuth();

  if (auth.isLoading) {
    return <div className="flex h-screen items-center justify-center">Sprawdzanie uprawnień...</div>;
  }

  // Jeśli w ogóle nie jest zalogowany - wyrzuć na stronę logowania
  if (!auth.isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  // Jeśli podaliśmy role, sprawdzamy czy użytkownik ma chociaż jedną z nich
  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = getUserRoles(auth.user);
    const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return (
        <div className="p-10 text-center text-red-500">
          <h1 className="text-3xl font-bold">Brak dostępu (403)</h1>
          <p>Nie posiadasz uprawnień do przeglądania tej strony.</p>
        </div>
      );
    }
  }

  // Jeśli wszystko jest OK, wyrenderuj dzieci (czyli środek danego layoutu)
  return <Outlet />;
};