import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsersCount } from '../../hooks/useUsers';
import { useAdminTransactions } from '../../hooks/usePayments';
import { useAuditLogs } from '../../hooks/useLogs';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Users, DollarSign, Activity, ShieldAlert, ArrowRight, UserPlus, Receipt, ScrollText } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const { data: totalUsers = 0, isLoading: isLoadingUsers } = useUsersCount('');
  const { data: transactions, isLoading: isLoadingTx } = useAdminTransactions();
  const { data: logsData, isLoading: isLoadingLogs } = useAuditLogs();

  const totalRevenue = useMemo(() => {
    if (!transactions) return 0;
    return transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  }, [transactions]);

  // Wyciąganie 5 najnowszych logów i transakcji do podglądu
  const recentTransactions = useMemo(() => transactions?.slice(0, 5) || [], [transactions]);
  const recentLogs = useMemo(() => logsData?.pages[0]?.items?.slice(0, 5) || [], [logsData]);

  // Zliczanie błędów/alertów w ostatnich logach
  const errorLogsCount = useMemo(() => {
    if (!logsData?.pages[0]?.items) return 0;
    return logsData.pages[0].items.filter(log => 
      log.action_type.includes('FAILED') || 
      log.action_type.includes('ERROR') || 
      log.action_type.includes('LOST_OR_DAMAGED')
    ).length;
  }, [logsData]);

  return (
    <div className="flex flex-col h-full space-y-6 p-6 bg-gray-50/50">
      {/* Nagłówek i Szybkie Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Admin Control Center</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of system health, finances, and security.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/app/admin/users')} variant="outline" className="flex items-center gap-2 bg-white">
            <UserPlus className="h-4 w-4" />
            Manage Users
          </Button>
          <Button onClick={() => navigate('/app/admin/logs')} className="flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            Full Audit Logs
          </Button>
        </div>
      </div>

      {/* Kafelki KPI (Key Performance Indicators) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm border-gray-100">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Registered Users</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {isLoadingUsers ? '...' : totalUsers}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-100">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {isLoadingTx ? '...' : `${totalRevenue.toFixed(2)} PLN`}
              </h3>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-green-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-100">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">System Status</p>
              <h3 className="text-2xl font-bold text-emerald-600">Active</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
              <Activity className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-100">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Warnings (Recent Logs)</p>
              <h3 className={`text-2xl font-bold ${errorLogsCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {isLoadingLogs ? '...' : errorLogsCount}
              </h3>
            </div>
            <div className={`p-3 rounded-lg ${errorLogsCount > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
              <ShieldAlert className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Główna sekcja z podziałem na kolumny */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        {/* Lewa kolumna (Szersza) - Ostatnie Transakcje */}
        <Card className="lg:col-span-2 shadow-sm border-gray-100 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold text-gray-800">Recent Financial Flows</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/admin/payments')} className="text-blue-600 hover:text-blue-800">
              See all <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {isLoadingTx ? (
              <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-b-2 border-blue-500 rounded-full"></div></div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No recent transactions.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/50 text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium rounded-tl-lg">ID</th>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium text-right">Amount</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">#{tx.id}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{tx.userName || tx.userId}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">+{tx.amount?.toFixed(2)} PLN</td>
                        <td className="px-4 py-3 text-gray-500">
                          {tx.paidAt ? format(parseISO(tx.paidAt), 'dd.MM.yyyy HH:mm') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prawa kolumna (Węższa) - System Activity na żywo */}
        <Card className="shadow-sm border-gray-100 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold text-gray-800">System Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {isLoadingLogs ? (
              <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-b-2 border-blue-500 rounded-full"></div></div>
            ) : recentLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No system logs.</div>
            ) : (
              <div className="space-y-4">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex gap-3 items-start relative">
                    <div className="mt-1 h-2 w-2 rounded-full bg-blue-500 ring-4 ring-blue-50 shrink-0"></div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{log.action_type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {log.metadata?.message || `Aktor: ${log.actor_id}`}
                      </p>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {format(parseISO(log.timestamp), 'HH:mm • dd.MM')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}