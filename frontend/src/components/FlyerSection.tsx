'use client';

import { useEffect, useState, useRef } from 'react';
import { getFlyers, Flyer, submitContactMessage, getUserProfile, User } from '@/lib/api';
import { ArrowRight, Download, X, ChevronLeft, ChevronRight, Eye, Send, CheckCircle2, Lock } from 'lucide-react';
import Link from 'next/link';
import { BRAND } from '@/config/brand';

export default function FlyerSection() {
    const [flyers, setFlyers] = useState<Flyer[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [selectedFlyer, setSelectedFlyer] = useState<Flyer | null>(null);
    const [enquiryStatus, setEnquiryStatus] = useState<'IDLE' | 'SENDING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const flyerData = await getFlyers();
                setFlyers(flyerData);

                const token = localStorage.getItem('token');
                if (token) {
                    const profileData = await getUserProfile();
                    setUser(profileData);
                }
            } catch (error) {
                console.error('Failed to fetch data', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedFlyer) {
            document.body.style.overflow = 'hidden';
            setEnquiryStatus('IDLE');
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [selectedFlyer]);

    const handleSendEnquiry = async () => {
        if (!selectedFlyer || !user) return;

        setEnquiryStatus('SENDING');
        try {
            const messageText = `Enquiry for Flyer #${selectedFlyer.id}\nDescription: ${selectedFlyer.description}\n\nUser Profile Phone: ${user.profile.phone_number || 'N/A'}\nUsername: ${user.username}`;
            await submitContactMessage({
                name: user.username,
                email: user.email,
                message: messageText
            });

            fetch('/api/contact/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: user.username, email: user.email, message: messageText }),
            }).catch(e => console.error('Enquiry email dispatch failed:', e));

            setEnquiryStatus('SUCCESS');
            setTimeout(() => {
                setEnquiryStatus('IDLE');
            }, 3000);
        } catch (error) {
            console.error('Enquiry failed', error);
            setEnquiryStatus('ERROR');
        }
    };

    const handleDownload = async (imageUrl: string, filename: string) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || `${BRAND.name.toLowerCase()}-flyer.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed', error);
        }
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = window.innerWidth < 768 ? 300 : 450;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    if (loading) {
        return (
            <div className="mx-auto px-4 py-16">
                <div className="flex justify-center gap-8 overflow-hidden">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="min-w-[280px] md:min-w-[350px] flex flex-col gap-4">
                            <div className="aspect-[4/5] bg-slate-100 animate-pulse rounded-[2rem]" />
                            <div className="h-12 w-full bg-slate-100 animate-pulse rounded-xl" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (flyers.length === 0) return null;

    return (
        <section className="mx-auto pt-10 md:pt-20 bg-white">
            <div className="mx-auto flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 px-6">
                <div className="mb-6 md:mb-0">
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-2 tracking-tight">
                        Exclusive <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">Promotions</span>
                    </h2>
                    <p className="text-slate-500 font-medium text-base md:text-lg">Handpicked travel deals and seasonal flyers just for you</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => scroll('left')}
                        className="p-3 md:p-4 rounded-full bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all active:scale-95"
                    >
                        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-slate-600" />
                    </button>
                    <button 
                        onClick={() => scroll('right')}
                        className="p-3 md:p-4 rounded-full bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all active:scale-95"
                    >
                        <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-slate-600" />
                    </button>
                </div>
            </div>

            <div 
                ref={scrollContainerRef}
                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 pb-10 gap-4 md:gap-12"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {flyers.map((flyer) => (
                    <div 
                        key={flyer.id} 
                        className="min-w-[280px] md:min-w-[380px] flex flex-col gap-4 snap-center md:snap-start"
                    >
                        <div className="relative h-[350px] md:h-[550px] rounded-md overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100 transition-all duration-500">
                            <img 
                                src={flyer.image_url} 
                                alt="Promotion" 
                                className="w-full h-full object-cover"
                            />
                        </div>

                        <button 
                            onClick={() => setSelectedFlyer(flyer)}
                            className="underline underline-offset-4 cursor-pointer w-full flex items-center justify-center text-slate-600 text-md hover:text-green-600 transition-all duration-300"
                        >
                            VIEW DETAILS
                            {/* <ArrowRight className="w-3 h-3 ml-2" /> */}
                        </button>
                    </div>
                ))}
            </div>

            {/* Enhanced Lightbox / Modal */}
            {selectedFlyer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 overflow-hidden animate-in fade-in duration-300">
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
                        onClick={() => setSelectedFlyer(null)}
                    />
                    
                    <div className="relative w-full mx-4 md:mx-10 h-full max-h-[90vh] md:max-h-[95vh] bg-white rounded-[1.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
                        
                        <button 
                            onClick={() => setSelectedFlyer(null)}
                            className="cursor-pointer absolute top-4 right-4 md:top-6 md:right-6 p-2 md:p-3 bg-white/90 hover:bg-white text-slate-500 rounded-full transition-all z-[110] shadow-md active:scale-90"
                        >
                            <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>

                        {/* Image Pane - Responsive Sizing */}
                        <div className="w-full md:w-[45%] h-[35%] md:h-full bg-slate-100 flex items-center justify-center relative overflow-hidden shrink-0">
                            <img 
                                src={selectedFlyer.image_url} 
                                alt="Full Flyer" 
                                className="w-full h-full object-fit"
                            />
                        </div>
                        
                        {/* Content Pane */}
                        <div className="w-full md:w-[55%] h-[65%] md:h-full flex flex-col bg-white">
                            {/* Scrollable Text Area */}
                            <div className="flex-1 p-6 md:p-12 overflow-y-auto scrollbar-hide">
                                <h3 className="text-xl md:text-4xl font-semibold text-slate-900 tracking-tight mb-4 md:mb-6">Offer Details</h3>
                                <div className="text-slate-600 text-sm md:text-xl leading-relaxed whitespace-pre-line font-medium italic border-l-4 border-green-500 pl-4 md:pl-6 py-1 md:py-2">
                                    {selectedFlyer.description || "Exciting travel details await! Send an enquiry now to get the full itinerary and best fares."}
                                </div>
                            </div>

                            {/* Sticky Action Area at Bottom */}
                            <div className="p-4 md:p-12 bg-white border-t border-slate-100">
                                <div className="bg-slate-50 rounded-xl md:rounded-[2rem] p-4 md:p-8 border border-slate-100 shadow-sm">
                                    {!user ? (
                                        <div className="flex flex-col items-center justify-center text-center py-2">
                                            <h4 className="text-lg md:text-xl font-bold text-slate-900 mb-2">Login Required</h4>
                                            <p className="text-slate-500 text-xs md:text-sm mb-4">Log in to send an enquiry for this offer.</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            {enquiryStatus === 'SUCCESS' ? (
                                                <div className="flex flex-col items-center justify-center py-2 text-center animate-in zoom-in duration-300">
                                                    <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-green-500 mb-2 md:mb-3" />
                                                    <h5 className="text-lg md:text-xl font-black text-slate-900 mb-1">Enquiry Sent!</h5>
                                                    <p className="text-slate-500 text-xs md:text-sm">Our team will get back to you shortly.</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                                                    <button 
                                                        onClick={handleSendEnquiry}
                                                        disabled={enquiryStatus === 'SENDING'}
                                                        className="cursor-pointer flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-green-600 text-white font-bold py-4 md:py-5 rounded-xl md:rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 text-sm md:text-lg shadow-lg"
                                                    >
                                                        <Send className={`w-4 h-4 md:w-5 md:h-5 ${enquiryStatus === 'SENDING' ? 'animate-pulse' : ''}`} />
                                                        {enquiryStatus === 'SENDING' ? 'SENDING...' : 'I AM INTERESTED'}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDownload(selectedFlyer.image_url, `flyer-${selectedFlyer.id}.jpg`)}
                                                        className="cursor-pointer flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-600 font-bold px-4 py-4 md:px-8 md:py-5 rounded-xl md:rounded-2xl transition-all border border-slate-200 shadow-sm text-sm md:text-base"
                                                    >
                                                        <Download className="w-4 h-4 md:w-5 md:h-5" />
                                                        SAVE
                                                    </button>
                                                </div>
                                            )}
                                            
                                            {enquiryStatus === 'ERROR' && (
                                                <p className="mt-2 md:mt-4 text-red-500 text-xs md:text-sm font-medium text-center">Something went wrong. Please try again.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </section>
    );
}
