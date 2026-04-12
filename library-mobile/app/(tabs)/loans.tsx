import React, { useState } from 'react';
import { View, Text, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLoans, useMyLoans, Loan } from '../../src/hooks/useLoans';
import { useStripe } from '@stripe/stripe-react-native';
import { format } from 'date-fns';

const statuses = [
    { label: 'All', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Overdue', value: 'OVERDUE' },
    { label: 'Pending', value: 'PENDING_PAYMENT' },
    { label: 'Returned', value: 'RETURNED' },
];

export default function LoansScreen() {
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    // Dodajemy stan, aby wiedzieć, dla którego ID aktualnie trwa proces płatności (dla loadera na przycisku)
    const [processingPaymentId, setProcessingPaymentId] = useState<number | null>(null);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        refetch
    } = useMyLoans(selectedStatus);

    const { returnLoan, initPayment, confirmPayment } = useLoans();

    const handleReturn = async (loan: Loan) => {
        try {
            await returnLoan.mutateAsync(loan.id);
            Alert.alert("Success", "Book returned successfully!");
        } catch (error: any) {
            if (error.message === '402_PAYMENT_REQUIRED') {
                proceedToPayment(loan.id, true);
            } else {
                Alert.alert("Error", error.message || "Failed to return the book.");
            }
        }
    };

    // Dodano parametr 'isPenalty', aby móc zmieniać komunikaty w Alertach
    const proceedToPayment = async (loanId: number, isPenalty = false) => {
        try {
            setProcessingPaymentId(loanId);
            const initData = await initPayment.mutateAsync(loanId);
            const { clientSecret } = initData;

            const { error: initError } = await initPaymentSheet({
                paymentIntentClientSecret: clientSecret,
                merchantDisplayName: 'Library App',
            });

            if (initError) {
                Alert.alert("Payment Init Error", initError.message);
                setProcessingPaymentId(null);
                return;
            }

            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
                Alert.alert("Payment Canceled", isPenalty ? "You must pay the penalty to return the book." : "Payment was canceled.");
            } else {
                await confirmPayment.mutateAsync(loanId);
                Alert.alert("Success", isPenalty ? "Penalty paid and book returned successfully!" : "Initial fee paid successfully!");
            }
        } catch (error: any) {
            Alert.alert("Payment Error", error.message || "Something went wrong during payment.");
        } finally {
            setProcessingPaymentId(null);
        }
    };

    const loadMore = () => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    const renderLoanCard = ({ item }: { item: Loan }) => {
        const isOverdue = item.status === 'OVERDUE';
        const isActive = item.status === 'ACTIVE';
        const isReturned = item.status === 'RETURNED';
        const isPendingPayment = item.status === 'PENDING_PAYMENT';

        // Definiowanie stylów dla "odznaki" statusu w zależności od stanu wypożyczenia
        let badgeColor = 'bg-gray-100';
        let textColor = 'text-gray-700';
        
        if (isOverdue) { badgeColor = 'bg-red-100'; textColor = 'text-red-700'; }
        else if (isActive) { badgeColor = 'bg-blue-100'; textColor = 'text-blue-700'; }
        else if (isReturned) { badgeColor = 'bg-green-100'; textColor = 'text-green-700'; }
        else if (isPendingPayment) { badgeColor = 'bg-orange-100'; textColor = 'text-orange-700'; }

        return (
            <View className="bg-white p-5 mb-4 rounded-xl shadow-sm border border-gray-100 flex-col">
                <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-900">{item.book_title}</Text>
                        <Text className="text-gray-500 text-sm">Book ID: {item.book_id}</Text>
                    </View>
                    <View className={`px-3 py-1 rounded-full ${badgeColor}`}>
                        <Text className={`text-xs font-bold ${textColor}`}>
                            {item.status.replace('_', ' ')}
                        </Text>
                    </View>
                </View>

                <View className="flex-col gap-y-1 mb-4 mt-2">
                    <Text className="text-gray-600 text-sm">
                        Borrowed: {format(new Date(item.borrow_date), 'MMM dd, yyyy')}
                    </Text>
                    
                    {/* Pokazujemy Datę Zwrotu tylko jeśli książka nie została jeszcze oddana */}
                    {!isReturned && (
                        <Text className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                            Due: {format(new Date(item.due_date), 'MMM dd, yyyy')}
                        </Text>
                    )}
                    
                    {/* Pokazujemy rzczywistą datę oddania jeśli jest już RETURNED */}
                    {isReturned && item.return_date && (
                        <Text className="text-green-600 text-sm font-medium">
                            Returned: {format(new Date(item.return_date), 'MMM dd, yyyy')}
                        </Text>
                    )}
                    
                    {/* Jeśli wypożyczenie ma naliczoną karę, wyświetl ją */}
                    {(isOverdue || Number(item.penalty_amount) > 0) && (
                        <Text className="text-red-600 text-sm font-bold mt-1">
                            Penalty due: {Number(item.penalty_amount).toFixed(2)} PLN
                        </Text>
                    )}
                    
                    {/* Komunikat o konieczności opłacenia wypożyczenia przed podjęciem akcji */}
                    {isPendingPayment && (
                        <Text className="text-orange-600 text-sm font-bold mt-1">
                            ⚠️ This loan is unpaid. Please complete the payment to activate and return the book.
                        </Text>
                    )}
                </View>

                {/* PRZYCISKI AKCJI */}
                <View className="flex-row gap-2 mt-2">
                    {/* Opcja 1: Zwróć Książkę (Dla aktywnych i przetrzymanych) */}
                    {(isActive || isOverdue) && (
                        <TouchableOpacity
                            className="bg-indigo-600 py-3 rounded-lg items-center flex-1 flex-row justify-center"
                            onPress={() => handleReturn(item)}
                            disabled={returnLoan.isPending || processingPaymentId === item.id}
                        >
                            {returnLoan.isPending && returnLoan.variables === item.id ? (
                                <ActivityIndicator color="#fff" className="mr-2" />
                            ) : null}
                            <Text className="text-white font-semibold text-base">Return Book</Text>
                        </TouchableOpacity>
                    )}

                    {/* Opcja 2: Opłać wypożyczenie (Tylko dla Pending Payment) */}
                    {isPendingPayment && (
                        <TouchableOpacity
                            className="bg-orange-500 py-3 rounded-lg items-center flex-1 flex-row justify-center"
                            onPress={() => proceedToPayment(item.id, false)}
                            disabled={processingPaymentId === item.id}
                        >
                            {processingPaymentId === item.id ? (
                                <ActivityIndicator color="#fff" className="mr-2" />
                            ) : null}
                            <Text className="text-white font-semibold text-base">Pay Fee (2.00 PLN)</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const allLoans = data?.pages.flatMap(page => page.results) || [];

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="px-4 pt-6 pb-2">
                <Text className="text-3xl font-extrabold text-gray-900 mb-4">My Loans</Text>
                <View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                        {statuses.map((status) => {
                            const isSelected = selectedStatus === status.value;
                            return (
                                <TouchableOpacity
                                    key={status.value}
                                    onPress={() => setSelectedStatus(status.value)}
                                    className={`px-5 py-2 mr-3 rounded-full border ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'}`}
                                >
                                    <Text className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                                        {status.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>

            {isLoading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#4f46e5" />
                </View>
            ) : isError ? (
                <View className="flex-1 justify-center items-center">
                    <Text className="text-red-500 font-semibold mb-2">Failed to load loans.</Text>
                    <TouchableOpacity onPress={() => refetch()} className="bg-indigo-100 px-4 py-2 rounded-md">
                        <Text className="text-indigo-700 font-medium">Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={allLoans}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderLoanCard}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    refreshing={isLoading}
                    onRefresh={refetch}
                    ListEmptyComponent={
                        <View className="py-10 items-center">
                            <Text className="text-gray-400 text-lg">No loans found.</Text>
                        </View>
                    }
                    ListFooterComponent={
                        isFetchingNextPage ? (
                            <ActivityIndicator size="small" color="#4f46e5" style={{ marginVertical: 16 }} />
                        ) : null
                    }
                />
            )}
        </SafeAreaView>
    );
}