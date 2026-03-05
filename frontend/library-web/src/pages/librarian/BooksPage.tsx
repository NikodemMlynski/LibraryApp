import { useState } from 'react';
import { BookList } from '@/components/features/Books/BookList';
import { BookFormModal } from '@/components/features/Books/BookFormModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const BooksPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Books Catalog</h1>
            <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add New Book
            </Button>
        </div>
        
        <BookList />

        {isModalOpen && (
            <BookFormModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
            />
        )}
    </div>
  );
}

export default BooksPage;