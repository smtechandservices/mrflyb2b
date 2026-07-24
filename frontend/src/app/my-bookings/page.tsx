'use client';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { Booking, getBookingHistory, requestRefund } from '@/lib/api';
import Swal from 'sweetalert2';
import { Loader2, User as UserIcon, Mail, Phone, Calendar as CalendarIcon, FileText, RefreshCw, Wallet, CreditCard } from 'lucide-react';
import { RipplesBackground } from '@/components/RipplesBackground';
import { getAirlineLogo } from '@/lib/airlines';
import { generateTicketPDF } from '@/lib/ticketGenerator';
import { Download } from 'lucide-react';

export default function MyBookingsPage() {
    const { user, isAuthenticated } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchBookings = async () => {
        try {
            const data = await getBookingHistory();
            setBookings(data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    };

    useEffect(() => {
        const initBookings = async () => {
            try {
                await fetchBookings();
            } catch (error) {
                setBookings([]);
            } finally {
                setLoading(false);
            }
        };

        if (isAuthenticated) {
            initBookings();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchBookings();
        // Artificial delay to show spinning animation
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsRefreshing(false);
    };

    const handleRequestRefund = async (groupKey: string, passengers: Booking[]) => {
        const confirmable = passengers.filter(p => p.status === 'CONFIRMED');
        if (confirmable.length === 0) return;

        const remarksField = `
            <div class="mt-3">
                <label class="block text-xs font-medium text-gray-600 mb-1 text-left">Reason for refund <span class="text-gray-400 font-normal">(optional)</span></label>
                <textarea id="refund-remarks" rows="2" placeholder="e.g. Flight cancelled, plans changed…" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"></textarea>
            </div>`;

        let selectedIds: string[] = [];
        let remarks = '';

        if (confirmable.length === 1) {
            const p = confirmable[0];
            const result = await Swal.fire({
                title: 'Request Refund?',
                html: `<div class="text-left px-2">
                    <p class="text-sm text-gray-500 mb-3">Requesting refund for:</p>
                    <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                            <div class="font-semibold text-gray-800">${p.first_name} ${p.last_name}</div>
                            <div class="text-xs text-gray-500 mt-0.5">₹${parseFloat(p.charged_price).toLocaleString('en-IN')}</div>
                        </div>
                    </div>
                    ${remarksField}
                </div>`,
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, request refund!',
                preConfirm: () => {
                    return (document.getElementById('refund-remarks') as HTMLTextAreaElement)?.value?.trim() || '';
                }
            });
            if (result.isConfirmed) {
                selectedIds = [p.booking_id];
                remarks = result.value as string;
            }
        } else {
            const passengerItems = confirmable.map((p) => `
                <label class="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 cursor-pointer border border-transparent hover:border-blue-200 transition-colors">
                    <input type="checkbox" class="passenger-checkbox w-4 h-4 accent-blue-600 flex-shrink-0" value="${p.booking_id}" />
                    <div class="text-left min-w-0">
                        <div class="font-medium text-sm text-gray-800">${p.first_name} ${p.last_name}</div>
                        <div class="text-xs text-gray-500 mt-0.5">₹${parseFloat(p.charged_price).toLocaleString('en-IN')}</div>
                    </div>
                </label>
            `).join('');

            const result = await Swal.fire({
                title: 'Select Passengers for Refund',
                html: `
                    <div class="text-left">
                        <p class="text-sm text-gray-500 mb-2">Choose the passengers you want to refund:</p>
                        <div class="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1 mb-1">${passengerItems}</div>
                        ${remarksField}
                    </div>
                `,
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Request Refund',
                preConfirm: () => {
                    const checked = Array.from(document.querySelectorAll<HTMLInputElement>('.passenger-checkbox:checked'));
                    const ids = checked.map(el => el.value);
                    if (!ids.length) {
                        Swal.showValidationMessage('Please select at least one passenger');
                        return false;
                    }
                    const r = (document.getElementById('refund-remarks') as HTMLTextAreaElement)?.value?.trim() || '';
                    return { ids, remarks: r };
                }
            });

            if (result.isConfirmed && result.value) {
                selectedIds = result.value.ids;
                remarks = result.value.remarks;
            }
        }

        if (selectedIds.length === 0) return;

        try {
            await requestRefund(undefined, undefined, selectedIds, remarks);
            Swal.fire('Requested!', `Refund requested for ${selectedIds.length} passenger(s).`, 'success');
            fetchBookings();
            // Notify admin
            fetch('/api/admin/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'refund_request',
                    userName: user?.username,
                    userEmail: user?.email,
                    bookingRef: groupKey,
                    passengerCount: selectedIds.length,
                    remarks: remarks || undefined,
                }),
            }).catch(() => {});
        } catch (error: any) {
            Swal.fire('Error!', error.message || 'Failed to request refund.', 'error');
        }
    };

    const handleDownloadTicket = async (groupBookings: Booking[], includePrice: boolean = true) => {
        try {
            await generateTicketPDF(groupBookings, user, includePrice);
        } catch (error) {
            console.error('PDF Generation failed:', error);
            Swal.fire('Error', 'Failed to generate PDF ticket.', 'error');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-50 py-12 px-4">
                <div className="max-w-4xl mx-auto text-center pt-24">
                    <h1 className="text-3xl font-bold text-slate-800 mb-4">My Bookings</h1>
                    <p className="text-slate-600">Please log in to view your bookings.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    // Group bookings by booking_group (or booking_id if booking_group is missing)
    const groupedBookings = bookings.reduce((groups: { [key: string]: Booking[] }, booking) => {
        const key = booking.booking_group || booking.booking_id;
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(booking);
        return groups;
    }, {});

    const groupKeys = Object.keys(groupedBookings).sort((a, b) => {
        // Sort groups by the creation date of the first booking in each group (descending)
        const dateA = new Date(groupedBookings[a][0].created_at).getTime();
        const dateB = new Date(groupedBookings[b][0].created_at).getTime();
        return dateB - dateA;
    });

    const calculateAge = (dob: string | undefined) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Hero Section with WebGL Ripples */}
            <div className="pt-4 relative min-h-[30vh] flex items-center overflow-hidden">
                <RipplesBackground imageUrl="/hero-booking.png">
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-black/10"></div>

                    {/* Content */}
                    <div className="relative max-w-9xl px-4 md:px-10 mx-auto w-full pt-32">
                        <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">My Bookings</h1>
                        <p className="text-slate-200 text-sm md:text-lg">Showing bookings for {user?.email}</p>
                    </div>
                </RipplesBackground>
            </div>

            {/* Main Content */}
            <div className="max-w-9xl px-4 md:px-10 mx-auto py-8">
                <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-6">{groupKeys.length} Booking Group{groupKeys.length !== 1 ? 's' : ''} Found</h2>

                {groupKeys.length > 0 ? (
                    groupKeys.map((groupKey, groupIndex) => {
                        const passengers = groupedBookings[groupKey];
                        const firstPassenger = passengers[0];
                        const isMulti = passengers.length > 1;

                        // Check if flight has expired (departure time has passed)
                        const isExpired = new Date(firstPassenger.flight_details.departure_time) < new Date();
                        const paymentStatus = firstPassenger.payment_status;
                        const flightStatus = firstPassenger.flight_status;

                        return (
                            <div
                                key={groupKey}
                                className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12 animate-fade-in"
                                style={{ animationDelay: `${groupIndex * 0.15}s` }}
                            >
                                {/* Flight Ticket Card - Left (2/3 width) */}
                                <div className="lg:col-span-2">
                                    <div className={`border-y-2 rounded-2xl overflow-hidden ${isExpired ? 'border-slate-400 opacity-75' : 'border-slate-700'}`}>
                                        {/* Main Ticket Body */}
                                        <div className="relative">
                                            {/* Header with Airline and Status */}
                                            <div className={`${isExpired ? 'bg-gradient-to-r from-slate-500 to-slate-600' :
                                                firstPassenger.status === 'REFUNDED' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                                    (firstPassenger.status === 'CANCELLED' || firstPassenger.status === 'REJECTED') ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                                        firstPassenger.status === 'PENDING' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                                                            'bg-gradient-to-r from-blue-600 to-sky-600'
                                                } text-white px-6 py-4 flex justify-between items-center`}>
                                                <div className="flex items-center gap-4">
                                                    {getAirlineLogo(firstPassenger.flight_details.airline) && (
                                                        <div className="h-10 w-10 bg-white rounded-full flex mx-auto items-center justify-center p-1 border border-white/20 shadow-sm overflow-hidden flex-shrink-0">
                                                            <img src={getAirlineLogo(firstPassenger.flight_details.airline)!} alt={firstPassenger.flight_details.airline} className="w-full h-full object-contain" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="text-xs uppercase tracking-wider opacity-90">Flight Ticket</div>
                                                        <div className="text-2xl font-bold">{firstPassenger.flight_details.airline}</div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-4">
                                                    {isMulti && (
                                                        <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold">
                                                            {passengers.length} Passengers
                                                        </div>
                                                    )}
                                                    
                                                    {/* Status Badges Container */}
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex gap-2">
                                                            {/* Payment Status Badge */}
                                                            <div className={`${isExpired ? 'bg-slate-700/50' : 'bg-white/20'} backdrop-blur-sm px-3 py-1.5 rounded-lg text-right border border-white/10`}>
                                                                <div className="text-[8px] uppercase tracking-tighter opacity-70 leading-none mb-1">Payment</div>
                                                                <div className="font-bold text-xs uppercase">{paymentStatus}</div>
                                                            </div>
                                                            
                                                                 <div className={`${isExpired ? 'bg-slate-700/50' : 
                                                                 flightStatus === 'PENDING' ? 'bg-yellow-400/30' : 'bg-white/20'
                                                             } backdrop-blur-sm px-3 py-1.5 rounded-lg text-right border border-white/10`}>
                                                                 <div className="text-[8px] uppercase tracking-tighter opacity-70 leading-none mb-1">Flight</div>
                                                                 <div className="font-bold text-xs uppercase">{flightStatus === 'CONFIRMED' ? 'Confirmed' : 'Pending'}</div>
                                                             </div>
                                                    </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Flight Route Section */}
                                            <div className="px-4 py-8 md:pt-14 bg-gradient-to-b from-slate-50 to-white">
                                                <div className="flex flex-col md:grid md:grid-cols-3 gap-6 md:gap-8 items-center">
                                                    {/* Origin */}
                                                    <div className="text-center w-full md:w-auto">
                                                        <div className="text-3xl md:text-4xl font-bold text-slate-800">{firstPassenger.flight_details.origin}</div>
                                                        <div className="text-sm text-slate-500 mt-1">Origin</div>
                                                        <div className="text-sm text-slate-400 mt-1">
                                                            {new Date(firstPassenger.flight_details.departure_time).toLocaleDateString('en-GB')} {new Date(firstPassenger.flight_details.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                        </div>
                                                    </div>

                                                    {/* Flight Path */}
                                                    <div className="flex flex-col items-center w-full">
                                                        <div className="text-sm md:text-md text-slate-500 mb-2">Flight {firstPassenger.flight_details.flight_number}</div>
                                                        <div className="w-full flex items-center justify-center">
                                                            <div className="h-px bg-slate-300 flex-1"></div>
                                                            <svg className="w-6 h-6 text-blue-600 mx-2" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                                            </svg>
                                                            <div className="h-px bg-slate-300 flex-1"></div>
                                                        </div>
                                                        <div className="flex flex-col items-center mt-2">
                                                            <div className="text-sm md:text-md text-slate-500">{firstPassenger.flight_details.duration}</div>
                                                            <div className="text-[10px] md:text-xs mt-1">
                                                                <span className="text-slate-400 font-medium">
                                                                    {firstPassenger.flight_details.stops === 0 ? 'Non-stop' : `${firstPassenger.flight_details.stops} Stop(s)`}
                                                                </span>
                                                                {firstPassenger.flight_details.stops > 0 && firstPassenger.flight_details.stop_details && (
                                                                    <span className="text-slate-400 ml-1">via {firstPassenger.flight_details.stop_details}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Destination */}
                                                    <div className="text-center w-full md:w-auto">
                                                        <div className="text-3xl md:text-4xl font-bold text-slate-800">{firstPassenger.flight_details.destination}</div>
                                                        <div className="text-sm text-slate-500 mt-1">Destination</div>
                                                        <div className="text-sm text-slate-400 mt-1">
                                                            {new Date(firstPassenger.flight_details.arrival_time).toLocaleDateString('en-GB')} {new Date(firstPassenger.flight_details.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Perforated Divider */}
                                            <div className="relative h-12 md:h-24 bg-white overflow-hidden">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t-2 border-dashed border-slate-300"></div>
                                                </div>
                                                <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-10 md:h-12 bg-slate-50 rounded-full border-2 border-slate-200"></div>
                                                <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-10 md:h-12 bg-slate-50 rounded-full border-2 border-slate-200"></div>
                                            </div>

                                            {/* Flight Info Section */}
                                            <div className="px-6 pt-4 pb-12 bg-white text-center">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div>
                                                        <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Travel Date</div>
                                                        <div className="font-semibold text-slate-800">
                                                            {new Date(firstPassenger.travel_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Group Total</div>
                                                        <div className="font-bold text-slate-800">
                                                            ₹{passengers.reduce((acc, p) => acc + parseFloat((parseFloat(p.charged_price) > 0 || p.is_infant) ? p.charged_price : p.flight_details.price), 0).toLocaleString('en-IN')}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Payment Method</div>
                                                        <div className="font-bold text-slate-800 flex items-center justify-center gap-1.5">
                                                            {firstPassenger.payment_mode === 'WALLET' ? (
                                                                <>
                                                                    <Wallet size={14} className="text-blue-500" />
                                                                    <span>Wallet</span>
                                                                </>
                                                            ) : firstPassenger.payment_mode === 'RAZORPAY' ? (
                                                                <>
                                                                    <CreditCard size={14} className="text-indigo-500" />
                                                                    <span>Razorpay</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-slate-400 text-xs">{firstPassenger.payment_mode || 'N/A'}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Group Ref</div>
                                                        <div className="font-mono font-bold text-blue-600">{groupKey}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Pending Confirmation Note */}
                                            {!isExpired && flightStatus === 'PENDING' && (
                                                <div className="border-t border-yellow-100 px-6 py-3 bg-yellow-50 flex items-start gap-3">
                                                    <svg className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                    </svg>
                                                    <p className="text-xs text-yellow-700 leading-relaxed">
                                                        <span className="font-semibold">Booking Pending:</span> Your PNR generation may take up to <span className="font-semibold">60 minutes</span>. Please check back shortly.
                                                    </p>
                                                </div>
                                            )}

                                            {/* Action Footer (Download & Refund) */}
                                            {(() => {
                                                const isDownloadable = firstPassenger.payment_status === 'CONFIRMED' && firstPassenger.flight_status === 'CONFIRMED';
                                                const isRefundable = !isExpired && passengers.some(p => p.status === 'CONFIRMED');
                                                
                                                if (!isDownloadable && !isRefundable) return null;
                                                
                                                return (
                                                    <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            {isDownloadable && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleDownloadTicket(passengers, true)}
                                                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[10px] md:text-xs font-bold border border-blue-100 transition-all group/dl"
                                                                        title="Download Ticket with Price"
                                                                    >
                                                                        <Download size={14} className="group-hover/dl:scale-110 transition-transform" />
                                                                        Ticket with Price
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDownloadTicket(passengers, false)}
                                                                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-[10px] md:text-xs font-bold border border-slate-200 transition-all group/dl"
                                                                        title="Download Ticket without Price"
                                                                    >
                                                                        <Download size={14} className="group-hover/dl:scale-110 transition-transform" />
                                                                        Ticket (No Price)
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                        
                                                        {isRefundable && (
                                                            <button
                                                                onClick={() => handleRequestRefund(groupKey, passengers)}
                                                                className="cursor-pointer text-[10px] md:text-xs text-red-500 hover:text-red-700 font-bold px-4 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-all whitespace-nowrap ml-auto sm:ml-0"
                                                            >
                                                                Request Refund
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                            {!isExpired && passengers.some(p => p.status === 'REFUND_REQUESTED') && !passengers.some(p => p.status === 'CONFIRMED') && (
                                                <div className="border-t border-slate-100 p-4">
                                                    <span className="text-sm text-orange-500 font-medium">
                                                        Refund Requested
                                                    </span>
                                                </div>
                                            )}
                                            {passengers.some(p => p.status === 'REFUNDED') && !passengers.some(p => p.status === 'CONFIRMED') && !passengers.some(p => p.status === 'REFUND_REQUESTED') && (
                                                <div className="border-t border-slate-100 p-4">
                                                    <span className="text-sm text-slate-500 font-medium">
                                                        Refunded to Wallet
                                                    </span>
                                                </div>
                                            )}
                                            {passengers.some(p => p.status === 'REJECTED') && !passengers.some(p => p.status === 'CONFIRMED') && !passengers.some(p => p.status === 'REFUND_REQUESTED') && (
                                                <div className="border-t border-red-100 p-4 bg-red-50/50">
                                                    <span className="text-sm text-red-600 font-bold">
                                                        Booking Rejected & Fully Refunded
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Passenger Details Card - Right (1/3 width) */}
                                <div className="lg:col-span-1">
                                    <div className={`bg-white rounded-2xl overflow-hidden h-full shadow-sm border-y-2 ${isExpired ? 'border-slate-400 opacity-75' : (firstPassenger.status === 'REJECTED' || firstPassenger.status === 'CANCELLED') ? 'border-red-600' : 'border-slate-700'}`}>
                                        <div className={`${isExpired ? 'bg-gradient-to-r from-slate-500 to-slate-600' : (firstPassenger.status === 'REJECTED' || firstPassenger.status === 'CANCELLED') ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-blue-600 to-sky-600'} text-white px-6 py-4`}>
                                            <div className="text-xs uppercase tracking-wider opacity-90">Passenger List</div>
                                            <div className="text-lg font-bold mt-1">{passengers.length} Passenger{passengers.length !== 1 ? 's' : ''}</div>
                                        </div>

                                        <div className="p-0 max-h-[500px] overflow-y-auto">
                                            {passengers.map((passenger, pIdx) => (
                                                <div key={passenger.booking_id} className={`p-6 ${pIdx !== passengers.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <div className="font-bold text-slate-800 text-lg leading-tight flex items-center gap-2">
                                                                {passenger.first_name} {passenger.last_name}
                                                                {passenger.date_of_birth && (
                                                                    <span className="text-slate-500 font-medium text-sm">
                                                                        ({calculateAge(passenger.date_of_birth)}Y)
                                                                    </span>
                                                                )}
                                                                {passenger.is_infant && (
                                                                    <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                                                        Infant
                                                                    </span>
                                                                )}
                                                                {!passenger.is_infant && (() => {
                                                                    const age = calculateAge(passenger.date_of_birth);
                                                                    return age !== null && age > 2 && age <= 18;
                                                                })() && (
                                                                    <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-blue-200">
                                                                        Child
                                                                    </span>
                                                                )}
                                                                {passenger.status === 'REFUND_REQUESTED' && (
                                                                    <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                                                        Refund Pending
                                                                    </span>
                                                                )}
                                                                {passenger.status === 'REFUNDED' && (
                                                                    <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                                                        Refunded
                                                                    </span>
                                                                )}
                                                                {passenger.status === 'REJECTED' && (
                                                                    <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                                                        Rejected
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="mt-1 flex flex-wrap gap-2 items-center">
                                                                <div className="text-xs font-mono bg-slate-100 px-3 py-1 rounded text-slate-600 font-bold border border-slate-200 inline-block">
                                                                    TXN ID: {passenger.booking_id}
                                                                </div>
                                                                <div className="text-[10px] font-bold text-slate-700">
                                                                    Price: ₹{parseFloat((parseFloat(passenger.charged_price) > 0 || passenger.is_infant) ? passenger.charged_price : passenger.flight_details.price).toLocaleString('en-IN')}
                                                                </div>
                                                                {passenger.pnr ? (
                                                                    <div className="text-[10px] font-mono bg-blue-100 px-2 py-0.5 rounded text-blue-700 font-bold border border-blue-200 inline-block">
                                                                        PNR: {passenger.pnr}
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-1">
                                                                        <div className="text-[10px] bg-yellow-50 px-2 py-0.5 rounded text-yellow-700 border border-yellow-200 border-dashed">
                                                                            PNR: Will be generated soon
                                                                        </div>
                                                                        <button
                                                                            onClick={handleRefresh}
                                                                            className={`cursor-pointer p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-blue-600 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
                                                                            title="Refresh PNR"
                                                                        >
                                                                            <RefreshCw size={12} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-3">
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <Mail size={14} className="text-slate-400" />
                                                            <span className="truncate">{passenger.passenger_email}</span>
                                                        </div>
                                                        {passenger.passenger_phone && (
                                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                                <Phone size={14} className="text-slate-400" />
                                                                <span>{passenger.passenger_phone}</span>
                                                            </div>
                                                        )}
                                                        {passenger.date_of_birth && (
                                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                                <CalendarIcon size={14} className="text-slate-400" />
                                                                <span>DOB: {new Date(passenger.date_of_birth).toLocaleDateString()}</span>
                                                            </div>
                                                        )}
                                                        {passenger.passport_number && (
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                                    <FileText size={14} className="text-slate-400" />
                                                                    <span>Passport: <span className="font-mono">{passenger.passport_number}</span></span>
                                                                </div>
                                                                {passenger.passport_expiry_date && (
                                                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 ml-6">
                                                                        <span>Expires: {new Date(passenger.passport_expiry_date).toLocaleDateString()}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {passenger.user_refund_remarks && (
                                                            <div className="mt-1 p-2 bg-orange-50 border border-orange-100 rounded-lg">
                                                                <div className="text-[10px] text-orange-500 uppercase font-bold tracking-wide mb-0.5">Your Refund Reason</div>
                                                                <div className="text-xs text-slate-700">{passenger.user_refund_remarks}</div>
                                                            </div>
                                                        )}
                                                        {passenger.admin_refund_remarks && (
                                                            <div className="mt-1 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                                                                <div className="text-[10px] text-blue-500 uppercase font-bold tracking-wide mb-0.5">Admin Remarks</div>
                                                                <div className="text-xs text-slate-700">{passenger.admin_refund_remarks}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                                            <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Booked On</div>
                                            <div className="text-xs text-slate-600">
                                                {new Date(firstPassenger.created_at).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CalendarIcon size={32} className="text-slate-300" />
                        </div>
                        <p className="text-slate-500 text-lg font-medium">No bookings found.</p>
                        <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">You haven't made any bookings yet. Start your journey today!</p>
                        <a
                            href="/search"
                            className="inline-block mt-8 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                        >
                            Explore Flights
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
