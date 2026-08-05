'use client';

import { useState, useEffect } from 'react';
import { register } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, AlertCircle, X } from 'lucide-react';
import { BRAND } from '@/config/brand';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);

    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'details' | 'otp'>('details');
    const [resendTimer, setResendTimer] = useState(0);
    const [canResend, setCanResend] = useState(true);

    const router = useRouter();

    useEffect(() => {
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
        setResendTimer(60);
    };

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

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (phone && !validatePhoneNumber(phone)) {
            setError('Please enter a valid phone number');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

            setStep('otp');
            startResendTimer();
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
            const res = await fetch('/api/auth/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to resend OTP');

            startResendTimer();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpChange = (value: string, index: number) => {
        if (value.length > 1) {
            // Handle paste
            const pastedData = value.slice(0, 6).split('');
            const newOtp = [...otp];
            pastedData.forEach((char, i) => {
                if (i < 6) newOtp[i] = char.replace(/\D/g, '');
            });
            setOtp(newOtp);
            // Focus last filled or next empty
            const nextIndex = Math.min(pastedData.length, 5);
            document.getElementById(`otp-${nextIndex}`)?.focus();
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = value.replace(/\D/g, '');
        setOtp(newOtp);

        // Move to next input if value is entered
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
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
                body: JSON.stringify({ email, otp: otpString }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Verification failed');

            // Verification successful, now call the actual registration
            await register(email, password, phone, username.toLowerCase());
            router.push('/login');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
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
                        {step === 'details' ? 'Register your agency.' : 'Verify your email'}
                    </h1>
                    <p style={{ color: 'var(--muted)', marginBottom: 32, fontSize: 15 }}>
                        {step === 'details' ? (
                            `Join ${BRAND.name} to book flights for your clients.`
                        ) : (
                            <>
                                We&apos;ve sent a 6-digit code to <strong style={{ color: 'var(--ink)' }}>{email}</strong>.
                                {' '}Check your spam folder if it doesn&apos;t arrive shortly.
                            </>
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

                    {step === 'details' ? (
                        <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="field-group">
                                <label>Agency username</label>
                                <input
                                    required
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="username"
                                />
                            </div>
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
                                        placeholder="Create a strong password"
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
                            </div>
                            <div className="field-group">
                                <label>Phone number</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => handlePhoneChange(e.target.value)}
                                    placeholder="+91 9876543210"
                                    style={phoneError ? { borderColor: '#b8443a' } : undefined}
                                />
                                {phoneError && (
                                    <p style={{ fontSize: 12, color: '#b8443a', margin: 0 }}>{phoneError}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn btn-primary btn-lg"
                                style={{ marginTop: 8, justifyContent: 'center' }}
                            >
                                {isLoading ? 'Sending…' : 'Get verification code'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`otp-${index}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
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

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <button
                                    type="submit"
                                    disabled={isLoading || otp.some(d => !d)}
                                    className="btn btn-primary btn-lg"
                                    style={{ justifyContent: 'center' }}
                                >
                                    {isLoading ? 'Verifying…' : 'Verify & sign up'}
                                </button>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                    <button
                                        type="button"
                                        disabled={!canResend || isLoading}
                                        onClick={handleResendOTP}
                                        className="btn btn-link"
                                        style={{ borderBottom: 0, fontSize: 13, color: canResend ? 'var(--clay)' : 'var(--muted)', fontWeight: 400 }}
                                    >
                                        {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Didn't receive it? Resend"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStep('details')}
                                        className="btn btn-link"
                                        style={{ borderBottom: 0, fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}
                                    >
                                        ← Edit registration details
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    <p style={{ marginTop: 28, fontSize: 14, color: 'var(--muted)', textAlign: 'center' }}>
                        Already registered your agency? <Link href="/login" style={{ color: 'var(--clay)' }}>Log in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
