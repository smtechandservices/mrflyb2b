'use client';

import { useState, useEffect } from 'react';
import { updateProfile } from '@/lib/api';
import { X, ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Swal from 'sweetalert2';

export function EditProfileModal() {
    const { user, refreshUser } = useAuth(); // We need refreshUser to update the user in context
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [username, setUsername] = useState(user?.username || '');
    const [phone, setPhone] = useState(user?.profile?.phone_number || '');
    const [address, setAddress] = useState(user?.profile?.address || '');
    const [phoneError, setPhoneError] = useState('');

    // Sync state when modal opens or user data changes
    useEffect(() => {
        if (isOpen && user) {
            setUsername(user.username || '');
            setPhone(user.profile?.phone_number || '');
            setAddress(user.profile?.address || '');
        }
    }, [isOpen, user]);

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('open-edit-profile-modal', handleOpen);
        return () => window.removeEventListener('open-edit-profile-modal', handleOpen);
    }, []);

    const onClose = () => setIsOpen(false);

    const validatePhoneNumber = (phoneNumber: string): boolean => {
        if (!phoneNumber) return true; // Phone is optional

        // Remove all spaces and special characters except +
        const cleaned = phoneNumber.replace(/[\s\-()]/g, '');

        // Check for valid Indian phone number formats:
        // +919876543210 (with country code)
        // 919876543210 (without + but with country code)
        // 9876543210 (10 digits only)
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

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate phone number before submission
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

            onClose();
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

    const kycLabel = user?.profile?.kyc_status === 'VERIFIED' ? 'Verified'
        : user?.profile?.kyc_status === 'SUBMITTED' ? 'Under Review'
        : user?.profile?.kyc_status === 'REJECTED' ? 'Rejected' : 'Not Verified';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="modal-close"><X size={16} /></button>

                <h3>Edit Agency Profile</h3>
                <div className="modal-sub">Update your agency's account details</div>

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

                    <div style={{ paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                        <label style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 10 }}>KYC Status</label>
                        <div className="row between" style={{ padding: 12, background: 'var(--sand)', borderRadius: 'var(--radius)' }}>
                            <div className="row" style={{ gap: 10 }}>
                                {user?.profile?.kyc_status === 'VERIFIED' ? <ShieldCheck size={18} style={{ color: 'var(--forest)' }} />
                                    : user?.profile?.kyc_status === 'SUBMITTED' ? <Shield size={18} style={{ color: '#1e5ab4' }} />
                                    : <ShieldAlert size={18} style={{ color: '#97712a' }} />}
                                <div>
                                    <p style={{ fontWeight: 600, fontSize: 14 }}>{kycLabel}</p>
                                    <p style={{ fontSize: 11, color: 'var(--muted)' }}>Agency Verification</p>
                                </div>
                            </div>

                            {user?.profile?.kyc_status !== 'VERIFIED' && user?.profile?.kyc_status !== 'SUBMITTED' && (
                                <button
                                    type="button"
                                    onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('open-kyc-modal')); }}
                                    className="btn btn-primary btn-sm"
                                >
                                    Verify Now
                                </button>
                            )}
                        </div>
                    </div>

                    <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ width: '100%' }}>
                        {isLoading ? 'Saving…' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
}
