'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getUserProfile, User } from '@/lib/api';

const SESSION_TIMEOUT_MS = 3 * 60 * 60 * 1000; // 3 hours from login, regardless of activity
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes without activity
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'] as const;
const ACTIVITY_THROTTLE_MS = 5000; // avoid writing to localStorage on every event
const SESSION_CHECK_INTERVAL_MS = 15000;

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    login: () => { },
    logout: () => { },
    refreshUser: async () => { },
    isAuthenticated: false,
    isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Initial load from localStorage
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));

            // Validate token and refresh user data
            getUserProfile()
                .then((userData) => {
                    setUser(userData);
                    localStorage.setItem('user', JSON.stringify(userData));
                })
                .catch(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setToken(null);
                    setUser(null);
                })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = (newToken: string, userData: User) => {
        const now = Date.now().toString();
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('loginTime', now);
        localStorage.setItem('lastActivity', now);
        router.push('/');
    };

    const refreshUser = async () => {
        if (!token) return;
        try {
            const userData = await getUserProfile();
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
            console.error("Failed to refresh user", error);
            // Optionally handle token expiry here, but better to be safe and just log for now
            // to avoid auto-logout during a background poll
        }
    };

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('lastActivity');
        router.push('/');
    }, [router]);

    // Auto-logout: 3hr absolute session limit + 30min idle timeout
    useEffect(() => {
        if (!token) return;

        if (!localStorage.getItem('loginTime')) {
            localStorage.setItem('loginTime', Date.now().toString());
        }
        if (!localStorage.getItem('lastActivity')) {
            localStorage.setItem('lastActivity', Date.now().toString());
        }

        let lastThrottledUpdate = 0;
        const markActivity = () => {
            const now = Date.now();
            if (now - lastThrottledUpdate < ACTIVITY_THROTTLE_MS) return;
            lastThrottledUpdate = now;
            localStorage.setItem('lastActivity', now.toString());
        };

        ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, markActivity));

        const interval = setInterval(() => {
            const now = Date.now();
            const loginTime = Number(localStorage.getItem('loginTime')) || now;
            const lastActivity = Number(localStorage.getItem('lastActivity')) || now;

            if (now - loginTime >= SESSION_TIMEOUT_MS || now - lastActivity >= IDLE_TIMEOUT_MS) {
                logout();
            }
        }, SESSION_CHECK_INTERVAL_MS);

        return () => {
            ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActivity));
            clearInterval(interval);
        };
    }, [token, logout]);

    return (
        <AuthContext.Provider value={{ user, token, login, logout, refreshUser, isAuthenticated: !!token, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
