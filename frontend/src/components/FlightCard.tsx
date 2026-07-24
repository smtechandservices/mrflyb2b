'use client';
import { Flight } from '@/lib/api';
import { Clock, Plane } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

import { getAirlineLogo } from '@/lib/airlines';
import { parseFlightLegs } from '@/lib/flightUtils';

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

    return (
        <div className="relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
            <div className="absolute top-0 right-0 bg-slate-50 border-b border-l border-slate-100 px-3 py-1 text-[9px] uppercase tracking-wider text-slate-400 font-semibold rounded-bl-lg">
                Non-refundable & Non-changeable
            </div>
            <div className="flex-1 mt-4 md:mt-0">
                <div className="flex items-center space-x-4 mb-4">
                    {airlineLogo ? (
                        <div className="h-12 w-12">
                            <img src={airlineLogo} alt={flight.airline} className="w-full h-full object-contain" />
                        </div>
                    ) : (
                        <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                            {flight.airline[0]}
                        </div>
                    )}
                    <div>
                        <h3 className="font-bold text-slate-800">{flight.airline}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            {(() => {
                                const legs = parseFlightLegs(flight.stop_info, flight.stop_details);
                                if (legs) {
                                    const allNumbers = legs.map(l => l.flight_number).filter((v, i, a) => a.indexOf(v) === i);
                                    return <p className="text-sm text-slate-500">{allNumbers.join(' / ')}</p>;
                                }
                                return <p className="text-sm text-slate-500">{flight.flight_number}</p>;
                            })()}
                            {flight.baggage_allowance && (
                                <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                    {flight.baggage_allowance}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between text-sm text-slate-600 px-2 md:px-6">
                    <div className="text-center">
                        <div className="font-bold text-xl text-slate-800">{formatTime(flight.departure_time)}</div>
                        <div className="uppercase tracking-wider text-xs font-semibold text-slate-700 flex items-center justify-center gap-1">
                            {flight.origin}
                            {flight.departure_terminal && <span className="text-[10px] bg-blue-50 text-blue-600 px-1 rounded">T{flight.departure_terminal}</span>}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{formatDate(flight.departure_time)}</div>
                    </div>

                    <div className="flex flex-col items-center flex-1 px-4">
                        <div className="text-xs text-slate-400 mb-1">{flight.duration}</div>
                        <div className="w-full flex items-center space-x-2">
                            <div className="h-[2px] bg-slate-200 flex-1"></div>
                            <Plane className="h-4 w-4 text-blue-500 transform rotate-90" />
                            <div className="h-[2px] bg-slate-200 flex-1"></div>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                            <div className="flex flex-col items-center">
                                <span>{flight.stops === 0 ? 'Non-stop' : `${flight.stops} Stop(s)`}</span>
                                {flight.stops > 0 && (
                                    <div className="text-[10px] text-slate-500 font-medium whitespace-nowrap flex flex-col items-center">
                                        {(() => {
                                            const legs = parseFlightLegs(flight.stop_info, flight.stop_details);
                                            if (legs) {
                                                const via = legs.slice(0, -1).map(l => l.destination).join(', ');
                                                return <span>via {via}</span>;
                                            }
                                            return flight.stop_details && <span>via {flight.stop_details}</span>;
                                        })()}
                                        {flight.layover_duration && <span className="text-blue-500/80 mt-0.5">Layover: {flight.layover_duration}</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="font-bold text-xl text-slate-800">{formatTime(flight.arrival_time)}</div>
                        <div className="uppercase tracking-wider text-xs font-semibold text-slate-700 flex items-center justify-center gap-1">
                            {flight.destination}
                            {flight.arrival_terminal && <span className="text-[10px] bg-blue-50 text-blue-600 px-1 rounded">T{flight.arrival_terminal}</span>}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{formatDate(flight.arrival_time)}</div>
                    </div>
                </div>
            </div>

            <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 w-full md:w-56 flex flex-col items-center justify-center gap-3">
                <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                        {`₹${totalPrice.toLocaleString('en-IN')}`}
                    </div>
                    {passengers > 1 && (
                        <div className="text-[10px] text-slate-400 font-medium">
                            {`₹${unitPrice.toLocaleString('en-IN')} x ${passengers} passengers`}
                        </div>
                    )}
                </div>
                <Link
                    href={`/booking/${flight.id}?passengers=${passengers}${window.location.search.includes('adults=') ? `&${new URLSearchParams(window.location.search).toString()}` : ''}`}
                    onClick={handleBookNow}
                    className="w-full bg-blue-600 text-center text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                    Book Now
                </Link>
                {/* Seat Availability Badge */}
                {flight.available_seats !== undefined && flight.available_seats > 0 && (
                    <div className="px-6">
                        {flight.available_seats <= 10 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Only {flight.available_seats} seat{flight.available_seats !== 1 ? 's' : ''}!
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {flight.available_seats} seats
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
