'use client';

import { useEffect, useState } from 'react';
import { getAdminBookings, updateBooking, rejectBooking, Booking } from '@/lib/api';
import { Search, X } from 'lucide-react';
import Swal from 'sweetalert2';

const calculateAge = (dateString?: string | null): number | null => {
    if (!dateString) return null;
    const birthDate = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

interface GroupedBooking {
    booking_group: string;
    broker: {
        username: string;
        email: string;
    };
    flight_details: any;
    travel_date: string;
    created_at: string;
    status: string;
    payment_status: string;
    flight_status: string;
    passengers: Booking[];
    total_price: number;
    payment_mode: string;
}

export default function AdminBookingsPage() {
    const [groupedBookings, setGroupedBookings] = useState<GroupedBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [netRevenue, setNetRevenue] = useState(0);
    const [selectedGroup, setSelectedGroup] = useState<GroupedBooking | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 10;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchBookings(currentPage, debouncedSearch);
    }, [currentPage, debouncedSearch]);

    const fetchBookings = async (page: number = 1, search: string = '') => {
        setLoading(true);
        try {
            const data = await getAdminBookings(page, search);

            const groups: { [key: string]: GroupedBooking } = {};
            data.results.forEach((booking: Booking) => {
                const groupId = booking.booking_group || `IND-${booking.booking_id}`;
                if (!groups[groupId]) {
                    groups[groupId] = {
                        booking_group: groupId,
                        broker: {
                            username: booking.booked_by?.username || 'System/Guest',
                            email: booking.booked_by?.email || 'no-email',
                        },
                        flight_details: booking.flight_details,
                        travel_date: booking.travel_date,
                        created_at: booking.created_at,
                        status: booking.status,
                        payment_status: booking.payment_status,
                        flight_status: booking.flight_status,
                        passengers: [],
                        total_price: 0,
                        payment_mode: booking.payment_mode || 'WALLET',
                    };
                    (groups[groupId] as any).total_refunded = 0;
                }
                groups[groupId].passengers.push(booking);
                const passengerPrice = parseFloat((parseFloat(booking.charged_price) > 0 || booking.is_infant) ? booking.charged_price : booking.flight_details.price);
                groups[groupId].total_price += passengerPrice;

                // Track refunded amount
                if (!groups[groupId].hasOwnProperty('total_refunded')) {
                    (groups[groupId] as any).total_refunded = 0;
                }
                (groups[groupId] as any).total_refunded += parseFloat(booking.refunded_amount || '0');
            });

            setGroupedBookings(Object.values(groups));
            setTotalCount(data.count);
            setNetRevenue(data.total_revenue || 0);
        } catch (error) {
            console.error('Failed to fetch bookings', error);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    const handleUpdatePnr = async (bookingId: string, newPnr: string) => {
        try {
            await updateBooking(bookingId, { pnr: newPnr });

            // Update local state
            setGroupedBookings(prev => prev.map(group => ({
                ...group,
                passengers: group.passengers.map(p =>
                    p.booking_id === bookingId ? { ...p, pnr: newPnr } : p
                )
            })));

            // Also update selected group if it contains this booking
            if (selectedGroup) {
                setSelectedGroup(prev => prev ? ({
                    ...prev,
                    passengers: prev.passengers.map(p =>
                        p.booking_id === bookingId ? { ...p, pnr: newPnr } : p
                    )
                }) : null);
            }

            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
            Toast.fire({
                icon: 'success',
                title: 'PNR Updated'
            });
        } catch (error) {
            console.error('Failed to update PNR', error);
            Swal.fire('Error', 'Failed to update PNR', 'error');
        }
    };

    const handleReject = async (bookingId?: string, bookingGroup?: string) => {
        // Handle artificial IDs generated for individual bookings
        const isArtificialGroup = bookingGroup?.startsWith('IND-');
        const effectiveBookingId = (isArtificialGroup && bookingGroup) ? bookingGroup.replace('IND-', '') : bookingId;
        const effectiveGroup = isArtificialGroup ? undefined : bookingGroup;

        const isGroup = !!effectiveGroup;

        const result = await Swal.fire({
            title: isGroup ? 'Reject Entire Group?' : 'Are you sure?',
            text: isGroup 
                ? "All eligible passengers in this group will be rejected and the user will be refunded the full amount."
                : "This booking will be rejected and the user will be refunded the full amount.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: isGroup ? 'Yes, reject group!' : 'Yes, reject it!'
        });

        if (result.isConfirmed) {
            try {
                const data = await rejectBooking(effectiveBookingId, effectiveGroup);
                
                // Refresh list to update all states correctly
                fetchBookings(currentPage, debouncedSearch);
                if (selectedGroup) {
                    setSelectedGroup(null);
                }

                Swal.fire(
                    'Rejected!',
                    isGroup 
                        ? `Successfully rejected ${data.processed_count} booking(s) and refunded ₹${parseFloat(data.total_refunded as any).toLocaleString('en-IN')}.`
                        : `Successfully rejected the booking and refunded ₹${parseFloat(data.total_refunded as any).toLocaleString('en-IN')}.`,
                    'success'
                );
            } catch (error: any) {
                console.error('Failed to reject booking', error);
                Swal.fire('Error', error.message || 'Failed to reject booking', 'error');
            }
        }
    };

    if (loading && groupedBookings.length === 0) return <div>Loading bookings...</div>;

    return (
        <div className='pt-8'>
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Booking Management</h2>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase tracking-wider text-green-600 font-bold">Net Revenue</span>
                        <span className="text-xl font-bold text-green-700">₹{netRevenue.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by booked by or passenger..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="text-slate-700 pl-10 pr-12 py-4 border border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-medium text-slate-500">Group Ref</th>
                                <th className="px-6 py-4 font-medium text-slate-500">Booked By</th>
                                <th className="px-6 py-4 font-medium text-slate-500">Flight</th>
                                <th className="px-6 py-4 font-medium text-slate-500">Route</th>
                                <th className="px-6 py-4 font-medium text-slate-500">Travel Date</th>
                                <th className="px-6 py-4 font-medium text-slate-500">Passengers</th>
                                <th className="px-6 py-4 font-medium text-slate-500">Total Price</th>
                                <th className="px-6 py-4 font-medium text-slate-500">Refunded</th>
                                <th className="px-6 py-4 font-medium text-slate-500 text-center">PNR Status</th>
                                <th className="px-6 py-4 font-medium text-slate-500 text-center">Payment Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            <span>Searching bookings...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : groupedBookings.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                                        No bookings found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                groupedBookings.map((group) => (
                                    <tr key={group.booking_group} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-400">
                                            {group.booking_group || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{group.broker.username}</div>
                                            <div className="text-slate-500 text-xs">{group.broker.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{group.flight_details.airline}</div>
                                            <div className="text-slate-500 text-xs">{group.flight_details.flight_number}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            <div className="font-medium">{group.flight_details.origin} → {group.flight_details.destination}</div>
                                            {group.flight_details.stops > 0 && (
                                                <div className="text-[10px] text-slate-400">via {group.flight_details.stop_details}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {new Date(group.travel_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => setSelectedGroup(group)}
                                                className="cursor-pointer inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors"
                                            >
                                                {group.passengers.length} Passenger(s)
                                            </button>
                                        </td>
                                        <td className={`px-6 py-4 font-bold ${group.status === 'CONFIRMED' ? 'text-green-600' : 'text-slate-900'}`}>
                                            ₹{group.total_price.toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-6 py-4">
                                            {(group as any).total_refunded > 0 ? (
                                                <span className="font-bold text-red-600">
                                                    - ₹{((group as any).total_refunded).toLocaleString('en-IN')}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {/* Flight Status Badge */}
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                                                group.flight_status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {group.flight_status}
                                            </span>                     
                                        </td>
                                        <td className="px-6 py-4">
                                            {/* Payment Status Badge */}
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                                                group.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                                                group.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                group.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {group.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && (
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                            Page {currentPage} of {Math.max(1, totalPages)} ({totalCount} bookings)
                        </span>
                        <div className="text-slate-700 flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {selectedGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-2xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 backdrop-blur-md z-10">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Group Passenger Details</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Booked by <span className="font-bold text-slate-700">{selectedGroup.broker.username}</span> • {selectedGroup.passengers.length} travelers
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedGroup(null)}
                                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="cursor-pointer w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-8 overflow-y-auto">
                            {selectedGroup.passengers.map((passenger, index) => {
                                const age = calculateAge(passenger.date_of_birth);
                                const isInfant = passenger.is_infant || (age !== null && age <= 2);
                                const isChild = age !== null && age > 2 && age <= 18;
                                
                                return (
                                <div key={passenger.booking_id} className={`${index !== 0 ? 'pt-8 border-t border-slate-100' : ''}`}>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm uppercase">
                                            {passenger.first_name[0]}{passenger.last_name[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                                {passenger.first_name} {passenger.last_name}
                                                {isChild && (
                                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] uppercase tracking-wider rounded border border-indigo-200 font-bold">
                                                        Child
                                                    </span>
                                                )}
                                                {isInfant && (
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] uppercase tracking-wider rounded border border-blue-200 font-bold">
                                                        Infant
                                                    </span>
                                                )}
                                            </h4>
                                            <div className="flex items-center gap-4">
                                                <p className="text-slate-400 text-[10px] font-mono uppercase tracking-wider">
                                                    ID: {passenger.booking_id}
                                                </p>
                                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                                    Price: ₹{parseFloat((parseFloat(passenger.charged_price) > 0 || passenger.is_infant) ? passenger.charged_price : passenger.flight_details.price).toLocaleString('en-IN')}
                                                </p>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                                                    passenger.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                                                    passenger.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                    passenger.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                    'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {passenger.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 px-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">First Name</label>
                                            <div className="text-slate-800 font-medium text-sm">{passenger.first_name}</div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Last Name</label>
                                            <div className="text-slate-800 font-medium text-sm">{passenger.last_name}</div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Booking ID</label>
                                            <div className="text-slate-800 font-medium text-sm font-mono">{passenger.booking_id}</div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email</label>
                                            <div className="text-slate-800 font-medium text-sm break-all">{passenger.passenger_email || '-'}</div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Phone</label>
                                            <div className="text-slate-800 font-medium text-sm">{passenger.passenger_phone || '-'}</div>
                                        </div>
                                        {passenger.date_of_birth && (
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">DOB</label>
                                                <div className="text-slate-800 font-medium text-sm">{new Date(passenger.date_of_birth).toLocaleDateString()}</div>
                                            </div>
                                        )}
                                        {passenger.frequent_flyer_number && (
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Freq. Flyer #</label>
                                                <div className="text-slate-800 font-medium text-sm font-mono">{passenger.frequent_flyer_number}</div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">PNR / Booking Reference</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                defaultValue={passenger.pnr || ''}
                                                placeholder="Enter PNR"
                                                className="text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-sm w-full font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                onBlur={(e) => {
                                                    if (e.target.value !== (passenger.pnr || '')) {
                                                        handleUpdatePnr(passenger.booking_id, e.target.value);
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.currentTarget.blur();
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {(passenger.passport_number || passenger.passport_issue_date || passenger.passport_expiry_date) && (
                                        <div className="mt-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                                                Passport Details
                                            </h5>
                                            <div className="grid grid-cols-3 gap-4 text-xs">
                                                {passenger.passport_number && (
                                                    <div className="col-span-1">
                                                        <label className="text-slate-400 mb-0.5 block">Number</label>
                                                        <div className="font-bold font-mono text-slate-800">{passenger.passport_number}</div>
                                                    </div>
                                                )}
                                                {passenger.passport_issue_date && (
                                                    <div className="col-span-1">
                                                        <label className="text-slate-400 mb-0.5 block">Issued</label>
                                                        <div className="font-medium text-slate-800">{new Date(passenger.passport_issue_date).toLocaleDateString()}</div>
                                                    </div>
                                                )}
                                                {passenger.passport_expiry_date && (
                                                    <div className="col-span-1">
                                                        <label className="text-slate-400 mb-0.5 block">Expiry</label>
                                                        <div className="font-medium text-slate-800">{new Date(passenger.passport_expiry_date).toLocaleDateString()}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )})}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center px-6">
                            <div className="flex gap-2">
                                {selectedGroup.passengers.some(p => p.status !== 'REJECTED' && p.status !== 'CANCELLED' && p.status !== 'REFUNDED') && (
                                    <button
                                        onClick={() => handleReject(undefined, selectedGroup.booking_group)}
                                        className="cursor-pointer px-4 py-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-all text-xs border border-red-100"
                                    >
                                        Reject Group
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedGroup(null)}
                                className="cursor-pointer px-8 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm text-sm"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
