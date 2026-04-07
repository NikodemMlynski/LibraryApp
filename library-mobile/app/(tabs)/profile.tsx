import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
    const { logout, setup2FA, resetPassword, user } = useAuth();

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView contentContainerClassName="flex-grow justify-center items-center p-6">
                <View className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 w-full mb-8 items-center">
                    <Text className="text-3xl font-bold text-gray-800">Profile</Text>
                    
                    {user ? (
                        <View className="mt-6 w-full items-center">
                            <View className="h-20 w-20 rounded-full bg-indigo-100 justify-center items-center mb-4">
                                <Text className="text-2xl font-bold text-indigo-700">
                                    {(user?.name || user?.preferred_username || '?')[0].toUpperCase()}
                                </Text>
                            </View>
                            <Text className="text-xl font-bold text-gray-800 text-center">
                                {user?.name || 'Reader'}
                            </Text>
                            <Text className="text-gray-500 mt-1 text-center font-medium">
                                @{user?.preferred_username || 'username'}
                            </Text>
                            <View className="bg-gray-100 px-3 py-1 rounded-full mt-3">
                                <Text className="text-gray-600 text-sm">{user?.email || 'No email provided'}</Text>
                            </View>
                        </View>
                    ) : (
                        <Text className="text-gray-500 mt-2 text-center text-base">Loading user data...</Text>
                    )}
                </View>

                <View className="w-full space-y-4 gap-y-4">

                    <TouchableOpacity 
                        className="w-full bg-indigo-50 border border-indigo-100 rounded-xl py-4 items-center shadow-sm"
                        onPress={setup2FA}
                    >
                        <Text className="text-indigo-700 font-semibold text-lg">Configure 2FA (Google Auth)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        className="w-full bg-orange-50 border border-orange-100 rounded-xl py-4 items-center shadow-sm"
                        onPress={resetPassword}
                    >
                        <Text className="text-orange-700 font-semibold text-lg">Reset/Change Password</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        className="w-full bg-red-50 border border-red-100 rounded-xl py-4 flex-row justify-center items-center shadow-sm mt-4"
                        onPress={logout}
                    >
                        <Text className="text-red-600 font-bold text-lg">Logout</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
