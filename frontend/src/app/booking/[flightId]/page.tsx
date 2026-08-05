'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getFlightById, Flight } from '@/lib/api';
import { BookingForm } from '@/components/BookingForm';
import { Plane, Clock, Loader2 } from 'lucide-react';
import { BookingSuccessWrapper } from './BookingSuccessWrapper';
import { BackButton } from '@/components/BackButton';
import { isInternationalFlight, parseFlightLegs } from '@/lib/flightUtils';
import { getAirlineLogo } from '@/lib/airlines';


export default function BookingPage() {
    const params = useParams();
    const flightId = params.flightId as string;

    const [flight, setFlight] = useState<Flight | null>(null);
    const [loading, setLoading] = useState(true);
    const [passengerCounts, setPassengerCounts] = useState({ adults: 1, infants: 0, infantPrice: 0 });

    const handlePassengersChange = useCallback((counts: { adults: number; infants: number; infantPrice: number }) => {
        setPassengerCounts(prev => {
            if (prev.adults === counts.adults && prev.infants === counts.infants && prev.infantPrice === counts.infantPrice) return prev;
            return counts;
        });
    }, []);

    useEffect(() => {
        if (!flightId) return;
        const fetchFlight = async () => {
            try {
                const flightData = await getFlightById(flightId);
                setFlight(flightData || null);
            } catch (error) {
                console.error('Error fetching flight:', error);
                setFlight(null);
            } finally {
                setLoading(false);
            }
        };
        fetchFlight();
    }, [flightId]);

    if (loading) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={32} style={{ color: 'var(--clay)' }} />
            </div>
        );
    }

    if (!flight) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <h1>Flight not found</h1>
            </div>
        );
    }

    // Check if flight is international
    const isInternational = isInternationalFlight(flight.origin, flight.destination);

    const unitPrice = parseFloat(flight.price);
    const infantPriceVal = parseFloat(flight.infant_price || '0');
    const totalPrice = (unitPrice * passengerCounts.adults) + (infantPriceVal * passengerCounts.infants);

    const legs = parseFlightLegs(flight.stop_info, flight.stop_details);

    return (
        <div className="container page-content-sm">
            <BackButton />
            <h1 style={{ marginBottom: 32 }}>Complete your booking</h1>

            <div className="checkout">
                <div>
                    <h3>Passenger Details</h3>
                    <BookingSuccessWrapper
                        flight={flight}
                        isInternational={isInternational}
                        onPassengersChange={handlePassengersChange}
                    />
                </div>

                <div className="summary-card">
                    <div className="summary-pkg" style={{ alignItems: 'center' }}>
                        {getAirlineLogo(flight.airline) ? (
                            <div className="img" style={{ width: 44, height: 44, background: 'var(--paper)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src={getAirlineLogo(flight.airline)!} alt={flight.airline} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                            </div>
                        ) : (
                            <div className="img" style={{ width: 44, height: 44, background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--forest)' }}>
                                {flight.airline[0]}
                            </div>
                        )}
                        <div>
                            <h4>{flight.airline}</h4>
                            <div className="meta">{flight.origin} → {flight.destination}</div>
                        </div>
                    </div>

                    <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                        <span>{flight.stops === 0 ? 'Non-stop' : `${flight.stops} Stop(s)`}</span>
                        {flight.stops > 0 && flight.stop_details && <span> via {flight.stop_details}</span>}
                        {flight.stops > 0 && flight.layover_duration && (
                            <div className="mono" style={{ color: 'var(--clay)', marginTop: 4 }}>Layover: {flight.layover_duration}</div>
                        )}
                        {flight.baggage_allowance && (
                            <div style={{ marginTop: 4 }}>Baggage: {flight.baggage_allowance}</div>
                        )}
                        {isInternational && <div className="eyebrow" style={{ color: 'var(--clay)', marginTop: 6 }}>International Flight</div>}
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <div className="eyebrow" style={{ marginBottom: 10 }}>Itinerary</div>
                        {legs ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {legs.map((leg, idx) => (
                                    <div key={idx}>
                                        <div className="row between" style={{ marginBottom: 4 }}>
                                            <div className="row" style={{ gap: 6 }}>
                                                {leg.airline && (getAirlineLogo(leg.airline) ? (
                                                    <img src={getAirlineLogo(leg.airline)!} style={{ width: 14, height: 14, objectFit: 'contain' }} alt="" />
                                                ) : <Plane size={12} style={{ color: 'var(--muted)' }} />)}
                                                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{leg.flight_number}</span>
                                            </div>
                                            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{leg.duration}</span>
                                        </div>
                                        <div className="row between">
                                            <div>
                                                <div className="mono" style={{ fontWeight: 600 }}>{leg.origin}</div>
                                                <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                                                    {new Date(leg.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                    {leg.departure_terminal && ` · T${leg.departure_terminal}`}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div className="mono" style={{ fontWeight: 600 }}>{leg.destination}</div>
                                                <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                                                    {new Date(leg.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                    {leg.arrival_terminal && ` · T${leg.arrival_terminal}`}
                                                </div>
                                            </div>
                                        </div>
                                        {idx < legs.length - 1 && (
                                            <div className="row" style={{ gap: 6, marginTop: 8, color: 'var(--clay)', fontSize: 11 }}>
                                                <Clock size={11} /> Layover at {leg.destination}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div>
                                <div className="row" style={{ gap: 6 }}>
                                    <Clock size={13} style={{ color: 'var(--clay)' }} />
                                    <span className="mono" style={{ fontWeight: 600 }}>{new Date(flight.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                    {flight.departure_terminal && <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>Dep T{flight.departure_terminal}</span>}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 19 }}>
                                    {new Date(flight.departure_time).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
                                </div>
                                <div className="row" style={{ gap: 6, marginTop: 8 }}>
                                    <Clock size={13} style={{ color: 'var(--clay)' }} />
                                    <span className="mono" style={{ fontWeight: 600 }}>{new Date(flight.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                    {flight.arrival_terminal && <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>Arr T{flight.arrival_terminal}</span>}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 19, marginTop: 2 }}>Duration: {flight.duration}</div>
                            </div>
                        )}
                    </div>

                    <div className="summary" style={{ marginTop: 0 }}>
                        {passengerCounts.adults > 0 && (
                            <div className="summary-row mono">
                                <span>Adults (₹{unitPrice.toLocaleString('en-IN')} × {passengerCounts.adults})</span>
                                <span>₹{(unitPrice * passengerCounts.adults).toLocaleString('en-IN')}</span>
                            </div>
                        )}
                        {passengerCounts.infants > 0 && (
                            <div className="summary-row mono" style={{ color: 'var(--clay)' }}>
                                <span>Infants {infantPriceVal > 0 ? `(₹${infantPriceVal.toLocaleString('en-IN')} × ${passengerCounts.infants})` : `(Free × ${passengerCounts.infants})`}</span>
                                <span>₹{(infantPriceVal * passengerCounts.infants).toLocaleString('en-IN')}</span>
                            </div>
                        )}
                        <div className="summary-row total mono">
                            <span className="serif" style={{ fontFamily: 'var(--sans)', fontSize: 14 }}>Total</span>
                            <span>₹{totalPrice.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                    <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                        This booking is non-refundable and non-changeable.
                    </div>
                </div>
            </div>
        </div>
    );
}
