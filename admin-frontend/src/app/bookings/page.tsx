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

// Map arbitrary backend status strings onto the 3 semantic .status pill variants.
function statusVariant(status: string): 'confirmed' | 'pending' | 'cancelled' {
    const s = (status || '').toUpperCase();
    if (s === 'CONFIRMED') return 'confirmed';
    if (s === 'PENDING') return 'pending';
    return 'cancelled';
}

function StatusPill({ status }: { status: string }) {
    return (
        <span className={`status ${statusVariant(status)}`}>
            <span className="d"></span>
            {status}
        </span>
    );
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
                {label}
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink)' }}>{value}</div>
        </div>
    );
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
                ? "All eligible passengers in this group will be rejected and the agent will be refunded the full amount."
                : "This booking will be rejected and the agent will be refunded the full amount.",
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

    if (loading && groupedBookings.length === 0) return (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>Loading bookings…</div>
    );

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
                <div>
                    <h2>Booking Management</h2>
                    <p className="sub" style={{ margin: '6px 0 0' }}>
                        {groupedBookings.length} booking group{groupedBookings.length !== 1 ? 's' : ''} on this page · {totalCount} total.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        <span className="eyebrow" style={{ color: '#1f7a4d' }}>Net Revenue</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 500, color: '#1f7a4d', letterSpacing: '-0.005em' }}>
                            ₹{netRevenue.toLocaleString('en-IN')}
                        </span>
                    </div>
                    <div className="admin-search">
                        <Search size={14} />
                        <input
                            type="text"
                            placeholder="Search by booked by or passenger…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', background: 'transparent', font: 'inherit', color: 'inherit', width: '100%' }}
                        />
                    </div>
                </div>
            </div>

            <div className="panel">
                <div style={{ overflowX: 'auto' }}>
                    <table className="dtable" style={{ whiteSpace: 'nowrap' }}>
                        <thead>
                            <tr>
                                <th>Group Ref</th>
                                <th>Booked By</th>
                                <th>Flight</th>
                                <th>Route</th>
                                <th>Travel Date</th>
                                <th style={{ textAlign: 'center' }}>Passengers</th>
                                <th style={{ textAlign: 'right' }}>Total Price</th>
                                <th style={{ textAlign: 'right' }}>Refunded</th>
                                <th style={{ textAlign: 'center' }}>Flight Status</th>
                                <th style={{ textAlign: 'center' }}>Payment Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={10} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                                        Searching bookings…
                                    </td>
                                </tr>
                            ) : groupedBookings.length === 0 ? (
                                <tr>
                                    <td colSpan={10} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                                        No bookings found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                groupedBookings.map((group) => (
                                    <tr key={group.booking_group}>
                                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
                                            {group.booking_group || 'N/A'}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{group.broker.username}</div>
                                            <div style={{ color: 'var(--muted)', fontSize: 12 }}>{group.broker.email}</div>
                                        </td>
                                        <td>
                                            <div style={{ color: 'var(--ink)' }}>{group.flight_details.airline}</div>
                                            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>{group.flight_details.flight_number}</div>
                                        </td>
                                        <td style={{ color: 'var(--ink-2)' }}>
                                            <div>{group.flight_details.origin} → {group.flight_details.destination}</div>
                                            {group.flight_details.stops > 0 && (
                                                <div style={{ fontSize: 10, color: 'var(--muted)' }}>via {group.flight_details.stop_details}</div>
                                            )}
                                        </td>
                                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                                            {new Date(group.travel_date).toLocaleDateString()}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button className="btn btn-ghost btn-sm" style={{ padding: '4px 10px' }} onClick={() => setSelectedGroup(group)}>
                                                {group.passengers.length} pax
                                            </button>
                                        </td>
                                        <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, color: group.status === 'CONFIRMED' ? '#1f7a4d' : 'var(--ink)' }}>
                                            ₹{group.total_price.toLocaleString('en-IN')}
                                        </td>
                                        <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13 }}>
                                            {(group as any).total_refunded > 0 ? (
                                                <span style={{ color: '#b8443a', fontWeight: 500 }}>
                                                    − ₹{((group as any).total_refunded).toLocaleString('en-IN')}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--muted)' }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <StatusPill status={group.flight_status} />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <StatusPill status={group.status} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && (
                    <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
                            Page {currentPage} of {Math.max(1, totalPages)} ({totalCount} bookings)
                        </span>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </button>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {selectedGroup && (
                <div className="modal-overlay" onClick={() => setSelectedGroup(null)}>
                    <div className="modal modal-wide" style={{ padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                            <div>
                                <h3 style={{ margin: 0 }}>Group Passenger Details</h3>
                                <p className="modal-sub" style={{ margin: '4px 0 0' }}>
                                    Booked by <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>{selectedGroup.broker.username}</strong> · {selectedGroup.passengers.length} traveler{selectedGroup.passengers.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <button className="modal-close" style={{ position: 'static' }} onClick={() => setSelectedGroup(null)}>
                                <X size={16} />
                            </button>
                        </div>

                        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
                            {selectedGroup.passengers.map((passenger, index) => {
                                const age = calculateAge(passenger.date_of_birth);
                                const isInfant = passenger.is_infant || (age !== null && age <= 2);
                                const isChild = age !== null && age > 2 && age <= 18;

                                return (
                                    <div key={passenger.booking_id} style={index !== 0 ? { paddingTop: 28, marginTop: 28, borderTop: '1px solid var(--line)' } : undefined}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                                            <div style={{
                                                width: 40, height: 40, borderRadius: '50%', background: 'var(--sand)', color: 'var(--forest)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', flexShrink: 0,
                                            }}>
                                                {passenger.first_name[0]}{passenger.last_name[0]}
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <h4 style={{ margin: 0, fontSize: 17 }}>{passenger.first_name} {passenger.last_name}</h4>
                                                    {isChild && <span className="tag" style={{ padding: '2px 8px', fontSize: 10 }}>Child</span>}
                                                    {isInfant && <span className="tag" style={{ padding: '2px 8px', fontSize: 10 }}>Infant</span>}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
                                                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--muted)' }}>
                                                        ID: {passenger.booking_id}
                                                    </span>
                                                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--muted)' }}>
                                                        ₹{parseFloat((parseFloat(passenger.charged_price) > 0 || passenger.is_infant) ? passenger.charged_price : passenger.flight_details.price).toLocaleString('en-IN')}
                                                    </span>
                                                    <StatusPill status={passenger.status} />
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px', padding: '4px 0 20px' }}>
                                            <InfoField label="First Name" value={passenger.first_name} />
                                            <InfoField label="Last Name" value={passenger.last_name} />
                                            <InfoField label="Booking ID" value={<span style={{ fontFamily: 'var(--mono)' }}>{passenger.booking_id}</span>} />
                                            <InfoField label="Email" value={passenger.passenger_email || '—'} />
                                            <InfoField label="Phone" value={passenger.passenger_phone || '—'} />
                                            {passenger.date_of_birth && (
                                                <InfoField label="DOB" value={<span style={{ fontFamily: 'var(--mono)' }}>{new Date(passenger.date_of_birth).toLocaleDateString()}</span>} />
                                            )}
                                            {passenger.frequent_flyer_number && (
                                                <InfoField label="Freq. Flyer #" value={<span style={{ fontFamily: 'var(--mono)' }}>{passenger.frequent_flyer_number}</span>} />
                                            )}
                                        </div>

                                        <div className="field-group" style={{ maxWidth: 320, marginBottom: (passenger.passport_number || passenger.passport_issue_date || passenger.passport_expiry_date) ? 20 : 0 }}>
                                            <label>PNR / Booking Reference</label>
                                            <input
                                                type="text"
                                                defaultValue={passenger.pnr || ''}
                                                placeholder="Enter PNR"
                                                style={{ fontFamily: 'var(--mono)', textTransform: 'uppercase' }}
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

                                        {(passenger.passport_number || passenger.passport_issue_date || passenger.passport_expiry_date) && (
                                            <div style={{ background: 'var(--sand)', border: '1px solid var(--line)', borderRadius: 4, padding: 16 }}>
                                                <div className="eyebrow" style={{ marginBottom: 10 }}>Passport Details</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                                                    {passenger.passport_number && (
                                                        <InfoField label="Number" value={<span style={{ fontFamily: 'var(--mono)', fontWeight: 500 }}>{passenger.passport_number}</span>} />
                                                    )}
                                                    {passenger.passport_issue_date && (
                                                        <InfoField label="Issued" value={<span style={{ fontFamily: 'var(--mono)' }}>{new Date(passenger.passport_issue_date).toLocaleDateString()}</span>} />
                                                    )}
                                                    {passenger.passport_expiry_date && (
                                                        <InfoField label="Expiry" value={<span style={{ fontFamily: 'var(--mono)' }}>{new Date(passenger.passport_expiry_date).toLocaleDateString()}</span>} />
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ padding: '16px 28px', background: 'var(--sand)', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <div>
                                {selectedGroup.passengers.some(p => p.status !== 'REJECTED' && p.status !== 'CANCELLED' && p.status !== 'REFUNDED') && (
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        style={{ color: '#b8443a', borderColor: 'rgba(184,68,58,0.3)' }}
                                        onClick={() => handleReject(undefined, selectedGroup.booking_group)}
                                    >
                                        Reject Group
                                    </button>
                                )}
                            </div>
                            <button className="btn btn-ghost" onClick={() => setSelectedGroup(null)}>
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
