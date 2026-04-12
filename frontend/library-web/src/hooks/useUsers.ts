// Upewnij się, że importujesz też API_URL (lub ENDPOINTS, jeśli tak to nazwałeś)
import { KEYCLOAK_URL, API_URL } from '@/config/constants';
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
  
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

export const useUsers = (page: number = 0, size: number = 10, search?: string) => {
  const auth = useAuth();
  const token = auth.user?.access_token;
  
  const first = page * size;
  const max = size;
  
  // POPRAWKA: Usunięto podwójne /auth
  let url = `${KEYCLOAK_URL}/admin/realms/library-system/users?first=${first}&max=${max}`;
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
  
  // POPRAWKA: Usunięto podwójne /auth
  let url = `${KEYCLOAK_URL}/admin/realms/library-system/users/count`;
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
      // POPRAWKA: Usunięto podwójne /auth
      await fetchWithToken(`${KEYCLOAK_URL}/admin/realms/library-system/users/${id}`, { method: 'DELETE' }, token);
      
      try {
        // POPRAWKA: Zastąpienie localhost na zmienną API_URL
        await fetchWithToken(`${API_URL}/analytics/admin/logs`, {
          method: 'POST',
          body: JSON.stringify({
            action_type: 'LIBRARIAN_DELETED',
            actor_id: username,
            visibility: 'ADMIN',
            metadata: { user_id: id, message: `Administrator ${username} deleted user.` }
          })
        }, token);
      } catch (e) {
        console.warn("Failed to send log of deleting entry:", e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['usersCount'] });
    },
  });
};

export const useAddLibrarian = () => {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const token = auth.user?.access_token;
  const admin_username = auth.user?.profile.preferred_username || "admin";

  return useMutation({
    mutationFn: async (userData: any) => {
      // POPRAWKA: Usunięto podwójne /auth we wszystkich poniższych wywołaniach
      await fetchWithToken(`${KEYCLOAK_URL}/admin/realms/library-system/users`, {
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

      const users = await fetchWithToken(`${KEYCLOAK_URL}/admin/realms/library-system/users?username=${userData.username}&exact=true`, { method: 'GET' }, token);
      if (!users || users.length === 0) throw new Error("Nie udało się odnaleźć nowo utworzonego użytkownika.");
      const userId = users[0].id;

      const roleData = await fetchWithToken(`${KEYCLOAK_URL}/admin/realms/library-system/roles/librarian`, { method: 'GET' }, token);

      await fetchWithToken(`${KEYCLOAK_URL}/admin/realms/library-system/users/${userId}/role-mappings/realm`, {
        method: 'POST',
        body: JSON.stringify([roleData]) 
      }, token);
      
      try {
        // POPRAWKA: Zastąpienie localhost na zmienną API_URL
        await fetchWithToken(`${API_URL}/analytics/admin/logs`, {
          method: 'POST',
          body: JSON.stringify({
            action_type: 'LIBRARIAN_ADDED',
            actor_id: admin_username,
            visibility: 'ADMIN',
            metadata: { new_user: userData.username, message: `Administrator ${admin_username} added librarian ${userData.username}.` }
          })
        }, token);
      } catch (e) {
        console.warn("Failed to send log of adding entry:", e);
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['usersCount'] });
    },
  });
};