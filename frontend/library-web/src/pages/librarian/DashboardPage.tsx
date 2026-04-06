import React, { useState } from 'react';
import { useLibrarianLoans, useUpdateLibrarianLoan } from '../../hooks/useLoans';
import { useBooks } from '../../hooks/useBooks';
import { useAddLibrarian } from '../../hooks/useUsers';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { LoanFormModal } from '../../components/features/Loans/LoanFormModal';
import { useNavigate } from 'react-router-dom';

import { BookOpen, AlertCircle, Clock, Archive, Plus, Bell } from 'lucide-react';

export default function DashboardPage() {
  // KPI Data
  const { data: activeLoans } = useLibrarianLoans('ACTIVE', 1);
  const { data: overdueLoans } = useLibrarianLoans('OVERDUE', 1);
  const { data: pendingLoans } = useLibrarianLoans('PENDING_PAYMENT', 1);
  const { data: booksData } = useBooks(0, 1); // just to get totalElements

  const navigate = useNavigate();

  // Modals state
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);

  // Mock Notification
  const handleNotify = (userId: string) => {
    alert(`Zlecono wysłanie powiadomienia (Upomnienie) do użytkownika #${userId} za pośrednictwem notify-service!`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Panel Główny</h1>
        <p className="text-gray-500 mt-1">Przegląd sytuacji w bibliotece na żywo.</p>
      </div>

      {/* --- 1. KPI Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Loans */}
        <Card 
          className="border-l-4 border-l-blue-500 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => navigate('/app/librarian/loans?status=ACTIVE')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600">Aktywne Wypożyczenia</CardTitle>
            <BookOpen className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{activeLoans?.count ?? '-'}</div>
            <p className="text-xs text-gray-500 mt-1">Obecnie czytane książki</p>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card 
          className="border-l-4 border-l-red-500 shadow-sm bg-red-50/30 cursor-pointer hover:bg-red-50 transition-colors"
          onClick={() => navigate('/app/librarian/loans?status=OVERDUE')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-red-800">Przetrzymane</CardTitle>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{overdueLoans?.count ?? '-'}</div>
            <p className="text-xs text-red-600/80 mt-1">wymagają interwencji</p>
          </CardContent>
        </Card>

        {/* Pending Payment */}
        <Card 
          className="border-l-4 border-l-amber-400 shadow-sm cursor-pointer hover:bg-amber-50/50 transition-colors"
          onClick={() => navigate('/app/librarian/loans?status=PENDING_PAYMENT')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-amber-800">Oczekujące Płatności</CardTitle>
            <Clock className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{pendingLoans?.count ?? '-'}</div>
            <p className="text-xs text-gray-500 mt-1">Kary zablokowane</p>
          </CardContent>
        </Card>

        {/* Catalog Status */}
        <Card 
          className="border-l-4 border-l-green-500 shadow-sm cursor-pointer hover:bg-green-50/50 transition-colors"
          onClick={() => navigate('/app/librarian/loans?status=ALL')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600">Stan Katalogu</CardTitle>
            <Archive className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{booksData?.totalElements ?? '-'}</div>
            <p className="text-xs text-gray-500 mt-1">Zarejestrowanych pozycji</p>
          </CardContent>
        </Card>
      </div>

      {/* --- 2. Quick Actions --- */}
      <div className="flex flex-wrap gap-4">
        <Button 
          size="lg" 
          onClick={() => setIsNewLoanOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center gap-2 h-14 px-6 rounded-xl"
        >
          <Plus className="h-5 w-5" />
          Nowe Wypożyczenie
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- 3. Actionable Items (Wymaga uwagi) --- */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Wymaga Twojej Uwagi</h2>
            <span className="text-sm text-gray-500">Najpilniejsze zaległości</span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Użytkownik</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Wypożyczenie ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Szacowana Kara</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Akcja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {!overdueLoans?.results || overdueLoans.results.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                      Brak zaległych wypożyczeń. Wszystko w porządku!
                    </td>
                  </tr>
                ) : (
                  overdueLoans.results.slice(0, 5).map((loan) => (
                    <tr key={loan.id} className="hover:bg-red-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {loan.user_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        Książka #{loan.book_id} <br/>
                        <span className="text-xs text-red-500">Limit: {new Date(loan.due_date).toLocaleDateString()}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {/* Fake penalty calculation for visuals if backend doesn't provide it directly in the loan object */}
                        ~ {Math.max(1, Math.floor((new Date().getTime() - new Date(loan.due_date).getTime()) / (1000 * 3600 * 24))) * 0.50} PLN
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-amber-600 hover:bg-amber-100 hover:text-amber-700"
                          onClick={() => handleNotify(loan.user_id)}
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          Upomnienie
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- 4. Recent Feed --- */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Ostatnia Aktywność</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
              
              <div className="relative pl-6">
                <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-blue-500 ring-4 ring-white" />
                <p className="text-sm font-medium text-gray-900">Jan Kowalski opłacił karę</p>
                <p className="text-xs text-gray-500">Dzisiaj, 11:45 • Kwota: 2.50 PLN</p>
              </div>

              <div className="relative pl-6">
                <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-green-500 ring-4 ring-white" />
                <p className="text-sm font-medium text-gray-900">Zwrócono "Wiedźmina"</p>
                <p className="text-xs text-gray-500">Dzisiaj, 10:30 • Zwrócił: Piotr Nowak</p>
              </div>

              <div className="relative pl-6">
                <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-purple-500 ring-4 ring-white" />
                <p className="text-sm font-medium text-gray-900">Nowe wypożyczenie</p>
                <p className="text-xs text-gray-500">Dzisiaj, 09:12 • "Zbrodnia i kara"</p>
              </div>

              <div className="relative pl-6">
                <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-red-500 ring-4 ring-white" />
                <p className="text-sm font-medium text-gray-900">System naliczył kary (Celery)</p>
                <p className="text-xs text-gray-500">Wczoraj, 23:59 • Dla 4 użytkowników</p>
              </div>

            </div>
            
            <Button variant="ghost" className="w-full mt-6 text-sm text-gray-500">
              Zobacz cały log
            </Button>
          </div>
        </div>
      </div>

      {/* --- Modals --- */}
      <LoanFormModal isOpen={isNewLoanOpen} onClose={() => setIsNewLoanOpen(false)} />
    </div>
  );
}