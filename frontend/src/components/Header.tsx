'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Plane, LogOut, User, Wallet, ShieldCheck, ShieldAlert, Shield, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { BRAND } from '@/config/brand';

export function Header() {
    const { user, logout, isAuthenticated, refreshUser } = useAuth();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close menu on route change
    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    // Poll for wallet updates every 10 seconds
    useEffect(() => {
        if (!isAuthenticated) return;

        const interval = setInterval(() => {
            refreshUser().catch(err => console.error("Wallet poll failed", err));
        }, 10000);

        return () => clearInterval(interval);
    }, [isAuthenticated, refreshUser]);

    return (
        <header className={`${isMenuOpen ? 'fixed inset-0 z-[1000] bg-slate-950 flex flex-col' : 'fixed top-0 inset-x-0 z-50 bg-slate-950/40 lg:bg-slate-950/10'} transition-all duration-300 ${isScrolled ? 'bg-slate-950/80 lg:bg-slate-950/40 backdrop-blur-md border-b border-white/20' : ''}`}>
            <div className="mx-auto px-4 md:px-12 h-20 flex items-center justify-between shrink-0">
                <Link href="/" className="flex items-center space-x-2 md:space-x-3 font-semibold shrink-0" style={{ fontFamily: "sans-serif" }}>
                    <Image src={BRAND.logoTransparent} alt={`${BRAND.name} Logo`} width={32} height={32} className="object-contain md:w-20 md:h-20" />
                    <span className={`bg-gradient-to-r from-sky-300 to-blue-200 text-transparent text-xl md:text-3xl bg-clip-text whitespace-nowrap mt-2 -ms-2`}>
                        {BRAND.name}
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center space-x-6">
                    <NavLink href="/">Home</NavLink>
                    <NavLink href="/search">Flights</NavLink>
                    {isAuthenticated && <NavLink href="/my-bookings">Bookings</NavLink>}
                    {isAuthenticated && <NavLink href="/wallet">Wallet</NavLink>}
                    <NavLink href="/about">About</NavLink>
                    <NavLink href="/contact">Contact</NavLink>
                </nav>

                {/* Desktop Auth Section */}
                <div className="hidden lg:flex items-center space-x-4">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <button
                                    onClick={() => window.dispatchEvent(new CustomEvent('open-edit-profile-modal'))}
                                    className="cursor-pointer text-white font-medium flex items-center gap-2 hover:text-blue-200 transition-colors"
                                >
                                    <User size={18} />
                                    {user?.username}
                                    {user?.profile?.kyc_status === 'VERIFIED' ? (
                                        <div className="flex items-center gap-1 bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/30 text-[10px] font-bold">
                                            <ShieldCheck size={10} />
                                        </div>
                                    ) : user?.profile?.kyc_status === 'SUBMITTED' ? (
                                        <div className="flex items-center gap-1 bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30 text-[10px] font-bold">
                                            <Shield size={10} />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30 text-[10px] font-bold">
                                            <ShieldAlert size={10} />
                                        </div>
                                    )}
                                </button>
                            </div>
                            {user?.profile?.wallet_balance !== undefined && (() => {
                                const balance = Number(user.profile.wallet_balance);
                                const credit = Number(user.profile.credit_limit ?? 0);
                                const dues = Number(user.profile.total_dues ?? 0);
                                const spendingPower = balance + credit - dues;
                                const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                return (
                                    <Link href="/wallet" className="group relative flex items-center gap-3 px-4 py-2 rounded-2xl bg-gradient-to-br from-sky-950/80 to-slate-900/80 border border-sky-500/40 hover:border-sky-400/70 transition-all duration-300 shadow-lg shadow-sky-900/30 backdrop-blur-sm overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        {/* Spending power */}
                                        <div className="relative flex flex-col">
                                            <span className="text-sky-400/80 text-[8px] uppercase tracking-[0.15em] font-bold flex items-center gap-1"><Wallet size={9} />Power</span>
                                            <span className="text-white font-black text-base leading-tight tracking-tight whitespace-nowrap">{fmt(spendingPower)}</span>
                                        </div>
                                        {/* Divider */}
                                        <div className="relative w-px self-stretch bg-white/10" />
                                        {/* Stats */}
                                        <div className="relative flex items-center gap-3 text-[10px]">
                                            <div className="flex flex-col">
                                                <span className="text-slate-400 text-[8px] uppercase tracking-wider">Bal</span>
                                                <span className="text-blue-300 font-bold whitespace-nowrap">{fmt(balance)}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-slate-400 text-[8px] uppercase tracking-wider">Credit</span>
                                                <span className="text-sky-300 font-bold whitespace-nowrap">{fmt(credit)}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-slate-400 text-[8px] uppercase tracking-wider">Dues</span>
                                                <span className="text-red-400 font-bold whitespace-nowrap">{fmt(dues)}</span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })()}
                            <button
                                onClick={logout}
                                className="cursor-pointer bg-white/10 hover:bg-white/20 text-white p-2 border border-sky-500 rounded-full transition-colors"
                                title="Logout"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Link href="/login" className="text-white hover:text-blue-300 font-medium transition-colors">
                                Login
                            </Link>
                            <Link href="/signup" className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-full font-bold transition-colors shadow-lg shadow-blue-600/20">
                                Create an account
                            </Link>
                        </div>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors relative z-[110]"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            {/* Mobile Menu Content (Only visible when open) */}
            {isMenuOpen && (
                <>
                <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col space-y-8 animate-fade-in pb-12">
                    {/* User Info on Mobile */}
                    {isAuthenticated ? (
                        <div className="flex flex-col space-y-6">
                            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/10">
                                <div className="w-14 h-14 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 border border-sky-500/30">
                                    <User size={28} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold text-lg truncate">{user?.username}</p>
                                    <p className="text-gray-400 text-sm truncate">{user?.email}</p>
                                </div>
                                <button onClick={logout} className="p-3 bg-red-500/10 text-red-400 rounded-2xl hover:bg-red-500/20 transition-colors">
                                    <LogOut size={20} />
                                </button>
                            </div>

                            {/* Mobile Profile Actions */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        window.dispatchEvent(new CustomEvent('open-edit-profile-modal'));
                                    }}
                                    className="flex items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all font-bold text-sm"
                                >
                                    <User size={18} className="text-sky-400" />
                                    Edit Profile
                                </button>
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        window.dispatchEvent(new CustomEvent('open-kyc-modal'));
                                    }}
                                    className={`flex items-center justify-center gap-2 p-4 rounded-2xl border transition-all font-bold text-sm ${user?.profile?.kyc_status === 'VERIFIED'
                                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                                        : user?.profile?.kyc_status === 'SUBMITTED'
                                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                                        }`}
                                >
                                    {user?.profile?.kyc_status === 'VERIFIED' ? <ShieldCheck size={18} /> :
                                        user?.profile?.kyc_status === 'SUBMITTED' ? <Shield size={18} /> :
                                            <ShieldAlert size={18} />}
                                    {user?.profile?.kyc_status === 'VERIFIED' ? 'Verified' :
                                        user?.profile?.kyc_status === 'SUBMITTED' ? 'Reviewing' : 'Verify KYC'}
                                </button>
                            </div>

                            {user?.profile?.wallet_balance !== undefined && (() => {
                                const balance = Number(user.profile.wallet_balance);
                                const credit = Number(user.profile.credit_limit ?? 0);
                                const dues = Number(user.profile.total_dues ?? 0);
                                const spendingPower = balance + credit - dues;
                                const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                return (
                                    <Link href="/wallet" className="p-4 rounded-3xl bg-gradient-to-br from-sky-500/20 to-blue-600/10 border border-sky-500/30 block">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-1.5 bg-sky-500/20 rounded-lg">
                                                <Wallet size={14} className="text-sky-400" />
                                            </div>
                                            <span className="text-sky-300 text-[10px] uppercase tracking-widest font-bold">Spending Power</span>
                                        </div>
                                        <p className="text-white font-extrabold text-2xl mb-3 truncate">{fmt(spendingPower)}</p>
                                        <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-white/10">
                                            <div className="bg-white/5 rounded-xl p-2 text-center">
                                                <p className="text-blue-300 text-[9px] uppercase tracking-wider font-bold mb-0.5">Balance</p>
                                                <p className="text-white font-bold text-[11px] truncate">{fmt(balance)}</p>
                                            </div>
                                            <div className="bg-white/5 rounded-xl p-2 text-center">
                                                <p className="text-sky-300 text-[9px] uppercase tracking-wider font-bold mb-0.5">Credit</p>
                                                <p className="text-white font-bold text-[11px] truncate">{fmt(credit)}</p>
                                            </div>
                                            <div className="bg-white/5 rounded-xl p-2 text-center">
                                                <p className="text-red-300 text-[9px] uppercase tracking-wider font-bold mb-0.5">Dues</p>
                                                <p className="text-white font-bold text-[11px] truncate">{fmt(dues)}</p>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })()}
                        </div>
                    ) : (
                            <div className="flex flex-col gap-4">
                                <h3 className="text-center text-white text-2xl font-bold mb-2">Welcome to {BRAND.name}</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <Link
                                        href="/login"
                                        className="py-4 text-center text-white font-bold bg-white/5 rounded-2xl border border-white/10"
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        href="/signup"
                                        className="py-4 text-center text-white font-bold bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20"
                                    >
                                        Join Now
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* Mobile Links */}
                        <div className="flex flex-col space-y-4">
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest pl-2">Navigation</p>
                            <MobileNavLink href="/">Home</MobileNavLink>
                            <MobileNavLink href="/search">Flights</MobileNavLink>
                            {isAuthenticated && <MobileNavLink href="/my-bookings">My Bookings</MobileNavLink>}
                            {isAuthenticated && <MobileNavLink href="/wallet">Wallet</MobileNavLink>}
                            <MobileNavLink href="/about">About Us</MobileNavLink>
                            <MobileNavLink href="/contact">Support</MobileNavLink>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/10 text-center">
                        <p className="text-gray-500 text-sm">© {new Date().getFullYear()} {BRAND.name}</p>
                    </div>
                </>
            )}
        </header>
    );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    const pathname = usePathname();
    const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

    return (
        <Link
            href={href}
            className={`relative text-gray-200 hover:text-white px-2 py-2 transition-all duration-300 text-lg font-medium group ${isActive ? 'text-white' : ''}`}
        >
            {children}
            <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-blue-500 transition-all duration-300 rounded-full ${isActive ? 'w-2/3' : 'group-hover:w-1/3'}`} />
        </Link>
    );
}

function MobileNavLink({ href, children }: { href: string; children: React.ReactNode }) {
    const pathname = usePathname();
    const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

    return (
        <Link
            href={href}
            className={`flex items-center px-6 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${isActive
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                : 'text-gray-300 hover:bg-white/5'
                }`}
        >
            {children}
        </Link>
    );
}
