'use client';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { Booking, getBookingHistory, requestRefund } from '@/lib/api';
import Swal from 'sweetalert2';
import { Loader2, Mail, Phone, Calendar as CalendarIcon, FileText, RefreshCw, Wallet, CreditCard, Download } from 'lucide-react';
import { getAirlineLogo } from '@/lib/airlines';
import { generateTicketPDF } from '@/lib/ticketGenerator';

function fmt(n: number) {
    return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Map the many backend booking/payment statuses down to the three pill
// variants the design system defines (confirmed / pending / cancelled).
function statusPill(status: string): { cls: string; label: string } {
    if (status === 'CONFIRMED') return { cls: 'confirmed', label: 'Confirmed' };
    if (status === 'PENDING') return { cls: 'pending', label: 'Pending' };
    if (status === 'REFUND_REQUESTED') return { cls: 'pending', label: 'Refund Pending' };
    if (status === 'REFUNDED') return { cls: 'cancelled', label: 'Refunded' };
    if (status === 'REJECTED') return { cls: 'cancelled', label: 'Rejected' };
    if (status === 'CANCELLED') return { cls: 'cancelled', label: 'Cancelled' };
    return { cls: 'pending', label: status };
}

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
            <div style="margin-top:12px;">
                <label style="display:block;text-align:left;font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px;">Reason for refund <span style="font-weight:400;color:var(--muted);">(optional)</span></label>
                <textarea id="refund-remarks" rows="2" placeholder="e.g. Flight cancelled, plans changed…" style="width:100%;border:1px solid var(--line-2);border-radius:4px;padding:8px 10px;font-size:13px;color:var(--ink);resize:none;box-sizing:border-box;outline:none;font-family:var(--sans);"></textarea>
            </div>`;

        let selectedIds: string[] = [];
        let remarks = '';

        if (confirmable.length === 1) {
            const p = confirmable[0];
            const result = await Swal.fire({
                title: 'Request Refund?',
                html: `<div style="text-align:left;padding:0 8px;">
                    <p style="font-size:13px;color:var(--muted);margin-bottom:12px;">Requesting refund for:</p>
                    <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--sand);border-radius:4px;border:1px solid var(--line);">
                        <div>
                            <div style="font-weight:600;color:var(--ink);">${p.first_name} ${p.last_name}</div>
                            <div style="font-size:12px;color:var(--muted);margin-top:2px;">₹${parseFloat(p.charged_price).toLocaleString('en-IN')}</div>
                        </div>
                    </div>
                    ${remarksField}
                </div>`,
                showCancelButton: true,
                confirmButtonColor: '#1f3b30',
                cancelButtonColor: '#b8443a',
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
                <label style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:4px;cursor:pointer;border:1px solid transparent;">
                    <input type="checkbox" class="passenger-checkbox" style="width:16px;height:16px;flex-shrink:0;" value="${p.booking_id}" />
                    <div style="text-align:left;min-width:0;">
                        <div style="font-weight:500;font-size:13px;color:var(--ink);">${p.first_name} ${p.last_name}</div>
                        <div style="font-size:11px;color:var(--muted);margin-top:2px;">₹${parseFloat(p.charged_price).toLocaleString('en-IN')}</div>
                    </div>
                </label>
            `).join('');

            const result = await Swal.fire({
                title: 'Select Passengers for Refund',
                html: `
                    <div style="text-align:left;">
                        <p style="font-size:13px;color:var(--muted);margin-bottom:8px;">Choose the passengers you want to refund:</p>
                        <div style="display:flex;flex-direction:column;gap:2px;max-height:190px;overflow-y:auto;padding-right:4px;margin-bottom:4px;">${passengerItems}</div>
                        ${remarksField}
                    </div>
                `,
                showCancelButton: true,
                confirmButtonColor: '#1f3b30',
                cancelButtonColor: '#b8443a',
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
            <div className="container page-content-sm" style={{ textAlign: 'center' }}>
                <span className="eyebrow">Account</span>
                <h1 style={{ marginTop: 12 }}>My Bookings</h1>
                <p style={{ color: 'var(--muted)', marginTop: 14 }}>Please log in to view your agency's bookings.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="container page-content-sm" style={{ textAlign: 'center' }}>
                <Loader2 className="animate-spin" size={28} color="var(--muted)" style={{ margin: '0 auto' }} />
                <p className="eyebrow" style={{ marginTop: 16 }}>Loading your agency's bookings…</p>
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
        <>
            <div className="page-head">
                <div className="container">
                    <div className="crumbs">Account <span>/</span> My Bookings</div>
                    <h1>My Bookings</h1>
                    <p style={{ color: 'var(--muted)', marginTop: 14, fontSize: 15 }}>Showing bookings made by {user?.email}</p>
                </div>
            </div>

            <div className="container" style={{ paddingTop: 48, paddingBottom: 96 }}>
                <div className="section-head" style={{ marginBottom: 32 }}>
                    <h3 style={{ margin: 0 }}>{groupKeys.length} Booking Group{groupKeys.length !== 1 ? 's' : ''} Found</h3>
                </div>

                {groupKeys.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                        {groupKeys.map((groupKey) => {
                            const passengers = groupedBookings[groupKey];
                            const firstPassenger = passengers[0];

                            // Check if flight has expired (departure time has passed)
                            const isExpired = new Date(firstPassenger.flight_details.departure_time) < new Date();
                            const flightStatus = firstPassenger.flight_status;
                            const groupStatus = statusPill(firstPassenger.status);
                            const logo = getAirlineLogo(firstPassenger.flight_details.airline);

                            const groupTotal = passengers.reduce((acc, p) => acc + parseFloat((parseFloat(p.charged_price) > 0 || p.is_infant) ? p.charged_price : p.flight_details.price), 0);

                            const isDownloadable = firstPassenger.payment_status === 'CONFIRMED' && firstPassenger.flight_status === 'CONFIRMED';
                            const isRefundable = !isExpired && passengers.some(p => p.status === 'CONFIRMED');
                            const onlyRefundRequested = !isExpired && passengers.some(p => p.status === 'REFUND_REQUESTED') && !passengers.some(p => p.status === 'CONFIRMED');
                            const onlyRefunded = passengers.some(p => p.status === 'REFUNDED') && !passengers.some(p => p.status === 'CONFIRMED') && !passengers.some(p => p.status === 'REFUND_REQUESTED');
                            const onlyRejected = passengers.some(p => p.status === 'REJECTED') && !passengers.some(p => p.status === 'CONFIRMED') && !passengers.some(p => p.status === 'REFUND_REQUESTED');

                            return (
                                <div className="panel" key={groupKey} style={isExpired ? { opacity: 0.7 } : undefined}>
                                    <div className="panel-head">
                                        <h4 style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                            {firstPassenger.flight_details.airline}
                                            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>
                                                {passengers.length} passenger{passengers.length !== 1 ? 's' : ''}
                                            </span>
                                        </h4>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            {isExpired && <span className="eyebrow">Expired</span>}
                                            <span className={`status ${groupStatus.cls}`}><span className="d" />{groupStatus.label}</span>
                                        </div>
                                    </div>

                                    <div className="panel-body" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 24 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                                            <div className="flight-card-airline">
                                                <div className="logo">
                                                    {logo ? (
                                                        <img src={logo} alt={firstPassenger.flight_details.airline} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
                                                    ) : (
                                                        firstPassenger.flight_details.airline.slice(0, 2).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="num">Flight {firstPassenger.flight_details.flight_number}</div>
                                                    {flightStatus === 'PENDING' && <div className="mono" style={{ fontSize: 10, color: 'var(--clay)', marginTop: 2 }}>PNR Pending</div>}
                                                </div>
                                            </div>

                                            <div className="flight-route">
                                                <div className="pt">
                                                    <div className="time mono">{new Date(firstPassenger.flight_details.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                                                    <div className="code">{firstPassenger.flight_details.origin}</div>
                                                </div>
                                                <div className="mid">
                                                    <div className="line" />
                                                    <div className="dur">{firstPassenger.flight_details.duration}</div>
                                                    <div className="stops">
                                                        {firstPassenger.flight_details.stops === 0 ? 'Non-stop' : `${firstPassenger.flight_details.stops} stop(s)`}
                                                    </div>
                                                </div>
                                                <div className="pt">
                                                    <div className="time mono">{new Date(firstPassenger.flight_details.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                                                    <div className="code">{firstPassenger.flight_details.destination}</div>
                                                </div>
                                            </div>

                                            <div className="flight-card-price">
                                                <div className="amount">{fmt(groupTotal)}</div>
                                                <div className="per">Group Total</div>
                                            </div>
                                        </div>

                                        <div className="detail-meta" style={{ border: 0, margin: '20px 0 0', padding: 0, flexWrap: 'wrap' }}>
                                            <div className="item">
                                                <div className="lbl">Travel Date</div>
                                                <div className="v mono" style={{ fontSize: 15 }}>
                                                    {new Date(firstPassenger.travel_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </div>
                                            <div className="item">
                                                <div className="lbl">Payment Method</div>
                                                <div className="v" style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {firstPassenger.payment_mode === 'WALLET' ? (
                                                        <><Wallet size={14} color="var(--clay)" />Wallet</>
                                                    ) : firstPassenger.payment_mode === 'RAZORPAY' ? (
                                                        <><CreditCard size={14} color="var(--clay)" />Razorpay</>
                                                    ) : (
                                                        <span style={{ color: 'var(--muted)' }}>{firstPassenger.payment_mode || 'N/A'}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="item">
                                                <div className="lbl">Group Ref</div>
                                                <div className="v mono" style={{ fontSize: 15 }}>{groupKey}</div>
                                            </div>
                                            <div className="item">
                                                <div className="lbl">Booked On</div>
                                                <div className="v mono" style={{ fontSize: 15 }}>{new Date(firstPassenger.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>

                                        {!isExpired && flightStatus === 'PENDING' && (
                                            <p style={{ marginTop: 20, fontSize: 12.5, color: 'var(--muted)' }}>
                                                <strong style={{ color: 'var(--ink)' }}>Booking pending:</strong> your PNR generation may take up to <strong style={{ color: 'var(--ink)' }}>60 minutes</strong>. Please check back shortly.
                                            </p>
                                        )}
                                    </div>

                                    <div style={{ paddingTop: 0, overflowX: 'auto' }}>
                                        <table className="dtable">
                                            <thead>
                                                <tr>
                                                    <th>Passenger</th>
                                                    <th>Contact</th>
                                                    <th>PNR</th>
                                                    <th>Status</th>
                                                    <th style={{ textAlign: 'right' }}>Price</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {passengers.map((passenger) => {
                                                    const age = calculateAge(passenger.date_of_birth);
                                                    const pStatus = statusPill(passenger.status);
                                                    const price = parseFloat((parseFloat(passenger.charged_price) > 0 || passenger.is_infant) ? passenger.charged_price : passenger.flight_details.price);
                                                    return (
                                                        <tr key={passenger.booking_id}>
                                                            <td>
                                                                <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                    {passenger.first_name} {passenger.last_name}
                                                                    {passenger.is_infant && <span className="mono" style={{ fontSize: 9, color: 'var(--clay)' }}>INFANT</span>}
                                                                    {!passenger.is_infant && age !== null && age > 2 && age <= 18 && (
                                                                        <span className="mono" style={{ fontSize: 9, color: 'var(--clay)' }}>CHILD</span>
                                                                    )}
                                                                </div>
                                                                <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                                                                    TXN {passenger.booking_id}
                                                                    {passenger.passport_number && ` · Passport ${passenger.passport_number}`}
                                                                </div>
                                                                {(passenger.user_refund_remarks || passenger.admin_refund_remarks) && (
                                                                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', maxWidth: 240 }}>
                                                                        {passenger.user_refund_remarks && <div>Your note: {passenger.user_refund_remarks}</div>}
                                                                        {passenger.admin_refund_remarks && <div>Admin: {passenger.admin_refund_remarks}</div>}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td style={{ fontSize: 13 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={12} color="var(--muted)" />{passenger.passenger_email}</div>
                                                                {passenger.passenger_phone && (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, color: 'var(--muted)' }}><Phone size={12} color="var(--muted)" />{passenger.passenger_phone}</div>
                                                                )}
                                                                {passenger.date_of_birth && (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, color: 'var(--muted)', fontSize: 12 }}><CalendarIcon size={12} color="var(--muted)" />DOB {new Date(passenger.date_of_birth).toLocaleDateString()}</div>
                                                                )}
                                                            </td>
                                                            <td className="mono">
                                                                {passenger.pnr ? passenger.pnr : (
                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)' }}>
                                                                        Pending
                                                                        <button
                                                                            onClick={handleRefresh}
                                                                            title="Refresh PNR"
                                                                            style={{ background: 'transparent', border: 0, padding: 2, color: 'var(--muted)', display: 'flex' }}
                                                                        >
                                                                            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                                                                        </button>
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td><span className={`status ${pStatus.cls}`}><span className="d" />{pStatus.label}</span></td>
                                                            <td className="mono" style={{ textAlign: 'right' }}>{fmt(price)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <hr style={{marginBottom: 18, borderColor: 'var(--line)' }}/>
                                    
                                    {(isDownloadable || isRefundable) && (
                                        <div className="panel-body" style={{ paddingTop: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {isDownloadable && (
                                                    <>
                                                        <button onClick={() => handleDownloadTicket(passengers, true)} className="btn btn-ghost btn-sm">
                                                            <Download size={13} />Ticket with Price
                                                        </button>
                                                        <button onClick={() => handleDownloadTicket(passengers, false)} className="btn btn-ghost btn-sm">
                                                            <Download size={13} />Ticket (No Price)
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            {isRefundable && (
                                                <button
                                                    onClick={() => handleRequestRefund(groupKey, passengers)}
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ color: '#b8443a', borderColor: 'rgba(184,68,58,0.4)', marginLeft: 'auto' }}
                                                >
                                                    Request Refund
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {onlyRefundRequested && (
                                        <div className="panel-body" style={{ paddingTop: 0 }}>
                                            <span className="mono" style={{ fontSize: 11, color: '#97712a' }}>Refund requested — awaiting review</span>
                                        </div>
                                    )}
                                    {onlyRefunded && (
                                        <div className="panel-body" style={{ paddingTop: 0 }}>
                                            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>Refunded to wallet</span>
                                        </div>
                                    )}
                                    {onlyRejected && (
                                        <div className="panel-body" style={{ paddingTop: 0 }}>
                                            <span className="mono" style={{ fontSize: 11, color: '#b8443a' }}>Booking rejected &amp; fully refunded</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '80px 20px', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', background: 'var(--sand)' }}>
                        <CalendarIcon size={28} color="var(--muted)" style={{ margin: '0 auto' }} />
                        <p className="serif" style={{ fontSize: 20, marginTop: 20 }}>No bookings found.</p>
                        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 8, maxWidth: 320, marginInline: 'auto' }}>
                            You haven&apos;t booked any flights for your clients yet. Get started below.
                        </p>
                        <a href="/search" className="btn btn-primary" style={{ marginTop: 28 }}>
                            Search Flights
                        </a>
                    </div>
                )}
            </div>
        </>
    );
}
