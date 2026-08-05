'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import { createFlight, Flight } from '@/lib/api';
import { getAirlineLogo, PREDEFINED_AIRLINES } from '@/lib/airlines';
import { formatDateToDDMMYYYY, parseDDMMYYYYToYYYYMMDD, parseDDMMYYYYToDate, parseHHMMToDate, getISOPart, lockedFieldStyle } from '@/lib/flightDateUtils';
import { ArrowLeft, ArrowRight, Check, Plane, Route } from 'lucide-react';
import Swal from 'sweetalert2';

type FlightType = 'nonstop' | 'stops' | null;

interface LegInput {
    flight_number: string;
    airline: string;
    origin: string;
    destination: string;
    departure_time: string;
    arrival_time: string;
    departure_terminal: string;
    arrival_terminal: string;
    date_departure: string;
    time_departure: string;
    date_arrival: string;
    time_arrival: string;
}

const STEP_LABELS_NONSTOP = ['Flight Type', 'Route & Schedule', 'Pricing & Seats', 'Extras & PNR', 'Review & Confirm'];
const STEP_LABELS_STOPS = ['Flight Type', 'Route & Schedule', 'Pricing & Seats', 'Extras & PNR', 'Itinerary', 'Review & Confirm'];

export default function AddFlightPage() {
    const router = useRouter();

    const [stepIndex, setStepIndex] = useState(0);
    const [flightType, setFlightType] = useState<FlightType>(null);
    const [numStops, setNumStops] = useState(1);
    const [isAirlineDropdownOpen, setIsAirlineDropdownOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState<Partial<Flight>>({
        airline: '',
        flight_number: '',
        origin: '',
        destination: '',
        price: '',
        infant_price: '0',
        total_seats: 150,
        available_seats: 150,
        is_hidden: false,
        pnr: '',
        baggage_allowance: '',
        layover_duration: '',
        departure_terminal: '',
        arrival_terminal: '',
    });
    const [dateStrings, setDateStrings] = useState({ departure: '', arrival: '' });
    const [timeStrings, setTimeStrings] = useState({ departure: '', arrival: '' });
    const [legInputs, setLegInputs] = useState<LegInput[]>([]);

    const stepLabels = flightType === 'stops' ? STEP_LABELS_STOPS : STEP_LABELS_NONSTOP;
    const currentLabel = stepLabels[stepIndex];

    const handleTotalSeatsChange = (val: number) => {
        const total = Math.max(0, val);
        setFormData(prev => ({ ...prev, total_seats: total, available_seats: total }));
    };

    const handleAvailableSeatsChange = (val: number) => {
        const available = Math.max(0, val);
        setFormData(prev => ({ ...prev, available_seats: available, total_seats: available }));
    };

    const handleDateSelect = (field: 'departure' | 'arrival', date: Date | null) => {
        if (!date) return;
        const val = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        setDateStrings(prev => ({ ...prev, [field]: val }));
        const parsed = parseDDMMYYYYToYYYYMMDD(val);
        if (parsed) {
            const timeKey = field === 'departure' ? 'departure_time' : 'arrival_time';
            const time = getISOPart(formData[timeKey], 'time');
            setFormData(prev => ({ ...prev, [timeKey]: `${parsed}T${time}:00.000Z` }));
        }
    };

    const handleTimeSelect = (field: 'departure' | 'arrival', date: Date | null) => {
        if (!date) return;
        const val = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        setTimeStrings(prev => ({ ...prev, [field]: val }));
        const dateKey = field === 'departure' ? 'departure_time' : 'arrival_time';
        const manualDate = parseDDMMYYYYToYYYYMMDD(dateStrings[field]);
        const isoDate = manualDate || getISOPart(formData[dateKey], 'date');
        setFormData(prev => ({ ...prev, [dateKey]: `${isoDate}T${val}:00.000Z` }));
    };

    const goBack = () => {
        if (stepIndex === 0) {
            router.push('/flights');
        } else {
            setStepIndex(i => i - 1);
        }
    };

    const submitFlightType = (e: React.FormEvent) => {
        e.preventDefault();
        if (!flightType) return;
        if (flightType === 'stops') setNumStops(n => Math.max(1, Math.min(6, n || 1)));
        setStepIndex(i => i + 1);
    };

    const submitRouteSchedule = (e: React.FormEvent) => {
        e.preventDefault();

        if (new Date(formData.arrival_time || '').getTime() <= new Date(formData.departure_time || '').getTime()) {
            Swal.fire({ icon: 'error', title: 'Invalid Times', text: 'Arrival time must be strictly after departure time.' });
            return;
        }

        setStepIndex(i => i + 1);
    };

    const submitPricingSeats = (e: React.FormEvent) => {
        e.preventDefault();
        setStepIndex(i => i + 1);
    };

    const submitExtras = (e: React.FormEvent) => {
        e.preventDefault();

        if (flightType === 'stops') {
            const numLegs = numStops + 1;
            const initialLegs: LegInput[] = Array.from({ length: numLegs }).map((_, i) => {
                const isFirst = i === 0;
                const isLast = i === numLegs - 1;
                return {
                    flight_number: isFirst ? (formData.flight_number || '') : '',
                    airline: formData.airline || '',
                    origin: isFirst ? (formData.origin || '') : '',
                    destination: isLast ? (formData.destination || '') : '',
                    departure_time: isFirst ? (formData.departure_time || '') : '',
                    arrival_time: isLast ? (formData.arrival_time || '') : '',
                    departure_terminal: isFirst ? (formData.departure_terminal || '') : '',
                    arrival_terminal: isLast ? (formData.arrival_terminal || '') : '',
                    date_departure: isFirst ? formatDateToDDMMYYYY(formData.departure_time) : '',
                    time_departure: isFirst ? getISOPart(formData.departure_time, 'time') : '',
                    date_arrival: isLast ? formatDateToDDMMYYYY(formData.arrival_time) : '',
                    time_arrival: isLast ? getISOPart(formData.arrival_time, 'time') : '',
                };
            });
            setLegInputs(initialLegs);
        }
        setStepIndex(i => i + 1);
    };

    const updateLegInput = (idx: number, field: keyof LegInput, value: string) => {
        setLegInputs(prev => {
            const newLegs = prev.map(leg => ({ ...leg }));
            newLegs[idx][field] = value;
            if (newLegs[idx + 1]) {
                if (field === 'destination') newLegs[idx + 1].origin = value;
                if (field === 'arrival_terminal') newLegs[idx + 1].departure_terminal = value;
                if (field === 'date_arrival') newLegs[idx + 1].date_departure = value;
                if (field === 'time_arrival') newLegs[idx + 1].time_departure = value;
            }
            return newLegs;
        });
    };

    const submitItinerary = (e: React.FormEvent) => {
        e.preventDefault();

        const incomplete = legInputs.some(leg =>
            !leg.flight_number?.trim() ||
            !leg.origin?.trim() ||
            !leg.destination?.trim() ||
            !leg.date_departure?.trim() ||
            !leg.time_departure?.trim() ||
            !leg.date_arrival?.trim() ||
            !leg.time_arrival?.trim()
        );

        if (incomplete) {
            Swal.fire({ icon: 'error', title: 'Incomplete Details', text: 'Please fill all flight numbers, airports, dates, and times for every leg.' });
            return;
        }

        setStepIndex(i => i + 1);
    };

    const buildFinishedLegs = () => legInputs.map(leg => {
        const depDate = parseDDMMYYYYToYYYYMMDD(leg.date_departure);
        const arrDate = parseDDMMYYYYToYYYYMMDD(leg.date_arrival);
        const departure_time = (depDate && leg.time_departure) ? `${depDate}T${leg.time_departure}:00.000Z` : leg.departure_time;
        const arrival_time = (arrDate && leg.time_arrival) ? `${arrDate}T${leg.time_arrival}:00.000Z` : leg.arrival_time;
        return { ...leg, departure_time, arrival_time };
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = await Swal.fire({
            title: 'Create this flight?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, create',
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#64748b',
        });
        if (!result.isConfirmed) return;

        setSubmitting(true);
        try {
            const dataToSave: Partial<Flight> = { ...formData, stops: flightType === 'stops' ? numStops : 0 };

            if (flightType === 'stops') {
                const finishedLegs = buildFinishedLegs();
                dataToSave.stop_details = finishedLegs.slice(0, -1).map(leg => leg.destination).join(', ');
                dataToSave.stop_info = JSON.stringify(finishedLegs);
            } else {
                dataToSave.stop_details = '';
            }

            await createFlight(dataToSave);

            await Swal.fire({
                icon: 'success',
                title: `Flight Created (${dataToSave.is_hidden ? 'Hidden' : 'Visible'})`,
                text: dataToSave.is_hidden ? 'Flight is manually set to hidden.' : 'Flight is now visible for bookings.',
                timer: 2500,
                showConfirmButton: true,
            });
            router.push('/flights');
        } catch (error: any) {
            Swal.fire({ icon: 'error', title: 'Save Failed', text: error.message || 'Failed to create flight.' });
        } finally {
            setSubmitting(false);
        }
    };

    const filteredAirlineOptions = PREDEFINED_AIRLINES.filter(a => a.toLowerCase().includes((formData.airline || '').toLowerCase()));

    return (
        <>
            <div style={{ marginBottom: 24 }}>
                <h2>Add New Flight</h2>
                <p className="sub" style={{ margin: '6px 0 0' }}>Set up route, pricing, seats and itinerary in a few steps.</p>
            </div>

            <div className="wizard-steps">
                {stepLabels.map((label, i) => (
                    <div key={label} className="wizard-step-wrap">
                        <div className={`wizard-step ${i === stepIndex ? 'active' : i < stepIndex ? 'done' : ''}`}>
                            <span className="wizard-step-dot">{i < stepIndex ? <Check size={12} /> : i + 1}</span>
                            <span className="wizard-step-label">{label}</span>
                        </div>
                        {i < stepLabels.length - 1 && <div className={`wizard-connector ${i < stepIndex ? 'done' : ''}`} />}
                    </div>
                ))}
            </div>

            <div className="panel" style={{ padding: '28px 32px' }}>
                {currentLabel === 'Flight Type' && (
                    <form onSubmit={submitFlightType}>
                        <h3 style={{ marginTop: 0 }}>How does this flight travel?</h3>
                        <p className="modal-sub">Choose whether this is a direct flight or one with layovers before entering details.</p>

                        <div className="flight-type-grid">
                            <button
                                type="button"
                                className={`flight-type-card ${flightType === 'nonstop' ? 'selected' : ''}`}
                                onClick={() => setFlightType('nonstop')}
                            >
                                <Plane size={22} />
                                <div>
                                    <div className="flight-type-title">Non-stop Flight</div>
                                    <div className="flight-type-desc">Direct flight, no layovers.</div>
                                </div>
                            </button>
                            <button
                                type="button"
                                className={`flight-type-card ${flightType === 'stops' ? 'selected' : ''}`}
                                onClick={() => setFlightType('stops')}
                            >
                                <Route size={22} />
                                <div>
                                    <div className="flight-type-title">With Stop(s)</div>
                                    <div className="flight-type-desc">One or more layovers en route.</div>
                                </div>
                            </button>
                        </div>

                        {flightType === 'stops' && (
                            <div className="field-group" style={{ maxWidth: 220, marginTop: 20 }}>
                                <label>Number of Stops</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={6}
                                    required
                                    value={numStops || ''}
                                    onChange={e => {
                                        const raw = e.target.value;
                                        setNumStops(raw === '' ? 0 : Math.max(0, Math.min(6, parseInt(raw) || 0)));
                                    }}
                                    onBlur={() => setNumStops(n => Math.max(1, Math.min(6, n || 1)))}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
                            <button type="button" onClick={goBack} className="btn btn-ghost">
                                <ArrowLeft size={14} /> Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={!flightType}>
                                Continue <ArrowRight size={14} />
                            </button>
                        </div>
                    </form>
                )}

                {currentLabel === 'Route & Schedule' && (
                    <form onSubmit={submitRouteSchedule}>
                        <h3 style={{ marginTop: 0 }}>Route & Schedule</h3>
                        <p className="modal-sub">Airline, route and timings for this flight.</p>

                        <div className="formgrid">
                            <div className="field-group" style={{ position: 'relative' }}>
                                <label>Airline</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Type or select airline…"
                                    value={formData.airline || ''}
                                    onChange={e => {
                                        setFormData({ ...formData, airline: e.target.value.toUpperCase() });
                                        setIsAirlineDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsAirlineDropdownOpen(true)}
                                    onBlur={() => setTimeout(() => setIsAirlineDropdownOpen(false), 200)}
                                    autoComplete="off"
                                />
                                {isAirlineDropdownOpen && (
                                    <div className="sb-drop" style={{ top: 'calc(100% + 4px)', left: 0, width: '100%', maxHeight: 220, overflowY: 'auto' }}>
                                        {filteredAirlineOptions.length > 0 ? (
                                            filteredAirlineOptions.map((airline) => (
                                                <div
                                                    key={airline}
                                                    className="sb-opt"
                                                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setFormData({ ...formData, airline });
                                                        setIsAirlineDropdownOpen(false);
                                                    }}
                                                >
                                                    {getAirlineLogo(airline) ? (
                                                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                                            <img src={getAirlineLogo(airline)!} alt={airline} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                        </div>
                                                    ) : (
                                                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--sand)', color: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 10, flexShrink: 0 }}>
                                                            {airline[0]}
                                                        </div>
                                                    )}
                                                    <span>{airline}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ padding: '12px 10px', fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center' }}>
                                                Will be created as a custom airline
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="field-group">
                                <label>Flight Number</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="AI101"
                                    value={formData.flight_number || ''}
                                    onChange={e => setFormData({ ...formData, flight_number: e.target.value })}
                                />
                            </div>

                            <div className="field-group">
                                <label>Origin</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="DEL"
                                    value={formData.origin || ''}
                                    onChange={e => setFormData({ ...formData, origin: e.target.value })}
                                />
                            </div>
                            <div className="field-group">
                                <label>Destination</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="BOM"
                                    value={formData.destination || ''}
                                    onChange={e => setFormData({ ...formData, destination: e.target.value })}
                                />
                            </div>

                            <div className="field-group">
                                <label>Departure Date</label>
                                <DatePicker
                                    selected={parseDDMMYYYYToDate(dateStrings.departure)}
                                    onChange={(date: Date | null) => handleDateSelect('departure', date)}
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="dd/mm/yyyy"
                                    showYearDropdown
                                    dropdownMode="select"
                                    required
                                />
                            </div>
                            <div className="field-group">
                                <label>Departure Time (24h)</label>
                                <DatePicker
                                    selected={parseHHMMToDate(timeStrings.departure)}
                                    onChange={(date: Date | null) => handleTimeSelect('departure', date)}
                                    showTimeSelect
                                    showTimeSelectOnly
                                    timeIntervals={5}
                                    timeCaption="Time"
                                    dateFormat="HH:mm"
                                    placeholderText="HH:mm"
                                    required
                                />
                            </div>
                            <div className="field-group">
                                <label>Arrival Date</label>
                                <DatePicker
                                    selected={parseDDMMYYYYToDate(dateStrings.arrival)}
                                    onChange={(date: Date | null) => handleDateSelect('arrival', date)}
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="dd/mm/yyyy"
                                    showYearDropdown
                                    dropdownMode="select"
                                    required
                                />
                            </div>
                            <div className="field-group">
                                <label>Arrival Time (24h)</label>
                                <DatePicker
                                    selected={parseHHMMToDate(timeStrings.arrival)}
                                    onChange={(date: Date | null) => handleTimeSelect('arrival', date)}
                                    showTimeSelect
                                    showTimeSelectOnly
                                    timeIntervals={5}
                                    timeCaption="Time"
                                    dateFormat="HH:mm"
                                    placeholderText="HH:mm"
                                    required
                                />
                            </div>

                            <div className="field-group">
                                <label>Departure Terminal</label>
                                <input
                                    type="text"
                                    placeholder="T3"
                                    value={formData.departure_terminal || ''}
                                    onChange={e => setFormData({ ...formData, departure_terminal: e.target.value })}
                                />
                            </div>
                            <div className="field-group">
                                <label>Arrival Terminal</label>
                                <input
                                    type="text"
                                    placeholder="T1"
                                    value={formData.arrival_terminal || ''}
                                    onChange={e => setFormData({ ...formData, arrival_terminal: e.target.value })}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
                            <button type="button" onClick={goBack} className="btn btn-ghost">
                                <ArrowLeft size={14} /> Back
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Continue <ArrowRight size={14} />
                            </button>
                        </div>
                    </form>
                )}

                {currentLabel === 'Pricing & Seats' && (
                    <form onSubmit={submitPricingSeats}>
                        <h3 style={{ marginTop: 0 }}>Pricing & Seats</h3>
                        <p className="modal-sub">Fares and inventory for this flight.</p>

                        <div className="formgrid">
                            <div className="field-group">
                                <label>Price (Adult)</label>
                                <input
                                    type="number"
                                    required
                                    placeholder="12345"
                                    value={formData.price || ''}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                />
                            </div>
                            <div className="field-group">
                                <label>Infant Price (0–2 Yrs)</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="0 for free"
                                    value={formData.infant_price ?? ''}
                                    onChange={e => setFormData({ ...formData, infant_price: e.target.value })}
                                />
                                <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>Leave 0 for free infant seats</p>
                            </div>

                            <div className="field-group">
                                <label>Total Seats</label>
                                <input
                                    type="number"
                                    required
                                    min={0}
                                    value={formData.total_seats || ''}
                                    onChange={e => handleTotalSeatsChange(parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div className="field-group">
                                <label>Available Seats</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    style={{ fontFamily: 'var(--mono)', fontWeight: 500, color: 'var(--forest)' }}
                                    value={formData.available_seats !== undefined ? formData.available_seats : ''}
                                    onChange={e => handleAvailableSeatsChange(parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
                            <button type="button" onClick={goBack} className="btn btn-ghost">
                                <ArrowLeft size={14} /> Back
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Continue <ArrowRight size={14} />
                            </button>
                        </div>
                    </form>
                )}

                {currentLabel === 'Extras & PNR' && (
                    <form onSubmit={submitExtras}>
                        <h3 style={{ marginTop: 0 }}>Extras & PNR</h3>
                        <p className="modal-sub">Baggage, layover and booking reference details.</p>

                        <div className="formgrid">
                            <div className="field-group">
                                <label>Baggage Allowance</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 15kg / 7kg"
                                    value={formData.baggage_allowance || ''}
                                    onChange={e => setFormData({ ...formData, baggage_allowance: e.target.value })}
                                />
                            </div>
                            <div className="field-group">
                                <label>Layover Duration</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 2h 30m"
                                    value={formData.layover_duration || ''}
                                    onChange={e => setFormData({ ...formData, layover_duration: e.target.value })}
                                />
                            </div>

                            <div className="field-group full">
                                <label>Flight PNR</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. INDBOM001"
                                    style={{ fontFamily: 'var(--mono)', textTransform: 'uppercase' }}
                                    value={formData.pnr || ''}
                                    onChange={e => setFormData({ ...formData, pnr: e.target.value.toUpperCase() })}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
                            <button type="button" onClick={goBack} className="btn btn-ghost">
                                <ArrowLeft size={14} /> Back
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Continue <ArrowRight size={14} />
                            </button>
                        </div>
                    </form>
                )}

                {currentLabel === 'Itinerary' && (
                    <form onSubmit={submitItinerary}>
                        <h3 style={{ marginTop: 0 }}>Configure Detailed Itinerary</h3>
                        <p className="modal-sub">Define details for each leg of the journey.</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                            {legInputs.map((leg, idx) => {
                                const isFirst = idx === 0;
                                const isLast = idx === legInputs.length - 1;
                                return (
                                    <div key={idx} style={{ background: 'var(--sand)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '22px 20px 20px', position: 'relative' }}>
                                        <span
                                            className="eyebrow"
                                            style={{ position: 'absolute', top: -9, left: 20, background: 'var(--paper)', padding: '0 8px', color: 'var(--clay)' }}
                                        >
                                            Leg {idx + 1}
                                        </span>

                                        <div className="formgrid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
                                            <div className="field-group">
                                                <label>Airline</label>
                                                <input
                                                    type="text"
                                                    list={`airline-options-${idx}`}
                                                    placeholder="e.g. Air India"
                                                    value={leg.airline}
                                                    onChange={e => updateLegInput(idx, 'airline', e.target.value)}
                                                />
                                                <datalist id={`airline-options-${idx}`}>
                                                    {PREDEFINED_AIRLINES.map(a => <option key={a} value={a} />)}
                                                </datalist>
                                            </div>
                                            <div className="field-group">
                                                <label>Flight Number</label>
                                                <input
                                                    type="text"
                                                    required
                                                    readOnly={isFirst}
                                                    style={isFirst ? { ...lockedFieldStyle, fontWeight: 500, textTransform: 'uppercase' } : { fontWeight: 500, textTransform: 'uppercase' }}
                                                    placeholder="e.g. 6E 123"
                                                    value={leg.flight_number}
                                                    onChange={e => updateLegInput(idx, 'flight_number', e.target.value.toUpperCase())}
                                                />
                                            </div>
                                            <div className="field-group">
                                                <label>Origin</label>
                                                <input
                                                    type="text"
                                                    required
                                                    readOnly={isFirst}
                                                    style={isFirst ? { ...lockedFieldStyle, fontWeight: 500, textTransform: 'uppercase' } : { fontWeight: 500, textTransform: 'uppercase' }}
                                                    placeholder="Airport Code"
                                                    value={leg.origin}
                                                    onChange={e => updateLegInput(idx, 'origin', e.target.value.toUpperCase())}
                                                />
                                            </div>
                                            <div className="field-group">
                                                <label>Destination</label>
                                                <input
                                                    type="text"
                                                    required
                                                    readOnly={isLast}
                                                    style={isLast ? { ...lockedFieldStyle, fontWeight: 500, textTransform: 'uppercase' } : { fontWeight: 500, textTransform: 'uppercase' }}
                                                    placeholder="Airport Code"
                                                    value={leg.destination}
                                                    onChange={e => updateLegInput(idx, 'destination', e.target.value.toUpperCase())}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <div className="field-group" style={{ flex: 1 }}>
                                                    <label>Dep. Tml</label>
                                                    <input
                                                        type="text"
                                                        readOnly={isFirst}
                                                        style={isFirst ? lockedFieldStyle : undefined}
                                                        placeholder="T3"
                                                        value={leg.departure_terminal}
                                                        onChange={e => updateLegInput(idx, 'departure_terminal', e.target.value)}
                                                    />
                                                </div>
                                                <div className="field-group" style={{ flex: 1 }}>
                                                    <label>Arr. Tml</label>
                                                    <input
                                                        type="text"
                                                        readOnly={isLast}
                                                        style={isLast ? lockedFieldStyle : undefined}
                                                        placeholder="T1"
                                                        value={leg.arrival_terminal}
                                                        onChange={e => updateLegInput(idx, 'arrival_terminal', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="formgrid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 14 }}>
                                            <div className="field-group">
                                                <label>Dep. Date</label>
                                                <input
                                                    type="text"
                                                    required
                                                    readOnly={isFirst}
                                                    style={isFirst ? lockedFieldStyle : undefined}
                                                    placeholder="DD/MM/YYYY"
                                                    value={leg.date_departure}
                                                    onChange={e => updateLegInput(idx, 'date_departure', e.target.value)}
                                                />
                                            </div>
                                            <div className="field-group">
                                                <label>Dep. Time</label>
                                                <input
                                                    type="text"
                                                    required
                                                    readOnly={isFirst}
                                                    style={isFirst ? lockedFieldStyle : undefined}
                                                    placeholder="HH:mm"
                                                    value={leg.time_departure}
                                                    onChange={e => updateLegInput(idx, 'time_departure', e.target.value)}
                                                />
                                            </div>
                                            <div className="field-group">
                                                <label>Arr. Date</label>
                                                <input
                                                    type="text"
                                                    required
                                                    readOnly={isLast}
                                                    style={isLast ? lockedFieldStyle : undefined}
                                                    placeholder="DD/MM/YYYY"
                                                    value={leg.date_arrival}
                                                    onChange={e => updateLegInput(idx, 'date_arrival', e.target.value)}
                                                />
                                            </div>
                                            <div className="field-group">
                                                <label>Arr. Time</label>
                                                <input
                                                    type="text"
                                                    required
                                                    readOnly={isLast}
                                                    style={isLast ? lockedFieldStyle : undefined}
                                                    placeholder="HH:mm"
                                                    value={leg.time_arrival}
                                                    onChange={e => updateLegInput(idx, 'time_arrival', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
                            <button type="button" onClick={goBack} className="btn btn-ghost">
                                <ArrowLeft size={14} /> Back
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Continue <ArrowRight size={14} />
                            </button>
                        </div>
                    </form>
                )}

                {currentLabel === 'Review & Confirm' && (
                    <form onSubmit={handleCreate}>
                        <h3 style={{ marginTop: 0 }}>Review & Confirm</h3>
                        <p className="modal-sub">Double-check the details below before creating this flight.</p>

                        <div className="review-card">
                            <div className="review-row">
                                <span className="review-label">Route</span>
                                <span className="review-value">{formData.airline} {formData.flight_number} · {formData.origin} → {formData.destination}</span>
                            </div>
                            <div className="review-row">
                                <span className="review-label">Type</span>
                                <span className="review-value">{flightType === 'stops' ? `${numStops} stop(s)` : 'Non-stop'}</span>
                            </div>
                            <div className="review-row">
                                <span className="review-label">Departure</span>
                                <span className="review-value">{dateStrings.departure} {timeStrings.departure}{formData.departure_terminal ? ` · ${formData.departure_terminal}` : ''}</span>
                            </div>
                            <div className="review-row">
                                <span className="review-label">Arrival</span>
                                <span className="review-value">{dateStrings.arrival} {timeStrings.arrival}{formData.arrival_terminal ? ` · ${formData.arrival_terminal}` : ''}</span>
                            </div>
                            <div className="review-row">
                                <span className="review-label">Price</span>
                                <span className="review-value">₹{formData.price} adult · ₹{formData.infant_price || 0} infant</span>
                            </div>
                            <div className="review-row">
                                <span className="review-label">Seats</span>
                                <span className="review-value">{formData.total_seats} total</span>
                            </div>
                            <div className="review-row">
                                <span className="review-label">PNR</span>
                                <span className="review-value">{formData.pnr}</span>
                            </div>
                        </div>

                        {flightType === 'stops' && (
                            <div style={{ marginTop: 20 }}>
                                <span className="eyebrow">Itinerary</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                                    {legInputs.map((leg, idx) => (
                                        <div key={idx} className="review-card" style={{ padding: '12px 16px' }}>
                                            <div className="review-row">
                                                <span className="review-label">Leg {idx + 1}</span>
                                                <span className="review-value">
                                                    {leg.flight_number} · {leg.origin} → {leg.destination} · {leg.date_departure} {leg.time_departure} → {leg.date_arrival} {leg.time_arrival}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="full" style={{ marginTop: 20 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13.5, color: 'var(--ink-2)' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.is_hidden || false}
                                    onChange={e => setFormData({ ...formData, is_hidden: e.target.checked })}
                                    style={{ width: 15, height: 15 }}
                                />
                                Temporarily hide this flight from agents
                            </label>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
                            <button type="button" onClick={goBack} className="btn btn-ghost">
                                <ArrowLeft size={14} /> Back
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? 'Creating…' : 'Create Flight'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </>
    );
}
