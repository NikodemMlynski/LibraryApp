import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Modal, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar as CalendarIcon, ChevronLeft, CreditCard } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStripe } from '@stripe/stripe-react-native';
import { useBookDetails } from '../../src/hooks/useBooks';
import { useLoans } from '../../src/hooks/useLoans';

export default function BookDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const { data: book, isLoading, isError, refetch } = useBookDetails(id || '');
    const { createLoan, confirmPayment } = useLoans();

    const [isModalVisible, setModalVisible] = useState(false);
    const [returnDate, setReturnDate] = useState(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)); // Default 14 days
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#4f46e5" />
                <Text className="mt-4 text-gray-500 font-medium">Loading book details...</Text>
            </SafeAreaView>
        );
    }

    if (isError || !book) {
        return (
            <SafeAreaView className="flex-1 bg-white justify-center items-center p-6">
                <Text className="text-red-500 text-lg text-center font-medium">Failed to load book details.</Text>
                <TouchableOpacity className="mt-6 bg-indigo-500 px-8 py-3 rounded-xl shadow-sm" onPress={() => refetch()}>
                    <Text className="text-white font-bold">Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity className="mt-4" onPress={() => router.back()}>
                    <Text className="text-gray-500">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const isOutOfStock = book.availableCopies <= 0;

    const handleCheckoutProcess = async () => {
        setIsProcessing(true);
        try {
            // 1. Create the loan in DB & Generate Stripe Client Secret
            const isoDate = returnDate.toISOString().split('T')[0];
            const loanResponse = await createLoan.mutateAsync({ 
                book_id: book.id, 
                due_date: isoDate 
            });

            // 2. Initialize the Payment Sheet
            const { error: initError } = await initPaymentSheet({
                merchantDisplayName: 'Library System',
                paymentIntentClientSecret: loanResponse.clientSecret,
                allowsDelayedPaymentMethods: true,
                defaultBillingDetails: {
                  name: 'Library User',
                }
            });

            if (initError) {
                Alert.alert('Payment Setup Failed', initError.message);
                setIsProcessing(false);
                return;
            }

            // 3. Present the Payment Sheet to user
            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
                if (presentError.code === 'Canceled') {
                    // User closed the popup manually
                    setIsProcessing(false);
                    return;
                }
                Alert.alert('Payment Failed', presentError.message);
                setIsProcessing(false);
                return;
            }

            // 4. Confirm the payment with our backend
            await confirmPayment.mutateAsync(loanResponse.id);
            
            // 5. Success!
            setModalVisible(false);
            Alert.alert(
                'Success!', 
                'You have successfully borrowed this book. Enjoy reading!',
                [{ text: 'OK', onPress: () => router.replace('/(tabs)/loans') }]
            );

        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong during checkout.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
            <View className="px-4 py-3 flex-row items-center border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full bg-gray-50">
                    <ChevronLeft color="#374151" size={24} />
                </TouchableOpacity>
                <Text className="ml-4 text-xl font-bold text-gray-800">Book Details</Text>
            </View>

            <ScrollView contentContainerClassName="p-6">
                <View className="items-center mb-8 shadow-sm">
                    {book.coverImageUrl ? (
                        <Image 
                            source={{ uri: book.coverImageUrl }} 
                            className="w-48 h-72 rounded-xl bg-gray-200"
                            resizeMode="cover"
                        />
                    ) : (
                        <View className="w-48 h-72 rounded-xl bg-indigo-50 items-center justify-center border border-indigo-100">
                            <Text className="text-indigo-400 font-bold text-center text-lg">No Cover</Text>
                        </View>
                    )}
                </View>

                <View className="mb-6">
                    <Text className="text-3xl font-extrabold text-gray-900 leading-tight">{book.title}</Text>
                    <Text className="text-xl text-indigo-600 font-semibold mt-2">{book.author}</Text>
                </View>

                <View className="flex-row items-center justify-between bg-gray-50 p-4 rounded-2xl mb-8 border border-gray-100">
                    <View>
                        <Text className="text-sm text-gray-500 font-medium">ISBN</Text>
                        <Text className="text-base text-gray-800 font-semibold mt-1">{book.isbn || 'N/A'}</Text>
                    </View>
                    <View className="h-full w-px bg-gray-200" />
                    <View className="items-end">
                        <Text className="text-sm text-gray-500 font-medium">Availability</Text>
                        <Text className={`text-base font-bold mt-1 ${isOutOfStock ? 'text-red-500' : 'text-green-600'}`}>
                            {isOutOfStock ? 'Out of Stock' : `${book.availableCopies} Copies Available`}
                        </Text>
                    </View>
                </View>

                {book.description && (
                    <View className="mb-8">
                        <Text className="text-lg font-bold text-gray-800 mb-2">Synopsis</Text>
                        <Text className="text-gray-600 leading-normal">{book.description}</Text>
                    </View>
                )}
            </ScrollView>

            <View className="p-4 border-t border-gray-100 bg-white">
                <TouchableOpacity 
                    className={`w-full py-4 rounded-2xl items-center shadow-sm flex-row justify-center ${isOutOfStock ? 'bg-gray-300' : 'bg-indigo-600'}`}
                    disabled={isOutOfStock}
                    onPress={() => setModalVisible(true)}
                >
                    <Text className={`font-bold text-lg ${isOutOfStock ? 'text-gray-500' : 'text-white'}`}>
                        {isOutOfStock ? 'Currently Unavailable' : 'Borrow Book'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Borrowing Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => !isProcessing && setModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 shadow-xl w-full">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-2xl font-extrabold text-gray-900">Checkout</Text>
                            {!isProcessing && (
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Text className="text-gray-500 font-bold">Done</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View className="mb-6 flex-row items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                           {book.coverImageUrl && (
                               <Image source={{ uri: book.coverImageUrl }} className="w-12 h-16 rounded-md mr-4" />
                           )}
                           <View className="flex-1">
                               <Text className="font-bold text-gray-800 text-base" numberOfLines={1}>{book.title}</Text>
                               <Text className="text-gray-500 text-sm mt-1">{book.author}</Text>
                           </View>
                        </View>

                        <View className="mb-6">
                            <Text className="text-gray-700 font-bold mb-3">Select Return Date</Text>
                            <TouchableOpacity 
                                className="flex-row items-center bg-gray-50 border border-gray-200 p-4 rounded-xl"
                                onPress={() => setShowDatePicker(true)}
                                disabled={isProcessing}
                            >
                                <CalendarIcon color="#4f46e5" size={20} />
                                <Text className="ml-3 text-gray-800 font-medium">
                                    {returnDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </Text>
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={returnDate}
                                    mode="date"
                                    display="default"
                                    minimumDate={new Date(Date.now() + 24 * 60 * 60 * 1000)} // Minimum 1 day
                                    maximumDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)} // Maximum 30 days
                                    onChange={(event: any, selectedDate?: Date) => {
                                        setShowDatePicker(false);
                                        if (selectedDate) {
                                            setReturnDate(selectedDate);
                                        }
                                    }}
                                />
                            )}
                        </View>

                        <View className="flex-row justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-8 mt-2">
                            <View className="flex-row items-center">
                                <CreditCard color="#4f46e5" size={20} />
                                <Text className="ml-2 font-bold text-indigo-900 text-base">Borrowing Fee</Text>
                            </View>
                            <Text className="font-extrabold text-indigo-700 text-lg">2.00 PLN</Text>
                        </View>

                        <TouchableOpacity 
                            className={`w-full py-4 rounded-2xl items-center shadow-sm flex-row justify-center ${isProcessing ? 'bg-indigo-400' : 'bg-indigo-600'}`}
                            onPress={handleCheckoutProcess}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <ActivityIndicator color="white" className="mr-3" />
                                    <Text className="font-bold text-lg text-white">Processing...</Text>
                                </>
                            ) : (
                                <Text className="font-bold text-lg text-white">Confirm & Pay</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
