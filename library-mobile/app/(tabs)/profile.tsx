import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Key, LogOut } from 'lucide-react-native';

const KEYCLOAK_URL = process.env.EXPO_PUBLIC_KEYCLOAK_URL as string;

export default function ProfileScreen() {
    const { token, logout, setup2FA, resetPassword, user } = useAuth();
    
    const [is2FAActive, setIs2FAActive] = useState(false);
    const [isChecking2FA, setIsChecking2FA] = useState(true);

    useEffect(() => {
        const check2FAStatus = async () => {
            if (!token) return;
            try {
                const response = await fetch(`${KEYCLOAK_URL}/account/credentials`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    const credentials = await response.json();
                    
                    // POPRAWIONA LOGIKA: Sprawdzamy czy istnieje urządzenie w metadanych (jak na webie)
                    const hasOTP = Array.isArray(credentials) && credentials.some((cred: any) => 
                        (cred.type === 'otp' || cred.type === 'totp') && 
                        Array.isArray(cred.userCredentialMetadatas) && 
                        cred.userCredentialMetadatas.length > 0
                    );
                    
                    setIs2FAActive(hasOTP);
                } else {
                    console.error('Failed to fetch credentials from Keycloak', response.status);
                }
            } catch (error) {
                console.error('Error checking 2FA status:', error);
            } finally {
                setIsChecking2FA(false);
            }
        };

        check2FAStatus();
    }, [token]);

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView contentContainerClassName="flex-grow items-center p-6 pb-12">
                
                {/* Header Profilu */}
                <View className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full mb-8 pt-8 pb-6 px-6 items-center">
                    {user ? (
                        <View className="w-full items-center">
                            <View className="h-24 w-24 rounded-full bg-indigo-600 justify-center items-center mb-5 shadow-sm">
                                <Text className="text-3xl font-extrabold text-white">
                                    {(user?.name || user?.preferred_username || '?')[0].toUpperCase()}
                                </Text>
                            </View>
                            <Text className="text-2xl font-black text-gray-900 text-center mb-1">
                                {user?.name || 'Reader'}
                            </Text>
                            <Text className="text-gray-500 font-medium text-center">
                                @{user?.preferred_username || 'username'}
                            </Text>
                            <View className="bg-indigo-50 px-4 py-1.5 rounded-full mt-4 border border-indigo-100">
                                <Text className="text-indigo-700 text-sm font-semibold">{user?.email || 'No email provided'}</Text>
                            </View>
                        </View>
                    ) : (
                        <Text className="text-gray-500 mt-2 text-center text-base font-medium">Loading user data...</Text>
                    )}
                </View>

                {/* Sekcja Bezpieczeństwa */}
                <View className="w-full mb-2">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2 mb-3">Security & Authentication</Text>
                </View>

                {/* Kafelki akcji */}
                <View className="w-full flex-col gap-4">
                    
                    {/* Przycisk 2FA - Zablokowany jeśli 2FA jest aktywne */}
                    <TouchableOpacity 
                        className={`w-full bg-white border border-gray-100 rounded-2xl py-4 px-5 flex-row items-center shadow-sm ${
                            is2FAActive && !isChecking2FA ? 'bg-emerald-50/50' : ''
                        }`}
                        onPress={setup2FA}
                        disabled={isChecking2FA || is2FAActive}
                    >
                        <View className={`p-2 rounded-xl mr-3 ${
                            isChecking2FA ? 'bg-gray-100' : is2FAActive ? 'bg-emerald-100' : 'bg-indigo-50'
                        }`}>
                            {isChecking2FA ? (
                                <ActivityIndicator size="small" color="#6b7280" />
                            ) : (
                                <ShieldCheck size={20} color={is2FAActive ? "#059669" : "#4f46e5"} />
                            )}
                        </View>
                        <View className="flex-1">
                            <Text className={`font-bold text-base ${is2FAActive && !isChecking2FA ? 'text-emerald-800' : 'text-gray-800'}`}>
                                Two-Factor Auth
                            </Text>
                            {isChecking2FA ? (
                                <Text className="text-gray-400 text-xs mt-0.5">Checking status...</Text>
                            ) : is2FAActive ? (
                                <Text className="text-emerald-600 text-xs mt-0.5">Configured and active</Text>
                            ) : (
                                <Text className="text-gray-500 text-xs mt-0.5">Setup or manage Google Auth</Text>
                            )}
                        </View>
                    </TouchableOpacity>

                    {/* Przycisk Zmiany Hasła */}
                    <TouchableOpacity 
                        className="w-full bg-white border border-gray-100 rounded-2xl py-4 px-5 flex-row items-center shadow-sm"
                        onPress={resetPassword}
                    >
                        <View className="bg-blue-50 p-2 rounded-xl mr-3">
                            <Key size={20} color="#2563eb" />
                        </View>
                        <View className="flex-1">
                            <Text className="font-bold text-gray-800 text-base">Change Password</Text>
                            <Text className="text-gray-500 text-xs mt-0.5">Update your login credentials</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Sekcja Wylogowania */}
                <View className="w-full mt-8">
                    <TouchableOpacity 
                        className="w-full bg-red-50 border border-red-100 rounded-2xl py-4 flex-row justify-center items-center shadow-sm"
                        onPress={logout}
                    >
                        <LogOut size={20} color="#dc2626" />
                        <Text className="text-red-600 font-bold text-lg ml-2">Log Out</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}