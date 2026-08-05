'use client';

import { useState, useEffect } from 'react';
import { updateProfile } from '@/lib/api';
import { ShieldCheck, ShieldAlert, Shield, User, FileText, CreditCard, Landmark, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Swal from 'sweetalert2';

function maskAadhar(value?: string) {
    if (!value || value.length < 4) return value || '—';
    return `XXXX XXXX ${value.slice(-4)}`;
}

// KYC document URLs point at an authenticated Django endpoint — a plain
// <img>/<a> load can't attach an Authorization header, so the token is
// appended as a query param instead (the endpoint accepts both).
function withAuthToken(url?: string): string | undefined {
    if (!url || typeof window === 'undefined') return url;
    const token = localStorage.getItem('token');
    if (!token) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(token)}`;
}

export default function ProfilePage() {
    const { user, isAuthenticated, refreshUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [phoneError, setPhoneError] = useState('');

    useEffect(() => {
        if (user) {
            setUsername(user.username || '');
            setPhone(user.profile?.phone_number || '');
            setAddress(user.profile?.address || '');
        }
    }, [user]);

    const validatePhoneNumber = (phoneNumber: string): boolean => {
        if (!phoneNumber) return true;
        const cleaned = phoneNumber.replace(/[\s\-()]/g, '');
        const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
        return phoneRegex.test(cleaned);
    };

    const handlePhoneChange = (value: string) => {
        setPhone(value);
        if (value && !validatePhoneNumber(value)) {
            setPhoneError('Please enter a valid Indian phone number (10 digits, starting with 6-9)');
        } else {
            setPhoneError('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (phone && !validatePhoneNumber(phone)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Phone Number',
                text: 'Please enter a valid Indian phone number',
                confirmButtonColor: '#b8443a'
            });
            return;
        }

        setIsLoading(true);
        try {
            await updateProfile({
                username: username.toLowerCase(),
                phone_number: phone,
                address: address,
            });

            Swal.fire({
                icon: 'success',
                title: 'Profile Updated',
                text: 'Your profile has been updated successfully!',
                timer: 2000,
                showConfirmButton: false
            }).then(async () => {
                await refreshUser();
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: 'Failed to update profile. Please try again.',
                confirmButtonColor: '#b8443a'
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="container page-content-sm" style={{ textAlign: 'center' }}>
                <h1 style={{ marginBottom: 12 }}>Agency Profile</h1>
                <p style={{ color: 'var(--muted)' }}>Please log in to view your agency's profile.</p>
            </div>
        );
    }

    const kyc = user?.profile?.kyc_status;
    const kycMeta = kyc === 'VERIFIED'
        ? { label: 'Verified', sub: 'Your agency is fully verified', icon: <ShieldCheck size={20} style={{ color: 'var(--forest)' }} />, cls: 'confirmed' }
        : kyc === 'SUBMITTED'
        ? { label: 'Under Review', sub: 'Documents submitted, awaiting review', icon: <Shield size={20} style={{ color: '#1e5ab4' }} />, cls: 'pending' }
        : kyc === 'REJECTED'
        ? { label: 'Rejected', sub: 'Please re-submit your documents', icon: <ShieldAlert size={20} style={{ color: '#b8443a' }} />, cls: 'cancelled' }
        : { label: 'Not Verified', sub: 'Complete KYC to unlock full access', icon: <ShieldAlert size={20} style={{ color: '#97712a' }} />, cls: 'pending' };

    const documents = [
        { key: 'brand_logo', label: 'Brand Logo', url: withAuthToken(user?.profile?.brand_logo) },
        { key: 'aadhar_card_doc', label: 'Aadhar Card', url: withAuthToken(user?.profile?.aadhar_card_doc) },
        { key: 'pan_card_doc', label: 'PAN Card', url: withAuthToken(user?.profile?.pan_card_doc) },
    ];

    return (
        <div className="page-content-sm">
            <div className="container">
                <span className="eyebrow">— Account</span>

                <div className="row between" style={{ marginTop: 8, marginBottom: 36, flexWrap: 'wrap', gap: 20 }}>
                    <div className="row" style={{ gap: 16 }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: '50%', background: 'var(--forest)',
                            color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--serif)', fontSize: 22, flexShrink: 0, overflow: 'hidden',
                        }}>
                            {user?.profile?.brand_logo
                                ? <img src={withAuthToken(user.profile.brand_logo)} alt="Brand logo" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                                : (user?.username?.[0]?.toUpperCase() || <User size={22} />)}
                        </div>
                        <div>
                            <h1 style={{ fontSize: 30 }}>{user?.username}</h1>
                            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 2 }}>{user?.email}</p>
                        </div>
                    </div>
                    <span className={`status ${kycMeta.cls}`}>{kycMeta.icon}<span className="d" />{kycMeta.label}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 24, alignItems: 'start' }}>
                    <div className="panel">
                        <div className="panel-head">
                            <h4>Account Details</h4>
                        </div>
                        <div className="panel-body">
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div className="field-group">
                                    <label>Username</label>
                                    <input required type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your display name" />
                                </div>
                                <div className="field-group">
                                    <label>Email Address</label>
                                    <input type="email" value={user?.email || ''} readOnly style={{ color: 'var(--muted)', cursor: 'not-allowed' }} />
                                </div>
                                <div className="field-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => handlePhoneChange(e.target.value)}
                                        className="mono"
                                        placeholder="+91 9876543210"
                                        style={phoneError ? { borderColor: '#b8443a' } : undefined}
                                    />
                                    {phoneError && <p style={{ marginTop: 4, fontSize: 12, color: '#b8443a' }}>{phoneError}</p>}
                                    <p style={{ marginTop: 4, fontSize: 11, color: 'var(--muted)' }}>Format: 10 digits starting with 6-9</p>
                                </div>
                                <div className="field-group">
                                    <label>Address</label>
                                    <textarea
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        style={{ minHeight: 80, resize: 'none' }}
                                        placeholder="Your address..."
                                    />
                                </div>

                                <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ width: '100%' }}>
                                    {isLoading ? 'Saving…' : 'Save Changes'}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div className="panel">
                            <div className="panel-head">
                                <h4>Onboarding &amp; KYC</h4>
                            </div>
                            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                <div className="row between" style={{ padding: 12, background: 'var(--sand)', borderRadius: 'var(--radius)' }}>
                                    <div className="row" style={{ gap: 10 }}>
                                        {kycMeta.icon}
                                        <div>
                                            <p style={{ fontWeight: 600, fontSize: 14 }}>{kycMeta.label}</p>
                                            <p style={{ fontSize: 11, color: 'var(--muted)' }}>{kycMeta.sub}</p>
                                        </div>
                                    </div>

                                    {(kyc !== 'VERIFIED' && kyc !== 'SUBMITTED') && (
                                        <button
                                            type="button"
                                            onClick={() => window.dispatchEvent(new CustomEvent('open-kyc-modal'))}
                                            className="btn btn-primary btn-sm"
                                        >
                                            {kyc === 'REJECTED' ? 'Re-submit' : 'Verify Now'}
                                        </button>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div className="row between">
                                        <span className="row" style={{ gap: 8, fontSize: 13, color: 'var(--muted)' }}><CreditCard size={14} />Aadhar Number</span>
                                        <span className="mono" style={{ fontSize: 13 }}>{maskAadhar(user?.profile?.aadhar_number)}</span>
                                    </div>
                                    <div className="row between">
                                        <span className="row" style={{ gap: 8, fontSize: 13, color: 'var(--muted)' }}><CreditCard size={14} />PAN Number</span>
                                        <span className="mono" style={{ fontSize: 13 }}>{user?.profile?.pan_number || '—'}</span>
                                    </div>
                                    <div className="row between">
                                        <span className="row" style={{ gap: 8, fontSize: 13, color: 'var(--muted)' }}><Landmark size={14} />GST Number</span>
                                        <span className="mono" style={{ fontSize: 13 }}>{user?.profile?.gst_number || '—'}</span>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                                    <label style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 10 }}>
                                        Submitted Documents
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {documents.map(doc => (
                                            <div className="row between" key={doc.key}>
                                                <span className="row" style={{ gap: 8, fontSize: 13 }}>
                                                    <FileText size={14} style={{ color: 'var(--muted)' }} />{doc.label}
                                                </span>
                                                {doc.url ? (
                                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn-link row" style={{ gap: 4, fontSize: 12 }}>
                                                        View <ExternalLink size={11} />
                                                    </a>
                                                ) : (
                                                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>Not uploaded</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
