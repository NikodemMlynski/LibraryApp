import { useState } from 'react';
import { useBooks, type Book as BookType } from '@/hooks/useBooks';
import { Book } from './Book';
import { BookFormModal } from './BookFormModal';

export const BookList = () => {
  const { data: books, isLoading, isError, error } = useBooks();
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
      {books && books.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
           No books found. Add some!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
          {books?.map((book) => (
            <Book key={book.id} book={book} onEdit={handleEdit} />
          ))}
        </div>
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