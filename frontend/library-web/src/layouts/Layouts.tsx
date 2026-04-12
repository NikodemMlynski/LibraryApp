// src/layouts/Layouts.tsx
import { Outlet, Navigate, Link, NavLink } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { getUserRoles } from "../utils/auth";
import Bookflow from "../assets/bookflow.png"
// --- LAYOUT PUBLICZNY (Logowanie) ---
export const AuthLayout = () => {
  const auth = useAuth();

  // Zabezpieczenie przed przerwaniem flow logowania
  if (auth.isLoading || auth.activeNavigator) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        Pobieranie danych logowania...
      </div>
    );
  }

  // Sprytny mechanizm: Jeśli zalogowany wejdzie na /signin, od razu rzuć go na jego panel
  if (auth.isAuthenticated) {
    const roles = getUserRoles(auth.user);
    if (roles.includes("admin")) return <Navigate to="/app/admin" replace />;
    if (roles.includes("librarian")) return <Navigate to="/app/librarian" replace />;
    
    // Fallback dla zalogowanego użytkownika bez ról
    return <Navigate to="/app" replace />;
  }

  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-[450px] text-center">
        <div className="flex justify-center mb-4">
          <img src={Bookflow} alt="Logo" className="" />
        </div>
        {/* Tu wpadną dzieci np. widok Signin */}
        <Outlet /> 
      </div>
    </div>
  );
};

// --- LAYOUT CHRONIONY (Panel z Menu) ---
export const RootLayout = () => {
  const auth = useAuth();
  const navLinkStyling = ({ isActive }: { isActive: boolean }) => 
    `px-3 py-2 rounded hover:bg-gray-700 transition ${isActive ? "bg-gray-700 opacity-80" : ""}`;
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 text-xl font-bold border-b border-gray-700">
          Witaj, {auth.user?.profile.preferred_username}
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
           
           {getUserRoles(auth.user).includes('admin') && (
             <div className="flex flex-col gap-1 mb-4">
               <p className="text-xs text-gray-400 uppercase mb-1">Admin Panel</p>
               <NavLink to="/app/admin" end className={navLinkStyling}>Dashboard</NavLink>
               <NavLink to="/app/admin/user-management" className={navLinkStyling}>Users</NavLink>
               <NavLink to="/app/admin/payments" className={navLinkStyling}>Transactions</NavLink>
               <NavLink to="/app/admin/logs" className={navLinkStyling}>System Logs</NavLink>
               <NavLink to="/app/admin/loans" className={navLinkStyling}>Loans</NavLink>
             </div>
           )}

           {getUserRoles(auth.user).includes('librarian') && (
             <div className="flex flex-col gap-1 mb-4">
               <p className="text-xs text-gray-400 uppercase mb-1">Librarian Panel</p>
               {/* Zamieniono Link na NavLink, aby obsłużyć opacity */}
               <NavLink to="/app/librarian" end className={navLinkStyling}>Dashboard</NavLink>
               <NavLink to="/app/librarian/profile" className={navLinkStyling}>Profile</NavLink>
               <NavLink to="/app/librarian/books" className={navLinkStyling}>Books</NavLink>
               <NavLink to="/app/librarian/loans" className={navLinkStyling}>Loans</NavLink>
             </div>
           )}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button 
            onClick={() => void auth.signoutRedirect()} 
            className="w-full bg-red-600 hover:bg-red-700 py-2 rounded text-white font-medium transition"
          >
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};