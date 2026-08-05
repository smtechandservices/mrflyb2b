'use client';
import { Plane, Users, Globe, Award, Heart, Shield, Zap, TrendingUp } from 'lucide-react';
import { BRAND } from '@/config/brand';

export default function AboutPage() {
    return (
        <>
            <div className="section">
                <div className="container">
                    <span className="eyebrow">— Our Story</span>
                    <h2 style={{ marginTop: 12, marginBottom: 24, maxWidth: 720 }}>How {BRAND.name} came to be</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720, color: 'var(--ink-2)', fontSize: 16, lineHeight: 1.6 }}>
                        <p>
                            {BRAND.name} was founded with a simple vision: to make flight booking as easy for travel agents as it is for airlines themselves. We noticed that agencies were frustrated with complicated interfaces, hidden fees, and endless options that made booking for clients overwhelming.
                        </p>
                        <p>
                            Our team of travel industry veterans and tech experts came together to create a platform that puts the agent first. We've built smart filters, intuitive search, and transparent pricing to help your agency find exactly what your clients need in minutes, not hours.
                        </p>
                        <p>
                            Today, {BRAND.name} serves thousands of travel agents and agencies, connecting them with flights to destinations around the world. But we're just getting started. We're constantly innovating, adding new features, and expanding our reach to help your agency book smarter.
                        </p>
                    </div>
                </div>
            </div>

            <div className="section" style={{ paddingTop: 0 }}>
                <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
                    <div>
                        <span className="eyebrow">— Our Mission</span>
                        <h2 style={{ marginTop: 12, marginBottom: 20 }}>Simplifying flight booking, one search at a time</h2>
                        <p style={{ color: 'var(--ink-2)', fontSize: 16, lineHeight: 1.6, marginBottom: 16 }}>
                            At {BRAND.name}, we believe every travel agency deserves to book flights for their clients without the hassle of complicated processes. Our mission is to simplify air travel by providing a seamless, agent-friendly platform that connects agencies with the best flight options.
                        </p>
                        <p style={{ color: 'var(--ink-2)', fontSize: 16, lineHeight: 1.6, marginBottom: 16 }}>
                            We're committed to making your agency's booking workflow, from search to confirmation, as smooth as possible, with transparent pricing, real-time updates, and exceptional support.
                        </p>
                        <p style={{ color: 'var(--ink-2)', fontSize: 16, lineHeight: 1.6 }}>
                            Contact us now to start booking for your clients!
                        </p>
                    </div>
                    <div className="kpis" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                        <StatCard icon={<Users size={18} />} value="50K +" label="Travel Agents" />
                        <StatCard icon={<Plane size={18} />} value="8K +" label="Flight Options" />
                        <StatCard icon={<Globe size={18} />} value="100 +" label="Destinations" />
                        <StatCard icon={<Award size={18} />} value="4.8" label="Agent Rating" />
                    </div>
                </div>
            </div>

            <div className="container" style={{ textAlign: 'center', margin: '48px auto' }}>
                <p className="serif" style={{ fontSize: 26, color: 'var(--ink)', maxWidth: 720, margin: '0 auto', lineHeight: 1.4 }}>
                    Your trusted partner in helping travel agents book smarter, one flight at a time.
                </p>
            </div>

            <div className="news">
                <div className="container" style={{ textAlign: 'center', display: 'block' }}>
                    <h2>Ready to book smarter for your clients?</h2>
                    <p style={{ margin: '16px auto 32px', maxWidth: 520 }}>
                        Join thousands of travel agents who trust {BRAND.name} for their client bookings.
                    </p>
                    <a href="/search" className="btn btn-clay btn-lg">Start Booking Now</a>
                </div>
            </div>

            <div className="section" style={{ background: 'var(--sand)' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: 48 }}>
                        <h2>Our core values</h2>
                        <p style={{ color: 'var(--muted)', marginTop: 12, maxWidth: 520, margin: '12px auto 0' }}>
                            These principles guide everything we do at {BRAND.name}.
                        </p>
                    </div>
                    <div className="cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <ValueCard icon={<Heart size={22} />} title="Agent First" description="Your agency's success is our top priority. We go above and beyond to ensure your booking experience is exceptional." />
                        <ValueCard icon={<Shield size={22} />} title="Trust & Security" description="Your data and payments are protected with industry-leading security measures. Book with confidence." />
                        <ValueCard icon={<Zap size={22} />} title="Innovation" description="We continuously improve our platform with cutting-edge technology to make booking for clients faster and easier." />
                        <ValueCard icon={<TrendingUp size={22} />} title="Best Prices" description="We work with airlines worldwide to bring your agency competitive prices and exclusive deals on flights." />
                        <ValueCard icon={<Globe size={22} />} title="Global Reach" description="Access flights to destinations across the globe for your clients, from major cities to hidden gems." />
                        <ValueCard icon={<Users size={22} />} title="Community" description={`Join thousands of travel agents who trust ${BRAND.name} for their client booking needs.`} />
                    </div>
                </div>
            </div>
        </>
    );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <div className="kpi" style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--clay)', display: 'flex', justifyContent: 'center', marginBottom: 10 }}>{icon}</div>
            <div className="v">{value}</div>
            <div className="lbl" style={{ marginTop: 6 }}>{label}</div>
        </div>
    );
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: 32, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--forest)' }}>
                {icon}
            </div>
            <h4 style={{ marginBottom: 10 }}>{title}</h4>
            <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>{description}</p>
        </div>
    );
}
