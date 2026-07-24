'use client';

import { useState, useEffect } from 'react';
import { getAdminTopUpRequests, processTopUpRequest, TopUpRequest, PaginatedResponse, getAdminUsers, getAdminTransactions, User as ApiUser, WalletTransaction } from '@/lib/api';
import { Wallet, Search, CheckCircle, XCircle, Clock, Filter, User as UserIcon, History, ArrowUpRight, ArrowDownLeft, RotateCcw, CreditCard } from 'lucide-react';
import Swal from 'sweetalert2';

export default function TopUpRequestsPage() {
    const [requests, setRequests] = useState<TopUpRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'TOPUPS' | 'TRANSACTIONS'>('TOPUPS');

    // New states for Transactions
    const [users, setUsers] = useState<ApiUser[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);
    const [transactionSearch, setTransactionSearch] = useState('');
    const [transactionPage, setTransactionPage] = useState(1);
    const [totalTransactionPages, setTotalTransactionPages] = useState(1);

    useEffect(() => {
        fetchRequests();
    }, [page, statusFilter, search]);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [selectedUserId, transactionSearch, transactionPage]);

    const fetchUsers = async () => {
        try {
            const data = await getAdminUsers(1, '');
            setUsers(data.results);
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const fetchTransactions = async () => {
        setLoadingTransactions(true);
        try {
            const data = await getAdminTransactions(selectedUserId, transactionSearch, transactionPage);
            setTransactions(data.results);
            setTotalTransactionPages(Math.ceil(data.count / 10)); // Assuming 10 per page
        } catch (error) {
            console.error('Failed to fetch transactions', error);
        } finally {
            setLoadingTransactions(false);
        }
    };

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const data = await getAdminTopUpRequests(page, search, statusFilter);
            setRequests(data.results);
            setTotalPages(Math.ceil(data.count / 10)); // Assuming 10 per page
        } catch (error) {
            console.error('Failed to fetch top-up requests', error);
            Swal.fire('Error', 'Failed to load top-up requests', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    const handleAction = async (requestId: number, action: 'APPROVE' | 'REJECT') => {
        const result = await Swal.fire({
            title: action === 'APPROVE' ? 'Approve Top-up' : 'Reject Top-up',
            html: `
                <p class="text-sm text-slate-600 mb-4">Are you sure you want to ${action.toLowerCase()} this top-up request?</p>
                <textarea id="swal-remarks" class="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" rows="3" placeholder="Remarks (optional)..."></textarea>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: action === 'APPROVE' ? '#16a34a' : '#dc2626',
            confirmButtonText: action === 'APPROVE' ? 'Yes, Approve' : 'Yes, Reject',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                const el = document.getElementById('swal-remarks') as HTMLTextAreaElement;
                return el?.value?.trim() || '';
            }
        });

        if (!result.isConfirmed) return;

        const remarks = result.value as string;

        setProcessingId(requestId);
        try {
            await processTopUpRequest(requestId, action, remarks);
            Swal.fire('Success', `Request ${action.toLowerCase()}d successfully`, 'success');
            fetchRequests(); // Refresh
        } catch (error: any) {
            Swal.fire('Error', error.message || 'Operation failed', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <Wallet className="text-blue-600" size={32} />
                        Transactions & Top-ups
                    </h1>
                    <p className="text-slate-500 mt-1">Manage top-up requests and audit all wallet transactions.</p>
                </div>

                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
                    <button
                        onClick={() => setActiveTab('TOPUPS')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            activeTab === 'TOPUPS' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Top-up Requests
                    </button>
                    <button
                        onClick={() => setActiveTab('TRANSACTIONS')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            activeTab === 'TRANSACTIONS' 
                            ? 'bg-white text-indigo-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Wallet Transactions
                    </button>
                </div>
            </div>

            {activeTab === 'TOPUPS' ? (
                <>
                    {/* Filters and search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by username or email..."
                        className="text-slate-700 w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <Filter className="text-slate-400" size={18} />
                    <select
                        className="flex-1 lg:w-48 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-600 font-medium"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">All Statuses</option>
                        <option value="PENDING">Pending Only</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Requests Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Method</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Requested At</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                                        No top-up requests found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                requests.map((request) => (
                                    <tr key={request.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0">
                                                    {request.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{request.username}</p>
                                                    <p className="text-xs text-slate-500">{request.user_email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-lg font-extrabold text-slate-800">
                                                ₹{parseFloat(request.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                                request.method === 'RAZORPAY' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-100 text-slate-700 border-slate-200'
                                            }`}>
                                                {request.method}
                                            </span>
                                            {request.razorpay_payment_id && (
                                                <p className="text-[10px] text-slate-400 mt-1 font-mono">ID: {request.razorpay_payment_id}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                                                request.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                request.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
                                                'bg-red-50 text-red-700 border-red-200'
                                            }`}>
                                                {request.status === 'PENDING' && <Clock size={12} />}
                                                {request.status === 'APPROVED' && <CheckCircle size={12} />}
                                                {request.status === 'REJECTED' && <XCircle size={12} />}
                                                {request.status}
                                            </span>
                                            {request.user_remarks && (
                                                <p className="text-[11px] text-blue-600 italic mt-1.5 max-w-[180px] truncate" title={`User: ${request.user_remarks}`}>
                                                    User: {request.user_remarks}
                                                </p>
                                            )}
                                            {request.remarks && (
                                                <p className="text-[11px] text-slate-500 italic mt-1 max-w-[180px] truncate" title={`Admin: ${request.remarks}`}>
                                                    Admin: {request.remarks}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(request.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {request.status === 'PENDING' ? (
                                                <div className="flex items-center justify-end gap-2 text-xs font-bold">
                                                    <button
                                                        onClick={() => handleAction(request.id, 'APPROVE')}
                                                        disabled={processingId === request.id}
                                                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm shadow-green-100 disabled:opacity-50"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(request.id, 'REJECT')}
                                                        disabled={processingId === request.id}
                                                        className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-xs italic">
                                                    Processed {new Date(request.updated_at).toLocaleDateString()}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                        <p className="text-sm text-slate-500 font-medium">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex gap-2 font-bold text-xs">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
            </>
            ) : (
            <>
            {/* Recent Transactions Section */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <History size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Transaction Audit Log</h2>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select
                                value={selectedUserId}
                                onChange={(e) => { setSelectedUserId(e.target.value); setTransactionPage(1); }}
                                className="pl-10 pr-8 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                            >
                                <option value="">All Users</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search transactions..."
                                value={transactionSearch}
                                onChange={(e) => { setTransactionSearch(e.target.value); setTransactionPage(1); }}
                                className="pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 font-medium text-slate-500">Transaction Info</th>
                                    <th className="px-6 py-4 font-medium text-slate-500">Date & Time</th>
                                    <th className="px-6 py-4 font-medium text-slate-500">Type</th>
                                    <th className="px-6 py-4 font-medium text-slate-500">Amount</th>
                                    <th className="px-6 py-4 font-medium text-slate-500">Reference</th>
                                    <th className="px-6 py-4 font-medium text-slate-500 text-right">Balances</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loadingTransactions ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                                <span>Fetching transactions...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            No transactions found for the selected criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${
                                                        tx.description.toLowerCase().includes('refund')
                                                            ? 'bg-blue-100 text-blue-600'
                                                            : tx.description.toLowerCase().includes('razorpay')
                                                                ? 'bg-indigo-100 text-indigo-600'
                                                                : tx.transaction_type === 'CREDIT'
                                                                    ? 'bg-green-100 text-green-600'
                                                                    : 'bg-red-100 text-red-600'
                                                    }`}>
                                                        {tx.description.toLowerCase().includes('refund') ? (
                                                            <RotateCcw size={16} />
                                                        ) : tx.description.toLowerCase().includes('razorpay') ? (
                                                            <CreditCard size={16} />
                                                        ) : tx.transaction_type === 'CREDIT' ? (
                                                            <ArrowDownLeft size={16} />
                                                        ) : (
                                                            <ArrowUpRight size={16} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800">{tx.description}</div>
                                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">User ID: {tx.user}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {new Date(tx.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                    tx.transaction_type === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {tx.transaction_type}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 font-bold ${tx.transaction_type === 'CREDIT' ? 'text-green-600' : 'text-slate-900'}`}>
                                                {tx.transaction_type === 'CREDIT' ? '+' : '-'} ₹{parseFloat(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-400">
                                                {tx.transaction_id || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-xs font-bold text-slate-700">Bal: ₹{parseFloat(tx.balance_after).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                                <div className="text-[10px] text-slate-400">Dues: ₹{parseFloat(tx.dues_after).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Transaction Pagination */}
                {totalTransactionPages > 1 && (
                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                        <p className="text-sm text-slate-500 font-medium">
                            Page {transactionPage} of {totalTransactionPages}
                        </p>
                        <div className="flex gap-2 font-bold text-xs">
                            <button
                                onClick={() => setTransactionPage(p => Math.max(1, p - 1))}
                                disabled={transactionPage === 1}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setTransactionPage(p => Math.min(totalTransactionPages, p + 1))}
                                disabled={transactionPage === totalTransactionPages}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
            </>
            )}
        </div>
    );
}
