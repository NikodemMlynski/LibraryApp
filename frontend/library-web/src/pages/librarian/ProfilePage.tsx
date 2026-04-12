import { useAuth } from 'react-oidc-context';
import { Button } from '../../components/ui/button';
import { ShieldCheck, Key, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { KEYCLOAK_URL } from '@/config/constants';

export default function ProfilePage() {
  const auth = useAuth();
  const userProfile = auth.user?.profile;

  const { data: credentials, isLoading: isChecking2FA } = useQuery({
    queryKey: ['keycloak-credentials', auth.user?.profile.sub],
    queryFn: async () => {
      const token = auth.user?.access_token;
      if (!token) return [];
      
      const res = await fetch(`${KEYCLOAK_URL}/realms/library-system/account/credentials`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch credential data');
      return res.json();
    },
    enabled: !!auth.user?.access_token
  });

  // POPRAWIONA LOGIKA: 
  // Szukamy sekcji 'otp' (lub 'totp') i sprawdzamy, czy użytkownik ma tam przypisane jakiekolwiek urządzenia (metadane).
  const is2FAEnabled = Array.isArray(credentials) && credentials.some((c: any) => 
    (c.type === 'otp' || c.type === 'totp') && 
    Array.isArray(c.userCredentialMetadatas) && 
    c.userCredentialMetadatas.length > 0
  );

  const handleEnable2FA = () => {
    auth.signinRedirect({
      extraQueryParams: { kc_action: 'CONFIGURE_TOTP' }
    });
  };

  const handleManageAccount = () => {
    auth.signinRedirect({
      extraQueryParams: { kc_action: 'UPDATE_PASSWORD' }
    });
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 max-w-2xl mx-auto mt-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Profile</h1>
      
      <div className="space-y-4 mb-8">
        <div>
          <span className="text-gray-500 block text-sm">Username</span>
          <span className="text-lg font-medium">{userProfile?.preferred_username}</span>
        </div>
        <div>
          <span className="text-gray-500 block text-sm">Email</span>
          <span className="text-lg font-medium">{userProfile?.email || 'Brak'}</span>
        </div>
        <div>
          <span className="text-gray-500 block text-sm">First Name</span>
          <span className="text-lg font-medium">{userProfile?.given_name || 'Brak'}</span>
        </div>
        <div>
          <span className="text-gray-500 block text-sm">Nazwisko</span>
          <span className="text-lg font-medium">{userProfile?.family_name || 'Brak'}</span>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Security and Account</h2>
        <p className="text-sm text-gray-600 mb-4">
          Secure your account using two-factor authentication or modify your password in the Keycloak portal.
        </p>

        <div className="flex flex-col sm:flex-row flex-wrap gap-4">
          {isChecking2FA ? (
            <Button variant="outline" disabled className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 animate-pulse text-gray-400" />
              Sprawdzanie statusu...
            </Button>
          ) : is2FAEnabled ? (
            <Button 
              variant="outline" 
              className="flex items-center gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800 cursor-default"
            >
              <CheckCircle className="h-4 w-4" />
              2FA Enabled
            </Button>
          ) : (
            <Button onClick={handleEnable2FA} className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Configure 2FA
            </Button>
          )}

          <Button onClick={handleManageAccount} variant="outline" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Change Password
          </Button>
        </div>
      </div>
    </div>
  );
}