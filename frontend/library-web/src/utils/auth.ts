// src/utils/auth.ts
import { User } from "oidc-client-ts";

export const getUserRoles = (user: User | null | undefined): string[] => {
  if (!user?.access_token) return [];
  try {
    // Rozszyfrowanie Payloadu z tokena JWT (środkowa część)
    const base64Url = user.access_token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const decoded = JSON.parse(jsonPayload);
    // Keycloak standardowo trzyma role tutaj:
    return decoded.realm_access?.roles || [];
  } catch (e) {
    console.error("Błąd dekodowania tokenu", e);
    return [];
  }
};