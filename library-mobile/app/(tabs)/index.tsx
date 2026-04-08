import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useBooks, Book } from '../../src/hooks/useBooks';

export default function BrowseScreen() {
    const [searchValue, setSearchValue] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchValue);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchValue]);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        refetch
    } = useBooks(debouncedSearch);

    // Flatten pages into a single array
    const books = data?.pages.flatMap((page: any) => page.content) || [];

    const renderBook = ({ item }: { item: Book }) => {
        const isOutOfStock = item.availableCopies <= 0;
        
        return (
            <TouchableOpacity 
                className="flex-row bg-white rounded-xl shadow-sm border border-gray-100 mb-4 p-3"
                onPress={() => router.push(`/book/${item.id}`)}
            >
                {item.coverImageUrl ? (
                    <Image 
                        source={{ uri: item.coverImageUrl }} 
                        className="w-20 h-28 rounded-lg bg-gray-200"
                        resizeMode="cover"
                    />
                ) : (
                    <View className="w-20 h-28 rounded-lg bg-indigo-50 items-center justify-center border border-indigo-100 px-1">
                        <Text className="text-indigo-300 font-bold text-center text-xs">No Cover</Text>
                    </View>
                )}
                
                <View className="flex-1 ml-4 justify-between py-1">
                    <View>
                        <Text className="text-lg font-bold text-gray-800" numberOfLines={2}>{item.title}</Text>
                        <Text className="text-gray-500 mt-1" numberOfLines={1}>{item.author}</Text>
                    </View>
                    
                    <View className={`self-start px-2 py-1 rounded-md ${isOutOfStock ? 'bg-red-50' : 'bg-green-50'}`}>
                        <Text className={`text-xs font-semibold ${isOutOfStock ? 'text-red-600' : 'text-green-600'}`}>
                            {isOutOfStock ? 'Out of Stock' : `${item.availableCopies} Copies Available`}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <View className="px-4 py-3 bg-white shadow-sm z-10 border-b border-gray-100">
                <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
                    <Search color="#9ca3af" size={20} />
                    <TextInput 
                        className="flex-1 ml-2 text-base text-gray-800"
                        placeholder="Search by title or author..."
                        value={searchValue}
                        onChangeText={setSearchValue}
                        returnKeyType="search"
                        autoCapitalize="none"
                    />
                </View>
            </View>

            {isLoading && books.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#4f46e5" />
                    <Text className="mt-4 text-gray-500">Loading catalog...</Text>
                </View>
            ) : isError ? (
                <View className="flex-1 justify-center items-center p-6">
                    <Text className="text-red-500 text-center text-lg">Failed to load catalog. Please try again.</Text>
                    <TouchableOpacity className="mt-4 bg-indigo-500 px-6 py-2 rounded-lg" onPress={() => refetch()}>
                        <Text className="text-white font-semibold">Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList 
                    data={books}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderBook}
                    contentContainerClassName="p-4 flex-grow"
                    onEndReached={() => {
                        if (hasNextPage && !isFetchingNextPage) {
                            fetchNextPage();
                        }
                    }}
                    onEndReachedThreshold={0.5}
                    refreshing={isLoading}
                    onRefresh={refetch}
                    ListFooterComponent={() => 
                        isFetchingNextPage ? (
                            <View className="py-4 items-center">
                                <ActivityIndicator size="small" color="#4f46e5" />
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={() => (
                        <View className="flex-1 justify-center items-center py-10">
                            <Text className="text-gray-500 text-lg">No books found matching your search.</Text>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}
