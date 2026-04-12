import React, { useState, useEffect } from 'react';
import { useLibrarianLoans, useUpdateLibrarianLoan, type Loan } from '@/hooks/useLoans';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from 'react-oidc-context';
import { getUserRoles } from '@/utils/auth';

export const LoanList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'ALL';
  const [status, setStatus] = useState(initialStatus);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useLibrarianLoans(status, page);
  const updateLoan = useUpdateLibrarianLoan();
  const navigate = useNavigate();
  const auth = useAuth();
  const roles = getUserRoles(auth.user);
  const isLibrarian = roles.includes('librarian');

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam && statusParam !== status) {
      setStatus(statusParam);
      setPage(1);
    }
  }, [searchParams]);

  const handleReturn = (loan: Loan) => {
    if (window.confirm('Are you sure you want to mark this book as returned?')) {
      updateLoan.mutate({ id: loan.id, action: 'return' }, {
        onError: (err: any) => {
          if (err.status === 402) {
            navigate(`/app/librarian/loans/${loan.id}/pay`);
          } else {
            alert(`Error returning book: ${err?.message}`);
          }
        }
      });
    }
  };



  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setSearchParams({ status: newStatus });
    setPage(1); // Reset to first page on filter change
  };

  if (isLoading) {
    return <div className="flex justify-center items-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (isError) {
    return <div className="text-red-500 p-4 rounded-md bg-red-50 border border-red-200">Error loading loans: {error?.message}</div>;
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <label className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Filter Status:</span>
          <select 
            value={status} 
            onChange={handleStatusChange}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="RETURNED">Returned</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs uppercase text-gray-700">
            <tr>
              <th className="px-6 py-3">ID</th>
              <th className="px-6 py-3">User ID</th>
              <th className="px-6 py-3">Book ID</th>
              <th className="px-6 py-3">Borrow Date</th>
              <th className="px-6 py-3">Due Date</th>
              <th className="px-6 py-3">Status</th>
              {isLibrarian && <th className="px-6 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data?.results?.length === 0 ? (
              <tr>
                <td colSpan={isLibrarian ? 7 : 6} className="px-6 py-4 text-center text-gray-500">No loans found.</td>
              </tr>
            ) : (
              data?.results?.map((loan) => (
                <tr key={loan.id} className="border-b bg-white">
                  <td className="px-6 py-4 font-medium">{loan.id}</td>
                  <td className="px-6 py-4">{loan.user_id}</td>
                  <td className="px-6 py-4">{loan.book_id}</td>
                  <td className="px-6 py-4">{new Date(loan.borrow_date).toLocaleString()}</td>
                  <td className="px-6 py-4">{new Date(loan.due_date).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      loan.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                      loan.status === 'RETURNED' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {loan.status}
                    </span>
                  </td>
                  {isLibrarian && (
                    <td className="px-6 py-4">
                      {loan.status !== 'RETURNED' && loan.status !== 'PENDING_PAYMENT' && (
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => handleReturn(loan)}
                          disabled={updateLoan.isPending}
                        >
                          Mark Returned
                        </Button>
                      )}
                      {loan.status === 'PENDING_PAYMENT' && (
                        <Button 
                          size="sm" 
                          variant="secondary"
                          className="ml-2"
                          onClick={() => navigate(`/app/librarian/loans/${loan.id}/pay`)}
                        >
                          Opłać
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
         <div className="text-sm text-gray-500">
           Total: {data?.count || 0}
         </div>
         <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!data?.previous}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!data?.next}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
         </div>
      </div>


    </div>
  );
};
