import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as WebBrowser from 'expo-web-browser';

const TOKEN_KEY = 'library_app_token';
const KEYCLOAK_URL = process.env.EXPO_PUBLIC_KEYCLOAK_URL || 'http://192.168.3.42:8080/auth/realms/library-system';
const CLIENT_ID = 'library-mobile';

interface AuthContextType {
  token: string | null;
  user: any | null;
  isLoading: boolean;
  login: () => Promise<void>;
  register: () => Promise<void>;
  logout: () => Promise<void>;
  setup2FA: () => Promise<void>;
  resetPassword: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  setup2FA: async () => {},
  resetPassword: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const discovery = AuthSession.useAutoDiscovery(KEYCLOAK_URL);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'library-mobile',
  });

  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (storedToken) {
          const decoded = decodeJWT(storedToken);
          const isExpired = decoded?.exp ? decoded.exp * 1000 < Date.now() : false;
          
          if (!isExpired) {
            setToken(storedToken);
            setUser(decoded);
          } else {
            await AsyncStorage.removeItem(TOKEN_KEY);
            setToken(null);
            setUser(null);
          }
        }
      } catch (e) {
        console.error('Failed to load token', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  const saveToken = async (newToken: string) => {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);
      setUser(decodeJWT(newToken));
    } catch (e) {
      console.error('Failed to save token', e);
    }
  };

  const removeToken = async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    } catch (e) {
      console.error('Failed to remove token', e);
    }
  };

  const handleAuth = async (extraParams = {}) => {
    if (!discovery) return;
    try {
        const request = new AuthSession.AuthRequest({
          clientId: CLIENT_ID,
          scopes: ['openid', 'profile', 'email'],
          redirectUri,
          extraParams,
        });
        
        const result = await request.promptAsync(discovery);
        
        if (result.type === 'success' && result.params?.code) {
          const tokenResult = await AuthSession.exchangeCodeAsync({
            clientId: CLIENT_ID,
            code: result.params.code,
            redirectUri,
            extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
          }, discovery);

          if (tokenResult.accessToken) {
            const decoded = decodeJWT(tokenResult.accessToken);
            const roles = decoded?.realm_access?.roles || [];
            
            if (!roles.includes('reader') || roles.includes('admin') || roles.includes('librarian')) {
               Alert.alert(
                 'Access Denied', 
                 'This mobile application is strictly for regular Readers. Administrators and Librarians must use the web dashboard.'
               );
               
               // Force kill their browser session so they can retry as a different user
               try {
                  const logoutUrl = `${KEYCLOAK_URL}/protocol/openid-connect/logout?client_id=${CLIENT_ID}&post_logout_redirect_uri=${encodeURIComponent(redirectUri)}`;
                  await WebBrowser.openAuthSessionAsync(logoutUrl, redirectUri);
               } catch (e) {}
               
               return; // Skip saving the token and logging them into the React navigation stack
            }

            await saveToken(tokenResult.accessToken);
          }
        }
    } catch (error) {
        console.error('Auth error', error);
    }
  };

  const login = () => handleAuth();
  const register = () => handleAuth({ kc_action: 'REGISTRATION' });
  const setup2FA = () => handleAuth({ kc_action: 'CONFIGURE_TOTP' });
  const resetPassword = () => handleAuth({ kc_action: 'UPDATE_PASSWORD' });

  const logout = async () => {
      // Clear persistent browser cookie from Keycloak
      try {
          const logoutUrl = `${KEYCLOAK_URL}/protocol/openid-connect/logout?client_id=${CLIENT_ID}&post_logout_redirect_uri=${encodeURIComponent(redirectUri)}`;
          await WebBrowser.openAuthSessionAsync(logoutUrl, redirectUri);
      } catch (e) {
          console.error("Logout browser redirect failed", e);
      }
      
      // Clear app state
      await removeToken();
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, register, logout, setup2FA, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};
