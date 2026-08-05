'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export function BackButton() {
    const router = useRouter();

    return (
        <button
            onClick={() => router.back()}
            className="btn-link"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}
        >
            <ArrowLeft size={16} />
            Back
        </button>
    );
}
