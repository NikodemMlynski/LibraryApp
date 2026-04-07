import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StripeProvider } from '@stripe/stripe-react-native';
import '../global.css';

const queryClient = new QueryClient();

const InitialLayout = () => {
    const { token, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!token && !inAuthGroup) {
            router.replace('/(auth)');
        } else if (token && inAuthGroup) {
            router.replace('/(tabs)');
        }
    }, [token, isLoading, segments]);

    if (isLoading) {
        return null;
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
        </Stack>
    );
}

export default function RootLayout() {
    const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
    
    return (
        <QueryClientProvider client={queryClient}>
            <StripeProvider publishableKey={publishableKey}>
                <AuthProvider>
                    <InitialLayout />
                </AuthProvider>
            </StripeProvider>
        </QueryClientProvider>
    );
}
