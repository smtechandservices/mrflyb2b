'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export function BackButton() {
    const router = useRouter();

    return (
        <button
            onClick={() => router.back()}
            className="flex items-center text-slate-600 hover:text-blue-600 transition-colors mb-6 font-medium"
        >
            <ArrowLeft size={20} className="mr-2" />
            Back
        </button>
    );
}
