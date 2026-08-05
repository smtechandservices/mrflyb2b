'use client';

import { useState, useEffect } from 'react';
import { getAdminTopUpRequests, processTopUpRequest, TopUpRequest, PaginatedResponse, getAdminUsers, getAdminTransactions, User as ApiUser, WalletTransaction } from '@/lib/api';
import { Wallet, Search, CheckCircle, XCircle, Clock, Filter, User as UserIcon, History, ArrowUpRight, ArrowDownLeft, RotateCcw, CreditCard } from 'lucide-react';
import Swal from 'sweetalert2';

const selectStyle: React.CSSProperties = {
    padding: '9px 12px',
    border: '1px solid var(--line-2)',
    background: 'var(--paper)',
    borderRadius: 'var(--radius)',
    fontSize: 13.5,
    fontFamily: 'var(--sans)',
    color: 'var(--ink)',
    outline: 'none',
};

// Map arbitrary backend status strings onto the 3 semantic .status pill variants.
function statusVariant(status: string): 'confirmed' | 'pending' | 'cancelled' {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED' || s === 'CREDIT') return 'confirmed';
    if (s === 'PENDING') return 'pending';
    return 'cancelled';
}

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
                <p style="font-size:13px; color:var(--muted); margin:0 0 12px; text-align:left;">Are you sure you want to ${action.toLowerCase()} this top-up request?</p>
                <textarea id="swal-remarks" style="width:100%; border:1px solid var(--line-2); border-radius:4px; padding:10px 12px; font-size:13px; color:var(--ink); font-family:var(--sans); resize:none; outline:none;" rows="3" placeholder="Remarks (optional)…"></textarea>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: action === 'APPROVE' ? '#1f3b30' : '#b8443a',
            confirmButtonText: action === 'APPROVE' ? 'Yes, Approve' : 'Yes, Reject',
            cancelButtonColor: '#756e63',
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
        <>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, marginBottom: 24 }}>
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        Transactions &amp; Top-ups
                    </h2>
                    <p className="sub" style={{ margin: '6px 0 0' }}>Manage top-up requests and audit all wallet transactions.</p>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                    <button
                        onClick={() => setActiveTab('TOPUPS')}
                        className="btn btn-sm btn-ghost"
                        style={activeTab === 'TOPUPS' ? { background: 'var(--forest)', color: 'var(--paper)', borderColor: 'var(--forest)' } : undefined}
                    >
                        Top-up Requests
                    </button>
                    <button
                        onClick={() => setActiveTab('TRANSACTIONS')}
                        className="btn btn-sm btn-ghost"
                        style={activeTab === 'TRANSACTIONS' ? { background: 'var(--forest)', color: 'var(--paper)', borderColor: 'var(--forest)' } : undefined}
                    >
                        Wallet Transactions
                    </button>
                </div>
            </div>

            {activeTab === 'TOPUPS' ? (
                <>
                    {/* Filters and search */}
                    <div className="panel" style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', marginBottom: 20 }}>
                        <div className="admin-search" style={{ flex: 1, minWidth: 240 }}>
                            <Search size={14} color="var(--muted)" />
                            <input
                                type="text"
                                placeholder="Search by username or email…"
                                value={search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                style={{ border: 'none', outline: 'none', background: 'transparent', font: 'inherit', color: 'inherit', width: '100%' }}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Filter size={14} color="var(--muted)" />
                            <select
                                style={{ ...selectStyle, width: 180 }}
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
                    <div className="panel">
                        <div style={{ overflowX: 'auto' }}>
                            <table className="dtable" style={{ whiteSpace: 'nowrap' }}>
                                <thead>
                                    <tr>
                                        <th>Agent Details</th>
                                        <th style={{ textAlign: 'right' }}>Amount</th>
                                        <th>Method</th>
                                        <th>Status</th>
                                        <th>Requested At</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                                                Loading top-up requests…
                                            </td>
                                        </tr>
                                    ) : requests.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)', fontStyle: 'italic' }}>
                                                No top-up requests found matching your criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        requests.map((request) => (
                                            <tr key={request.id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--forest)', fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                                                            {request.username.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{request.username}</div>
                                                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{request.user_email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
                                                    ₹{parseFloat(request.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td>
                                                    <span className="tag" style={{ padding: '3px 9px', fontSize: 10, fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>
                                                        {request.method}
                                                    </span>
                                                    {request.razorpay_payment_id && (
                                                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>ID: {request.razorpay_payment_id}</div>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`status ${statusVariant(request.status)}`}>
                                                        <span className="d"></span>
                                                        {request.status === 'PENDING' && <Clock size={11} />}
                                                        {request.status === 'APPROVED' && <CheckCircle size={11} />}
                                                        {request.status === 'REJECTED' && <XCircle size={11} />}
                                                        {request.status}
                                                    </span>
                                                    {request.user_remarks && (
                                                        <p style={{ fontSize: 11, color: 'var(--clay)', fontStyle: 'italic', marginTop: 6, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`User: ${request.user_remarks}`}>
                                                            User: {request.user_remarks}
                                                        </p>
                                                    )}
                                                    {request.remarks && (
                                                        <p style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginTop: 4, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`Admin: ${request.remarks}`}>
                                                            Admin: {request.remarks}
                                                        </p>
                                                    )}
                                                </td>
                                                <td style={{ fontSize: 13, color: 'var(--ink-2)', fontFamily: 'var(--mono)' }}>
                                                    {new Date(request.created_at).toLocaleString()}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    {request.status === 'PENDING' ? (
                                                        <div style={{ display: 'inline-flex', gap: 8 }}>
                                                            <button
                                                                onClick={() => handleAction(request.id, 'APPROVE')}
                                                                disabled={processingId === request.id}
                                                                className="btn btn-primary btn-sm"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleAction(request.id, 'REJECT')}
                                                                disabled={processingId === request.id}
                                                                className="btn btn-ghost btn-sm"
                                                                style={{ color: '#b8443a' }}
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', fontFamily: 'var(--mono)' }}>
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
                            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
                                    Page {page} of {totalPages}
                                </span>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="btn btn-ghost btn-sm"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="btn btn-ghost btn-sm"
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
                    {/* Transaction Audit Log */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <History size={18} style={{ color: 'var(--clay)' }} />
                            <h3 style={{ margin: 0, fontSize: 20 }}>Transaction Audit Log</h3>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                            <select
                                value={selectedUserId}
                                onChange={(e) => { setSelectedUserId(e.target.value); setTransactionPage(1); }}
                                style={{ ...selectStyle, width: 220 }}
                            >
                                <option value="">All Agents</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                                ))}
                            </select>

                            <div className="admin-search" style={{ width: 220 }}>
                                <Search size={14} color="var(--muted)" />
                                <input
                                    type="text"
                                    placeholder="Search transactions…"
                                    value={transactionSearch}
                                    onChange={(e) => { setTransactionSearch(e.target.value); setTransactionPage(1); }}
                                    style={{ border: 'none', outline: 'none', background: 'transparent', font: 'inherit', color: 'inherit', width: '100%' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="panel">
                        <div style={{ overflowX: 'auto' }}>
                            <table className="dtable" style={{ whiteSpace: 'nowrap' }}>
                                <thead>
                                    <tr>
                                        <th>Transaction Info</th>
                                        <th>Date &amp; Time</th>
                                        <th>Type</th>
                                        <th style={{ textAlign: 'right' }}>Amount</th>
                                        <th>Reference</th>
                                        <th style={{ textAlign: 'right' }}>Balances</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingTransactions ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                                                Fetching transactions…
                                            </td>
                                        </tr>
                                    ) : transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                                                No transactions found for the selected criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.map((tx) => {
                                            const isRefund = tx.description.toLowerCase().includes('refund');
                                            const isRazorpay = tx.description.toLowerCase().includes('razorpay');
                                            const isCredit = tx.transaction_type === 'CREDIT';
                                            return (
                                                <tr key={tx.id}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div style={{
                                                                width: 32, height: 32, borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                                background: isRefund || isRazorpay ? 'var(--sand)' : (isCredit ? 'rgba(31,122,77,0.1)' : 'rgba(184,68,58,0.1)'),
                                                                color: isRefund || isRazorpay ? 'var(--forest)' : (isCredit ? '#1f7a4d' : '#b8443a'),
                                                            }}>
                                                                {isRefund ? <RotateCcw size={15} /> : isRazorpay ? <CreditCard size={15} /> : isCredit ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{tx.description}</div>
                                                                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Agent ID: {tx.user}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--ink-2)' }}>
                                                        {new Date(tx.timestamp).toLocaleString()}
                                                    </td>
                                                    <td>
                                                        <span className={`status ${isCredit ? 'confirmed' : 'cancelled'}`}>
                                                            <span className="d"></span>{tx.transaction_type}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600, color: isCredit ? '#1f7a4d' : 'var(--ink)' }}>
                                                        {isCredit ? '+' : '−'} ₹{parseFloat(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
                                                        {tx.transaction_id || '-'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>
                                                        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>Bal: ₹{parseFloat(tx.balance_after).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                                        <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>Dues: ₹{parseFloat(tx.dues_after).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Transaction Pagination */}
                        {totalTransactionPages > 1 && (
                            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
                                    Page {transactionPage} of {totalTransactionPages}
                                </span>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={() => setTransactionPage(p => Math.max(1, p - 1))}
                                        disabled={transactionPage === 1}
                                        className="btn btn-ghost btn-sm"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setTransactionPage(p => Math.min(totalTransactionPages, p + 1))}
                                        disabled={transactionPage === totalTransactionPages}
                                        className="btn btn-ghost btn-sm"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </>
    );
}
