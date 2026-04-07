import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function WelcomeScreen() {
    const { login, register } = useAuth();

    return (
        <SafeAreaView className="flex-1 bg-white items-center justify-center p-6">
            <View className="items-center mb-12">
                <Text className="text-4xl font-bold text-indigo-700 tracking-tight">LibraryApp</Text>
                <Text className="text-gray-500 mt-2 text-center text-lg">Manage your reading and borrowing seamlessly.</Text>
            </View>

            <View className="w-full space-y-4 gap-y-4">
                <TouchableOpacity 
                    onPress={login}
                    className="w-full bg-indigo-600 rounded-xl py-4 items-center shadow-sm"
                >
                    <Text className="text-white font-semibold text-lg">Login</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={register}
                    className="w-full bg-indigo-100 rounded-xl py-4 items-center"
                >
                    <Text className="text-indigo-700 font-semibold text-lg">Create Account</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
