'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    CreateBookingData, createBooking, getWalletBalance, WalletData,
    checkDuplicateBooking, createFlightRazorpayOrder, verifyFlightRazorpayPayment
} from '@/lib/api';
import { Wallet, Info, CreditCard, Check, Plane } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Swal from 'sweetalert2';
import Script from 'next/script';
import DatePicker from 'react-datepicker';
import { BRAND } from '@/config/brand';

const safeDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
};

const calculateAge = (dateString: string): number | null => {
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

interface BookingFormProps {
    flightId: number;
    departureDate: string; // ISO date string from flight
    isInternational: boolean; // Whether the flight is international
    infantPrice?: number; // Price for infants (0-2 yrs). Defaults to 0 (free)
    onSuccess: (bookingId: string) => void;
    onPassengersChange?: (counts: { adults: number; infants: number; infantPrice: number }) => void;
}

export function BookingForm({ flightId, departureDate, isInternational, infantPrice = 0, onSuccess, onPassengersChange }: BookingFormProps) {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paymentMode, setPaymentMode] = useState<'WALLET' | 'RAZORPAY'>('WALLET');
    const [walletData, setWalletData] = useState<WalletData | null>(null);

    // Fetch wallet data for accurate spending power
    useEffect(() => {
        const fetchWallet = async () => {
            if (user) {
                try {
                    const data = await getWalletBalance();
                    setWalletData(data);
                } catch (error) {
                    console.error('Failed to fetch wallet balance:', error);
                }
            }
        };
        fetchWallet();
    }, [user]);

    const [primaryPassengerIndex, setPrimaryPassengerIndex] = useState(0);

    // Format departure date to YYYY-MM-DD for input field
    const formattedDate = new Date(departureDate).toISOString().split('T')[0];

    const [passengers, setPassengers] = useState(() => {
        const count = Number(searchParams.get('passengers')) || 1;
        const p = [];
        for (let i = 0; i < count; i++) {
            p.push({
                first_name: '',
                last_name: '',
                passenger_email: '',
                passenger_phone: '',
                date_of_birth: '',
                passport_number: '',
                passport_issue_date: '',
                passport_expiry_date: '',
                frequent_flyer_number: '',
            });
        }
        return p;
    });

    useEffect(() => {
        if (onPassengersChange) {
            let adults = 0;
            let infants = 0;
            passengers.forEach(p => {
                const age = calculateAge(p.date_of_birth);
                // Child is > 2, Infant is <= 2
                // We charge child/adult same, so adults count = count of people > 2
                if (age !== null && age <= 2) {
                    infants++;
                } else {
                    adults++;
                }
            });
            onPassengersChange({ adults, infants, infantPrice });
        }
    }, [passengers]); // intentional removal of onPassengersChange from deps to avoid infinite loop with parent arrow functions

    useEffect(() => {
        if (user && passengers.length >= 1 && !passengers[0].first_name) {
            // Split username into first and last name if possible
            const nameParts = (user.username || '').split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            const newPassengers = [...passengers];
            newPassengers[0] = {
                ...newPassengers[0],
                first_name: firstName,
                last_name: lastName,
                passenger_email: user.email || '',
                passenger_phone: user.profile?.phone_number || '',
            };
            setPassengers(newPassengers);
        }
    }, [user]);

    // Ensure primary passenger is never an infant
    useEffect(() => {
        const currentPrimary = passengers[primaryPassengerIndex];
        if (currentPrimary) {
            const age = calculateAge(currentPrimary.date_of_birth);
            const isInfant = age !== null && age <= 2;

            if (isInfant) {
                // Find the first non-infant to be the primary passenger
                const firstNonInfantIndex = passengers.findIndex(p => {
                    const a = calculateAge(p.date_of_birth);
                    return a === null || a > 2;
                });

                if (firstNonInfantIndex !== -1 && firstNonInfantIndex !== primaryPassengerIndex) {
                    setPrimaryPassengerIndex(firstNonInfantIndex);
                }
            }
        }
    }, [passengers, primaryPassengerIndex]);

    const handleAddPassenger = () => {
        if (passengers.length >= 9) return;
        setPassengers([...passengers, {
            first_name: '',
            last_name: '',
            passenger_email: '',
            passenger_phone: '',
            date_of_birth: '',
            passport_number: '',
            passport_issue_date: '',
            passport_expiry_date: '',
            frequent_flyer_number: '',
        }]);
    };

    const handleAddInfant = () => {
        if (passengers.length >= 9) return;
        const today = new Date();
        // Set default DOB to today to mark as infant immediately
        const infantDOB = today.toISOString().split('T')[0];
        setPassengers([...passengers, {
            first_name: '',
            last_name: '',
            passenger_email: '',
            passenger_phone: '',
            date_of_birth: infantDOB,
            passport_number: '',
            passport_issue_date: '',
            passport_expiry_date: '',
            frequent_flyer_number: '',
        }]);
    };

    const handleRemovePassenger = (index: number) => {
        if (passengers.length > 1) {
            setPassengers(passengers.filter((_, i) => i !== index));
            if (primaryPassengerIndex === index) {
                setPrimaryPassengerIndex(0);
            } else if (primaryPassengerIndex > index) {
                setPrimaryPassengerIndex(prev => prev - 1);
            }
        }
    };

    const handlePassengerChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newPassengers = [...passengers];
        (newPassengers[index] as any)[name] = value;
        setPassengers(newPassengers);
    };

    const handleDateChange = (index: number, name: string, date: Date | null) => {
        const newPassengers = [...passengers];
        if (date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            (newPassengers[index] as any)[name] = `${year}-${month}-${day}`;
        } else {
            (newPassengers[index] as any)[name] = '';
        }
        setPassengers(newPassengers);
    };

    const validatePhoneNumber = (phoneNumber: string): boolean => {
        if (!phoneNumber) return false; // Phone is required in booking

        // Remove all spaces and special characters except +
        const cleaned = phoneNumber.replace(/[\s\-()]/g, '');

        // Check for valid Indian phone number formats:
        // +919876543210 (with country code)
        // 919876543210 (without + but with country code)
        // 9876543210 (10 digits only)
        const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;

        return phoneRegex.test(cleaned);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let hasAdult = false;
        for (const p of passengers) {
            const age = calculateAge(p.date_of_birth);
            if (age !== null && age >= 18) {
                hasAdult = true;
                break;
            }
        }

        if (!hasAdult) {
            if (passengers.length === 1) {
                await Swal.fire({
                    icon: 'error',
                    title: 'Age Restriction',
                    text: 'The passenger must be 18 years or older to book.',
                    confirmButtonColor: '#1f3b30',
                });
                return;
            } else {
                await Swal.fire({
                    icon: 'error',
                    title: 'Age Restriction',
                    text: 'At least one passenger must be 18 years or older when booking for multiple passengers.',
                    confirmButtonColor: '#1f3b30',
                });
                return;
            }
        }

        // Passport Validity Validation
        for (let i = 0; i < passengers.length; i++) {
            const p = passengers[i];
            if (p.passport_issue_date && p.passport_expiry_date) {
                const issue = new Date(p.passport_issue_date);
                const expiry = new Date(p.passport_expiry_date);
                const age = calculateAge(p.date_of_birth);

                // Calculate difference in partial years
                const diffTime = expiry.getTime() - issue.getTime();
                const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

                const maxValidity = (age !== null && age >= 18) ? 10 : 5;
                console.log(diffYears, maxValidity);
                if (diffYears > maxValidity) {
                    await Swal.fire({
                        icon: 'error',
                        title: 'Invalid Passport Validity',
                        text: `Passenger ${i + 1}: Passport validity cannot exceed ${maxValidity} years for ${maxValidity === 10 ? 'adults' : 'minors'}.`,
                        confirmButtonColor: '#1f3b30',
                    });
                    return;
                }

                if (diffTime < 0) {
                    await Swal.fire({
                        icon: 'error',
                        title: 'Invalid Passport Dates',
                        text: `Passenger ${i + 1}: Passport expiry date cannot be before the issue date.`,
                        confirmButtonColor: '#1f3b30',
                    });
                    return;
                }
            }
        }

        const primaryPassenger = passengers[primaryPassengerIndex] || passengers[0];
        const result = await Swal.fire({
            title: 'Complete Your Booking',
            html: `
                <div style="text-align:left">
                    <p>Are you sure you want to book for <strong>${passengers.length} passenger(s)</strong>?</p>
                    <div style="background:#f4ede0;border:1px solid #d8cdb6;border-radius:8px;padding:16px;margin-top:16px;">
                        <p style="font-size:13px;font-weight:700;color:#1c1916;margin-bottom:8px;">Contact Email Confirmation</p>
                        <p style="font-size:13px;color:#3a3530;line-height:1.5;margin-bottom:12px;">
                            A booking confirmation will be sent to the primary passenger's email address. You can download your E-Ticket anytime from the <strong>"My Bookings"</strong> tab.
                        </p>
                        <div style="background:#faf7f0;border:1px solid #d8cdb6;border-radius:4px;padding:10px 14px;font-weight:700;color:#1f3b30;text-align:center;">
                            ${primaryPassenger.passenger_email}
                        </div>
                    </div>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Book Now',
            cancelButtonText: 'No, Cancel',
            confirmButtonColor: '#1f3b30',
            cancelButtonColor: '#756e63',
        });

        if (!result.isConfirmed) return;

        // KYC Verification Check
        if (user?.profile?.kyc_status !== 'VERIFIED') {
            const statusText = user?.profile?.kyc_status === 'SUBMITTED'
                ? 'Your KYC is currently under review by our admin team.'
                : 'You must complete your KYC verification (Aadhar & PAN) to book flights.';

            await Swal.fire({
                icon: 'warning',
                title: 'KYC Required',
                text: statusText,
                confirmButtonColor: '#1f3b30',
                confirmButtonText: user?.profile?.kyc_status === 'SUBMITTED' ? 'Okay' : 'Complete KYC Now',
            }).then((result) => {
                if (result.isConfirmed && user?.profile?.kyc_status !== 'SUBMITTED') {
                    // Navigate to profile or open KYC modal
                    window.dispatchEvent(new CustomEvent('open-kyc-modal'));
                }
            });
            return;
        }

        // Duplicate Name Validation
        const passengerNames = new Set();
        for (let i = 0; i < passengers.length; i++) {
            const fullName = `${passengers[i].first_name.trim().toLowerCase()} ${passengers[i].last_name.trim().toLowerCase()}`;
            if (passengerNames.has(fullName)) {
                await Swal.fire({
                    icon: 'error',
                    title: 'Duplicate Passenger Name',
                    text: `Each passenger in a booking must have a unique name. Duplicate name found: "${passengers[i].first_name} ${passengers[i].last_name}"`,
                    confirmButtonColor: '#1f3b30',
                });
                return;
            }
            passengerNames.add(fullName);
        }

        // Backend Duplicate Check (Existing Bookings)
        try {
            const bookingData = {
                flight: flightId,
                travel_date: formattedDate,
                passengers: passengers.map(p => ({
                    ...p,
                    passenger_email: p.passenger_email || undefined,
                    passenger_phone: p.passenger_phone || undefined,
                    passport_number: p.passport_number || undefined,
                    passport_issue_date: p.passport_issue_date || undefined,
                    passport_expiry_date: p.passport_expiry_date || undefined,
                    frequent_flyer_number: p.frequent_flyer_number || undefined,
                    date_of_birth: p.date_of_birth || undefined,
                }))
            };

            const duplicateCheck = await checkDuplicateBooking(bookingData);
            if (duplicateCheck.has_duplicates) {
                const duplicateDetails = duplicateCheck.duplicates.map(d =>
                    `<li style="margin-bottom:4px;font-size:13px;"><strong>${d.first_name} ${d.last_name}:</strong> ${d.reason}</li>`
                ).join('');

                const confirmResult = await Swal.fire({
                    icon: 'warning',
                    title: 'Existing Booking Detected',
                    html: `
                        <div style="text-align:left">
                            <p style="font-size:13px;color:#756e63;">Existing bookings were found for the following passenger(s) on this flight:</p>
                            <ul style="text-align:left;background:#f4ede0;border:1px solid #d8cdb6;border-radius:8px;padding:16px 16px 16px 32px;margin-top:12px;">
                                ${duplicateDetails}
                            </ul>
                            <p style="font-size:13px;font-weight:600;margin-top:12px;">Do you want to proceed with another booking anyway?</p>
                        </div>
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'Proceed Anyway',
                    cancelButtonText: 'Cancel',
                    confirmButtonColor: '#c79a4a',
                    cancelButtonColor: '#756e63',
                });
                if (!confirmResult.isConfirmed) return;
            }
        } catch (err) {
            console.error('Duplicate check failed:', err);
        }

        setLoading(true);

        setError(null);

        try {
            const bookingData = {
                flight: flightId,
                travel_date: formattedDate,
                payment_mode: paymentMode,
                passengers: passengers.map(p => {
                    const age = calculateAge(p.date_of_birth);
                    const isInfant = age !== null && age <= 2;

                    return {
                        ...p,
                        passenger_email: isInfant ? (p.passenger_email || undefined) : p.passenger_email,
                        passenger_phone: isInfant ? (p.passenger_phone || undefined) : p.passenger_phone,
                        passport_number: p.passport_number || undefined,
                        passport_issue_date: p.passport_issue_date || undefined,
                        passport_expiry_date: p.passport_expiry_date || undefined,
                        frequent_flyer_number: p.frequent_flyer_number || undefined,
                        date_of_birth: p.date_of_birth || undefined,
                    };
                })
            };

            if (paymentMode === 'RAZORPAY') {
                try {
                    // 1. Create Razorpay Order
                    const orderData = await createFlightRazorpayOrder(bookingData);

                    // 2. Open Razorpay Checkout
                    const options = {
                        key: orderData.key,
                        amount: orderData.amount,
                        currency: orderData.currency,
                        name: BRAND.name,
                        description: `Flight Booking: ${flightId}`,
                        order_id: orderData.order_id,
                        handler: async function (response: any) {
                            try {
                                setLoading(true);
                                // 3. Verify Payment
                                const verifyResponse = await verifyFlightRazorpayPayment({
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature,
                                    ...bookingData
                                });

                                // Trigger automated email (background)
                                fetch('/api/booking/email', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Token ${localStorage.getItem('token')}`
                                    },
                                    body: JSON.stringify({
                                        bookings: bookingData.passengers.map((p, i) => ({
                                            ...p,
                                            booking_group: i === 0 ? verifyResponse.booking_group : undefined
                                        })),
                                        user: user,
                                        email: bookingData.passengers[primaryPassengerIndex]?.passenger_email,
                                        includePrice: true
                                    })
                                }).catch(e => console.error('Automated email dispatch failed:', e));

                                onSuccess(verifyResponse.booking_group);
                            } catch (error: any) {
                                await Swal.fire('Error', 'Payment verification failed', 'error');
                            } finally {
                                setLoading(false);
                            }
                        },
                        prefill: {
                            name: user?.username,
                            email: user?.email,
                            contact: user?.profile?.phone_number
                        },
                        theme: {
                            color: "#1f3b30"
                        },
                        modal: {
                            ondismiss: function () {
                                setLoading(false);
                            }
                        }
                    };

                    const rzp = new (window as any).Razorpay(options);
                    rzp.on('payment.failed', function (response: any) {
                        Swal.fire('Payment Failed', response.error.description, 'error');
                        setLoading(false);
                    });
                    rzp.open();
                } catch (err: any) {
                    setError(err.message || 'Failed to initiate Razorpay payment');
                    setLoading(false);
                }
                return;
            }

            // Wallet Payment Flow
            const response = await createBooking(bookingData);

            // Send automated email
            try {
                // We run this in the background, don't wait for it to finish before showing success UI
                fetch('/api/booking/email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Token ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        bookings: Array.isArray(response) ? response : [response],
                        user: user,
                        email: passengers[primaryPassengerIndex]?.passenger_email,
                        includePrice: true
                    })
                }).catch(e => console.error('Automated email dispatch failed:', e));
            } catch (e) {
                console.error('Failed to trigger automated email:', e);
            }

            // If response is an array (multiple bookings), use the first one's group or ID for success message
            const firstBooking = Array.isArray(response) ? response[0] : response;
            onSuccess(firstBooking.booking_group || firstBooking.booking_id);
        } catch (err: unknown) {
            let errorMessage = 'Something went wrong';
            if (err instanceof Error) {
                errorMessage = err.message;
                try {
                    // Try to parse JSON error from api.ts
                    const errorObj = JSON.parse(errorMessage);
                    if (errorObj.error) {
                        errorMessage = errorObj.error;
                        if (errorObj.available !== undefined && errorObj.required !== undefined) {
                            errorMessage += ` (Available: ₹${errorObj.available}, Required: ₹${errorObj.required})`;
                        }
                    } else if (errorObj.detail) {
                        errorMessage = errorObj.detail;
                    } else {
                        // Fallback for other JSON structures
                        errorMessage = JSON.stringify(errorObj);
                    }
                } catch (e) {
                    // Not JSON, use original message
                }
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Derived (presentational only) progress state for the checkout step indicator below.
    // Reflects the real sections already rendered in this form: passenger details -> payment -> confirm.
    const passengersComplete = passengers.every(p => p.first_name.trim() !== '' && p.last_name.trim() !== '' && p.date_of_birth !== '');
    const checkoutStep = loading ? 2 : (passengersComplete ? 1 : 0);
    const checkoutSteps = ['Passenger Details', 'Payment Method', 'Confirm & Book'];

    return (
        <form onSubmit={handleSubmit}>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />

            <div className="steps">
                {checkoutSteps.map((label, i) => {
                    const isCompleted = i < checkoutStep;
                    const isActive = i === checkoutStep;
                    return (
                        <div key={label} className={`step ${isCompleted ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                            <span className="n">{isCompleted ? <Check size={13} /> : i + 1}</span>
                            <span className="lbl">{label}</span>
                        </div>
                    );
                })}
            </div>

            {error && (
                <div style={{ padding: '12px 16px', background: 'rgba(184,68,58,0.08)', color: '#b8443a', borderRadius: 4, fontSize: 13, marginBottom: 24 }}>
                    {error}
                </div>
            )}

            {passengers.map((passenger, index) => {
                const age = calculateAge(passenger.date_of_birth);
                const isInfant = age !== null && age <= 2;
                const isChild = age !== null && age > 2 && age <= 18;

                return (
                    <div key={index} style={{ paddingBottom: 32, marginBottom: 32, borderBottom: index < passengers.length - 1 || true ? '1px solid var(--line)' : undefined }}>
                        <div className="row between" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                            <h4 className="row" style={{ gap: 10 }}>
                                <span style={{
                                    width: 24, height: 24, borderRadius: '50%', background: 'var(--forest)', color: 'var(--paper)',
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontFamily: 'var(--mono)',
                                }}>
                                    {index + 1}
                                </span>
                                Passenger Information
                                {isChild && <span className="tag">Child</span>}
                                {isInfant && <span className="tag mono">Infant {infantPrice > 0 ? `(₹${infantPrice.toLocaleString('en-IN')})` : '(Free)'}</span>}
                            </h4>
                            <div className="row" style={{ gap: 16 }}>
                                {passengers.length > 1 && !isInfant && (
                                    <label className="row" style={{ gap: 8, cursor: 'pointer', fontSize: 13 }}>
                                        <input
                                            type="radio"
                                            name="primary_passenger"
                                            checked={primaryPassengerIndex === index}
                                            onChange={() => setPrimaryPassengerIndex(index)}
                                        />
                                        <span style={{ color: 'var(--clay)', fontWeight: 500 }}>Primary Passenger</span>
                                    </label>
                                )}
                                {passengers.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemovePassenger(index)}
                                        className="btn-link"
                                        style={{ color: '#b8443a', borderBottomColor: '#b8443a', fontSize: 13 }}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="formgrid">
                            <div className="field-group">
                                <label>First Name</label>
                                <input name="first_name" value={passenger.first_name} onChange={(e) => handlePassengerChange(index, e)} required />
                            </div>
                            <div className="field-group">
                                <label>Last Name</label>
                                <input name="last_name" value={passenger.last_name} onChange={(e) => handlePassengerChange(index, e)} required />
                            </div>

                            <div className="field-group">
                                <label>Date of Birth</label>
                                <DatePicker
                                    selected={safeDate(passenger.date_of_birth)}
                                    onChange={(date: Date | null) => handleDateChange(index, 'date_of_birth', date)}
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="dd/mm/yyyy"
                                    showYearDropdown
                                    dropdownMode="select"
                                    maxDate={new Date()}
                                    required
                                />
                            </div>
                            <div className="field-group">
                                <label>Travel Date</label>
                                <div style={{
                                    padding: '12px 14px', border: '1px solid var(--line-2)', borderRadius: 'var(--radius)',
                                    background: 'var(--sand)', fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--muted)',
                                }}>
                                    {new Date(departureDate).toLocaleDateString('en-GB')}
                                </div>
                            </div>

                            {!isInfant && (
                                <>
                                    <div className="field-group">
                                        <label>{index === primaryPassengerIndex ? 'Email (for booking confirmation)' : 'Email Address'}</label>
                                        <input type="email" name="passenger_email" value={passenger.passenger_email} onChange={(e) => handlePassengerChange(index, e)} required />
                                    </div>
                                    <div className="field-group">
                                        <label>Phone Number</label>
                                        <input type="tel" name="passenger_phone" value={passenger.passenger_phone} onChange={(e) => handlePassengerChange(index, e)} required />
                                    </div>

                                    <div className="field-group">
                                        <label>{isInternational ? 'Passport Number' : 'Passport Number (Optional)'}</label>
                                        <input name="passport_number" value={passenger.passport_number} onChange={(e) => handlePassengerChange(index, e)} required={isInternational} />
                                    </div>
                                    <div className="field-group">
                                        <label>Frequent Flyer Number (Optional)</label>
                                        <input name="frequent_flyer_number" value={passenger.frequent_flyer_number} onChange={(e) => handlePassengerChange(index, e)} placeholder="Enter if you have one" />
                                    </div>

                                    <div className="field-group">
                                        <label>{isInternational ? 'Passport Issue Date' : 'Passport Issue Date (Optional)'}</label>
                                        <DatePicker
                                            selected={safeDate(passenger.passport_issue_date)}
                                            onChange={(date: Date | null) => handleDateChange(index, 'passport_issue_date', date)}
                                            dateFormat="dd/MM/yyyy"
                                            placeholderText="dd/mm/yyyy"
                                            showYearDropdown
                                            dropdownMode="select"
                                            maxDate={new Date()}
                                            required={isInternational}
                                        />
                                    </div>
                                    <div className="field-group">
                                        <label>{isInternational ? 'Passport Expiry Date' : 'Passport Expiry Date (Optional)'}</label>
                                        <DatePicker
                                            selected={safeDate(passenger.passport_expiry_date)}
                                            onChange={(date: Date | null) => handleDateChange(index, 'passport_expiry_date', date)}
                                            dateFormat="dd/MM/yyyy"
                                            placeholderText="dd/mm/yyyy"
                                            showYearDropdown
                                            dropdownMode="select"
                                            minDate={new Date()}
                                            required={isInternational}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            })}

            <div style={{ marginBottom: 32 }}>
                <h4 style={{ marginBottom: 16 }}>Payment Method</h4>
                <div className="payment-tabs" style={{ flexDirection: 'column' }}>
                    <div className={`pay-tab ${paymentMode === 'WALLET' ? 'active' : ''}`} onClick={() => setPaymentMode('WALLET')} style={{ alignItems: 'flex-start', padding: 16 }}>
                        <span className="dot" style={{ marginTop: 4 }} />
                        <Wallet size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                            <div style={{ fontWeight: 600 }}>{BRAND.name} Wallet</div>
                            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, fontWeight: 400 }}>
                                Pay using your wallet balance.
                                {walletData ? (
                                    <div style={{ marginTop: 6 }}>
                                        <span className="mono" style={{ display: 'block', color: 'var(--forest)' }}>
                                            Available: ₹{Number(walletData.wallet_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="mono row" style={{ gap: 4, fontSize: 11, color: 'var(--clay)', marginTop: 2 }}>
                                            <Info size={10} /> Spending Power: ₹{Number(walletData.available_spending_power).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                ) : user?.profile?.wallet_balance !== undefined && (
                                    <span className="mono" style={{ display: 'block', marginTop: 6, color: 'var(--forest)' }}>
                                        Available: ₹{Number(user.profile.wallet_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={`pay-tab ${paymentMode === 'RAZORPAY' ? 'active' : ''}`} onClick={() => setPaymentMode('RAZORPAY')} style={{ alignItems: 'flex-start', padding: 16 }}>
                        <span className="dot" style={{ marginTop: 4 }} />
                        <CreditCard size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                            <div style={{ fontWeight: 600 }}>Instant Booking</div>
                            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, fontWeight: 400 }}>
                                Pay directly using Cards, UPI, NetBanking.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row" style={{ gap: 16, marginBottom: 24 }}>
                <button
                    type="button"
                    onClick={handleAddPassenger}
                    disabled={passengers.length >= 9}
                    className="btn btn-ghost"
                    style={{ flex: 1, borderStyle: 'dashed' }}
                >
                    + Add Passenger
                </button>
                <button
                    type="button"
                    onClick={handleAddInfant}
                    disabled={passengers.length >= 9}
                    className="btn btn-ghost"
                    style={{ flex: 1, borderStyle: 'dashed' }}
                >
                    + Add Infant (0-2 Yrs)
                </button>
            </div>

            {passengers.length >= 9 && (
                <div style={{ padding: 14, background: 'rgba(199,154,74,0.1)', color: '#97712a', borderRadius: 4, fontSize: 13, fontWeight: 600, textAlign: 'center', marginBottom: 24 }}>
                    Maximum limit of 9 travelers per booking has been reached.
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
            >
                {loading ? (
                    <span className="animate-plane-loading" style={{ display: 'inline-flex' }}>
                        <Plane size={18} />
                    </span>
                ) : `Confirm Booking for ${passengers.length} Passenger${passengers.length !== 1 ? 's' : ''}`}
            </button>
        </form>
    );
}
