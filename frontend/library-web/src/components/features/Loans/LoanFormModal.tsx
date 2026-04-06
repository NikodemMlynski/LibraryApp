import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useCreateLibrarianLoan, useLibrarianUsers, useConfirmLoanPayment } from '@/hooks/useLoans';
import { useBooks } from '@/hooks/useBooks';
import { CheckoutFlow } from './CheckoutFlow';
import { Search } from 'lucide-react';

interface LoanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Prosty hook do opóźniania zapytań (Debounce)
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export const LoanFormModal: React.FC<LoanFormModalProps> = ({ isOpen, onClose }) => {
  // Stany formularza
  const [dueDate, setDueDate] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [createdLoanId, setCreatedLoanId] = useState<number | null>(null);

  // Stany dla wyszukiwarki Użytkowników
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const debouncedUserSearch = useDebounce(userSearchTerm, 300);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  // Stany dla wyszukiwarki Książek
  const [bookSearchTerm, setBookSearchTerm] = useState('');
  const debouncedBookSearch = useDebounce(bookSearchTerm, 300);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);

  // Fetchowanie danych (tylko małe porcje po 5-10 wyników!)
  const { data: users, isLoading: isLoadingUsers } = useLibrarianUsers(debouncedUserSearch);
  const { data: paginatedBooks, isLoading: isLoadingBooks } = useBooks(0, 10, debouncedBookSearch);
  const books = paginatedBooks?.content || [];

  const createLoan = useCreateLibrarianLoan();
  const confirmPayment = useConfirmLoanPayment();

  // Resetowanie formularza przy otwarciu/zamknięciu
  useEffect(() => {
    if (isOpen) {
      setDueDate('');
      setClientSecret(null);
      setCreatedLoanId(null);
      setUserSearchTerm('');
      setSelectedUser(null);
      setBookSearchTerm('');
      setSelectedBook(null);
    }
  }, [isOpen]);

  const isBookUnavailable = selectedBook ? selectedBook.availableCopies <= 0 : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBookUnavailable || !selectedUser || !selectedBook) return;
    
    const loanData = { 
      user_id: selectedUser.username, // używamy username tak jak w pierwotnym kodzie
      book_id: selectedBook.id.toString(), 
      due_date: dueDate || undefined 
    };
    
    createLoan.mutate(loanData, { 
      onSuccess: (data: any) => {
        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
          setCreatedLoanId(data.id);
        } else {
          onClose(); 
        }
      } 
    });
  };

  const handlePaymentSuccess = () => {
    if (createdLoanId) {
      confirmPayment.mutate(createdLoanId, { onSuccess: onClose });
    } else {
      onClose();
    }
  };

  if (clientSecret) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !createLoan.isPending) onClose(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <CheckoutFlow clientSecret={clientSecret} onSuccess={handlePaymentSuccess} onCancel={onClose} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !createLoan.isPending) onClose(); }}>
      <DialogContent className="sm:max-w-[500px] overflow-visible">
        <DialogHeader>
          <DialogTitle>Create New Loan</DialogTitle>
          <DialogDescription>
            Search and select a user and a book.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="overflow-visible">
          <div className="grid gap-6 py-4">
            
            {/* AUTOUZUPEŁNIANIE: Użytkownik */}
            <div className="relative">
              <Label className="mb-2 block">Find User</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Type username..."
                  value={userSearchTerm}
                  onChange={(e) => {
                    setUserSearchTerm(e.target.value);
                    setSelectedUser(null);
                    setIsUserDropdownOpen(true);
                  }}
                  onFocus={() => setIsUserDropdownOpen(true)}
                  className="pl-9"
                />
              </div>
              {isUserDropdownOpen && userSearchTerm && (
                <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto">
                  {isLoadingUsers ? (
                    <li className="p-3 text-sm text-gray-500 text-center">Searching...</li>
                  ) : users?.length === 0 ? (
                    <li className="p-3 text-sm text-gray-500 text-center">No users found</li>
                  ) : (
                    users?.map(user => (
                      <li 
                        key={user.id} 
                        className="p-3 text-sm hover:bg-blue-50 cursor-pointer border-b last:border-0"
                        onClick={() => {
                          setSelectedUser(user);
                          setUserSearchTerm(user.username);
                          setIsUserDropdownOpen(false);
                        }}
                      >
                        <span className="font-medium text-gray-900">{user.username}</span>
                        {user.email && <span className="block text-xs text-gray-500">{user.email}</span>}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>

            {/* AUTOUZUPEŁNIANIE: Książka */}
            <div className="relative">
              <Label className="mb-2 block">Find Book</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Type title or author..."
                  value={bookSearchTerm}
                  onChange={(e) => {
                    setBookSearchTerm(e.target.value);
                    setSelectedBook(null);
                    setIsBookDropdownOpen(true);
                  }}
                  onFocus={() => setIsBookDropdownOpen(true)}
                  className={`pl-9 ${isBookUnavailable ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
              </div>
              {isBookDropdownOpen && bookSearchTerm && (
                <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto">
                  {isLoadingBooks ? (
                    <li className="p-3 text-sm text-gray-500 text-center">Searching...</li>
                  ) : books.length === 0 ? (
                    <li className="p-3 text-sm text-gray-500 text-center">No books found</li>
                  ) : (
                    books.map(book => {
                      const unavailable = book.availableCopies <= 0;
                      return (
                        <li 
                          key={book.id} 
                          className={`p-3 text-sm hover:bg-blue-50 cursor-pointer border-b last:border-0 ${unavailable ? 'opacity-50 bg-gray-50' : ''}`}
                          onClick={() => {
                            if (!unavailable) {
                              setSelectedBook(book);
                              setBookSearchTerm(`${book.title} - ${book.author}`);
                              setIsBookDropdownOpen(false);
                            }
                          }}
                        >
                          <span className="font-medium text-gray-900 block truncate">{book.title}</span>
                          <span className="text-xs text-gray-500">{book.author}</span>
                          <span className={`text-xs float-right font-medium ${unavailable ? 'text-red-500' : 'text-green-600'}`}>
                            {unavailable ? 'Out of stock' : `${book.availableCopies} left`}
                          </span>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
              {isBookUnavailable && (
                <span className="text-xs text-red-500 mt-1 block">This book is currently out of stock.</span>
              )}
            </div>

            {/* DATA ZWROTU */}
            <div>
              <Label htmlFor="dueDate" className="mb-2 block">Return Date (Optional)</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

          </div>

          {createLoan.isError && (
             <div className="text-red-500 text-sm mb-4">
               Error: {(createLoan.error as any)?.message || 'An error occurred'}
             </div>
          )}
          
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={createLoan.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createLoan.isPending || isBookUnavailable || !selectedUser || !selectedBook}>
              {createLoan.isPending ? 'Saving...' : 'Create Loan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};