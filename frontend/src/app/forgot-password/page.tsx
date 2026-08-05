"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { BRAND } from '@/config/brand';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
    const [resendTimer, setResendTimer] = useState(0);
    const [canResend, setCanResend] = useState(true);

    const router = useRouter();

    React.useEffect(() => {
        let interval: NodeJS.Timeout;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        } else {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const startResendTimer = () => {
        setCanResend(false);
        setResendTimer(60); // 60 seconds cooldown
    };

    const handleOtpChange = (value: string, index: number) => {
        if (value.length > 1) {
            const pastedData = value.slice(0, 6).split('');
            const newOtp = [...otp];
            pastedData.forEach((char, i) => {
                if (i < 6) newOtp[i] = char.replace(/\D/g, '');
            });
            setOtp(newOtp);
            const nextIndex = Math.min(pastedData.length, 5);
            document.getElementById(`otp-${nextIndex}`)?.focus();
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = value.replace(/\D/g, '');
        setOtp(newOtp);

        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/otp/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

            setMessage(data.message);
            setStep('otp');
            startResendTimer();

            // Clear message after 3 seconds
            setTimeout(() => setMessage(''), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (!canResend) return;
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/otp/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to resend OTP');

            setMessage('New OTP sent successfully!');
            startResendTimer();
            setTimeout(() => setMessage(''), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const otpString = otp.join('');

        try {
            const res = await fetch('/api/auth/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otpString, deleteAfter: false }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Invalid OTP');

            // Move to next step only if OTP is valid
            setStep('reset');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const otpString = otp.join('');

        try {
            const res = await fetch('/api/auth/otp/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otpString, password: newPassword }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to reset password');

            setMessage('Password reset successfully! Redirecting to login...');
            setTimeout(() => router.push('/login'), 2000);
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <Link href="/" className="auth-close" aria-label="Close">
                <X size={16} />
            </Link>

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
                        {step === 'email' ? 'Forgot password.' : step === 'otp' ? 'Verify code' : 'New password'}
                    </h1>
                    <p style={{ color: 'var(--muted)', marginBottom: 32, fontSize: 15 }}>
                        {step === 'email' ? (
                            "Enter your email and we'll send you a reset code."
                        ) : step === 'otp' ? (
                            <>
                                Enter the 6-digit code sent to <strong style={{ color: 'var(--ink)' }}>{email}</strong>.
                                {' '}Check your spam folder if it doesn&apos;t arrive shortly.
                            </>
                        ) : (
                            'Choose a strong new password for your agency account.'
                        )}
                    </p>

                    {error && (
                        <div style={{
                            padding: '12px 16px', background: 'rgba(199, 154, 74, 0.1)', color: '#97712a',
                            borderRadius: 4, fontSize: 13, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8
                        }}>
                            <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
                        </div>
                    )}

                    {message && !error && (
                        <div style={{
                            padding: '12px 16px', background: 'rgba(31, 122, 77, 0.1)', color: '#1f7a4d',
                            borderRadius: 4, fontSize: 13, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8
                        }}>
                            <CheckCircle2 size={14} style={{ flexShrink: 0 }} /> {message}
                        </div>
                    )}

                    {step === 'email' && (
                        <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="field-group">
                                <label>Email address</label>
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@email.com"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn btn-primary btn-lg"
                                style={{ marginTop: 8, justifyContent: 'center' }}
                            >
                                {isLoading ? 'Sending…' : 'Send reset code'}
                            </button>
                        </form>
                    )}

                    {step === 'otp' && (
                        <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`otp-${index}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(e.target.value, index)}
                                        onKeyDown={(e) => handleKeyDown(e, index)}
                                        style={{
                                            width: 44, height: 56, textAlign: 'center', fontSize: 20,
                                            fontFamily: 'var(--mono)', border: '1px solid var(--line-2)',
                                            borderRadius: 4, color: 'var(--ink)', outline: 'none'
                                        }}
                                    />
                                ))}
                            </div>
                            <button
                                type="submit"
                                disabled={otp.some(d => !d) || isLoading}
                                className="btn btn-primary btn-lg"
                                style={{ justifyContent: 'center' }}
                            >
                                {isLoading ? 'Verifying…' : 'Verify code'}
                            </button>

                            <button
                                type="button"
                                disabled={!canResend || isLoading}
                                onClick={handleResendOTP}
                                className="btn btn-link"
                                style={{ alignSelf: 'center', borderBottom: 0, fontSize: 13, color: canResend ? 'var(--clay)' : 'var(--muted)', fontWeight: 400 }}
                            >
                                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Didn't receive it? Resend"}
                            </button>
                        </form>
                    )}

                    {step === 'reset' && (
                        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="field-group">
                                <label>New password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        required
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Min. 8 characters"
                                        style={{ paddingRight: 40 }}
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
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || newPassword.length < 8}
                                className="btn btn-primary btn-lg"
                                style={{ marginTop: 8, justifyContent: 'center' }}
                            >
                                {isLoading ? 'Resetting…' : 'Reset password'}
                            </button>
                        </form>
                    )}

                    <p style={{ marginTop: 28, fontSize: 14, color: 'var(--muted)', textAlign: 'center' }}>
                        <Link href="/login" style={{ color: 'var(--clay)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <ArrowLeft size={14} /> Back to login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
