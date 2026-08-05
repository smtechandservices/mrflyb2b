'use client';

import { useEffect, useState } from 'react';
import { getAdminKYCs, updateKYCStatus, User } from '@/lib/api';
import { Shield, ShieldAlert, Search, Check, X, User as UserIcon, Calendar, FileText, Eye } from 'lucide-react';
import Swal from 'sweetalert2';

const STATUS_TABS = ['SUBMITTED', 'VERIFIED', 'REJECTED', ''];

function statusVariant(status: string) {
    if (status === 'VERIFIED') return 'confirmed';
    if (status === 'REJECTED') return 'cancelled';
    return 'pending';
}

export default function KYCManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [filterStatus, setFilterStatus] = useState<string>('SUBMITTED');
    const [selectedDoc, setSelectedDoc] = useState<{ url: string, title: string } | null>(null);
    const pageSize = 10;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchKYCs(currentPage, debouncedSearch, filterStatus);
    }, [currentPage, debouncedSearch, filterStatus]);

    const fetchKYCs = async (page: number = 1, search: string = '', status: string = '') => {
        setLoading(true);
        try {
            const data = await getAdminKYCs(page, search, status);
            setUsers(data.results);
            setTotalCount(data.count);
        } catch (error) {
            console.error('Failed to fetch KYC submissions', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (userId: number, action: 'APPROVE' | 'REJECT', username: string) => {
        const result = await Swal.fire({
            title: `${action === 'APPROVE' ? 'Approve' : 'Reject'} KYC?`,
            text: `Are you sure you want to ${action.toLowerCase()} the KYC for ${username}?`,
            icon: action === 'APPROVE' ? 'success' : 'warning',
            showCancelButton: true,
            confirmButtonColor: action === 'APPROVE' ? '#1f3b30' : '#b8443a',
            cancelButtonColor: '#756e63',
            confirmButtonText: `Yes, ${action.toLowerCase()} it!`
        });

        if (result.isConfirmed) {
            try {
                await updateKYCStatus(userId, action);
                Swal.fire({
                    icon: 'success',
                    title: `KYC ${action.toLowerCase()}d`,
                    showConfirmButton: false,
                    timer: 1500
                });
                fetchKYCs(currentPage, debouncedSearch, filterStatus);
            } catch (error: any) {
                Swal.fire('Error', error.message || 'Action failed', 'error');
            }
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="admin-content">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, marginBottom: 28 }}>
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Shield size={26} style={{ color: 'var(--clay)' }} />
                        KYC Management
                    </h2>
                    <p className="sub">Review and verify agent business documents</p>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {STATUS_TABS.map((status) => (
                            <button
                                key={status || 'ALL'}
                                onClick={() => setFilterStatus(status)}
                                className="btn btn-sm btn-ghost"
                                style={filterStatus === status ? { background: 'var(--forest)', color: 'var(--paper)', borderColor: 'var(--forest)' } : undefined}
                            >
                                {status === '' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>

                    <div className="admin-search" style={{ width: 260 }}>
                        <Search size={14} color="var(--muted)" />
                        <input
                            type="text"
                            placeholder="Search by name, email, Aadhar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', font: 'inherit', color: 'var(--ink)' }}
                        />
                    </div>
                </div>
            </div>

            {loading && users.length === 0 ? (
                <div className="panel">
                    <div style={{ padding: 64, textAlign: 'center', color: 'var(--muted)' }}>Loading KYC submissions…</div>
                </div>
            ) : users.length === 0 ? (
                <div className="panel">
                    <div style={{ padding: 64, textAlign: 'center', color: 'var(--muted)' }}>
                        <Shield size={32} style={{ marginBottom: 16, color: 'var(--clay)' }} />
                        <p>No KYC submissions found for the selected filter.</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20 }}>
                    {users.map((user) => {
                        const status = user.profile.kyc_status;
                        return (
                            <div key={user.id} className="panel">
                                <div className="panel-head">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--forest)', flexShrink: 0 }}>
                                            <UserIcon size={20} />
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0 }}>{user.username}</h4>
                                            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{user.email}</div>
                                        </div>
                                    </div>
                                    <span className={'status ' + statusVariant(status)}>
                                        <span className="d"></span>{status}
                                    </span>
                                </div>

                                <div className="panel-body">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: (user.profile.gst_number || user.profile.brand_logo) ? 14 : 0 }}>
                                        <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 14 }}>
                                            <div className="eyebrow" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <FileText size={12} /> Aadhar Number
                                            </div>
                                            <div className="mono" style={{ fontSize: 14, letterSpacing: '0.04em', marginBottom: 10 }}>
                                                {user.profile.aadhar_number || 'N/A'}
                                            </div>
                                            {user.profile.aadhar_card_doc && (
                                                <button
                                                    onClick={() => setSelectedDoc({ url: user.profile.aadhar_card_doc as string, title: `Aadhar Card - ${user.username}` })}
                                                    className="btn btn-link btn-sm"
                                                    style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                                >
                                                    <Eye size={12} /> View Aadhar Card
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 14 }}>
                                            <div className="eyebrow" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <FileText size={12} /> PAN Number
                                            </div>
                                            <div className="mono" style={{ fontSize: 14, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 }}>
                                                {user.profile.pan_number || 'N/A'}
                                            </div>
                                            {user.profile.pan_card_doc && (
                                                <button
                                                    onClick={() => setSelectedDoc({ url: user.profile.pan_card_doc as string, title: `PAN Card - ${user.username}` })}
                                                    className="btn btn-link btn-sm"
                                                    style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                                >
                                                    <Eye size={12} /> View PAN Card
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {(user.profile.gst_number || user.profile.brand_logo) && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, paddingTop: 14, borderTop: '1px solid var(--line)', marginBottom: 14 }}>
                                            {user.profile.gst_number && (
                                                <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 14 }}>
                                                    <div className="eyebrow" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                        <Shield size={12} /> GST Number
                                                    </div>
                                                    <div className="mono" style={{ fontSize: 14, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                                        {user.profile.gst_number}
                                                    </div>
                                                </div>
                                            )}
                                            {user.profile.brand_logo && (
                                                <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 14 }}>
                                                    <div className="eyebrow" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                        <UserIcon size={12} /> Brand Identity
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedDoc({ url: user.profile.brand_logo as string, title: `Brand Logo - ${user.username}` })}
                                                        className="btn btn-link btn-sm"
                                                        style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                                    >
                                                        <Eye size={12} /> View Logo
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                                        <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Calendar size={13} />
                                            Joined {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}
                                        </div>

                                        {status === 'SUBMITTED' && (
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    onClick={() => handleAction(user.id, 'REJECT', user.username)}
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ color: '#b8443a' }}
                                                >
                                                    <X size={14} /> Reject
                                                </button>
                                                <button
                                                    onClick={() => handleAction(user.id, 'APPROVE', user.username)}
                                                    className="btn btn-primary btn-sm"
                                                >
                                                    <Check size={14} /> Approve
                                                </button>
                                            </div>
                                        )}

                                        {(status === 'VERIFIED' || status === 'REJECTED') && (
                                            <button
                                                onClick={() => handleAction(user.id, status === 'VERIFIED' ? 'REJECT' : 'APPROVE', user.username)}
                                                className="btn btn-link btn-sm"
                                                style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: 'none' }}
                                            >
                                                Change Status
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && totalPages > 1 && (
                <div className="panel" style={{ marginTop: 20, padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
                        Page <strong style={{ color: 'var(--ink)' }}>{currentPage}</strong> of <strong style={{ color: 'var(--ink)' }}>{totalPages}</strong> ({totalCount} entries)
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

            {selectedDoc && (
                <DocumentModal
                    url={selectedDoc.url}
                    title={selectedDoc.title}
                    onClose={() => setSelectedDoc(null)}
                />
            )}
        </div>
    );
}

// ─── Document Viewer Modal ───────────────────────────────────────────────────

function DocumentModal({
    url,
    title,
    onClose
}: {
    url: string;
    title: string;
    onClose: () => void;
}) {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPdf, setIsPdf] = useState(false);

    useEffect(() => {
        let active = true;
        let currentBlobUrl: string | null = null;

        async function fetchFile() {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                // Ensure HTTPS in production to avoid mixed content issues
                const securedUrl = (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://'))
                    ? url.replace('http://', 'https://')
                    : url;

                const response = await fetch(securedUrl, {
                    headers: {
                        'Authorization': `Token ${token}`
                    }
                });

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const blob = await response.blob();
                if (active) {
                    setIsPdf(blob.type === 'application/pdf');
                    currentBlobUrl = URL.createObjectURL(blob);
                    setBlobUrl(currentBlobUrl);
                }
            } catch (err) {
                if (active) {
                    console.error('Document fetch failed:', err);
                    setError('Failed to load document. Please check your connection or login again.');
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        fetchFile();

        return () => {
            active = false;
            if (currentBlobUrl) {
                URL.revokeObjectURL(currentBlobUrl);
            }
        };
    }, [url]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal modal-wide"
                style={{ maxWidth: 820, height: '85vh', display: 'flex', flexDirection: 'column', padding: 0 }}
                onClick={(e) => e.stopPropagation()}
            >
                <button className="modal-close" onClick={onClose}><X size={16} /></button>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
                    <h3 style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                        <FileText size={16} style={{ color: 'var(--clay)' }} />
                        {title}
                    </h3>
                </div>
                <div style={{ flex: 1, background: 'var(--sand)', overflow: 'auto', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                            <Shield size={28} style={{ color: 'var(--clay)' }} />
                            <p className="eyebrow">Securely loading…</p>
                        </div>
                    ) : error ? (
                        <div style={{ background: 'var(--paper)', padding: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', textAlign: 'center', maxWidth: 360 }}>
                            <div style={{ width: 48, height: 48, background: 'rgba(184,68,58,0.1)', color: '#b8443a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <ShieldAlert size={22} />
                            </div>
                            <p style={{ fontWeight: 500, marginBottom: 8 }}>Access Error</p>
                            <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.55 }}>{error}</p>
                        </div>
                    ) : (
                        isPdf ? (
                            <iframe
                                src={blobUrl!}
                                style={{ width: '100%', height: '100%', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--paper)' }}
                                title={title}
                            />
                        ) : (
                            <img
                                src={blobUrl!}
                                alt={title}
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', background: 'var(--paper)', padding: 8, border: '1px solid var(--line)', borderRadius: 4 }}
                            />
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
