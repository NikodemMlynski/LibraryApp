import React from 'react';
import { useDeleteBook, type Book as BookType } from '@/hooks/useBooks';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Edit } from 'lucide-react';

interface BookProps {
  book: BookType;
  onEdit: (book: BookType) => void;
}

export const Book: React.FC<BookProps> = ({ book, onEdit }) => {
  const deleteBook = useDeleteBook();

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      deleteBook.mutate(book.id);
    }
  };

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-200 border border-gray-100 bg-white overflow-hidden">
      {book.coverImageUrl ? (
        <div className="w-full h-64 bg-gray-100 relative border-b border-gray-100">
          <img src={book.coverImageUrl} alt={`Cover for ${book.title}`} className="object-contain w-full h-full" />
        </div>
      ) : (
        <div className="w-full h-48 bg-gray-50 flex items-center justify-center border-b border-gray-100">
            <span className="text-gray-400 text-sm">No cover image</span>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-xl line-clamp-2 font-bold text-gray-800">{book.title}</CardTitle>
      </CardHeader>
      <CardContent className="grow">
        <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-500 uppercase tracking-wider text-xs block mb-1">Author</span> 
              <span className="text-gray-900">{book.author}</span>
            </p>
            <p className="text-sm text-gray-600 flex justify-between">
              <span>
                <span className="font-semibold text-gray-500 uppercase tracking-wider text-xs block mb-1">ISBN</span> 
                <span className="text-gray-900 font-mono text-sm">{book.isbn}</span>
              </span>
              <span>
                <span className="font-semibold text-gray-500 uppercase tracking-wider text-xs block mb-1 text-right">Copies</span> 
                <span className="text-gray-900 font-medium float-right">{book.availableCopies}</span>
              </span>
            </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 mt-auto pt-4 border-t border-gray-50">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1 hover:bg-gray-50 transition-colors"
          onClick={() => onEdit(book)}
        >
          <Edit className="w-4 h-4" />
          Edit
        </Button>
        <Button 
          variant="destructive" 
          size="sm" 
          className="flex items-center gap-1 hover:bg-red-600 transition-colors"
          onClick={handleDelete}
          disabled={deleteBook.isPending}
        >
          <Trash2 className="w-4 h-4" />
          {deleteBook.isPending ? 'Deleting...' : 'Delete'}
        </Button>
      </CardFooter>
    </Card>
  );
};
