'use client';
import { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { submitKYC } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Swal from 'sweetalert2';

export function KYCModal() {
    const { user, refreshUser } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        aadhar_number: '',
        pan_number: '',
        gst_number: '',
    });
    const [files, setFiles] = useState<{ [key: string]: File | null }>({
        brand_logo: null,
        aadhar_card_doc: null,
        pan_card_doc: null,
    });

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('open-kyc-modal', handleOpen);
        return () => window.removeEventListener('open-kyc-modal', handleOpen);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        if (e.target.files && e.target.files[0]) {
            setFiles(prev => ({ ...prev, [field]: e.target.files![0] }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (formData.aadhar_number && formData.aadhar_number.length !== 12) {
            Swal.fire('Error', 'Aadhar number must be 12 digits', 'error');
            return;
        }
        if (formData.pan_number && formData.pan_number.length !== 10) {
            Swal.fire('Error', 'PAN number must be 10 characters', 'error');
            return;
        }
        if (!formData.gst_number || formData.gst_number.length !== 15) {
            Swal.fire('Error', 'Please enter a valid 15-character GST number', 'error');
            return;
        }
        if (!files.aadhar_card_doc || !files.pan_card_doc || !files.brand_logo) {
            Swal.fire('Error', 'All documents (Aadhar, PAN, and Brand Logo) are mandatory', 'error');
            return;
        }

        setLoading(true);
        try {
            const submitData = new FormData();
            submitData.append('aadhar_number', formData.aadhar_number);
            submitData.append('pan_number', formData.pan_number);
            submitData.append('gst_number', formData.gst_number);

            if (files.brand_logo) submitData.append('brand_logo', files.brand_logo);
            if (files.aadhar_card_doc) submitData.append('aadhar_card_doc', files.aadhar_card_doc);
            if (files.pan_card_doc) submitData.append('pan_card_doc', files.pan_card_doc);

            await submitKYC(submitData);

            await Swal.fire({
                icon: 'success',
                title: 'KYC Submitted',
                text: "Your agency's KYC details and documents have been submitted for verification.",
                confirmButtonColor: '#1f3b30',
            });

            setIsOpen(false);
            await refreshUser();
        } catch (error: any) {
            Swal.fire('Error', error.message || 'Failed to submit KYC', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
            <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                <button onClick={() => setIsOpen(false)} className="modal-close"><X size={16} /></button>

                <div className="row" style={{ gap: 12, marginBottom: 4 }}>
                    <ShieldCheck size={20} style={{ color: 'var(--forest)' }} />
                    <h3>Verify Your Agency</h3>
                </div>
                <div className="modal-sub">Submit your agency's KYC and business details for verification</div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="formgrid">
                        {/* Aadhar */}
                        <div className="field-group">
                            <label>Aadhar Number</label>
                            <input
                                required
                                type="text"
                                maxLength={12}
                                placeholder="12-digit Aadhar Number"
                                value={formData.aadhar_number}
                                onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value.replace(/\D/g, '') })}
                                className="mono"
                            />
                            <div style={{ marginTop: 4 }}>
                                <span className="eyebrow">Aadhar Card Copy</span>
                                <input
                                    required
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={(e) => handleFileChange(e, 'aadhar_card_doc')}
                                    style={{ fontSize: 12, marginTop: 6, color: 'var(--muted)' }}
                                />
                                <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Only .pdf and .jpeg files are allowed.</p>
                            </div>
                        </div>

                        {/* PAN */}
                        <div className="field-group">
                            <label>PAN Number</label>
                            <input
                                required
                                type="text"
                                maxLength={10}
                                placeholder="10-character PAN"
                                value={formData.pan_number.toUpperCase()}
                                onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                                className="mono"
                                style={{ textTransform: 'uppercase' }}
                            />
                            <div style={{ marginTop: 4 }}>
                                <span className="eyebrow">PAN Card Copy</span>
                                <input
                                    required
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={(e) => handleFileChange(e, 'pan_card_doc')}
                                    style={{ fontSize: 12, marginTop: 6, color: 'var(--muted)' }}
                                />
                                <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Only .pdf and .jpeg files are allowed.</p>
                            </div>
                        </div>

                        {/* GST */}
                        <div className="field-group">
                            <label>GST Number</label>
                            <input
                                required
                                type="text"
                                maxLength={15}
                                placeholder="15-character GST Number"
                                value={formData.gst_number.toUpperCase()}
                                onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                                className="mono"
                                style={{ textTransform: 'uppercase' }}
                            />
                        </div>

                        {/* Brand Logo */}
                        <div className="field-group">
                            <label>Brand Logo</label>
                            <input
                                required
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, 'brand_logo')}
                                style={{ fontSize: 12, color: 'var(--muted)' }}
                            />
                            <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Only .jpeg files are allowed.</p>
                        </div>
                    </div>

                    <div className="row" style={{ gap: 10, padding: 14, background: 'rgba(199,154,74,0.1)', borderRadius: 4 }}>
                        <AlertCircle size={16} style={{ color: '#97712a', flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: 11, color: '#97712a', lineHeight: 1.5 }}>
                            Please ensure all provided agency details and documents are clear and legible. All fields and document uploads are mandatory. Incorrect or blurred uploads may result in rejection.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Submit KYC & Documents'}
                        </button>
                        <button type="button" onClick={() => setIsOpen(false)} className="btn-link" style={{ margin: '0 auto', color: 'var(--muted)', borderBottomColor: 'var(--muted)' }}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
