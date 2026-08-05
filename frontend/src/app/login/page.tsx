'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { login as loginApi, getUserProfile } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, AlertCircle, X } from 'lucide-react';
import { BRAND } from '@/config/brand';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState<'LOGIN' | 'OTP'>('LOGIN');
    const [loading, setLoading] = useState(false);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to verify credentials');

            setStep('OTP');
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // 1. Verify OTP
            const verifyRes = await fetch('/api/auth/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Invalid OTP');

            // 2. Finalize Login
            const { token } = await loginApi(email, password);

            localStorage.setItem('token', token);
            const userProfile = await getUserProfile();

            login(token, {
                id: userProfile.id,
                username: userProfile.username,
                email: userProfile.email,
                is_staff: userProfile.is_staff,
                is_superuser: userProfile.is_superuser,
                profile: userProfile.profile
            });
        } catch (err: any) {
            setError(err.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newOtp = otp.split('');
        newOtp[index] = value.slice(-1);
        const finalOtp = newOtp.join('');
        setOtp(finalOtp);

        // Move to next input if value is entered
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, '');
        setOtp(pastedData);
        // Focus the last input or the next empty one
        const nextIndex = Math.min(pastedData.length, 5);
        otpRefs.current[nextIndex]?.focus();
    };

    return (
        <div className="auth-page">
            <div className="auth-visual" style={{ backgroundImage: 'url(/hero-booking.png)' }}>
                <div className="auth-visual-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--serif)', fontSize: 22 }}>
                        {BRAND.name}<span className="dot" />
                    </div>
                    <div className="auth-visual-quote">
                        &ldquo;{BRAND.tagline}&rdquo;
                        <span>— {BRAND.name}</span>
                    </div>
                </div>
            </div>

            <div className="auth-panel">
                <div className="auth-panel-inner">
                    <div className="auth-brand">
                        <Image src={BRAND.logoTransparent} alt={`${BRAND.name} Logo`} width={508} height={491} style={{ height: 34, width: 'auto' }} />
                        {BRAND.name}<span className="dot" />
                    </div>

                    <h1 style={{ fontSize: 32, marginBottom: 8 }}>
                        {step === 'LOGIN' ? 'Welcome back.' : 'Verify identity'}
                    </h1>
                    <p style={{ color: 'var(--muted)', marginBottom: 32, fontSize: 15 }}>
                        {step === 'LOGIN' ? "Log in to manage your agency's bookings." : `Enter the 6-digit code sent to ${email}.`}
                    </p>

                    {error && (
                        <div style={{
                            padding: '12px 16px', background: 'rgba(199, 154, 74, 0.1)', color: '#97712a',
                            borderRadius: 4, fontSize: 13, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8
                        }}>
                            <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
                        </div>
                    )}

                    {step === 'LOGIN' ? (
                        <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="field-group">
                                <label>Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@email.com"
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
                                        placeholder="Enter your password"
                                        style={{ paddingRight: 40 }}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, padding: 0, color: 'var(--muted)', cursor: 'pointer', display: 'flex' }}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <Link href="/forgot-password" style={{ fontSize: 13, color: 'var(--clay)' }}>
                                        Forgot password?
                                    </Link>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary btn-lg"
                                style={{ marginTop: 8, justifyContent: 'center' }}
                            >
                                {loading ? 'Verifying…' : 'Continue'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                                <label className="eyebrow">One-time password</label>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }} onPaste={handleOtpPaste}>
                                    {[0, 1, 2, 3, 4, 5].map((i) => (
                                        <input
                                            key={i}
                                            ref={(el) => { otpRefs.current[i] = el; }}
                                            type="text"
                                            inputMode="numeric"
                                            pattern="\d*"
                                            maxLength={1}
                                            value={otp[i] || ''}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            required={i === 0}
                                            autoFocus={i === 0}
                                            style={{
                                                width: 44, height: 56, textAlign: 'center', fontSize: 20,
                                                fontFamily: 'var(--mono)', border: '1px solid var(--line-2)',
                                                borderRadius: 4, color: 'var(--ink)', outline: 'none'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <button
                                    type="submit"
                                    disabled={loading || otp.length !== 6}
                                    className="btn btn-primary btn-lg"
                                    style={{ justifyContent: 'center' }}
                                >
                                    {loading ? 'Logging in…' : 'Verify & log in'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStep('LOGIN')}
                                    className="btn btn-link"
                                    style={{ alignSelf: 'center', borderBottom: 0, color: 'var(--muted)', fontWeight: 400 }}
                                >
                                    Try again with password
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 'LOGIN' && (
                        <p style={{ marginTop: 28, fontSize: 14, color: 'var(--muted)', textAlign: 'center' }}>
                            New agency? <Link href="/signup" style={{ color: 'var(--clay)' }}>Sign up</Link>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
