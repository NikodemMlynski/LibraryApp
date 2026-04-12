import { useAuditLogs, type AuditLog } from '../../hooks/useLogs';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Book, CheckCircle, CreditCard, UserPlus, FileText, AlertCircle, AlertTriangle, Trash2, UserMinus, CalendarClock, DollarSign, XCircle, PlusSquare } from 'lucide-react';

const getLogIcon = (action_type: string) => {
  switch (action_type) {
    case 'LOAN_CREATED': return <Book className="w-5 h-5 text-blue-500" />;
    case 'LOAN_RETURNED_ON_TIME': return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'LOAN_RETURNED_LATE': return <CalendarClock className="w-5 h-5 text-amber-600" />;
    case 'LOAN_OVERDUE_MARKED': return <AlertTriangle className="w-5 h-5 text-red-500" />;
    case 'BOOK_ADDED': return <PlusSquare className="w-5 h-5 text-emerald-500" />;
    case 'BOOK_LOST_OR_DAMAGED': return <Trash2 className="w-5 h-5 text-red-700" />;
    case 'PAYMENT_FEE_SUCCESS': return <DollarSign className="w-5 h-5 text-green-600" />;
    case 'PAYMENT_PENALTY_SUCCESS': return <DollarSign className="w-5 h-5 text-amber-600" />;
    case 'PAYMENT_FAILED': return <XCircle className="w-5 h-5 text-red-600" />;
    case 'LIBRARIAN_ADDED': return <UserPlus className="w-5 h-5 text-indigo-500" />;
    case 'LIBRARIAN_DELETED': return <UserMinus className="w-5 h-5 text-rose-500" />;
    case 'USER_REGISTERED': return <UserPlus className="w-5 h-5 text-purple-500" />;
    case 'BOOK_RETURNED': return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'PAYMENT_SUCCESS': return <CreditCard className="w-5 h-5 text-amber-500" />;
    default: return <FileText className="w-5 h-5 text-gray-500" />;
  }
};

const getLogColor = (action_type: string) => {
  switch (action_type) {
    case 'LOAN_CREATED': return 'bg-blue-50 border-blue-200';
    case 'LOAN_RETURNED_ON_TIME': return 'bg-green-50 border-green-200';
    case 'LOAN_RETURNED_LATE': return 'bg-amber-50 border-amber-200';
    case 'LOAN_OVERDUE_MARKED': return 'bg-red-50 border-red-200';
    case 'BOOK_ADDED': return 'bg-emerald-50 border-emerald-200';
    case 'BOOK_LOST_OR_DAMAGED': return 'bg-red-50 border-red-300';
    case 'PAYMENT_FEE_SUCCESS': return 'bg-green-50 border-green-200';
    case 'PAYMENT_PENALTY_SUCCESS': return 'bg-amber-50 border-amber-200';
    case 'PAYMENT_FAILED': return 'bg-red-50 border-red-200';
    case 'LIBRARIAN_ADDED': return 'bg-indigo-50 border-indigo-200';
    case 'LIBRARIAN_DELETED': return 'bg-rose-50 border-rose-200';
    case 'USER_REGISTERED': return 'bg-purple-50 border-purple-200';
    case 'BOOK_RETURNED': return 'bg-green-50 border-green-200';
    case 'PAYMENT_SUCCESS': return 'bg-amber-50 border-amber-200';
    default: return 'bg-gray-50 border-gray-200';
  }
};

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleString();
};

export default function AdminLogsPage() {
  const { data, isLoading, isError, error, hasNextPage, fetchNextPage, isFetchingNextPage } = useAuditLogs();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dziennik Zdarzeń Systemowych (Audit Logs)</h1>
        <p className="text-gray-500 mt-1">Podgląd operacji przechwyconych przez AWS DynamoDB.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-800">Oś Czasu Aktywności</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-2 p-4 text-red-600 bg-red-50 rounded animate-pulse">
              <AlertCircle className="w-5 h-5" />
              <span>Błąd pobierania logów: {(error as Error).message}</span>
            </div>
          )}

          {!isLoading && !isError && (!data || data.pages[0].items.length === 0) && (
            <div className="p-8 text-center text-gray-500">
              Brak zarejestrowanych zdarzeń systemowych.
            </div>
          )}

          <div className="space-y-6 mt-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
            {data?.pages.map((page, i) => (
              <div key={i} className="contents">
                {page.items.map((log: AuditLog) => (
                  <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    {/* Icon */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10 transition-transform hover:scale-110">
                      {getLogIcon(log.action_type)}
                    </div>

                    {/* Content */}
                    <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 md:p-4 rounded-xl border shadow-sm ${getLogColor(log.action_type)} break-words overflow-hidden`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-1 sm:space-y-0 sm:space-x-2 mb-2">
                        <div className="font-semibold text-xs sm:text-sm text-slate-900 break-all sm:break-normal">{log.action_type.replace(/_/g, ' ')}</div>
                        <time className="font-mono text-[10px] sm:text-xs text-slate-500 shrink-0">{formatTime(log.timestamp)}</time>
                      </div>
                      <div className="text-slate-700 text-xs sm:text-sm whitespace-normal break-words">
                        {log.metadata?.message || "Akcja wykonana przez pracownika"}
                      </div>
                      <div className="mt-2 text-[10px] sm:text-xs text-slate-500 flex flex-wrap justify-between gap-2">
                        <span className="truncate">Aktor: <span className="font-mono bg-white px-1 py-0.5 rounded border ml-1">{log.actor_id}</span></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          {hasNextPage && (
             <div className="mt-8 flex justify-center pb-4 relative z-20">
               <button
                 onClick={() => fetchNextPage()}
                 disabled={isFetchingNextPage}
                 className="px-6 py-2 bg-white border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
               >
                 {isFetchingNextPage ? 'Ładowanie...' : 'Pokaż starsze logi'}
               </button>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
