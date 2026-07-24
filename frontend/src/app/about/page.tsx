'use client';
import { Plane, Users, Globe, Award, Heart, Shield, Zap, TrendingUp } from 'lucide-react';
import { BRAND } from '@/config/brand';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">

            {/* Page Header */}
            <div className="bg-slate-900 pt-28 pb-20 px-4 text-center">
                <div className="inline-flex items-center gap-2 bg-blue-500/10 text-sky-400 px-4 py-2 rounded-full text-sm font-bold mb-6 border border-blue-500/20">
                    <Plane size={16} />
                    About Our Journey
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6">
                    We're on a Mission to <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
                        Simplify Travel
                    </span>
                </h1>
                <p className="text-slate-400 text-lg md:text-xl max-w-7xl mx-auto leading-relaxed">
                    Personalized, transparent, and hassle-free flight bookings for the modern explorer.
                </p>
            </div>

            {/* Story Section */}
            <div className="max-w-9xl mx-auto px-12 pt-20">
                <h2 className="text-4xl font-bold text-slate-800 mb-6">Our Story</h2>
                <div className="space-y-4 text-lg text-slate-600 leading-relaxed">
                    <p>
                        {BRAND.name} was founded with a simple vision: to make flight booking as easy as rolling down a hill. We noticed that travelers were frustrated with complicated interfaces, hidden fees, and endless options that made choosing the right flight overwhelming.
                    </p>
                    <p>
                        Our team of travel enthusiasts and tech experts came together to create a platform that puts the traveler first. We've built smart filters, intuitive search, and transparent pricing to help you find exactly what you need in minutes, not hours.
                    </p>
                    <p>
                        Today, {BRAND.name} serves thousands of happy travelers, connecting them with flights to destinations around the world. But we're just getting started. We're constantly innovating, adding new features, and expanding our reach to make your travel dreams a reality.
                    </p>
                </div>
            </div>

            {/* Mission Section */}
            <div className="max-w-9xl mx-auto px-12 py-20">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-4xl font-bold text-slate-800 mb-6">Our Mission</h2>
                        <p className="text-lg text-slate-600 leading-relaxed mb-4">
                            At {BRAND.name}, we believe that everyone deserves to explore the world without the hassle of complicated booking processes. Our mission is to simplify air travel by providing a seamless, user-friendly platform that connects travelers with the best flight options.
                        </p>
                        <p className="text-lg text-slate-600 leading-relaxed mb-4">
                            We're committed to making your journey from search to boarding as smooth as possible, with transparent pricing, real-time updates, and exceptional customer service.
                        </p>
                        <p className="text-lg text-slate-600 leading-relaxed">
                            Contact us now to book your next flight!
                        </p>
                    </div>
                    <div className="bg-gradient-to-br from-sky-100 to-blue-100 p-12 rounded-3xl border border-slate-200">
                        <div className="grid grid-cols-2 gap-6">
                            <StatCard icon={<Users />} value="50K+" label="Happy Travelers" />
                            <StatCard icon={<Plane />} value="8K+" label="Flight Options" />
                            <StatCard icon={<Globe />} value="100+" label="Destinations" />
                            <StatCard icon={<Award />} value="4.8★" label="User Rating" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="text-center my-12 px-8">
                <p className="text-xl md:text-2xl text-slate-800 max-w-7xl mx-auto leading-relaxed">
                    Your trusted partner in making travel dreams come true, one flight at a time.
                </p>
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-r from-blue-600 to-sky-600 text-white py-16 px-4 min-h-[50vh] flex items-center">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl md:text-6xl font-bold mb-6">Ready to Start Your Journey?</h2>
                    <p className="text-xl md:text-2xl text-blue-50 mb-8">
                        Join thousands of travelers who trust {BRAND.name} for their flight bookings
                    </p>
                    <a
                        href="/search"
                        className="inline-block bg-white text-blue-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform"
                    >
                        Book Your Flight Now
                    </a>
                </div>
            </div>

            {/* Values Section */}
            <div className="bg-slate-100 py-20 px-10">
                <div className="max-w-9xl mx-auto">
                    <h2 className="text-4xl font-bold text-slate-800 mb-4 text-center">Our Core Values</h2>
                    <p className="text-lg text-slate-600 text-center mb-12 max-w-2xl mx-auto">
                        These principles guide everything we do at {BRAND.name}
                    </p>
                    <div className="grid md:grid-cols-3 gap-8">
                        <ValueCard
                            icon={<Heart className="text-red-500" />}
                            title="Customer First"
                            description="Your satisfaction is our top priority. We go above and beyond to ensure your travel experience is exceptional."
                        />
                        <ValueCard
                            icon={<Shield className="text-blue-500" />}
                            title="Trust & Security"
                            description="Your data and payments are protected with industry-leading security measures. Travel with confidence."
                        />
                        <ValueCard
                            icon={<Zap className="text-yellow-500" />}
                            title="Innovation"
                            description="We continuously improve our platform with cutting-edge technology to make booking faster and easier."
                        />
                        <ValueCard
                            icon={<TrendingUp className="text-teal-500" />}
                            title="Best Prices"
                            description="We work with airlines worldwide to bring you competitive prices and exclusive deals on flights."
                        />
                        <ValueCard
                            icon={<Globe className="text-purple-500" />}
                            title="Global Reach"
                            description="Access flights to destinations across the globe, from major cities to hidden gems."
                        />
                        <ValueCard
                            icon={<Users className="text-indigo-500" />}
                            title="Community"
                            description={`Join thousands of travelers who trust ${BRAND.name} for their journey planning needs.`}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <div className="text-center">
            <div className="flex justify-center mb-3 text-blue-600">
                {icon}
            </div>
            <div className="text-3xl font-bold text-slate-800 mb-1">{value}</div>
            <div className="text-sm text-slate-600">{label}</div>
        </div>
    );
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-shadow border border-slate-200">
            <div className="flex justify-center mb-4 transform hover:scale-110 transition-transform">
                <div className="w-16 h-16 flex items-center justify-center">
                    {icon}
                </div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3 text-center">{title}</h3>
            <p className="text-slate-600 text-center leading-relaxed">{description}</p>
        </div>
    );
}
