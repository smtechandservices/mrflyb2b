'use client';
import { useState, useEffect } from 'react';
import { submitContactMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Mail, Phone, MapPin, Send, Instagram, Facebook, Clock, MessageSquare, HelpCircle, Youtube, Linkedin } from 'lucide-react';
import Swal from 'sweetalert2';
import { BRAND } from '@/config/brand';

const FAQS = [
    {
        q: `Is online check-in available through ${BRAND.name}?`,
        a: "While you book your flights here, online check-in should be completed directly on the airline's website using the PNR provided in your booking confirmation."
    },
    {
        q: "What documents does my client need for international travel?",
        a: "Your client will typically need a valid passport (with at least 6 months validity), a visa for their destination, and their flight tickets. Some countries also require travel insurance and health certificates."
    },
    {
        q: "What is the baggage allowance for my flight?",
        a: "Baggage allowance varies by airline and class of travel. You can find specific baggage details in your booking confirmation email or by checking your PNR on the airline's official website."
    },
    {
        q: "Does my client need travel insurance?",
        a: "While not always mandatory, travel insurance is highly recommended to protect your client against unexpected medical emergencies, trip cancellations, or lost baggage during their journey."
    },
    {
        q: "Can I book a seat in advance?",
        a: "Yes, many airlines allow advance seat selection during or after booking. You can manage your seat preferences through the airline's manage booking portal using your PNR."
    },
    {
        q: "What is your flight cancellation and modification policy?",
        a: "All flight bookings are non-changeable and non-refundable. However, a refund request can still be raised which may be partially settled upon contacting our team."
    }
];

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
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Failed to send message. Please try again later.',
                confirmButtonColor: '#1f3b30'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="page-head">
                <div className="container">
                    <div className="crumbs"><MessageSquare size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />Contact Support</div>
                    <h1>We're here to <em>support your agency</em></h1>
                    <p style={{ color: 'var(--muted)', marginTop: 16, maxWidth: 560 }}>
                        Have a question about your agency account or a booking? Our team is available 24/7.
                    </p>
                </div>
            </div>

            <div className="section">
                <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>
                    <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: 40 }}>
                        <h3 style={{ marginBottom: 24 }}>Send a message</h3>
                        {success ? (
                            <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                <h4 style={{ marginBottom: 8 }}>Message sent!</h4>
                                <p style={{ color: 'var(--muted)', marginBottom: 16 }}>We'll get back to you shortly.</p>
                                <button onClick={() => setSuccess(false)} className="btn-link">Send another</button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div className="field-group">
                                    <label>Name</label>
                                    <input name="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" />
                                </div>
                                <div className="field-group">
                                    <label>Email</label>
                                    <input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="john@example.com" />
                                </div>
                                <div className="field-group">
                                    <label>Message</label>
                                    <textarea name="message" value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} placeholder="How can we help your agency?" />
                                </div>
                                <button disabled={loading} className="btn btn-primary btn-lg">
                                    {loading ? 'Sending…' : <><Send size={16} /> Send Message</>}
                                </button>
                            </form>
                        )}
                    </div>

                    <div>
                        <h2 style={{ marginBottom: 16 }}>Get in touch</h2>
                        <p style={{ color: 'var(--muted)', fontSize: 16, lineHeight: 1.6, marginBottom: 32, maxWidth: 480 }}>
                            Have a question about your agency account or a booking? Our team is here to help you 24/7.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>
                            <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
                                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--forest)', flexShrink: 0 }}>
                                    <Mail size={18} />
                                </div>
                                <div>
                                    <h4 style={{ fontSize: 16, marginBottom: 2 }}>Email Us</h4>
                                    <p style={{ color: 'var(--muted)' }}>{BRAND.contactEmail}</p>
                                </div>
                            </div>

                            <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
                                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--forest)', flexShrink: 0 }}>
                                    <Phone size={18} />
                                </div>
                                <div>
                                    <h4 style={{ fontSize: 16, marginBottom: 2 }}>Call Us</h4>
                                    {BRAND.phones.map((phone) => (
                                        <p key={phone} className="mono" style={{ color: 'var(--muted)' }}>{phone}</p>
                                    ))}
                                </div>
                            </div>

                            <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
                                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--forest)', flexShrink: 0 }}>
                                    <MapPin size={18} />
                                </div>
                                <div>
                                    <h4 style={{ fontSize: 16, marginBottom: 2 }}>Visit Us</h4>
                                    <p style={{ color: 'var(--muted)' }}>Shop No 16, Balaji Market,<br />Kashmiri Gate, Delhi</p>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                                <div className="row" style={{ gap: 10, marginBottom: 14 }}>
                                    <Clock size={16} style={{ color: 'var(--clay)' }} />
                                    <h4 style={{ fontSize: 15 }}>Business Hours</h4>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
                                    <div className="row between"><span>Mon – Fri</span><span className="mono">9:00 AM – 8:00 PM</span></div>
                                    <div className="row between"><span>Saturday</span><span className="mono">10:00 AM – 6:00 PM</span></div>
                                    <div className="row between" style={{ color: 'var(--clay)', fontWeight: 600 }}><span>Support</span><span>24/7</span></div>
                                </div>
                            </div>
                            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                                <div className="row" style={{ gap: 10, marginBottom: 14 }}>
                                    <MessageSquare size={16} style={{ color: 'var(--clay)' }} />
                                    <h4 style={{ fontSize: 15 }}>Follow Us</h4>
                                </div>
                                <div className="row" style={{ gap: 10 }}>
                                    <a href={BRAND.social.instagram} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}><Instagram size={16} /></a>
                                    <a href={BRAND.social.facebook} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}><Facebook size={16} /></a>
                                    <a href={BRAND.social.youtube} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}><Youtube size={16} /></a>
                                    <a href={BRAND.social.linkedin} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}><Linkedin size={16} /></a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="section" style={{ paddingTop: 0 }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: 48 }}>
                        <span className="eyebrow"><HelpCircle size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />Common Questions</span>
                        <h2 style={{ marginTop: 12 }}>Frequently asked questions</h2>
                        <p style={{ color: 'var(--muted)', marginTop: 12 }}>Quick answers to things you might be wondering about.</p>
                    </div>

                    <div style={{ display: 'grid', gap: 16, margin: '0 auto' }}>
                        {FAQS.map((faq, i) => (
                            <div key={i} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: 24 }}>
                                <h4 className="row" style={{ gap: 12, marginBottom: 8, fontSize: 16 }}>
                                    <span className="mono" style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>{i + 1}</span>
                                    {faq.q}
                                </h4>
                                <p style={{ color: 'var(--muted)', marginLeft: 34, lineHeight: 1.6 }}>{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
