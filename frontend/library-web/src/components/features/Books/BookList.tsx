import React, { useState } from 'react';
import { useBooks, type Book as BookType } from '@/hooks/useBooks';
import { Book } from './Book';
import { BookFormModal } from './BookFormModal';

export const BookList = () => {
  const [page, setPage] = useState(0);
  const { data: paginatedBooks, isLoading, isError, error } = useBooks(page, 10);
  const [bookToEdit, setBookToEdit] = useState<BookType | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEdit = (book: BookType) => {
    setBookToEdit(book);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setBookToEdit(undefined), 300); // clear after animation
  };

  if (isLoading) {
    return <div className="flex justify-center items-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (isError) {
    return <div className="text-red-500 p-4 rounded-md bg-red-50 border border-red-200">Error loading books: {error?.message}</div>;
  }

  return (
    <>
      {paginatedBooks && paginatedBooks.content.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
           No books found. Add some!
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
            {paginatedBooks?.content.map((book) => (
              <Book key={book.id} book={book} onEdit={handleEdit} />
            ))}
          </div>
          
          {paginatedBooks && paginatedBooks.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button 
                onClick={() => setPage((p: number) => Math.max(0, p - 1))}
                disabled={paginatedBooks.first}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {paginatedBooks.number + 1} of {paginatedBooks.totalPages}
              </span>
              <button 
                onClick={() => setPage((p: number) => Math.min(paginatedBooks.totalPages - 1, p + 1))}
                disabled={paginatedBooks.last}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Edit Modal tied to the list just in case it's easier to handle here */}
      <BookFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        bookToEdit={bookToEdit}
      />
    </>
  );
};

export default BookList;