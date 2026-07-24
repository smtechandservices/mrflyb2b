'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getFlightById, Flight } from '@/lib/api';
import { BookingForm } from '@/components/BookingForm';
import { Plane, Clock, Calendar, Loader2 } from 'lucide-react';
import { BookingSuccessWrapper } from './BookingSuccessWrapper';
import { BackButton } from '@/components/BackButton';
import { isInternationalFlight, parseFlightLegs } from '@/lib/flightUtils';
import { getAirlineLogo } from '@/lib/airlines';


export default function BookingPage() {
    const { isAuthenticated, loading: authLoading } = useAuth() as any;
    const router = useRouter();
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
        // Redirect to login if not authenticated
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
            return;
        }

        // Fetch flight data if authenticated
        if (isAuthenticated && flightId) {
            const fetchFlight = async () => {
                try {
                    const flightData = await getFlightById(flightId);
                    if (flightData) {
                        setFlight(flightData);
                    } else {
                        setFlight(null);
                    }
                } catch (error) {
                    console.error('Error fetching flight:', error);
                    setFlight(null);
                } finally {
                    setLoading(false);
                }
            };
            fetchFlight();
        }
    }, [isAuthenticated, authLoading, flightId, router]);

    // Show loading state while checking authentication or fetching flight
    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    // Don't render anything if not authenticated (will redirect)
    if (!isAuthenticated) {
        return null;
    }

    if (!flight) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <h1 className="text-2xl font-bold text-slate-800">Flight not found</h1>
            </div>
        );
    }

    // Check if flight is international
    const isInternational = isInternationalFlight(flight.origin, flight.destination);

    const unitPrice = parseFloat(flight.price);
    const infantPriceVal = parseFloat(flight.infant_price || '0');
    const totalPrice = (unitPrice * passengerCounts.adults) + (infantPriceVal * passengerCounts.infants);


    return (
        <div className="min-h-screen bg-slate-50">
            <div className="bg-slate-900 py-10 text-center"></div>
            
            <div className="max-w-9xl px-4 md:px-12 mx-auto pt-14">

                <BackButton />
                <h1 className="text-3xl font-bold text-slate-800 mb-8">Complete Your Booking</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Flight Summary</h2>
                            <div className="space-y-8">
                                <div>
                                    <div className="text-xs text-slate-400 uppercase mb-1">Airline</div>
                                    <div className="font-semibold text-slate-700 flex items-center gap-2">
                                        {getAirlineLogo(flight.airline) ? (
                                            <div className="h-6 w-6 bg-white rounded border border-slate-100 flex items-center justify-center p-0.5 shadow-sm">
                                                <img src={getAirlineLogo(flight.airline)!} alt={flight.airline} className="w-full h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">
                                                {flight.airline[0]}
                                            </div>
                                        )}
                                        {flight.airline}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400 uppercase mb-1">Route</div>
                                    <div className="font-semibold text-slate-700">{flight.origin} → {flight.destination}</div>
                                    <div className="text-xs mt-1 flex flex-col gap-0.5">
                                        <div>
                                            <span className="text-slate-500">{flight.stops === 0 ? 'Non-stop' : `${flight.stops} Stop(s)`}</span>
                                            {flight.stops > 0 && flight.stop_details && (
                                                <span className="text-slate-400 ml-1">via {flight.stop_details}</span>
                                            )}
                                        </div>
                                        {flight.stops > 0 && flight.layover_duration && (
                                            <div className="text-blue-500/80">Layover: {flight.layover_duration}</div>
                                        )}
                                        {flight.baggage_allowance && (
                                            <div className="text-slate-500 bg-slate-100 w-fit px-2 py-0.5 rounded-full border border-slate-200 mt-1">
                                                Baggage: {flight.baggage_allowance}
                                            </div>
                                        )}
                                    </div>
                                    {isInternational && (
                                        <div className="text-xs text-blue-600 mt-1 font-medium">International Flight</div>
                                    )}
                                </div>                                 <div>
                                    <div className="text-xs text-slate-400 uppercase mb-3">Flight Itinerary</div>
                                    {(() => {
                                        const legs = parseFlightLegs(flight.stop_info, flight.stop_details);
                                        if (legs) {
                                            return (
                                                <div className="space-y-6 relative ml-2">
                                                    {/* Vertical connection line */}
                                                    <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-100 border-l-2 border-dashed border-slate-200"></div>
                                                    
                                                    {legs.map((leg, idx) => (
                                                        <div key={idx} className="relative pl-6 space-y-2">
                                                            {/* Point marker */}
                                                            <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-white border-4 border-blue-600"></div>
                                                            
                                                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                                    {leg.airline && (
                                                                        <div className="flex items-center gap-1 min-w-0">
                                                                            {getAirlineLogo(leg.airline) ? (
                                                                                <img src={getAirlineLogo(leg.airline)!} className="w-3.5 h-3.5 object-contain" alt="" />
                                                                            ) : (
                                                                                <Plane size={10} className="text-slate-400" />
                                                                            )}
                                                                            <span className="text-[10px] font-bold text-slate-600 truncate">{leg.airline}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">• {leg.flight_number}</div>
                                                                </div>
                                                                <div className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium shrink-0">
                                                                    {leg.duration || ''}
                                                                </div>
                                                            
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex flex-col">
                                                                    <div className="text-sm font-bold text-slate-800">{leg.origin}</div>
                                                                    <div className="text-[11px] text-slate-500">{new Date(leg.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                                                                    {leg.departure_terminal && <div className="text-[9px] text-blue-600 font-bold uppercase mt-0.5">Terminal {leg.departure_terminal}</div>}
                                                                </div>
                                                                
                                                                <div className="flex flex-col items-end">
                                                                    <div className="text-sm font-bold text-slate-800">{leg.destination}</div>
                                                                    <div className="text-[11px] text-slate-500">{new Date(leg.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                                                                    {leg.arrival_terminal && <div className="text-[9px] text-blue-600 font-bold uppercase mt-0.5">Terminal {leg.arrival_terminal}</div>}
                                                                </div>
                                                            </div>

                                                            {idx < legs.length - 1 && (
                                                                <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100/50 my-2">
                                                                    <div className="text-[9px] text-blue-500 font-bold flex items-center justify-center gap-1">
                                                                        <Clock size={10} /> LAYOVER AT {leg.destination}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }

                                        // Fallback for legacy format or non-stop
                                        return (
                                            <div className="space-y-4">
                                                <div className="font-semibold text-slate-700 flex items-center gap-2">
                                                    <Clock size={14} className="text-blue-600" />
                                                    {new Date(flight.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                    {flight.departure_terminal && (
                                                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                                                            Dep: T{flight.departure_terminal}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-slate-600 ml-6">
                                                    {new Date(flight.departure_time).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
                                                </div>
                                                <div className="font-semibold text-slate-700 flex items-center gap-2 mt-2">
                                                    <Clock size={14} className="text-blue-600" />
                                                    {new Date(flight.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                    {flight.arrival_terminal && (
                                                        <span className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                                                            Arr: T{flight.arrival_terminal}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1 ml-6">
                                                    Duration: {flight.duration}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="pt-4 border-t">
                                    <div className="text-xs text-slate-400 uppercase">Total Price</div>
                                    <div className="text-2xl font-bold text-blue-600">{`₹${totalPrice.toLocaleString('en-IN')}`}</div>
                                    <div className="mt-2 space-y-1">
                                        {passengerCounts.adults > 0 && (
                                            <div className="text-[10px] text-slate-500 font-medium flex justify-between">
                                                <span>Adults (₹{unitPrice.toLocaleString('en-IN')} x {passengerCounts.adults})</span>
                                                <span>₹{(unitPrice * passengerCounts.adults).toLocaleString('en-IN')}</span>
                                            </div>
                                        )}
                                        {passengerCounts.infants > 0 && (
                                            <div className="text-[10px] text-blue-500 font-bold flex justify-between">
                                                <span>Infants {infantPriceVal > 0 ? `(₹${infantPriceVal.toLocaleString('en-IN')} x ${passengerCounts.infants})` : `(FREE x ${passengerCounts.infants})`}</span>
                                                <span>₹{(infantPriceVal * passengerCounts.infants).toLocaleString('en-IN')}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 italic text-[14px] text-slate-400">
                                        Note: This booking is non-refundable and non-changeable.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
                            <h2 className="text-xl font-bold text-slate-800 mb-6">Passenger Details</h2>
                            <BookingSuccessWrapper
                                flight={flight}
                                isInternational={isInternational}
                                onPassengersChange={handlePassengersChange}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

