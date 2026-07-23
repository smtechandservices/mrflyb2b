'use client';

import { useState, useEffect } from 'react';
import { register } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
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
        <div className="min-h-screen relative flex items-center justify-center px-4 py-8">
            <div
                className="fixed inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: 'url(/hero-search.png)' }}
            />
            <div className="fixed inset-0 bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-green-900/70" />

            <div className="relative z-10 max-w-xl w-full">
                <div className="bg-white/95 backdrop-blur-lg p-8 md:p-10 rounded-3xl shadow-2xl border border-white/20">
                    <div className="flex justify-center mb-6">
                        <div className="h-20 w-20 relative">
                            <Image
                                src={BRAND.logo}
                                alt={`${BRAND.name} Logo`}
                                fill
                                className="object-contain"
                            />
                        </div>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2 text-center">
                        {step === 'details' ? 'Create Account' : 'Verify Email'}
                    </h1>
                    <p className="text-slate-600 mb-8 text-center">
                        {step === 'details'
                            ? `Join ${BRAND.name} for exclusive deals`
                            : (
                                <>
                                    We&apos;ve sent a 6-digit code to <span className="font-semibold text-slate-800">{email}</span>.
                                    <br />
                                    <span className="text-xs mt-2 block text-slate-500 italic">
                                        Didn&apos;t receive it? Check your <span className="font-bold text-green-600">spam folder</span>.
                                    </span>
                                </>
                            )}
                    </p>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium mb-6">
                            {error}
                        </div>
                    )}

                    {step === 'details' ? (
                        <form onSubmit={handleSendOTP} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Username <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="text-black w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all bg-white"
                                    placeholder="username"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Email <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="text-black w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all bg-white"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Password <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="text-black w-full px-4 py-3 pr-12 rounded-xl border-2 border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all bg-white"
                                        placeholder="Create a strong password"
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
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => handlePhoneChange(e.target.value)}
                                    className={`text-black w-full px-4 py-3 rounded-xl border-2 ${phoneError
                                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                                            : 'border-slate-200 focus:border-green-500 focus:ring-green-200'
                                        } focus:ring-2 outline-none transition-all bg-white`}
                                    placeholder="+91 9876543210"
                                />
                                {phoneError && (
                                    <p className="mt-1 text-xs text-red-600">{phoneError}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="cursor-pointer w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3.5 rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-600/30 hover:shadow-xl hover:shadow-green-600/40 transform hover:scale-[1.02] mt-6 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : 'Get Verification Code'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOTP} className="space-y-6">
                            <div className="flex justify-between gap-2 md:gap-4">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`otp-${index}`}
                                        type="text"
                                        maxLength={6} // Allow paste but visually restricted to 1
                                        value={digit}
                                        onChange={(e) => handleOtpChange(e.target.value, index)}
                                        onKeyDown={(e) => handleKeyDown(e, index)}
                                        className="text-black text-center text-2xl font-bold w-full h-12 md:h-16 rounded-xl border-2 border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all bg-white font-mono"
                                        placeholder="•"
                                    />
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || otp.some(d => !d)}
                                className="cursor-pointer w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3.5 rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-600/30 hover:shadow-xl hover:shadow-green-600/40 transform hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : 'Verify & Sign Up'}
                            </button>

                            <div className="text-center space-y-4">
                                <button
                                    type="button"
                                    disabled={!canResend || isLoading}
                                    onClick={handleResendOTP}
                                    className="text-sm font-medium text-green-600 hover:text-green-700 disabled:text-slate-400 transition-colors"
                                >
                                    {resendTimer > 0 
                                        ? `Resend code in ${resendTimer}s` 
                                        : 'Didn\'t receive code? Resend'}
                                </button>
                                <br />
                                <button
                                    type="button"
                                    onClick={() => setStep('details')}
                                    className="text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
                                >
                                    ← Edit registration details
                                </button>
                            </div>
                        </form>
                    )}

                    <p className="mt-8 text-center text-slate-600 text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="text-green-600 font-bold hover:text-green-700 hover:underline transition-colors">
                            Log in
                        </Link>
                    </p>
                </div>

                <div className="text-center mt-6">
                    <Link href="/" className="text-white/90 hover:text-white text-sm font-medium hover:underline transition-colors">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
