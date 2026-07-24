'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUserProfile } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, Plane, Calendar, Users, LogOut, RotateCcw, MessageSquare, Shield, Wallet, Image as ImageIcon } from 'lucide-react';
import { BRAND } from '@/config/brand';

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">Loading {BRAND.admin.name}...</div>
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
    { name: 'Users', href: '/users', icon: Users },
    { name: 'KYC', href: '/kyc', icon: Shield },
    { name: 'Flyers', href: '/flyers', icon: ImageIcon },
  ];

  return (
    <div className="flex min-h-screen bg-slate-100 relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[1000] lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 bg-slate-900 text-white fixed h-full z-[1001] transition-transform duration-300 transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="px-4 pt-4 pb-0 flex items-center justify-between lg:justify-start gap-3">
          <div className="flex items-center gap-3">
            <Image
              src={BRAND.logoTransparent}
              alt={`${BRAND.name} Logo`}
              width={42}
              height={42}
              priority
              unoptimized
              className="object-contain md:w-16 md:h-16"
            />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-300 to-blue-200 mt-2 -ms-2">
              {BRAND.name}
            </h1>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-white"
          >
            <LogOut size={20} className="rotate-180" />
          </button>
        </div>
        <nav className="mt-6 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
          <button
            onClick={() => {
              localStorage.removeItem('token');
              router.push('/login');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors mt-8"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Mobile Header Bar */}
        <header className="lg:hidden h-16 bg-slate-900 flex items-center justify-between px-4 sticky top-0 z-20 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Image src={BRAND.logoTransparent} alt="Logo" width={32} height={32} unoptimized />
            <span className="text-white font-bold">Admin</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-white hover:bg-white/10 rounded-lg"
          >
            <LayoutDashboard size={24} />
          </button>
        </header>

        <main className="p-4 md:p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
