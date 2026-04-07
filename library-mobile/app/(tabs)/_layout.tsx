import React from 'react';
import { Tabs } from 'expo-router';
import { Book, CheckCircle, Clock, CreditCard, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#4f46e5', // indigo-600
      tabBarInactiveTintColor: '#9ca3af', // gray-400
      headerShown: false,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Browse',
          tabBarIcon: ({ color, size }) => <Book color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="borrow"
        options={{
          title: 'Borrow',
          tabBarIcon: ({ color, size }) => <CheckCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: 'My Loans',
          tabBarIcon: ({ color, size }) => <Clock color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color, size }) => <CreditCard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
