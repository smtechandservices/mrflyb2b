'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { KYCModal } from '@/components/KYCModal';

export function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAuth();

    // Every page requires a logged-in agent except the auth pages themselves
    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';

    useEffect(() => {
        if (!isLoading && !isAuthenticated && !isAuthPage) {
            router.replace('/login');
        }
    }, [isLoading, isAuthenticated, isAuthPage, router]);

    if (isAuthPage) {
        return (
            <>
                {children}
                <KYCModal />
            </>
        );
    }

    if (isLoading || !isAuthenticated) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={32} style={{ color: 'var(--clay)' }} />
            </div>
        );
    }

    return (
        <div className="app">
            <Header />
            <main className="grow">
                {children}
            </main>
            <Footer />
            <KYCModal />
        </div>
    );
}
