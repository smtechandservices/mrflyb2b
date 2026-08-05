'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login as loginApi, getUserProfile } from '@/lib/api';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { BRAND } from '@/config/brand';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { token } = await loginApi(email, password);

            localStorage.setItem('token', token);

            // Verify admin status
            const userProfile = await getUserProfile();
            if (userProfile.profile?.usertype === 'admin' || userProfile.is_superuser) {
                router.push('/');
            } else {
                setError('Access denied: Admin privileges required.');
                localStorage.removeItem('token');
            }
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--sand)',
            padding: 24,
        }}>
            <div style={{ width: '100%', maxWidth: 400 }}>
                <div style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: '40px 32px',
                    boxShadow: 'var(--shadow-md)',
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 4, marginBottom: 32 }}>
                        <div style={{ width: 48, height: 48, position: 'relative', marginBottom: 8 }}>
                            <Image
                                src={BRAND.logoTransparent}
                                alt={`${BRAND.name} Logo`}
                                fill
                                unoptimized
                                style={{ objectFit: 'contain' }}
                            />
                        </div>
                        <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
                            {BRAND.admin.name}
                        </div>
                        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                            Sign in to manage the platform
                        </span>
                    </div>

                    {error && (
                        <div style={{
                            padding: '12px 16px',
                            background: 'rgba(184,68,58,0.1)',
                            color: '#b8443a',
                            borderRadius: 4,
                            fontSize: 13,
                            marginBottom: 20,
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div className="field-group">
                            <label>Email address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter admin email"
                                required
                            />
                        </div>

                        <div className="field-group">
                            <label>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    required
                                    style={{ paddingRight: 42, width: '100%' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    style={{
                                        position: 'absolute',
                                        right: 10,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'transparent',
                                        border: 0,
                                        color: 'var(--muted)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        padding: 2,
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ marginTop: 8, width: '100%' }}
                            disabled={loading}
                        >
                            {loading ? 'Verifying...' : 'Sign In'}
                        </button>
                    </form>
                </div>
                <p className="mono" style={{ textAlign: 'center', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 24 }}>
                    {BRAND.name} Admin &middot; Internal use only
                </p>
            </div>
        </div>
    );
}
