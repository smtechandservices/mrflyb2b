import Link from 'next/link';
import Image from 'next/image';
import { BRAND } from '@/config/brand';

export function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-top">
                    <div>
                        <div className="brand" style={{ color: 'var(--paper)' }}>
                            <Image src={BRAND.logoTransparent} alt={`${BRAND.name} Logo`} width={508} height={491} style={{ height: 30, width: 'auto' }} />
                            <span>{BRAND.name}<span className="dot" /></span>
                        </div>
                        <p className="footer-tag">
                            Shop No 16, Balaji Market, Kashmiri Gate, Delhi. Flight bookings for travel agents, made simple and transparent.
                        </p>
                    </div>

                    <div className="footer-col">
                        <h5>Explore</h5>
                        <Link href="/search">Flights</Link>
                        <Link href="/my-bookings">Bookings</Link>
                        <Link href="/wallet">Wallet</Link>
                    </div>

                    <div className="footer-col">
                        <h5>Support</h5>
                        <Link href="/contact">Contact Us</Link>
                        <Link href="/about">Privacy Policy</Link>
                        <Link href="/about">Terms of Service</Link>
                    </div>

                    <div className="footer-col">
                        <h5>Get in Touch</h5>
                        <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a>
                        {BRAND.phones.map(phone => (
                            <a key={phone} href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a>
                        ))}
                    </div>

                    <div className="footer-col">
                        <h5>Follow</h5>
                        <a href={BRAND.social.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>
                        <a href={BRAND.social.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
                        <a href={BRAND.social.youtube} target="_blank" rel="noopener noreferrer">YouTube</a>
                        <a href={BRAND.social.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                    </div>
                </div>
                <div className="footer-bot">
                    <span>© {new Date().getFullYear()} {BRAND.name}</span>
                </div>
            </div>
        </footer>
    );
}
