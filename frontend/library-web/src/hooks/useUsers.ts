import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from 'react-oidc-context';

export interface KeycloakUser {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
}

const API_URL = 'http://localhost/auth/admin/realms/library-system/users';
const ROLES_API_URL = 'http://localhost/auth/admin/realms/library-system/roles';

const fetchWithToken = async (url: string, options: RequestInit, token?: string) => {
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.method !== 'GET' && options.method !== 'DELETE') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }
    const error = new Error(errorData?.errorMessage || `HTTP Error: ${response.status}`) as any;
    error.status = response.status;
    error.data = errorData;
    throw error;
  }
  
  // Bezpieczne parsowanie odpowiedzi (nawet jeśli backend zwróci 201 Created lub 204 No Content bez body)
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

export const useUsers = (page: number = 0, size: number = 10, search?: string) => {
  const auth = useAuth();
  const token = auth.user?.access_token;
  
  const first = page * size;
  const max = size;
  
  let url = `${API_URL}?first=${first}&max=${max}`;
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }

  return useQuery<KeycloakUser[], Error>({
    queryKey: ['users', page, size, search],
    queryFn: () => fetchWithToken(url, { method: 'GET' }, token),
    enabled: !!token, 
  });
};

export const useUsersCount = (search?: string) => {
  const auth = useAuth();
  const token = auth.user?.access_token;
  
  let url = `${API_URL}/count`;
  if (search) {
    url += `?search=${encodeURIComponent(search)}`;
  }

  return useQuery<number, Error>({
    queryKey: ['usersCount', search],
    queryFn: () => fetchWithToken(url, { method: 'GET' }, token),
    enabled: !!token, 
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const token = auth.user?.access_token;
  const username = auth.user?.profile.preferred_username || "admin";

  return useMutation({
    mutationFn: async (id: string) => {
      await fetchWithToken(`${API_URL}/${id}`, { method: 'DELETE' }, token);
      
      try {
        await fetchWithToken('http://localhost/api/analytics/admin/logs', {
          method: 'POST',
          body: JSON.stringify({
            action_type: 'LIBRARIAN_DELETED',
            actor_id: username,
            visibility: 'ADMIN',
            metadata: { user_id: id, message: `Administrator ${username} usunął użytkownika.` }
          })
        }, token);
      } catch (e) {
        console.warn("Nie udało się wysłać logu usunięcia wpisu:", e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['usersCount'] });
    },
  });
};

// NOWY HOOK: Tworzy użytkownika i nadaje mu rolę "librarian"
export const useAddLibrarian = () => {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const token = auth.user?.access_token;
  const admin_username = auth.user?.profile.preferred_username || "admin";

  return useMutation({
    mutationFn: async (userData: any) => {
      // 1. Utworzenie użytkownika w Keycloak
      await fetchWithToken(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          enabled: true,
          credentials: [{ type: "password", value: userData.password, temporary: false }]
        })
      }, token);

      // 2. Pobranie ID nowo utworzonego użytkownika (szukamy po exact username)
      const users = await fetchWithToken(`${API_URL}?username=${userData.username}&exact=true`, { method: 'GET' }, token);
      if (!users || users.length === 0) throw new Error("Nie udało się odnaleźć nowo utworzonego użytkownika.");
      const userId = users[0].id;

      // 3. Pobranie detali roli 'librarian' (aby uzyskać jej ID)
      const roleData = await fetchWithToken(`${ROLES_API_URL}/librarian`, { method: 'GET' }, token);

      // 4. Przypisanie roli do użytkownika
      await fetchWithToken(`${API_URL}/${userId}/role-mappings/realm`, {
        method: 'POST',
        body: JSON.stringify([roleData]) // Keycloak oczekuje tablicy ról
      }, token);
      
      try {
        await fetchWithToken('http://localhost/api/analytics/admin/logs', {
          method: 'POST',
          body: JSON.stringify({
            action_type: 'LIBRARIAN_ADDED',
            actor_id: admin_username,
            visibility: 'ADMIN',
            metadata: { new_user: userData.username, message: `Administrator ${admin_username} dodał bibliotekarza ${userData.username}.` }
          })
        }, token);
      } catch (e) {
        console.warn("Nie udało się wysłać logu dodania wpisu:", e);
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['usersCount'] });
    },
  });
};
