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
                confirmButtonColor: '#ef4444'
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

            // Update local user context if possible, or force reload/refetch
            // Since our AuthContext takes a User object, we can optimistically update it
            if (user && user.profile) {
                const updatedUser = {
                    ...user,
                    profile: {
                        ...user.profile,
                        phone_number: phone,
                        address: address
                    }
                };
                // We don't have a dedicated 'updateUser' method in AuthContext, 
                // but we can re-login or better yet, just close for now. relative 
                // Ideally AuthContext should expose a reloadUser or updateUser method.
                // For simplicity, we just close. The user might need to refresh to see changes elsewhere 
                // unless we fetch profile again.
                // Actually, let's try to fetch profile again if we can. 
            }
            // Better approach: Since AuthContext doesn't expose reload, we just close.
            // But user wants to see changes. 
            // We can assume success.
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
                confirmButtonColor: '#ef4444'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Mobile/Desktop Overlay specifically for the EditProfileModal when it's in view */}
            <div 
                className={`fixed inset-0 bg-black/60 lg:bg-black/10 backdrop-blur-sm lg:backdrop-blur-none z-[1000] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />
            
            <div className={`
                ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}
                transition-all duration-300
                fixed inset-x-4 top-[15%] max-w-lg mx-auto bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-[1001]
                lg:inset-auto lg:top-20 lg:right-12 lg:w-96 lg:rounded-2xl
            `}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Edit Profile</h2>
                <button
                    onClick={onClose}
                    className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Username <span className="text-red-500">*</span></label>
                    <input
                        required
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none transition-all text-sm font-medium text-slate-700"
                        placeholder="Your display name"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                    <input
                        type="email"
                        value={user?.email || ''}
                        readOnly
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 outline-none cursor-not-allowed text-sm font-medium"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border ${phoneError
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-slate-200 focus:border-blue-500'
                            } outline-none transition-all text-sm font-medium text-slate-700`}
                        placeholder="+91 9876543210"
                    />
                    {phoneError && (
                        <p className="mt-1 text-xs text-red-600">{phoneError}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">Format: 10 digits starting with 6-9</p>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Address</label>
                    <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none transition-all min-h-[80px] text-sm font-medium text-slate-700 resize-none"
                        placeholder="Your address..."
                    />
                </div>

                <div className="pt-2 border-t border-slate-100 mt-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">KYC Status</label>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                            {user?.profile?.kyc_status === 'VERIFIED' ? (
                                <div className="p-1.5 bg-sky-100 text-sky-600 rounded-lg">
                                    <ShieldCheck size={16} />
                                </div>
                            ) : user?.profile?.kyc_status === 'SUBMITTED' ? (
                                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                                    <Shield size={16} />
                                </div>
                            ) : (
                                <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
                                    <ShieldAlert size={16} />
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-bold text-slate-700">
                                    {user?.profile?.kyc_status === 'VERIFIED' ? 'Verified' : 
                                     user?.profile?.kyc_status === 'SUBMITTED' ? 'Under Review' : 
                                     user?.profile?.kyc_status === 'REJECTED' ? 'Rejected' : 'Not Verified'}
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium">Identity Verification</p>
                            </div>
                        </div>
                        
                        {user?.profile?.kyc_status !== 'VERIFIED' && user?.profile?.kyc_status !== 'SUBMITTED' && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    window.dispatchEvent(new CustomEvent('open-kyc-modal'));
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all shadow-sm shadow-blue-200"
                            >
                                Verify Now
                            </button>
                        )}
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                    >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
        </>
    );
}
