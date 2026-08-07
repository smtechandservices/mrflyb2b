'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUserProfile } from '@/lib/api';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard, Plane, Calendar, Users, LogOut, RotateCcw,
  MessageSquare, Shield, Wallet, Image as ImageIcon, Menu, X,
} from 'lucide-react';
import { BRAND } from '@/config/brand';

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useAutoLogout(isAdmin && pathname !== '/login');

  // Close sidebar on navigation
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    async function checkAuth() {
      if (pathname === '/login') {
        setIsAdmin(true); // Allow login page access
        setLoading(false);
        return;
      }
      try {
        const user = await getUserProfile();
        // Check for admin usertype OR superuser status
        if (user.profile?.usertype === 'admin' || user.is_superuser) {
          setIsAdmin(true);
        } else {
          router.push('/login');
        }
      } catch (err) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router, pathname]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center',
        background: 'var(--sand)', color: 'var(--muted)', fontFamily: 'var(--mono)',
        fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        Loading {BRAND.admin.name}…
      </div>
    );
  }

  if (!isAdmin && pathname !== '/login') {
    return null;
  }

  if (pathname === '/login') return <>{children}</>;

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Flights', href: '/flights', icon: Plane },
    { name: 'Bookings', href: '/bookings', icon: Calendar },
    { name: 'Refunds', href: '/refunds', icon: RotateCcw },
    { name: 'Transactions', href: '/topups', icon: Wallet },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Agents', href: '/users', icon: Users },
    { name: 'KYC', href: '/kyc', icon: Shield },
    { name: 'Flyers', href: '/flyers', icon: ImageIcon },
  ];

  return (
    <div className="admin">
      {/* Scoped responsive rules for the mobile off-canvas sidebar — the
          Kushmud reference has no mobile treatment for .admin-side, so
          this project adds its own here rather than editing globals.css. */}
      <style>{`
        .admin-mobile-toggle { display: none; }
        @media (max-width: 900px) {
          .admin { grid-template-columns: 1fr; }
          .admin-side {
            position: fixed;
            top: 0; left: 0; bottom: 0;
            width: 240px;
            z-index: 1001;
            transform: translateX(-100%);
            transition: transform .25s ease;
          }
          .admin-side.is-open { transform: translateX(0); }
          .admin-mobile-toggle { display: inline-flex; }
        }
      `}</style>

      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(28,25,22,0.6)', zIndex: 1000 }}
        />
      )}

      <aside className={`admin-side${isSidebarOpen ? ' is-open' : ''}`}>
        <div className="admin-brand">
          <Image
            src={BRAND.logoTransparent}
            alt={`${BRAND.name} logo`}
            width={26}
            height={26}
            unoptimized
            style={{ objectFit: 'contain' }}
          />
          {BRAND.name}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="admin-mobile-toggle"
            aria-label="Close menu"
            style={{ marginLeft: 'auto', background: 'transparent', border: 0, color: 'var(--sand)', cursor: 'pointer', padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>
        <nav className="admin-nav">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={isActive ? 'active' : ''}
              >
                <span className="ic"><item.icon size={15} /></span>
                <span style={{ flex: 1 }}>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="admin-side-foot">
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('loginTime');
              localStorage.removeItem('lastActivity');
              router.push('/login');
            }}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', color: 'var(--sand)', borderColor: 'rgba(244,237,224,0.2)', justifyContent: 'flex-start' }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-top">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="admin-mobile-toggle btn btn-ghost btn-sm"
            aria-label="Open menu"
          >
            <Menu size={16} />
          </button>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            {BRAND.admin.name}
          </span>
          <Link href={BRAND.websiteUrl} target="_blank" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
            ← View site
          </Link>
        </div>
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
}
