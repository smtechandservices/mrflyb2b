'use client';

import { useEffect, useState, Fragment } from 'react';
import { getAdminBookings, processRefund, cancelRefundRequest, Booking } from '@/lib/api';
import { RefreshCw, CheckCircle, Search } from 'lucide-react';
import Swal from 'sweetalert2';

export default function RefundPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const fetchRefundRequests = async (tab: 'pending' | 'completed' = activeTab, search: string = debouncedSearch) => {
        setLoading(true);
        try {
            // Fetch based on active tab
            const status = tab === 'pending' ? 'REFUND_REQUESTED' : 'REFUNDED';
            const data = await getAdminBookings(1, search, status);
            setBookings(data.results);
        } catch (error) {
            console.error('Failed to fetch refund requests', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchRefundRequests(activeTab, debouncedSearch);
    }, [activeTab, debouncedSearch]);

    const adminRemarksField = `
        <div style="margin-top:12px; text-align:left;">
            <label style="display:block; font-size:11px; font-weight:500; color:var(--muted); margin-bottom:4px;">Admin Remarks <span style="font-weight:400;">(optional)</span></label>
            <textarea id="admin-remarks" rows="2" placeholder="Internal note visible to agent…"
                style="width:100%; border:1px solid var(--line-2); border-radius:4px; padding:8px 10px; font-size:13px; color:var(--ink); font-family:var(--sans); resize:none; outline:none;"></textarea>
        </div>`;

    const getAdminRemarks = () =>
        (document.getElementById('admin-remarks') as HTMLTextAreaElement)?.value?.trim() || '';

    const handleProcessRefund = async (groupKey: string, groupBookings: Booking[]) => {
        const isGroup = !groupKey.startsWith('IND-');

        let totalMaxRefund = 0;
        groupBookings.forEach(booking => {
            const cp = parseFloat(booking.charged_price);
            const fp = parseFloat(booking.flight_details.price);
            totalMaxRefund += (cp > 0 || booking.is_infant) ? cp : fp;
        });

        const userRemarksHtml = groupBookings.some(b => b.user_refund_remarks)
            ? `<div style="margin-bottom:12px; padding:8px 10px; background:var(--sand); border:1px solid var(--line); border-radius:4px; text-align:left;">
                <p style="font-size:10px; color:var(--clay); font-weight:600; text-transform:uppercase; letter-spacing:0.06em; margin:0 0 4px;">Agent Remarks</p>
                ${groupBookings.filter(b => b.user_refund_remarks).map(b =>
                    `<p style="font-size:12px; color:var(--ink-2); margin:0;"><span style="font-weight:500;">${b.first_name}:</span> ${b.user_refund_remarks}</p>`
                ).join('')}
               </div>`
            : '';

        const result = await Swal.fire({
            title: isGroup ? 'Approve All — Group Refund' : 'Approve Refund',
            html: `
                <div style="text-align:left;">
                    <p style="margin:0 0 8px; font-size:13px; color:var(--muted);">${isGroup ? 'Group ID' : 'Booking ID'}: <strong style="color:var(--ink);">${groupKey}</strong></p>
                    <p style="margin:0 0 12px; font-size:13px; color:var(--muted);">Passengers: <strong style="color:var(--ink);">${groupBookings.length}</strong></p>
                    ${userRemarksHtml}
                    <div style="background:var(--sand); padding:12px; border-radius:4px; border:1px solid var(--line); margin-bottom:12px;">
                        <p style="font-size:10px; color:var(--clay); font-weight:600; text-transform:uppercase; letter-spacing:0.08em; margin:0 0 4px;">Total Group Cost</p>
                        <p style="font-size:20px; font-weight:600; font-family:var(--mono); color:var(--ink); margin:0;">₹${totalMaxRefund.toLocaleString('en-IN')}</p>
                    </div>
                    <p style="font-size:11px; color:var(--muted); margin:0 0 4px;">Refund will be distributed proportionally across all passengers.</p>
                    ${adminRemarksField}
                </div>
            `,
            input: 'number',
            inputLabel: 'Total Refund Amount (₹)',
            inputValue: totalMaxRefund,
            inputAttributes: { min: '0', max: totalMaxRefund.toString(), step: '0.01' },
            showCancelButton: true,
            confirmButtonText: 'Approve Group Refund',
            confirmButtonColor: '#1f3b30',
            cancelButtonColor: '#756e63',
            showLoaderOnConfirm: true,
            preConfirm: async (amount) => {
                if (!amount) { Swal.showValidationMessage('Please enter an amount'); return false; }
                const numAmount = parseFloat(amount);
                if (numAmount < 0 || numAmount > totalMaxRefund) {
                    Swal.showValidationMessage(`Amount must be between 0 and ${totalMaxRefund}`);
                    return false;
                }
                const remarks = getAdminRemarks();
                try {
                    const res = isGroup
                        ? await processRefund(undefined, groupKey, numAmount, remarks)
                        : await processRefund(groupBookings[0].booking_id, undefined, numAmount, remarks);
                    return res;
                } catch (error: any) {
                    Swal.showValidationMessage(`Request failed: ${error.message}`);
                    return false;
                }
            },
            allowOutsideClick: () => !Swal.isLoading()
        });

        if (result.isConfirmed && result.value) {
            Swal.fire({
                title: 'Refund Approved!',
                text: `Successfully refunded ₹${parseFloat(result.value.total_refunded as any).toLocaleString('en-IN')} for ${result.value.processed_count} passenger(s).`,
                icon: 'success'
            });
            fetchRefundRequests();
        }
    };

    const handleCancelRefund = async (groupKey: string, groupBookings: Booking[]) => {
        const isGroup = !groupKey.startsWith('IND-');

        const userRemarksHtml = groupBookings.some(b => b.user_refund_remarks)
            ? `<div style="margin-bottom:12px; padding:8px 10px; background:var(--sand); border:1px solid var(--line); border-radius:4px; text-align:left;">
                <p style="font-size:10px; color:var(--clay); font-weight:600; text-transform:uppercase; letter-spacing:0.06em; margin:0 0 4px;">Agent Remarks</p>
                ${groupBookings.filter(b => b.user_refund_remarks).map(b =>
                    `<p style="font-size:12px; color:var(--ink-2); margin:0;"><span style="font-weight:500;">${b.first_name}:</span> ${b.user_refund_remarks}</p>`
                ).join('')}
               </div>`
            : '';

        const result = await Swal.fire({
            title: isGroup ? 'Deny All — Group Refund?' : 'Deny Refund?',
            html: `
                <div style="text-align:left;">
                    <p style="font-size:13px; color:var(--muted); margin:0 0 12px;">${isGroup
                        ? `Deny refund for all <strong style="color:var(--ink);">${groupBookings.length}</strong> passengers in group <strong style="font-family:var(--mono); color:var(--ink);">${groupKey}</strong>?`
                        : `Deny refund for <strong style="color:var(--ink);">${groupBookings[0].first_name} ${groupBookings[0].last_name}</strong>?`}
                    </p>
                    ${userRemarksHtml}
                    ${adminRemarksField}
                </div>`,
            showCancelButton: true,
            confirmButtonColor: '#b8443a',
            cancelButtonColor: '#756e63',
            confirmButtonText: 'Yes, deny',
            preConfirm: () => getAdminRemarks()
        });

        if (result.isConfirmed) {
            try {
                const remarks = result.value as string;
                if (isGroup) {
                    await cancelRefundRequest(undefined, groupKey, remarks);
                } else {
                    await cancelRefundRequest(groupBookings[0].booking_id, undefined, remarks);
                }
                Swal.fire('Denied!', 'The refund request(s) have been denied.', 'success');
                fetchRefundRequests();
            } catch (error: any) {
                Swal.fire('Error!', error.message || 'Failed to deny refund.', 'error');
            }
        }
    };

    const handleApprovePassenger = async (booking: Booking) => {
        const maxRefund = parseFloat((parseFloat(booking.charged_price) > 0 || booking.is_infant) ? booking.charged_price : booking.flight_details.price);

        const userRemarksHtml = booking.user_refund_remarks
            ? `<div style="margin-bottom:12px; padding:8px 10px; background:var(--sand); border:1px solid var(--line); border-radius:4px; text-align:left;">
                <p style="font-size:10px; color:var(--clay); font-weight:600; text-transform:uppercase; letter-spacing:0.06em; margin:0 0 4px;">Agent's Reason</p>
                <p style="font-size:12px; color:var(--ink-2); margin:0;">${booking.user_refund_remarks}</p>
               </div>`
            : '';

        const result = await Swal.fire({
            title: 'Approve Refund',
            html: `
                <div style="text-align:left;">
                    <div style="padding:12px; background:var(--sand); border-radius:4px; border:1px solid var(--line); margin-bottom:12px;">
                        <div style="font-weight:600; color:var(--ink);">${booking.first_name} ${booking.last_name}</div>
                        <div style="font-size:11px; color:var(--muted); margin-top:2px; font-family:var(--mono);">${booking.booking_id}</div>
                    </div>
                    ${userRemarksHtml}
                    <div style="background:#fbf8f1; padding:12px; border-radius:4px; border:1px solid var(--line); margin-bottom:8px;">
                        <div style="font-size:11px; color:var(--muted); margin-bottom:4px;">Amount Paid</div>
                        <div style="font-size:17px; font-weight:600; color:var(--ink); font-family:var(--mono);">₹${maxRefund.toLocaleString('en-IN')}</div>
                    </div>
                    ${adminRemarksField}
                </div>
            `,
            input: 'number',
            inputLabel: 'Refund Amount (₹)',
            inputValue: maxRefund,
            inputAttributes: { min: '0', max: maxRefund.toString(), step: '0.01' },
            showCancelButton: true,
            confirmButtonText: 'Approve Refund',
            confirmButtonColor: '#1f3b30',
            cancelButtonColor: '#756e63',
            showLoaderOnConfirm: true,
            preConfirm: async (amount) => {
                if (!amount) { Swal.showValidationMessage('Please enter an amount'); return false; }
                const num = parseFloat(amount);
                if (num < 0 || num > maxRefund) {
                    Swal.showValidationMessage(`Amount must be between 0 and ₹${maxRefund.toLocaleString('en-IN')}`);
                    return false;
                }
                const remarks = getAdminRemarks();
                try {
                    return await processRefund(booking.booking_id, undefined, num, remarks);
                } catch (error: any) {
                    Swal.showValidationMessage(`Failed: ${error.message}`);
                    return false;
                }
            },
            allowOutsideClick: () => !Swal.isLoading()
        });

        if (result.isConfirmed && result.value) {
            Swal.fire('Approved!', `Refunded ₹${parseFloat(result.value.total_refunded as any).toLocaleString('en-IN')} to ${booking.first_name} ${booking.last_name}'s wallet.`, 'success');
            fetchRefundRequests();
        }
    };

    const handleDenyPassenger = async (booking: Booking) => {
        const userRemarksHtml = booking.user_refund_remarks
            ? `<div style="margin-bottom:12px; padding:8px 10px; background:var(--sand); border:1px solid var(--line); border-radius:4px; text-align:left;">
                <p style="font-size:10px; color:var(--clay); font-weight:600; text-transform:uppercase; letter-spacing:0.06em; margin:0 0 4px;">Agent's Reason</p>
                <p style="font-size:12px; color:var(--ink-2); margin:0;">${booking.user_refund_remarks}</p>
               </div>`
            : '';

        const result = await Swal.fire({
            title: 'Deny Refund?',
            html: `
                <div style="text-align:left;">
                    <p style="font-size:13px; color:var(--muted); margin:0 0 12px;">Deny refund request for:</p>
                    <div style="padding:12px; background:rgba(184,68,58,0.08); border-radius:4px; border:1px solid rgba(184,68,58,0.25); margin-bottom:12px;">
                        <div style="font-weight:600; color:var(--ink);">${booking.first_name} ${booking.last_name}</div>
                        <div style="font-size:11px; color:var(--muted); margin-top:2px;">${booking.booking_id}</div>
                    </div>
                    ${userRemarksHtml}
                    <p style="font-size:11px; color:var(--muted); margin:0 0 8px;">Booking will revert to <strong style="color:var(--ink);">Confirmed</strong> status.</p>
                    ${adminRemarksField}
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#b8443a',
            cancelButtonColor: '#756e63',
            confirmButtonText: 'Yes, deny refund',
            preConfirm: () => getAdminRemarks()
        });

        if (result.isConfirmed) {
            try {
                const remarks = result.value as string;
                await cancelRefundRequest(booking.booking_id, undefined, remarks);
                Swal.fire('Denied', `Refund request for ${booking.first_name} ${booking.last_name} has been denied.`, 'success');
                fetchRefundRequests();
            } catch (error: any) {
                Swal.fire('Error!', error.message || 'Failed to deny refund.', 'error');
            }
        }
    };

    return (
        <>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, marginBottom: 24 }}>
                <div>
                    <h2>Refund Management</h2>
                    <p className="sub" style={{ margin: '6px 0 0' }}>Manage pending and completed refunds.</p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                    <div className="admin-search" style={{ width: 240 }}>
                        <Search size={14} color="var(--muted)" />
                        <input
                            type="text"
                            placeholder="Search refunds…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', background: 'transparent', font: 'inherit', color: 'inherit', width: '100%' }}
                        />
                    </div>
                    <button
                        onClick={() => fetchRefundRequests(activeTab, debouncedSearch)}
                        className="btn btn-ghost btn-sm"
                        title="Refresh List"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                <button
                    onClick={() => setActiveTab('pending')}
                    className="btn btn-sm btn-ghost"
                    style={activeTab === 'pending' ? { background: 'var(--forest)', color: 'var(--paper)', borderColor: 'var(--forest)' } : undefined}
                >
                    Pending Requests
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className="btn btn-sm btn-ghost"
                    style={activeTab === 'completed' ? { background: 'var(--forest)', color: 'var(--paper)', borderColor: 'var(--forest)' } : undefined}
                >
                    Completed Refunds
                </button>
            </div>

            <div className="panel">
                <div style={{ overflowX: 'auto' }}>
                    <table className="dtable" style={{ whiteSpace: 'nowrap' }}>
                        <thead>
                            <tr>
                                <th>Booking ID</th>
                                <th>Passenger</th>
                                <th>Requested By</th>
                                <th>Flight Details</th>
                                <th style={{ textAlign: 'right' }}>Paid Amount</th>
                                {activeTab === 'completed' && (
                                    <th style={{ textAlign: 'right' }}>Refunded</th>
                                )}
                                <th>Remarks</th>
                                <th colSpan={2} style={{ textAlign: 'right' }}>
                                    {activeTab === 'pending' ? 'Action' : 'Status'}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={activeTab === 'completed' ? 8 : 7} style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>
                                        Loading {activeTab === 'pending' ? 'requests' : 'refunds'}…
                                    </td>
                                </tr>
                            ) : bookings.length === 0 ? (
                                <tr>
                                    <td colSpan={activeTab === 'completed' ? 8 : 7} style={{ textAlign: 'center', padding: 56 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                            <CheckCircle size={28} style={{ color: 'var(--forest)' }} />
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: 17 }}>All caught up!</h4>
                                                <p style={{ color: 'var(--muted)', marginTop: 4 }}>
                                                    {activeTab === 'pending' ? 'No pending refund requests found.' : 'No completed refunds found.'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                (() => {
                                    const groupedBookingsMap = bookings.reduce((acc: { [key: string]: Booking[] }, booking) => {
                                        const key = booking.booking_group || booking.booking_id;
                                        if (!acc[key]) acc[key] = [];
                                        acc[key].push(booking);
                                        return acc;
                                    }, {});

                                    const orderedGroupKeys = Array.from(new Set(bookings.map(b => b.booking_group || b.booking_id)));

                                    return orderedGroupKeys.map((groupKey, groupIdx) => {
                                        const groupBookings = groupedBookingsMap[groupKey];
                                        const groupBg = groupIdx % 2 === 0 ? undefined : '#fbf8f1';

                                        return (
                                            <Fragment key={groupKey}>
                                                {groupBookings.map((booking, idx) => {
                                                    const isLastInGroup = idx === groupBookings.length - 1;
                                                    return (
                                                        <tr
                                                            key={booking.booking_id}
                                                            style={{
                                                                background: groupBg,
                                                                borderBottom: isLastInGroup && groupIdx !== orderedGroupKeys.length - 1 ? '2px solid var(--line-2)' : undefined,
                                                            }}
                                                        >
                                                            <td style={{ borderLeft: '3px solid var(--line-2)' }}>
                                                                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{booking.booking_id}</div>
                                                                {booking.booking_group && (
                                                                    <span className="tag" style={{ padding: '2px 8px', fontSize: 10, marginTop: 6 }}>
                                                                        Grp: {booking.booking_group}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{booking.first_name} {booking.last_name}</div>
                                                                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{booking.passenger_email}</div>
                                                            </td>
                                                            <td>
                                                                {booking.booked_by ? (
                                                                    <>
                                                                        <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{booking.booked_by.username}</div>
                                                                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{booking.booked_by.email}</div>
                                                                    </>
                                                                ) : (
                                                                    <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>System/Guest</span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <div style={{ color: 'var(--ink)' }}>{booking.flight_details.airline}</div>
                                                                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                                                                    {booking.flight_details.origin} → {booking.flight_details.destination}
                                                                </div>
                                                                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                                                                    {booking.flight_details.flight_number}
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 500, color: 'var(--ink)' }}>
                                                                ₹{(() => {
                                                                    const cp = parseFloat(booking.charged_price);
                                                                    const fp = parseFloat(booking.flight_details.price);
                                                                    return ((cp > 0 || booking.is_infant) ? cp : fp).toLocaleString('en-IN');
                                                                })()}
                                                            </td>
                                                            {activeTab === 'completed' && (
                                                                <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 500, color: '#b8443a' }}>
                                                                    −₹{parseFloat(booking.refunded_amount || '0').toLocaleString('en-IN')}
                                                                </td>
                                                            )}
                                                            <td style={{ maxWidth: 180 }}>
                                                                {booking.user_refund_remarks && (
                                                                    <div style={{ marginBottom: 4 }}>
                                                                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--clay)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>User</div>
                                                                        <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.4 }}>{booking.user_refund_remarks}</div>
                                                                    </div>
                                                                )}
                                                                {booking.admin_refund_remarks && (
                                                                    <div>
                                                                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--forest)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Admin</div>
                                                                        <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.4 }}>{booking.admin_refund_remarks}</div>
                                                                    </div>
                                                                )}
                                                                {!booking.user_refund_remarks && !booking.admin_refund_remarks && (
                                                                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
                                                                )}
                                                            </td>
                                                            <td colSpan={2} style={{ textAlign: 'right' }}>
                                                                {activeTab === 'completed' ? (
                                                                    <span className="status confirmed"><span className="d"></span>Refunded</span>
                                                                ) : (
                                                                    <div style={{ display: 'inline-flex', gap: 8 }}>
                                                                        <button
                                                                            onClick={() => handleDenyPassenger(booking)}
                                                                            className="btn btn-ghost btn-sm"
                                                                            style={{ color: '#b8443a' }}
                                                                        >
                                                                            Deny
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleApprovePassenger(booking)}
                                                                            className="btn btn-primary btn-sm"
                                                                        >
                                                                            Approve
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {/* Group Summary Row */}
                                                <tr style={{ background: groupBg, borderBottom: '2px solid var(--line-2)' }}>
                                                    <td colSpan={4} style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                                                        Group Total Summary
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 500, color: 'var(--ink)' }}>
                                                        ₹{(() => {
                                                            let total = 0;
                                                            groupBookings.forEach(b => {
                                                                const cp = parseFloat(b.charged_price);
                                                                const fp = parseFloat(b.flight_details.price);
                                                                total += (cp > 0 || b.is_infant) ? cp : fp;
                                                            });
                                                            return total.toLocaleString('en-IN');
                                                        })()}
                                                    </td>
                                                    {activeTab === 'completed' && (
                                                        <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 500, color: '#b8443a' }}>
                                                            −₹{(() => {
                                                                let total = 0;
                                                                groupBookings.forEach(b => {
                                                                    total += parseFloat(b.refunded_amount || '0');
                                                                });
                                                                return total.toLocaleString('en-IN');
                                                            })()}
                                                        </td>
                                                    )}
                                                    <td colSpan={2} style={{ textAlign: 'right' }}>
                                                        {activeTab === 'pending' ? (
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                                                <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>Bulk:</span>
                                                                <button
                                                                    onClick={() => handleCancelRefund(groupKey, groupBookings)}
                                                                    className="btn btn-ghost btn-sm"
                                                                    style={{ color: '#b8443a' }}
                                                                >
                                                                    Deny All
                                                                </button>
                                                                <button
                                                                    onClick={() => handleProcessRefund(groupKey, groupBookings)}
                                                                    className="btn btn-primary btn-sm"
                                                                >
                                                                    Approve All
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="status confirmed"><span className="d"></span>Group Fully Processed</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            </Fragment>
                                        );
                                    });
                                })()
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
