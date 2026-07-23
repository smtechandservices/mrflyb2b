'use client';
import { useState, useEffect } from 'react';
import { submitContactMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Mail, Phone, MapPin, Send, Instagram, Facebook, X as XIcon, Clock, MessageSquare, HelpCircle, Youtube, Linkedin } from 'lucide-react';
import Swal from 'sweetalert2';
import { BRAND } from '@/config/brand';

export default function ContactPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (user) {
            setName(user.username);
            setEmail(user.email);
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        try {
            await submitContactMessage({ name, email, message });
            setSuccess(true);
            setMessage(''); // Clear message only
            // Keep name/email if logged in, or clear if not? 
            // Better to keep them if user wants to send another.
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Failed to send message. Please try again later.',
                confirmButtonColor: '#10b981' // green-500
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">

            {/* Page Header */}
            <div className="bg-slate-900 pt-28 pb-20 px-4 text-center">
                <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full text-sm font-bold mb-6 border border-blue-500/20">
                    <MessageSquare size={16} />
                    Contact Support
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6">
                    We're Here to <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
                        Help You Roll
                    </span>
                </h1>
                <p className="text-slate-400 text-lg md:text-xl max-w-7xl mx-auto leading-relaxed">
                    Have questions about your booking or need assistance? Our team is available 24/7.
                </p>
            </div>

            <div className="max-w-9xl mx-auto py-20 px-4 md:px-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="bg-white p-8 rounded-3xl border border-slate-400">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">Send a Message</h2>
                        {success ? (
                            <div className="bg-green-50 text-green-700 p-6 rounded-xl text-center">
                                <div className="text-4xl mb-4">🎉</div>
                                <h3 className="font-bold text-xl mb-2">Message Sent!</h3>
                                <p>We'll get back to you shortly.</p>
                                <button onClick={() => setSuccess(false)} className="cursor-pointer mt-4 text-green-700 font-semibold hover:underline">Send another</button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
                                    <input
                                        name="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="text-slate-600 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-green-500 outline-none bg-slate-50"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                                    <input
                                        name="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="text-slate-600 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-slate-50"
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
                                    <textarea
                                        name="message"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        required
                                        rows={4}
                                        className="text-slate-600 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-slate-50"
                                        placeholder="How can we help?"
                                    ></textarea>
                                </div>
                                <button disabled={loading} className="cursor-pointer w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                                    {loading ? 'Sending...' : <><Send size={18} /> Send Message</>}
                                </button>
                            </form>
                        )}
                    </div>

                    <div className='mt-4'>
                        <h1 className="text-4xl font-bold text-slate-800 mb-6">Get in Touch</h1>
                        <p className="text-xl text-slate-500 mb-10 leading-relaxed max-w-2xl">
                            Have questions about your flight? Need assistance with booking? Our team is here to help you 24/7.
                        </p>

                        <div className="space-y-8">
                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0">
                                    <Mail />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">Email Us</h3>
                                    <p className="text-slate-500">{BRAND.contactEmail}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 shrink-0">
                                    <Phone />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">Call Us</h3>
                                    {BRAND.phones.map((phone) => (
                                        <p key={phone} className="text-slate-500">{phone}</p>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
                                    <MapPin />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">Visit Us</h3>
                                    <p className="text-slate-500">
                                        Shop No 16, Balaji Market, <br />
                                        Kashmiri Gate, Delhi <br />
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Business Hours & Socials */}
                        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-400">
                                <div className="flex items-center gap-3 mb-4 text-slate-800">
                                    <Clock className="text-blue-600" />
                                    <h3 className="font-bold">Business Hours</h3>
                                </div>
                                <div className="space-y-2 text-sm text-slate-500">
                                    <p className="flex justify-between"><span>Mon - Fri:</span> <span>9:00 AM - 8:00 PM</span></p>
                                    <p className="flex justify-between"><span>Saturday:</span> <span>10:00 AM - 6:00 PM</span></p>
                                    <p className="flex justify-between font-medium text-green-600"><span>Support:</span> <span>24/7 Available</span></p>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-400">
                                <div className="flex items-center gap-3 mb-4 text-slate-800">
                                    <MessageSquare className="text-pink-600" />
                                    <h3 className="font-bold">Follow Us</h3>
                                </div>
                                <div className="flex gap-4">
                                    <a href={BRAND.social.instagram} target="_blank" className="p-3 bg-slate-100 rounded-full text-slate-600 hover:bg-pink-100 hover:text-pink-600 transition-colors cursor-pointer">
                                        <Instagram size={20} />
                                    </a>
                                    <a href={BRAND.social.facebook} target="_blank" className="p-3 bg-slate-100 rounded-full text-slate-600 hover:bg-blue-100 hover:text-blue-600 transition-colors cursor-pointer">
                                        <Facebook size={20} />
                                    </a>
                                    <a href={BRAND.social.youtube} target="_blank" className="p-3 bg-slate-100 rounded-full text-slate-600 hover:bg-red-100 hover:text-red-600 transition-colors cursor-pointer">
                                        <Youtube size={20} />
                                    </a>
                                    <a href={BRAND.social.linkedin} target="_blank" className="p-3 bg-slate-100 rounded-full text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer">
                                        <Linkedin size={20} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="mt-24 max-w-9xl mx-auto">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-bold mb-4">
                            <HelpCircle size={16} />
                            Common Questions
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800">Frequently Asked Questions</h2>
                        <p className="text-slate-500 mt-4">Quick answers to things you might be wondering about.</p>
                    </div>

                    <div className="grid gap-6">
                        {[
                            {
                                q: `Is online check-in available through ${BRAND.name}?`,
                                a: "While you book your flights here, online check-in should be completed directly on the airline's website using the PNR provided in your booking confirmation."
                            },
                            {
                                q: "What documents do I need for international travel?",
                                a: "You'll typically need a valid passport (with at least 6 months validity), a visa for your destination, and your flight tickets. Some countries also require travel insurance and health certificates."
                            },
                            {
                                q: "What is the baggage allowance for my flight?",
                                a: "Baggage allowance varies by airline and class of travel. You can find specific baggage details in your booking confirmation email or by checking your PNR on the airline's official website."
                            },
                            {
                                q: "Do I need travel insurance?",
                                a: "While not always mandatory, travel insurance is highly recommended to protect you against unexpected medical emergencies, trip cancellations, or lost baggage during your journey."
                            },
                            {
                                q: "Can I book a seat in advance?",
                                a: "Yes, many airlines allow advance seat selection during or after booking. You can manage your seat preferences through the airline's manage booking portal using your PNR."
                            },
                            {
                                q: "What is your flight cancellation and modification policy?",
                                a: "All flight bookings are non-changeable and non-refundable. However, a refund request can still be raised which may be partially settled upon contacting our team."
                            }
                        ].map((faq, i) => (
                            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-400 hover:shadow-md transition-shadow">
                                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-3">
                                    <span className="h-6 w-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs shrink-0">{i + 1}</span>
                                    {faq.q}
                                </h3>
                                <p className="text-slate-600 ml-9 leading-relaxed">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
