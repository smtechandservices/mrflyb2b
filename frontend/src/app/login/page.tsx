'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { login as loginApi, getUserProfile } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
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
        <div className="min-h-screen relative flex items-center justify-center px-4">
            {/* Hero Background */}
            <div
                className="fixed inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: 'url(/hero-search.png)' }}
            />
            <div className="fixed inset-0 bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-blue-900/70" />

            {/* Login Card */}
            <div className="relative z-10 max-w-md w-full">
                <div className="bg-white/95 backdrop-blur-lg p-8 md:p-10 rounded-3xl shadow-2xl border border-white/20">
                    {/* Logo */}
                    <div className="flex justify-center">
                        <div className="h-20 w-20 relative">
                            <Image
                                src={BRAND.logoTransparent}
                                alt={`${BRAND.name} Logo`}
                                fill
                                className="object-contain"
                            />
                        </div>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2 text-center">
                        {step === 'LOGIN' ? 'Welcome Back' : 'Verify Identity'}
                    </h1>
                    <p className="text-slate-600 mb-8 text-center">
                        {step === 'LOGIN' ? 'Sign in to manage your bookings' : `Enter the 6-digit code sent to ${email}`}
                    </p>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium mb-6 animate-shake">
                            {error}
                        </div>
                    )}

                    {step === 'LOGIN' ? (
                        <form onSubmit={handleSendOTP} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="text-black w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="text-black w-full px-4 py-3 pr-12 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                                        placeholder="Enter your password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                <div className="flex justify-end mt-4">
                                    <Link href="/forgot-password" disable-nav="true" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                                        Forgot password?
                                    </Link>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="cursor-pointer w-full bg-gradient-to-r from-blue-600 to-sky-600 text-white py-3.5 rounded-xl font-bold hover:from-blue-700 hover:to-sky-700 transition-all shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Verifying...' : 'Continue'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOTP} className="space-y-8">
                            <div className="flex flex-col items-center gap-6">
                                <label className="block text-sm font-semibold text-slate-700 text-center uppercase tracking-wider opacity-70">One-Time Password</label>
                                <div className="flex justify-center w-full gap-2 sm:gap-3" onPaste={handleOtpPaste}>
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
                                            className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                                            required={i === 0}
                                            autoFocus={i === 0}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <button
                                    type="submit"
                                    disabled={loading || otp.length !== 6}
                                    className="cursor-pointer w-full bg-gradient-to-r from-blue-600 to-sky-600 text-white py-3.5 rounded-xl font-bold hover:from-blue-700 hover:to-sky-700 transition-all shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Logging in...' : 'Verify & Login'}
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={() => setStep('LOGIN')}
                                    className="w-full text-slate-500 text-sm font-medium hover:text-slate-700 transition-colors"
                                >
                                    Try again with password
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 'LOGIN' && (
                        <p className="mt-8 text-center text-slate-600 text-sm">
                            Don't have an account?{' '}
                            <Link href="/signup" disable-nav="true" className="text-blue-600 font-bold hover:text-blue-700 hover:underline transition-colors">
                                Sign up
                            </Link>
                        </p>
                    )}
                </div>

                {/* Back to Home Link */}
                <div className="text-center mt-6">
                    <Link href="/" disable-nav="true" className="text-white/90 hover:text-white text-sm font-medium hover:underline transition-colors">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
