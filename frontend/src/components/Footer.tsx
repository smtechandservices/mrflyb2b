import Link from 'next/link';
import { Github, X as XIcon, Facebook, Instagram, Mail, Phone, MapPin, Youtube, Linkedin } from 'lucide-react';
import { BRAND } from '@/config/brand';

export function Footer() {
    return (
        <footer className="bg-slate-900 border-t border-slate-800 pt-16 pb-8 z-10">
            <div className="mx-auto px-4 md:px-12">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-16">
                    <div className="col-span-1 md:col-span-2">
                        <h3 className="text-xl font-bold text-white mb-2 underline decoration-green-500 underline-offset-8">{BRAND.name}</h3>
                        <p className="text-gray-400 leading-relaxed text-sm mb-4">
                            Shop No 16, Balaji Market, Kashmiri Gate, Delhi
                        </p>
                        <div className="bg-slate-800 rounded-2xl overflow-hidden shadow-2xl mb-6">
                            <iframe
                                src="https://www.google.com/maps?q=Balaji+Market,+Shop+No+16,+Kashmiri+Gate,+Delhi&output=embed"
                                width="100%"
                                height="200"
                                style={{ border: 0 }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                className="grayscale hover:grayscale-0 transition-all duration-500 opacity-80 hover:opacity-100"
                            ></iframe>
                        </div>
                    </div>

                    {/* Links */}
                    <div className='lg:mt-2'>
                        <h4 className="text-lg font-semibold text-white mb-6">Explore</h4>
                        <ul className="space-y-3">
                            <FooterLink href="/flights">Flights</FooterLink>
                            <FooterLink href="/my-bookings">My Bookings</FooterLink>
                            <FooterLink href="/wallet">Wallet</FooterLink>
                        </ul>
                    </div>

                    <div className='lg:mt-2'>
                        <h4 className="text-lg font-semibold text-white mb-6">Support</h4>
                        <ul className="space-y-3">
                            <FooterLink href="/contact">Contact Us</FooterLink>
                            <FooterLink href="/about">Privacy Policy</FooterLink>
                            <FooterLink href="/about">Terms of Service</FooterLink>
                        </ul>
                    </div>

                    {/* Contact & Socials */}
                    <div className='lg:mt-2 space-y-6'>
                        <div>
                            <h4 className="text-lg font-semibold text-white mb-6">Get in Touch</h4>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-green-500/10 transition-colors">
                                        <Mail size={16} />
                                    </div>
                                    <div>
                                        <a href={`mailto:${BRAND.contactEmail}`} className="flex items-center gap-3 text-gray-400 hover:text-green-400 transition-colors group">
                                            <span className="text-sm">{BRAND.contactEmail}</span>
                                        </a>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-green-500/10 transition-colors">
                                        <Phone size={16} />
                                    </div>
                                    <div>
                                        {BRAND.phones.map((phone) => (
                                            <a key={phone} href={`tel:${phone.replace(/\s/g, '')}`} className="flex items-center gap-3 text-gray-400 hover:text-green-400 transition-colors group">
                                                <span className="text-sm">{phone}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Follow Us</h4>
                            <div className="flex space-x-3">
                                <SocialIcon href={BRAND.social.facebook} icon={<Facebook size={18} />} label="Facebook" color="hover:bg-blue-600" />
                                <SocialIcon href={BRAND.social.instagram} icon={<Instagram size={18} />} label="Instagram" color="hover:bg-pink-600" />
                                <SocialIcon href={BRAND.social.youtube} icon={<Youtube size={18} />} label="YouTube" color="hover:bg-red-600" />
                                <SocialIcon href={BRAND.social.linkedin} icon={<Linkedin size={18} />} label="LinkedIn" color="hover:bg-blue-700" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-center items-center gap-4 text-gray-600 text-sm">
                    <p>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <li>
            <Link href={href} className="text-gray-400 hover:text-green-400 transition-colors marker:text-green-500">
                {children}
            </Link>
        </li>
    );
}

function SocialIcon({ icon, href, label, color }: { icon: React.ReactNode, href: string, label: string, color: string }) {
    return (
        <a
            href={href}
            aria-label={label}
            className={`h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-gray-400 ${color} hover:text-white transition-all duration-300 transform hover:-translate-y-1`}
        >
            {icon}
        </a>
    );
}
