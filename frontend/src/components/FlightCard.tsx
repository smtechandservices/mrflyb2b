'use client';
import { Flight } from '@/lib/api';
import { Plane } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

import { getAirlineLogo } from '@/lib/airlines';
import { parseFlightLegs, formatDuration } from '@/lib/flightUtils';

interface FlightCardProps {
    flight: Flight;
    passengers?: number;
}

export function FlightCard({ flight, passengers = 1 }: FlightCardProps) {
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
    };

    const handleBookNow = (e: React.MouseEvent) => {
        if (!isAuthenticated) {
            e.preventDefault();
            router.push('/login');
        }
    };

    const unitPrice = parseFloat(flight.price);
    const totalPrice = unitPrice * passengers;
    const airlineLogo = getAirlineLogo(flight.airline);

    const legs = parseFlightLegs(flight.stop_info, flight.stop_details);
    const flightNumbers = legs
        ? legs.map(l => l.flight_number).filter((v, i, a) => a.indexOf(v) === i).join(' / ')
        : flight.flight_number;
    const via = legs ? legs.slice(0, -1).map(l => l.destination).join(', ') : flight.stop_details;

    return (
        <div className="flight-card" style={{ position: 'relative' }}>
            <span
                className="mono"
                style={{
                    position: 'absolute', top: 0, right: 0,
                    fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'var(--muted)', background: 'var(--sand)',
                    padding: '4px 10px',
                    borderTopRightRadius: 'var(--radius-md)',
                    borderBottomLeftRadius: 'var(--radius)',
                    borderLeft: '1px solid var(--line)', borderBottom: '1px solid var(--line)',
                }}
            >
                Non-refundable &amp; Non-changeable
            </span>

            <div className="flight-card-airline">
                {airlineLogo ? (
                    <div className="logo">
                        <img src={airlineLogo} alt={flight.airline} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
                    </div>
                ) : (
                    <div className="logo">{flight.airline[0]}</div>
                )}
                <div>
                    <div className="name">{flight.airline}</div>
                    <div className="num">{flightNumbers}</div>
                    {flight.baggage_allowance && (
                        <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                            {flight.baggage_allowance}
                        </div>
                    )}
                </div>
            </div>

            <div className="flight-route">
                <div className="pt">
                    <div className="time">{formatTime(flight.departure_time)}</div>
                    <div className="code">
                        {flight.origin}
                        {flight.departure_terminal ? ` · T${flight.departure_terminal}` : ''}
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{formatDate(flight.departure_time)}</div>
                </div>

                <div className="mid">
                    <div className="dur">{formatDuration(flight.duration)}</div>
                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="line" />
                        <Plane size={13} style={{ position: 'absolute', color: 'var(--muted)', background: 'var(--paper)', transform: 'rotate(45deg)' }} />
                    </div>
                    <div className="stops">{flight.stops === 0 ? 'Non-stop' : `${flight.stops} Stop${flight.stops > 1 ? 's' : ''}`}</div>
                    {flight.stops > 0 && via && (
                        <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>via {via}</div>
                    )}
                    {flight.stops > 0 && flight.layover_duration && (
                        <div className="mono" style={{ fontSize: 10, color: 'var(--clay)' }}>Layover: {flight.layover_duration}</div>
                    )}
                </div>

                <div className="pt">
                    <div className="time">{formatTime(flight.arrival_time)}</div>
                    <div className="code">
                        {flight.destination}
                        {flight.arrival_terminal ? ` · T${flight.arrival_terminal}` : ''}
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{formatDate(flight.arrival_time)}</div>
                </div>
            </div>

            <div className="flight-card-price">
                <div className="price-info">
                    <div>
                        <div className="amount">{`₹${totalPrice.toLocaleString('en-IN')}`}</div>
                        <div className="per">{passengers > 1 ? `₹${unitPrice.toLocaleString('en-IN')} x ${passengers} travelers` : 'per traveler'}</div>
                    </div>

                    {flight.available_seats !== undefined && flight.available_seats > 0 && (
                        flight.available_seats <= 10 ? (
                            <span className="status pending">
                                <span className="d" />Only {flight.available_seats} seat{flight.available_seats !== 1 ? 's' : ''} left
                            </span>
                        ) : (
                            <span className="mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                {flight.available_seats} seats available
                            </span>
                        )
                    )}
                </div>

                <Link
                    href={`/booking/${flight.id}?passengers=${passengers}${typeof window !== 'undefined' && window.location.search.includes('adults=') ? `&${new URLSearchParams(window.location.search).toString()}` : ''}`}
                    onClick={handleBookNow}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                >
                    Book Now
                </Link>
            </div>
        </div>
    );
}
