import { useState } from 'react';
import { useUsers, useUsersCount, useDeleteUser, useAddLibrarian } from '../../hooks/useUsers';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Search, Trash2, ChevronLeft, ChevronRight, UserX, UserPlus } from 'lucide-react';
import { useAuth } from 'react-oidc-context';

export default function AdminUsersPage() {
  // Stany paginacji i wyszukiwania
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [queryName, setQueryName] = useState('');
  
  // Stany akcji
  const [userToDelete, setUserToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Stan formularza nowego bibliotekarza
  const [newUserData, setNewUserData] = useState({
    username: '', email: '', firstName: '', lastName: '', password: ''
  });

  const auth = useAuth();
  const currentUserId = auth.user?.profile.sub;

  const { data: users, isLoading, isError, error } = useUsers(page, size, queryName);
  const { data: totalUsers = 0 } = useUsersCount(queryName);
  
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();
  const { mutate: addLibrarian, isPending: isAdding, error: addError } = useAddLibrarian();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQueryName(searchInput);
    setPage(0);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUser(userToDelete.id, {
        onSuccess: () => {
          setUserToDelete(null);
          if (users?.length === 1 && page > 0) {
            setPage(page - 1);
          }
        }
      });
    }
  };

  const handleAddLibrarian = (e: React.FormEvent) => {
    e.preventDefault();
    addLibrarian(newUserData, {
      onSuccess: () => {
        setIsAddModalOpen(false);
        setNewUserData({ username: '', email: '', firstName: '', lastName: '', password: '' }); // reset form
      }
    });
  };

  const totalPages = Math.ceil(totalUsers / size);

  return (
    <div className="flex flex-col h-full bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <p className="text-sm text-gray-500">Manage your system users, search, and revoke access.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add Librarian
        </Button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-md relative">
          <Input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Button type="submit" variant="secondary">Search</Button>
          {(queryName || searchInput) && (
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => {
                setSearchInput('');
                setQueryName('');
                setPage(0);
              }}
            >
              Clear
            </Button>
          )}
        </form>
        <div className="text-sm text-gray-500">
          Total Users: {totalUsers}
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex justify-center mb-2">
                    <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin"></div>
                  </div>
                  Loading users...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-red-500">
                  Error loading users: {error?.message}
                </td>
              </tr>
            ) : users?.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex justify-center mb-2">
                    <UserX className="h-8 w-8 text-gray-400" />
                  </div>
                  No users found matching your search.
                </td>
              </tr>
            ) : (
              users?.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold uppercase">
                        {(user.firstName?.[0] || user.username[0] || '?')} 
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName} 
                        </div>
                        <div className="text-sm text-gray-500">{user.email || 'No email provided'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.username}</div>
                    {user.id === currentUserId && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        You
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="ghost" 
                      onClick={() => setUserToDelete({ id: user.id, name: user.username })}
                      disabled={user.id === currentUserId}
                      className="text-red-600 hover:text-red-900 hover:bg-red-50"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginacja */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
        {/* ... (Pozostał kod paginacji bez zmian) ... */}
        <div className="flex-1 flex justify-between items-center sm:hidden">
          <Button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} variant="outline">
            Previous
          </Button>
          <Button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} variant="outline">
            Next
          </Button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{Math.min(page * size + 1, totalUsers)}</span> to{' '}
              <span className="font-medium">{Math.min((page + 1) * size, totalUsers)}</span> of{' '}
              <span className="font-medium">{totalUsers}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <Button variant="outline" className="relative inline-flex items-center px-2 py-2 rounded-l-md" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
                <span className="sr-only">Previous</span><ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                Page {page + 1} of {Math.max(1, totalPages)}
              </div>
              <Button variant="outline" className="relative inline-flex items-center px-2 py-2 rounded-r-md" disabled={page >= totalPages - 1 || totalPages === 0} onClick={() => setPage(p => p + 1)}>
                <span className="sr-only">Next</span><ChevronRight className="h-4 w-4" />
              </Button>
            </nav>
          </div>
        </div>
      </div>

      {/* MODAL: Usuwanie użytkownika */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user "{userToDelete?.name}"? This action cannot be undone and they will immediately lose access to the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setUserToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Dodawanie Librariana */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <form onSubmit={handleAddLibrarian}>
            <DialogHeader>
              <DialogTitle>Add New Librarian</DialogTitle>
              <DialogDescription>
                Create a new user account with librarian privileges.
              </DialogDescription>
            </DialogHeader>
            
            {addError && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm mt-2">
                {addError.message}
              </div>
            )}

            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Username *</label>
                <Input required value={newUserData.username} onChange={e => setNewUserData({...newUserData, username: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">First Name</label>
                  <Input value={newUserData.firstName} onChange={e => setNewUserData({...newUserData, firstName: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Last Name</label>
                  <Input value={newUserData.lastName} onChange={e => setNewUserData({...newUserData, lastName: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Email *</label>
                <Input type="email" required value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Temporary Password *</label>
                <Input type="password" required minLength={5} value={newUserData.password} onChange={e => setNewUserData({...newUserData, password: e.target.value})} />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isAdding}>
                {isAdding ? 'Creating...' : 'Create Librarian'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}