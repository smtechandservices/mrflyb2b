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
                        <div style="text-align:left;display:flex;flex-direction:column;gap:16px;">
                            <div style="background:#f4ede0;padding:16px;border-radius:8px;border:1px solid #d8cdb6;">
                                <p style="font-family:monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#756e63;margin-bottom:8px;">Booking Confirmation</p>
                                <p style="font-size:16px;font-weight:700;color:#1c1916;">ID: <span style="color:#1f3b30;font-family:monospace;">${bookingId}</span></p>
                            </div>

                            <div style="background:#faf7f0;padding:16px;border-radius:8px;border:1px solid #d8cdb6;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                    <span style="font-size:14px;font-weight:700;color:#3a3530;">${flight.origin} → ${flight.destination}</span>
                                    <span style="font-size:11px;font-weight:600;padding:3px 8px;background:#f4ede0;color:#1f3b30;border-radius:20px;">${flight.airline}</span>
                                </div>
                                <div style="font-size:12px;color:#756e63;">
                                    ${flight.stops === 0 && !flight.stop_details ? 'Non-stop' : `<span style="font-weight:700;color:#3a3530;">${flight.stops} Stop(s)</span> via ${flight.stop_details || 'N/A'}`}
                                </div>
                            </div>

                            <div style="background:rgba(31,59,48,0.06);padding:16px;border-radius:8px;border:1px solid rgba(31,59,48,0.15);color:#1f3b30;font-size:14px;">
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <div style="width:8px;height:8px;border-radius:50%;background:#1f3b30;"></div>
                                    <strong style="font-weight:700;">Status: Confirmed</strong>
                                </div>
                                <p style="opacity:0.85;margin-top:4px;">Your flight has been successfully booked. A confirmation email has been sent. You can also view and download your ticket in the <strong>"Bookings"</strong> tab. <br/><br/><span style="font-size:12px;font-style:italic;opacity:0.7;">Didn't receive the email? Check your <b>spam folder</b>.</span></p>
                            </div>
                        </div>
                    `,
                    confirmButtonText: 'View My Bookings',
                    confirmButtonColor: '#1f3b30',
                    allowOutsideClick: false,
                }).then(() => {
                    router.push('/my-bookings');
                });
            }}
        />
    );
}
