import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useMyTransactions, PaymentTransaction } from '../../src/hooks/useTransactions';
import { format, parseISO } from 'date-fns';
import { CreditCard, ArrowDownLeft } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL as string;

// Inteligentny komponent dociągający brakujący tytuł książki dla transakcji
const AsyncTransactionBookTitle = ({ loanId, defaultTitle }: { loanId: number, defaultTitle: string }) => {
    const { token } = useAuth();
    const [title, setTitle] = useState(defaultTitle || `Loan #${loanId}`);

    useEffect(() => {
        const fetchRealTitle = async () => {
            if (!defaultTitle || defaultTitle.includes('Loan #')) {
                try {
                    // Krok 1: Pobierz szczegóły wypożyczenia, aby zdobyć book_id
                    const loanRes = await fetch(`${API_URL}/lending/loans/${loanId}/`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (loanRes.ok) {
                        const loanData = await loanRes.json();
                        const bookId = loanData.book_id || loanData.bookId;

                        if (bookId) {
                            // Krok 2: Pobierz tytuł z katalogu na podstawie book_id
                            const bookRes = await fetch(`${API_URL}/catalog/books/${bookId}`, {
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Accept': 'application/json'
                                }
                            });
                            
                            if (bookRes.ok) {
                                const bookData = await bookRes.json();
                                if (bookData && bookData.title) {
                                    setTitle(bookData.title);
                                    return;
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.log('Silently failed to fetch specific book title for transaction', e);
                }
            } else {
                setTitle(defaultTitle);
            }
        };

        fetchRealTitle();
    }, [loanId, defaultTitle, token]);

    return (
        <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
            {title}
        </Text>
    );
};

export default function TransactionsScreen() {
    const { data: transactions, isLoading, isError, refetch } = useMyTransactions();

    const renderTransactionItem = ({ item }: { item: PaymentTransaction }) => {
        const isPenalty = item.amount > 2; // Zakładamy, że 2.00 to opłata startowa, reszta to kary

        return (
            <View className="bg-white p-4 mb-3 rounded-2xl shadow-sm border border-gray-100 flex-row items-center">
                {/* Ikona po lewej */}
                <View className="bg-green-50 p-3 rounded-full mr-4">
                    <ArrowDownLeft size={24} color="#16a34a" />
                </View>

                {/* Środkowe informacje */}
                <View className="flex-1 pr-2">
                    {/* ZMIANA: Zastąpiono statyczny tekst inteligentnym komponentem */}
                    <AsyncTransactionBookTitle loanId={item.loanId} defaultTitle={item.bookTitle} />
                    
                    <Text className="text-xs text-gray-500 font-medium mt-1">
                        {isPenalty ? 'Penalty Fee' : 'Borrowing Fee'}
                    </Text>
                    <Text className="text-xs text-gray-400 mt-1">
                        {item.paidAt ? format(parseISO(item.paidAt), 'MMM dd, yyyy • HH:mm') : 'Unknown date'}
                    </Text>
                </View>

                {/* Kwota po prawej */}
                <View className="items-end pl-2">
                    <Text className="text-lg font-bold text-gray-900">
                        -{Number(item.amount).toFixed(2)} zł
                    </Text>
                    <View className="bg-green-100 px-2 py-0.5 rounded mt-1">
                        <Text className="text-[10px] font-bold text-green-700 uppercase">Paid</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="px-4 pt-6 pb-4">
                <Text className="text-3xl font-extrabold text-gray-900 mb-1">Payment History</Text>
                <Text className="text-gray-500 text-sm">Review your past library fees and penalties.</Text>
            </View>

            {isLoading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#4f46e5" />
                </View>
            ) : isError ? (
                <View className="flex-1 justify-center items-center px-4">
                    <Text className="text-red-500 font-semibold mb-2 text-center">Failed to load transaction history.</Text>
                    <TouchableOpacity onPress={() => refetch()} className="bg-indigo-100 px-6 py-3 rounded-lg">
                        <Text className="text-indigo-700 font-bold">Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={transactions}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderTransactionItem}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                    refreshing={isLoading}
                    onRefresh={refetch}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View className="py-16 items-center">
                            <View className="bg-gray-100 p-4 rounded-full mb-4">
                                <CreditCard size={32} color="#9ca3af" />
                            </View>
                            <Text className="text-gray-500 text-lg font-medium">No transactions yet.</Text>
                            <Text className="text-gray-400 text-sm mt-1 text-center px-8">
                                When you borrow books or pay penalties, they will appear here.
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}