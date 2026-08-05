'use client';

import { useEffect, useState } from 'react';
import { getAdminUsers, createAdminUser, updateAdminUser, updateAdminUserWallet, User } from '@/lib/api';
import { UserPlus, Edit2, Search, X, Eye, EyeOff } from 'lucide-react';
import Swal from 'sweetalert2';

const textareaStyle: React.CSSProperties = {
    padding: '12px 14px',
    border: '1px solid var(--line-2)',
    background: 'var(--paper)',
    borderRadius: 'var(--radius)',
    fontSize: 14,
    fontFamily: 'var(--sans)',
    color: 'var(--ink)',
    outline: 'none',
    resize: 'vertical',
};

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
            title: `Are you sure you want to ${editingUser ? 'update' : 'create'} this agent?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: editingUser ? 'Yes, update' : 'Yes, create',
            confirmButtonColor: '#1f3b30',
            cancelButtonColor: '#756e63',
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
                    title: 'Agent updated successfully',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await createAdminUser(finalData);
                Swal.fire({
                    icon: 'success',
                    title: 'Agent created successfully',
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
        <>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, marginBottom: 24 }}>
                <div>
                    <h2>Agent Management</h2>
                    <p className="sub" style={{ margin: '6px 0 0' }}>Manage agent accounts on the platform.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="admin-search" style={{ width: 240 }}>
                        <Search size={14} color="var(--muted)" />
                        <input
                            type="text"
                            placeholder="Search agents…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', background: 'transparent', font: 'inherit', color: 'inherit', width: '100%' }}
                        />
                    </div>
                    <button onClick={() => openModal()} className="btn btn-primary btn-sm">
                        <UserPlus size={14} /> Add Agent
                    </button>
                </div>
            </div>

            <div className="panel">
                <div style={{ overflowX: 'auto' }}>
                    <table className="dtable" style={{ whiteSpace: 'nowrap' }}>
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Email</th>
                                <th style={{ textAlign: 'right' }}>Wallet</th>
                                <th style={{ textAlign: 'right' }}>Credit Limit</th>
                                <th style={{ textAlign: 'right' }}>Dues</th>
                                <th>Joined</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                                        Loading agents…
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                                        No agents found.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id}>
                                        <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{user.username}</td>
                                        <td style={{ color: 'var(--ink-2)' }}>{user.email}</td>
                                        <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 500, color: '#1f7a4d' }}>
                                            ₹{parseFloat(user.profile?.wallet_balance?.toString() || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--ink-2)' }}>
                                            ₹{parseFloat(user.profile?.credit_limit?.toString() || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 500, color: '#b8443a' }}>
                                            ₹{parseFloat(user.profile?.total_dues?.toString() || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--ink-2)' }}>
                                            {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                                <button
                                                    onClick={() => openWalletModal(user)}
                                                    className="btn btn-ghost btn-sm"
                                                    title="Manage Wallet"
                                                >
                                                    Wallet
                                                </button>
                                                <button
                                                    onClick={() => openModal(user)}
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ padding: 6 }}
                                                    title="Edit agent"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && (
                    <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
                            Page {currentPage} of {Math.max(1, totalPages)} ({totalCount} agents)
                        </span>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="btn btn-ghost btn-sm"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                className="btn btn-ghost btn-sm"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* User Details Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={16} /></button>
                        <h3>{editingUser ? 'Edit Agent' : 'Add New Agent'}</h3>
                        <p className="modal-sub">Account details for this agent / broker.</p>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="field-group">
                                <label>Username</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                            <div className="field-group">
                                <label>Email</label>
                                <input
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="field-group" style={{ position: 'relative' }}>
                                <label>{editingUser ? 'Password (leave blank to keep current)' : 'Password'}</label>
                                <input
                                    required={!editingUser}
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    style={{ paddingRight: 38 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    style={{ position: 'absolute', right: 10, top: 30, background: 'transparent', border: 0, color: 'var(--muted)', display: 'flex', padding: 2 }}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="field-group">
                                <label>Phone Number</label>
                                <input
                                    type="text"
                                    value={formData.profile.phone_number}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        profile: { ...formData.profile, phone_number: e.target.value }
                                    })}
                                />
                            </div>
                            <div className="field-group">
                                <label>Address</label>
                                <textarea
                                    value={formData.profile.address}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        profile: { ...formData.profile, address: e.target.value }
                                    })}
                                    rows={3}
                                    style={textareaStyle}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingUser ? 'Update Agent' : 'Create Agent'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Wallet Management Modal */}
            {isWalletModalOpen && (
                <div className="modal-overlay" onClick={() => setIsWalletModalOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setIsWalletModalOpen(false)}><X size={16} /></button>
                        <h3>Manage Wallet</h3>
                        <p className="modal-sub">
                            Agent: <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>{editingUser?.username}</strong>
                        </p>

                        <form onSubmit={handleWalletSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="field-group">
                                <label>Credit Limit</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 14 }}>₹</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={walletData.credit_limit}
                                        onChange={(e) => setWalletData({ ...walletData, credit_limit: e.target.value })}
                                        style={{ paddingLeft: 26 }}
                                    />
                                </div>
                                <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>Maximum credit allowed for this broker.</p>
                            </div>

                            {/* Allow editing Balance and Dues manually too - giving full control to admin */}
                            <div className="field-group">
                                <label>Wallet Balance</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 14 }}>₹</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={walletData.wallet_balance}
                                        onChange={(e) => setWalletData({ ...walletData, wallet_balance: e.target.value })}
                                        style={{ paddingLeft: 26 }}
                                    />
                                </div>
                            </div>

                            <div className="field-group">
                                <label>Total Dues</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 14 }}>₹</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={walletData.total_dues}
                                        onChange={(e) => setWalletData({ ...walletData, total_dues: e.target.value })}
                                        style={{ paddingLeft: 26 }}
                                    />
                                </div>
                            </div>

                            <div className="field-group">
                                <label>Remarks (Optional)</label>
                                <textarea
                                    value={walletData.remarks}
                                    onChange={(e) => setWalletData({ ...walletData, remarks: e.target.value })}
                                    placeholder="Add a note for this adjustment…"
                                    rows={3}
                                    style={textareaStyle}
                                />
                                <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>This note will be visible to the agent in their transaction history.</p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                                <button type="button" onClick={() => setIsWalletModalOpen(false)} className="btn btn-ghost">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Save Wallet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
