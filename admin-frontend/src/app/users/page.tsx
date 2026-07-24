'use client';

import { useEffect, useState } from 'react';
import { getAdminUsers, createAdminUser, updateAdminUser, updateAdminUserWallet, User } from '@/lib/api';
import { UserPlus, Edit2, Search, X, Eye, EyeOff } from 'lucide-react';
import Swal from 'sweetalert2';

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const pageSize = 10;

    // Form state
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        profile: {
            phone_number: '',
            address: '',
            usertype: 'user'
        }
    });

    const [showPassword, setShowPassword] = useState(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [walletData, setWalletData] = useState({
        credit_limit: '',
        wallet_balance: '',
        total_dues: '',
        remarks: ''
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // ... existing fetchUsers ...
    useEffect(() => {
        fetchUsers(currentPage, debouncedSearch);
    }, [currentPage, debouncedSearch]);

    const fetchUsers = async (page: number = 1, search: string = '') => {
        setLoading(true);
        try {
            const data = await getAdminUsers(page, search);
            setUsers(data.results);
            setTotalCount(data.count);
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (user: User | null = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                username: user.username,
                email: user.email,
                password: '', // Don't show password
                profile: {
                    phone_number: user.profile?.phone_number || '',
                    address: user.profile?.address || '',
                    usertype: user.profile?.usertype || 'user'
                }
            });
        } else {
            setEditingUser(null);
            setFormData({
                username: '',
                email: '',
                password: '',
                profile: {
                    phone_number: '',
                    address: '',
                    usertype: 'user'
                }
            });
        }
        setIsModalOpen(true);
        setShowPassword(false);
    };

    const openWalletModal = (user: User) => {
        setEditingUser(user);
        setWalletData({
            credit_limit: user.profile?.credit_limit?.toString() || '0',
            wallet_balance: user.profile?.wallet_balance?.toString() || '0',
            total_dues: user.profile?.total_dues?.toString() || '0',
            remarks: ''
        });
        setIsWalletModalOpen(true);
    };

    const handleWalletSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        try {
            await updateAdminUserWallet(editingUser.id, {
                credit_limit: parseFloat(walletData.credit_limit),
                wallet_balance: parseFloat(walletData.wallet_balance),
                total_dues: parseFloat(walletData.total_dues),
                remarks: walletData.remarks.trim() || undefined
            });
            Swal.fire({
                icon: 'success',
                title: 'Wallet updated successfully',
                timer: 1500,
                showConfirmButton: false
            });
            setIsWalletModalOpen(false);
            fetchUsers(currentPage, debouncedSearch);
        } catch (error: any) {
            Swal.fire('Error', error.message || 'Action failed', 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = await Swal.fire({
            title: `Are you sure you want to ${editingUser ? 'update' : 'create'} this user?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: editingUser ? 'Yes, update' : 'Yes, create',
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#64748b',
        });

        if (!result.isConfirmed) return;

        try {
            const finalData = {
                ...formData,
                username: formData.username.toLowerCase(),
                email: formData.email
            };

            if (editingUser) {
                // Remove password from update if empty
                const updateData = { ...finalData };
                if (!updateData.password) delete (updateData as any).password;
                await updateAdminUser(editingUser.id, updateData);
                Swal.fire({
                    icon: 'success',
                    title: 'User updated successfully',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await createAdminUser(finalData);
                Swal.fire({
                    icon: 'success',
                    title: 'User created successfully',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            setIsModalOpen(false);
            fetchUsers(currentPage, debouncedSearch);
        } catch (error: any) {
            Swal.fire('Error', error.message || 'Action failed', 'error');
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="pt-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
                    <p className="text-slate-500 text-sm mt-1">Manage non-admin travelers and customers</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="text-slate-700 pl-10 pr-12 py-3 border border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                        />
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all border border-slate-400"
                    >
                        <UserPlus className="w-5 h-5" />
                        Add User
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 font-medium text-slate-500">Username</th>
                            <th className="px-6 py-4 font-medium text-slate-500">Email</th>
                            <th className="px-6 py-4 font-medium text-slate-500">Wallet</th>
                            <th className="px-6 py-4 font-medium text-slate-500">Credit Limit</th>
                            <th className="px-6 py-4 font-medium text-slate-500">Dues</th>
                            <th className="px-6 py-4 font-medium text-slate-500">Joined</th>
                            <th className="px-6 py-4 font-medium text-slate-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && users.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span>Loading users...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                    No users found.
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-900">{user.username}</td>
                                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                                    <td className="px-6 py-4 font-medium text-green-600">
                                        ₹{parseFloat(user.profile?.wallet_balance?.toString() || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        ₹{parseFloat(user.profile?.credit_limit?.toString() || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-red-500">
                                        ₹{parseFloat(user.profile?.total_dues?.toString() || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openWalletModal(user)}
                                                className="cursor-pointer px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-bold transition-colors"
                                                title="Manage Wallet"
                                            >
                                                Wallet
                                            </button>
                                            <button
                                                onClick={() => openModal(user)}
                                                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                            >
                                                <Edit2 className="w-4 h-4 cursor-pointer" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {!loading && (
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                            Page {currentPage} of {Math.max(1, totalPages)} ({totalCount} users)
                        </span>
                        <div className="text-slate-700 flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* User Details Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-800">
                                {editingUser ? 'Edit User' : 'Add New User'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 cursor-pointer" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {editingUser ? 'Password (leave blank to keep current)' : 'Password'}
                                </label>
                                <div className="relative">
                                    <input
                                        required={!editingUser}
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                                <input
                                    type="text"
                                    value={formData.profile.phone_number}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        profile: { ...formData.profile, phone_number: e.target.value }
                                    })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                                <textarea
                                    value={formData.profile.address}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        profile: { ...formData.profile, address: e.target.value }
                                    })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 text-slate-900"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200 cursor-pointer"
                                >
                                    {editingUser ? 'Update User' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Wallet Management Modal */}
            {isWalletModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-xl font-bold text-slate-800">
                                Manage Wallet
                            </h3>
                            <button
                                onClick={() => setIsWalletModalOpen(false)}
                                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 cursor-pointer" />
                            </button>
                        </div>
                        <div className="px-6 py-2 bg-blue-50 border-b border-blue-100">
                            <p className="text-sm text-blue-800 font-medium">User: {editingUser?.username}</p>
                        </div>

                        <form onSubmit={handleWalletSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Credit Limit</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={walletData.credit_limit}
                                        onChange={(e) => setWalletData({ ...walletData, credit_limit: e.target.value })}
                                        className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Maximum credit allowed for this broker.</p>
                            </div>

                            {/* Allow editing Balance and Dues manually too - giving full control to admin */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Wallet Balance</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={walletData.wallet_balance}
                                        onChange={(e) => setWalletData({ ...walletData, wallet_balance: e.target.value })}
                                        className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Total Dues</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={walletData.total_dues}
                                        onChange={(e) => setWalletData({ ...walletData, total_dues: e.target.value })}
                                        className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks <span className="text-slate-400 font-normal">(optional)</span></label>
                                <textarea
                                    value={walletData.remarks}
                                    onChange={(e) => setWalletData({ ...walletData, remarks: e.target.value })}
                                    placeholder="Add a note for this adjustment..."
                                    rows={3}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 resize-none text-sm"
                                />
                                <p className="text-xs text-slate-500 mt-1">This note will be visible to the user in their transaction history.</p>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsWalletModalOpen(false)}
                                    className="px-6 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200 cursor-pointer"
                                >
                                    Save Wallet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
