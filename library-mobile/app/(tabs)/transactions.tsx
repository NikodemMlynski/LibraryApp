import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';

export default function TransactionsScreen() {
    return (
        <SafeAreaView className="flex-1 bg-gray-50 flex flex-col justify-center items-center">
            <View className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 items-center">
                <Text className="text-3xl font-bold text-gray-800">Transactions</Text>
                <Text className="text-gray-500 mt-2 text-center text-base">Placeholder for Stripe payment history.</Text>
            </View>
        </SafeAreaView>
    );
}
