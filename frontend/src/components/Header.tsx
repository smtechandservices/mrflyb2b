'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LogOut, User, Wallet, ShieldCheck, ShieldAlert, Shield, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { BRAND } from '@/config/brand';

const NAV_ITEMS = (isAuthenticated: boolean) => [
    { href: '/', label: 'Home' },
    { href: '/search', label: 'Flights' },
    ...(isAuthenticated ? [{ href: '/my-bookings', label: 'My Bookings' }] : []),
    ...(isAuthenticated ? [{ href: '/wallet', label: 'Wallet' }] : []),
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
];

function fmt(n: number) {
    return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function kycStatus(status?: string) {
    if (status === 'VERIFIED') return { cls: 'confirmed', icon: <ShieldCheck size={11} />, label: 'Verified' };
    if (status === 'SUBMITTED') return { cls: 'pending', icon: <Shield size={11} />, label: 'Reviewing' };
    return { cls: 'pending', icon: <ShieldAlert size={11} />, label: 'Verify KYC' };
}

export function Header() {
    const { user, logout, isAuthenticated, refreshUser } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!isAuthenticated) return;
        const interval = setInterval(() => {
            refreshUser().catch(err => console.error('Wallet poll failed', err));
        }, 10000);
        return () => clearInterval(interval);
    }, [isAuthenticated, refreshUser]);

    const navItems = NAV_ITEMS(isAuthenticated);
    const kyc = kycStatus(user?.profile?.kyc_status);

    const balance = Number(user?.profile?.wallet_balance ?? 0);
    const credit = Number(user?.profile?.credit_limit ?? 0);
    const dues = Number(user?.profile?.total_dues ?? 0);
    const spendingPower = balance + credit - dues;

    const navLinks = (
        <>
            {navItems.map(item => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={pathname === item.href ? 'active' : ''}
                >
                    {item.label}
                </Link>
            ))}
        </>
    );

    return (
        <nav className="nav">
            <div className="nav-inner">
                <Link href="/" className="brand">
                    <Image src={BRAND.logoTransparent} alt={`${BRAND.name} Logo`} width={508} height={491} style={{ height: 34, width: 'auto' }} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            {BRAND.name}
                        </span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 500, lineHeight: 1 }}>
                            Flight Bookings
                        </span>
                    </span>
                </Link>

                <div className="nav-links">{navLinks}</div>

                <div className="nav-actions">
                    {isAuthenticated ? (
                        <>
                            {user?.profile?.wallet_balance !== undefined && (
                                <Link href="/wallet" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                    <span className="eyebrow" style={{ fontSize: 9, display: 'flex', alignItems: 'center', gap: 4 }}><Wallet size={10} />Spending Power</span>
                                    <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{fmt(spendingPower)}</span>
                                </Link>
                            )}
                            <Link
                                href="/profile"
                                className="btn btn-ghost btn-sm"
                            >
                                <User size={14} />
                                {user?.username}
                                <span className={`status ${kyc.cls}`} style={{ padding: '2px 6px' }}>
                                    <span className="d" />
                                </span>
                            </Link>
                            <button onClick={logout} className="btn btn-ghost btn-sm" title="Log out">
                                <LogOut size={14} />
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className="btn btn-ghost btn-sm">Log in</Link>
                            <Link href="/signup" className="btn btn-primary btn-sm">Create an account</Link>
                        </>
                    )}
                </div>

                <button
                    className="nav-toggle"
                    aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={isMenuOpen}
                    onClick={() => setIsMenuOpen(o => !o)}
                >
                    {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            <div className={'nav-mobile' + (isMenuOpen ? ' is-open' : '')}>
                <div className="nav-mobile-links">
                    {navLinks}
                </div>

                {isAuthenticated && user?.profile?.wallet_balance !== undefined && (
                    <Link
                        href="/wallet"
                        onClick={() => setIsMenuOpen(false)}
                        style={{ display: 'block', padding: '16px', margin: '8px 0', background: 'var(--sand)', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}
                    >
                        <span className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><Wallet size={11} />Spending Power</span>
                        <span className="serif" style={{ fontSize: 22 }}>{fmt(spendingPower)}</span>
                    </Link>
                )}

                {isAuthenticated ? (
                    <div className="nav-mobile-actions">
                        <Link
                            href="/profile"
                            onClick={() => setIsMenuOpen(false)}
                            className="btn btn-ghost btn-sm"
                        >
                            <User size={14} /> {user?.username}
                        </Link>
                        <button
                            onClick={() => { setIsMenuOpen(false); window.dispatchEvent(new CustomEvent('open-kyc-modal')); }}
                            className={`status ${kyc.cls}`}
                        >
                            {kyc.icon}<span className="d" />{kyc.label}
                        </button>
                        <button onClick={logout} className="btn btn-ghost btn-sm">
                            <LogOut size={14} /> Log out
                        </button>
                    </div>
                ) : (
                    <div className="nav-mobile-actions">
                        <Link href="/login" className="btn btn-ghost btn-sm">Log in</Link>
                        <Link href="/signup" className="btn btn-primary btn-sm">Create an account</Link>
                    </div>
                )}
            </div>
        </nav>
    );
}
