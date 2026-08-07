'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const SESSION_TIMEOUT_MS = 3 * 60 * 60 * 1000; // 3 hours from login, regardless of activity
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes without activity
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'] as const;
const ACTIVITY_THROTTLE_MS = 5000; // avoid writing to localStorage on every event
const SESSION_CHECK_INTERVAL_MS = 15000;

// Enforces a 3hr absolute session limit and a 30min idle timeout for the admin panel.
export function useAutoLogout(enabled: boolean) {
    const router = useRouter();

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('lastActivity');
        router.push('/login');
    }, [router]);

    useEffect(() => {
        if (!enabled) return;

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
    }, [enabled, logout]);
}
