import React, { useState, useMemo } from 'react';
import { useAdminTransactions } from '@/hooks/usePayments';
import { format, parseISO, startOfDay, startOfWeek, startOfMonth, startOfYear, isAfter, isBefore, endOfDay } from 'date-fns';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminPaymentsPage() {
  const { data: transactions, isLoading, error } = useAdminTransactions();
  
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  
  // Stany dla zakresu dat
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 1. Najpierw filtrujemy transakcje według wybranego zakresu dat
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(t => {
      if (!t.paidAt) return false;
      const txDate = parseISO(t.paidAt);
      
      // Sprawdzanie 'Od'
      if (startDate && isBefore(txDate, startOfDay(parseISO(startDate)))) {
        return false;
      }
      
      // Sprawdzanie 'Do' (koniec wybranego dnia)
      if (endDate && isAfter(txDate, endOfDay(parseISO(endDate)))) {
        return false;
      }
      
      return true;
    });
  }, [transactions, startDate, endDate]);

  // 2. Następnie agregujemy przefiltrowane dane do wykresu
  const aggregatedData = useMemo(() => {
    const groups: { [key: string]: number } = {};
    
    filteredTransactions.forEach(t => {
      if (!t.paidAt) return;
      
      const date = parseISO(t.paidAt);
      let groupKey = '';
      
      switch (timeframe) {
        case 'day': groupKey = format(startOfDay(date), 'yyyy-MM-dd'); break;
        case 'week': groupKey = format(startOfWeek(date), 'yyyy-MM-dd'); break;
        case 'month': groupKey = format(startOfMonth(date), 'yyyy-MM'); break;
        case 'year': groupKey = format(startOfYear(date), 'yyyy'); break;
      }
      
      groups[groupKey] = (groups[groupKey] || 0) + (t.amount || 0);
    });

    return Object.entries(groups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, total]) => ({ date, total }));
  }, [filteredTransactions, timeframe]);

  // 3. Obliczamy sumę tylko dla przefiltrowanych transakcji
  const totalEarned = useMemo(() => {
    return aggregatedData.reduce((sum, item) => sum + item.total, 0);
  }, [aggregatedData]);

  if (isLoading) return <div className="p-8">Ładowanie statystyk finansowych...</div>;
  if (error) return <div className="p-8 text-red-500">Błąd podczas pobierania danych: {error.message}</div>;

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* Górny panel podsumowujący */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Finanse Systemu</h1>
          <p className="text-sm text-gray-500 mt-1">Raport przepływu środków ze Stripe</p>
        </div>
        <div className="text-xl font-bold bg-green-50 border border-green-200 text-green-700 px-6 py-3 rounded-xl shadow-sm">
          Zarobek (wybrany interwał): {totalEarned.toFixed(2)} PLN
        </div>
      </div>

      {/* Pasek Filtrów Dat */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="text-sm font-semibold text-gray-700">Filtruj po dacie:</div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Od:</span>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Do:</span>
          <input 
            type="date" 
            value={endDate}
            min={startDate} // Nie pozwala wybrać daty 'Do' wcześniejsznej niż 'Od'
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {(startDate || endDate) && (
          <button 
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="ml-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Wyczyść filtry
          </button>
        )}
      </div>

      <div className="flex gap-6 h-[60vh]">
        {/* Wykres - Lewa Strona */}
        <div className="flex-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col w-2/3">
          <div className="flex justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-700">Wizualizacja Zysków</h2>
            <div className="flex gap-4">
              <select 
                className="border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 p-2 rounded-lg text-sm font-medium transition"
                value={timeframe} 
                onChange={e => setTimeframe(e.target.value as any)}
              >
                <option value="day">Dzienny</option>
                <option value="week">Tygodniowy</option>
                <option value="month">Miesięczny</option>
                <option value="year">Roczny</option>
              </select>

              <select 
                className="border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 p-2 rounded-lg text-sm font-medium transition"
                value={chartType} 
                onChange={e => setChartType(e.target.value as any)}
              >
                <option value="bar">Słupkowy (Bar)</option>
                <option value="line">Liniowy (Line)</option>
              </select>
            </div>
          </div>

          <div className="flex-1 w-full relative">
            {aggregatedData.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                Brak danych w wybranym przedziale czasowym.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={aggregatedData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${value} zł`} />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(2)} PLN`, 'Przychód']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                    <Bar dataKey="total" fill="#3b82f6" name="Przychód (PLN)" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                ) : (
                  <LineChart data={aggregatedData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${value} zł`} />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(2)} PLN`, 'Przychód']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Przychód (PLN)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Lista transakcji - Prawa strona */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden w-1/3 flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-700">Ostatnie Transakcje ({filteredTransactions.length})</h2>
          </div>
          <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-3 custom-scrollbar">
            {filteredTransactions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-center text-gray-400">
                <p>Brak historii wpłat w tym przedziale.</p>
              </div>
            )}
            
            {filteredTransactions.map(t => (
              <div key={t.id} className="border p-3 rounded-lg hover:bg-blue-50 transition border-gray-100 shadow-sm text-sm group">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-gray-800 break-all pr-2">
                     <span className="text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full text-xs mr-2">#{t.id}</span>
                     {t.userName || t.userId}
                  </div>
                  <span className="text-green-600 font-bold shrink-0">+{t.amount?.toFixed(2)} PLN</span>
                </div>
                <div className="text-xs text-gray-600 mb-1 flex items-center gap-1 font-medium bg-gray-100 p-1.5 rounded truncate">
                  <svg className="w-3 h-3 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  <span className="truncate">{t.bookTitle || `Wypożyczenie #${t.loanId}`}</span>
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-1 mt-2">
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {t.paidAt ? format(parseISO(t.paidAt), 'dd MMM yyyy, HH:mm') : 'Nieznana data'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}