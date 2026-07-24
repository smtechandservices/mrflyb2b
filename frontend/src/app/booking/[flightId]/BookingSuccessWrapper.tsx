'use client';

import { BookingForm } from '@/components/BookingForm';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { Flight } from '@/lib/api';

export function BookingSuccessWrapper({
    flight,
    isInternational,
    onPassengersChange
}: {
    flight: Flight;
    isInternational: boolean;
    onPassengersChange?: (counts: { adults: number; infants: number; infantPrice: number }) => void;
}) {
    const router = useRouter();
    const infantPrice = parseFloat(flight.infant_price || '0');

    return (
        <BookingForm
            flightId={flight.id}
            departureDate={flight.departure_time}
            isInternational={isInternational}
            infantPrice={infantPrice}
            onPassengersChange={onPassengersChange}
            onSuccess={(bookingId) => {
                Swal.fire({
                    icon: 'success',
                    title: 'Booking Confirmed!',
                    html: `
                        <div class="space-y-4 font-sans text-left">
                            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <p class="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Booking Confirmation</p>
                                <p class="text-lg font-bold text-slate-800">ID: <span class="text-blue-600 font-mono">${bookingId}</span></p>
                            </div>
                            
                            <div class="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-4">
                                <div class="flex justify-between items-center mb-1">
                                    <span class="text-sm font-bold text-slate-700">${flight.origin} → ${flight.destination}</span>
                                    <span class="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">${flight.airline}</span>
                                </div>
                                <div class="text-xs text-slate-500">
                                    ${flight.stops === 0 && !flight.stop_details ? 'Non-stop' : `<span class="font-bold text-slate-600">${flight.stops} Stop(s)</span> via ${flight.stop_details || 'N/A'}`}
                                </div>
                            </div>

                            <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-sm">
                                <div class="flex items-center gap-2">
                                    <div class="h-2 w-2 rounded-full bg-blue-500"></div>
                                    <strong class="font-bold">Status: Confirmed</strong>
                                </div>
                                <p class="opacity-80 mt-1">Your flight has been successfully booked. A confirmation email has been sent. You can also view and download your ticket in the <strong>"Bookings"</strong> tab. <br/><br/><span class="text-xs italic opacity-70 block mt-2 font-medium">Didn't receive the email? Check your <b>spam folder</b>.</span></p>
                            </div>
                        </div>
                    `,
                    confirmButtonText: 'View My Bookings',
                    confirmButtonColor: '#2563eb',
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'rounded-3xl',
                        confirmButton: 'rounded-xl px-8 py-3 font-bold'
                    }
                }).then(() => {
                    router.push('/my-bookings');
                });
            }}
        />
    );
}
