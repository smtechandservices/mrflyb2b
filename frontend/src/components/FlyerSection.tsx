'use client';

import { useEffect, useState, useRef } from 'react';
import { getFlyers, Flyer } from '@/lib/api';
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function FlyerSection() {
    const [flyers, setFlyers] = useState<Flyer[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const flyerData = await getFlyers();
                setFlyers(flyerData);
            } catch (error) {
                console.error('Failed to fetch data', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = window.innerWidth < 768 ? 260 : 340;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    if (loading) {
        return (
            <div style={{ marginTop: 60, marginBottom: 40 }}>
                <div className="container">
                    <div style={{ display: 'flex', gap: 24, overflow: 'hidden' }}>
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flyer-card placeholder" style={{ height: 420 }} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (flyers.length === 0) return null;

    return (
        <section style={{ marginTop: 60, marginBottom: 40 }}>
            <div className="container">
                <div className="section-head">
                    <div>
                        <span className="eyebrow">— Offers</span>
                        <h2 style={{ marginTop: 8 }}>Exclusive promotions</h2>
                        <p style={{ color: 'var(--muted)', marginTop: 8 }}>Handpicked travel deals and seasonal flyers, just for you.</p>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                        <button onClick={() => scroll('left')} className="btn btn-ghost btn-sm" style={{ padding: 10, borderRadius: '50%' }}>
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => scroll('right')} className="btn btn-ghost btn-sm" style={{ padding: 10, borderRadius: '50%' }}>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="container">
                <div
                    ref={scrollContainerRef}
                    style={{ display: 'flex', overflowX: 'auto', gap: 24, paddingBottom: 24, scrollbarWidth: 'none' }}
                    className="scrollbar-hide"
                >
                    {flyers.map((flyer) => {
                        const rawDescription = flyer.description?.trim();
                        const lines = rawDescription ? rawDescription.split('\n') : [];
                        const bodyText = lines.slice(1).join('\n').trim();
                        const flyerTitle = bodyText ? lines[0] : null;
                        const flyerBody = bodyText || lines[0] || '';

                        return (
                            <div key={flyer.id} className="flyer-card" style={{ width: 320, flexShrink: 0 }}>
                                <div className="flyer-img" style={{ backgroundImage: `url(${flyer.image_url})` }} />
                                <div style={{ padding: '16px 20px 20px' }}>
                                    {flyerTitle && (
                                        <h4 style={{ marginBottom: 6, fontSize: 15 }}>{flyerTitle}</h4>
                                    )}
                                    {flyerBody && (
                                        <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-line', marginBottom: 14 }}>
                                            {flyerBody}
                                        </p>
                                    )}
                                    <Link href="/contact" className="btn btn-ghost btn-sm">
                                        <MessageSquare className="w-3.5 h-3.5" /> Enquire
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
