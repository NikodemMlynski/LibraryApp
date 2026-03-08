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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateBook, useUpdateBook, type Book } from '@/hooks/useBooks';

interface BookFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookToEdit?: Book;
}

export const BookFormModal: React.FC<BookFormModalProps> = ({ isOpen, onClose, bookToEdit }) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [availableCopies, setAvailableCopies] = useState(1);
  const [file, setFile] = useState<File | null>(null);

  const createBook = useCreateBook();
  const updateBook = useUpdateBook();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (bookToEdit) {
      setTitle(bookToEdit.title);
      setAuthor(bookToEdit.author);
      setIsbn(bookToEdit.isbn);
      setAvailableCopies(bookToEdit.availableCopies);
      setFile(bookToEdit.coverImageUrl as unknown as File);
    } else {
      setTitle('');
      setAuthor('');
      setIsbn('');
      setAvailableCopies(1);
      setFile(null);
    }
  }, [bookToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bookToEdit) {
      updateBook.mutate(
        { id: bookToEdit.id, title, author, isbn, availableCopies, file },
        { onSuccess: onClose }
      );
    } else {
      createBook.mutate(
        { title, author, isbn, availableCopies, file },
        { onSuccess: onClose }
      );
    }
  };

  const isPending = createBook.isPending || updateBook.isPending;
  const isError = createBook.isError || updateBook.isError;
  const error = createBook.error || updateBook.error;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isPending) onClose(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{bookToEdit ? 'Edit Book' : 'Add New Book'}</DialogTitle>
          <DialogDescription>
            {bookToEdit ? 'Update the details of the book.' : 'Fill out the form below to add a new book to the catalog.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="author" className="text-right">
                Author
              </Label>
              <Input
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isbn" className="text-right">
                ISBN
              </Label>
              <Input
                id="isbn"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="availableCopies" className="text-right">
                Copies
              </Label>
              <Input
                id="availableCopies"
                type="number"
                min="0"
                value={availableCopies}
                onChange={(e) => setAvailableCopies(parseInt(e.target.value) || 0)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="file" className="text-right">
                Cover Image
              </Label>
              <Input
                id="file"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="col-span-3"
              />
            </div>
          </div>
          {isError && (
             <div className="text-red-500 text-sm mb-4">
               Error: {error?.message || 'An error occurred'}
             </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
