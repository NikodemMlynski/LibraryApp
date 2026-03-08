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
import { useCreateLibrarianLoan, useLibrarianUsers } from '@/hooks/useLoans';
import { useBooks } from '@/hooks/useBooks';

interface LoanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoanFormModal: React.FC<LoanFormModalProps> = ({ isOpen, onClose }) => {
  const [userId, setUserId] = useState('');
  const [bookId, setBookId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const { data: users } = useLibrarianUsers();
  const { data: paginatedBooks } = useBooks(0, 1000); // Fetch a large page for dropdowns
  const books = paginatedBooks?.content || [];
  const createLoan = useCreateLibrarianLoan();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setUserId('');
      setBookId('');
      setDueDate('');
    }
  }, [isOpen]);

  const selectedBook = books?.find(b => b.id.toString() === bookId);
  const isBookUnavailable = selectedBook ? selectedBook.availableCopies <= 0 : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBookUnavailable) {
      alert("This book is currently unavailable.");
      return;
    }
    
    // Convert dueDate to ISO string or let the backend handle the format
    // the backend expects a standard string or handles empty
    const loanData = { user_id: userId, book_id: bookId, due_date: dueDate || undefined };
    createLoan.mutate(loanData, { onSuccess: onClose });
  };

  const isPending = createLoan.isPending;
  const isError = createLoan.isError;
  const error = createLoan.error;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isPending) onClose(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Loan</DialogTitle>
          <DialogDescription>
            Select a user and a book to create a new loan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user" className="text-right">
                User
              </Label>
              <select
                id="user"
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              >
                <option value="" disabled>Select a user</option>
                {users?.map(user => (
                  <option key={user.id} value={user.username}>
                    {user.username}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="book" className="text-right">
                Book
              </Label>
              <select
                id="book"
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                required
              >
                <option value="" disabled>Select a book</option>
                {books?.map(book => {
                  const unavailable = book.availableCopies <= 0;
                  return (
                    <option key={book.id} value={book.id} className={unavailable ? 'text-red-500' : ''}>
                      {book.title} - {book.author} {unavailable ? '(Unavailable)' : `(${book.availableCopies} available)`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">
                Return Date
              </Label>
              <input
                id="dueDate"
                type="datetime-local"
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            
            {isBookUnavailable && (
               <div className="text-red-500 text-sm mt-2 text-center">
                 Cannot create loan: Selected book has 0 available copies.
               </div>
            )}

          </div>
          {isError && (
             <div className="text-red-500 text-sm mb-4">
               Error: {(error as any)?.message || 'An error occurred'}
             </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || isBookUnavailable || !userId || !bookId}>
              {isPending ? 'Saving...' : 'Create Loan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
