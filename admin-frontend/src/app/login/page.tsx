'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login as loginApi, getUserProfile } from '@/lib/api';
// import Link from 'next/link'; // Not needed if we remove the signup link
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
                    <div className="flex justify-center mb-6">
                        <div className="h-20 w-20 relative">
                            <Image
                                src={BRAND.logoTransparent}
                                alt={`${BRAND.name} Logo`}
                                fill
                                className="object-contain"
                            />
                        </div>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2 text-center">Admin Access</h1>
                    <p className="text-slate-600 mb-8 text-center">Sign in to manage the platform</p>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium mb-6">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="text-black w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                                placeholder="Enter admin email"
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
                                    className="text-black w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white pr-12"
                                    placeholder="Enter password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-sky-600 text-white py-3.5 rounded-xl font-bold hover:from-blue-700 hover:to-sky-700 transition-all shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Verifying...' : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
