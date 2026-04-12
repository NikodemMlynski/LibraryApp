import React, { useState } from 'react';
import { useLibrarianLoans, useUpdateLibrarianLoan } from '../../hooks/useLoans';
import { useBooks } from '../../hooks/useBooks';
import { useAddLibrarian } from '../../hooks/useUsers';
import { useAuditLogs } from '../../hooks/useLogs';
import type { ActionType } from '../../hooks/useLogs';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { LoanFormModal } from '../../components/features/Loans/LoanFormModal';
import { useNavigate } from 'react-router-dom';

import { BookOpen, AlertCircle, Clock, Archive, Plus, Bell } from 'lucide-react';

const getLogAppearance = (action: ActionType) => {
  switch (action) {
    case 'PAYMENT_SUCCESS':
    case 'PAYMENT_FEE_SUCCESS':
      return { colorClass: 'bg-blue-500', title: 'Paid' };
    case 'LOAN_RETURNED_ON_TIME':
    case 'BOOK_RETURNED':
      return { colorClass: 'bg-green-500', title: 'Book returned' };
    case 'LOAN_CREATED':
    case 'BOOK_ADDED':
      return { colorClass: 'bg-purple-500', title: 'New activity' };
    case 'LOAN_OVERDUE_MARKED':
      return { colorClass: 'bg-red-500', title: 'Overdue' };
    case 'BOOK_LOST_OR_DAMAGED':
    case 'PAYMENT_FAILED':
    case 'LIBRARIAN_DELETED':
      return { colorClass: 'bg-gray-800', title: 'Negative event' };
    case 'USER_REGISTERED':
    case 'LIBRARIAN_ADDED':
      return { colorClass: 'bg-indigo-500', title: 'New user' };
    default:
      return { colorClass: 'bg-gray-400', title: 'System log' };
  }
};

export default function DashboardPage() {
  // KPI Data
  const { data: activeLoans } = useLibrarianLoans('ACTIVE', 1);
  const { data: overdueLoans } = useLibrarianLoans('OVERDUE', 1);
  const { data: pendingLoans } = useLibrarianLoans('PENDING_PAYMENT', 1);
  const { data: booksData } = useBooks(0, 1); // just to get totalElements
  const { data: auditLogsData, isLoading: isLogsLoading } = useAuditLogs();
  const recentLogs = auditLogsData?.pages?.[0]?.items?.slice(0, 4) || [];

  const navigate = useNavigate();

  // Modals state
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);

  // Mock Notification
  const handleNotify = (userId: string) => {
    alert(`A reminder notification was triggered for user #${userId} via notify-service!`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-gray-500 mt-1">Live overview of the library.</p>
      </div>

      {/* --- 1. KPI Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Loans */}
        <Card 
          className="border-l-4 border-l-blue-500 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => navigate('/app/librarian/loans?status=ACTIVE')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600">Active Loans</CardTitle>
            <BookOpen className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{activeLoans?.count ?? '-'}</div>
            <p className="text-xs text-gray-500 mt-1">Currently read books</p>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card 
          className="border-l-4 border-l-red-500 shadow-sm bg-red-50/30 cursor-pointer hover:bg-red-50 transition-colors"
          onClick={() => navigate('/app/librarian/loans?status=OVERDUE')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-red-800">Overdue</CardTitle>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{overdueLoans?.count ?? '-'}</div>
            <p className="text-xs text-red-600/80 mt-1">needs attention</p>
          </CardContent>
        </Card>

        {/* Pending Payment */}
        <Card 
          className="border-l-4 border-l-amber-400 shadow-sm cursor-pointer hover:bg-amber-50/50 transition-colors"
          onClick={() => navigate('/app/librarian/loans?status=PENDING_PAYMENT')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-amber-800">Pending Payments</CardTitle>
            <Clock className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{pendingLoans?.count ?? '-'}</div>
            <p className="text-xs text-gray-500 mt-1">Blocked by penalties</p>
          </CardContent>
        </Card>

        {/* Catalog Status */}
        <Card 
          className="border-l-4 border-l-green-500 shadow-sm cursor-pointer hover:bg-green-50/50 transition-colors"
          onClick={() => navigate('/app/librarian/loans?status=ALL')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600">Catalog Size</CardTitle>
            <Archive className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{booksData?.totalElements ?? '-'}</div>
            <p className="text-xs text-gray-500 mt-1">Registered books</p>
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
          New Loan
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- 3. Actionable Items (Wymaga uwagi) --- */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Requires Attention</h2>
            <span className="text-sm text-gray-500">Most urgent overdues</span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Loan ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Est. Penalty</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {!overdueLoans?.results || overdueLoans.results.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                      No overdue loans. All good!
                    </td>
                  </tr>
                ) : (
                  overdueLoans.results.slice(0, 5).map((loan) => (
                    <tr key={loan.id} className="hover:bg-red-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {loan.user_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        Book #{loan.book_id} <br/>
                        <span className="text-xs text-red-500">Due: {new Date(loan.due_date).toLocaleDateString()}</span>
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
                          Reminder
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
          <h2 className="text-xl font-semibold text-gray-800">Recent Activity</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            
            {isLogsLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : recentLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No recent activity.
              </div>
            ) : (
              <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
                {recentLogs.map((log) => {
                  const appearance = getLogAppearance(log.action_type);
                  const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={log.id} className="relative pl-6">
                      <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full ${appearance.colorClass} ring-4 ring-white`} />
                      <p className="text-sm font-medium text-gray-900">{appearance.title}</p>
                      <p className="text-xs text-gray-500">{timeStr} • {log.metadata?.message || "System action"}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Modals --- */}
      <LoanFormModal isOpen={isNewLoanOpen} onClose={() => setIsNewLoanOpen(false)} />
    </div>
  );
}