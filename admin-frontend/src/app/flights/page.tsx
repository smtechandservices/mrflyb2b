'use client';

import { useEffect, useState } from 'react';
import { getAdminFlights, createFlight, updateFlight, deleteFlight, bulkCreateFlights, Flight } from '@/lib/api';
import { getAirlineLogo, PREDEFINED_AIRLINES } from '@/lib/airlines';
import { Plus, Edit2, Trash2, Search, X, FileDigit, Download, Eye, EyeOff, Map } from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { BRAND } from '@/config/brand';

// Helper to format ISO to dd/mm/yyyy
const formatDateToDDMMYYYY = (isoString: string | undefined) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
};

// Helper to parse dd/mm/yyyy to yyyy-mm-dd
const parseDDMMYYYYToYYYYMMDD = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('/')) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const [d, m, y] = parts;
        if (y.length === 4 && d.length <= 2 && m.length <= 2) {
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
    }
    return null;
};

// Helper to safely get parts from ISO string without throwing RangeError
const getISOPart = (isoString: string | undefined, part: 'date' | 'time') => {
    if (!isoString) return part === 'date' ? new Date().toISOString().split('T')[0] : '00:00';

    // First try simple string split to avoid timezone/Date object issues
    const split = isoString.split('T');
    if (split.length === 2) {
        if (part === 'date') return split[0];
        const timePart = split[1].slice(0, 5);
        if (/^\d{2}:\d{2}$/.test(timePart)) return timePart;
    }

    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return part === 'date' ? new Date().toISOString().split('T')[0] : '00:00';
        const fullISO = date.toISOString();
        if (part === 'date') return fullISO.split('T')[0];
        return fullISO.split('T')[1].slice(0, 5);
    } catch {
        return part === 'date' ? new Date().toISOString().split('T')[0] : '00:00';
    }
};

// Shared input style helper for read-only/locked itinerary-leg fields (values
// pinned to the master flight or propagated from the previous leg).
const lockedFieldStyle: React.CSSProperties = {
    background: 'var(--sand)',
    color: 'var(--muted)',
    cursor: 'not-allowed',
};

export default function AdminFlightsPage() {
    const [flights, setFlights] = useState<Flight[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
    const [bookedCount, setBookedCount] = useState(0);
    const [isAirlineDropdownOpen, setIsAirlineDropdownOpen] = useState(false);

    // Stop Details State
    const [isStopModalOpen, setIsStopModalOpen] = useState(false);
    const [stopFlightId, setStopFlightId] = useState<number | null>(null);
    const [legInputs, setLegInputs] = useState<any[]>([]);

    // Form state
    const [formData, setFormData] = useState<Partial<Flight>>({});
    const [modalDateStrings, setModalDateStrings] = useState({ departure: '', arrival: '' });
    const [modalTimeStrings, setModalTimeStrings] = useState({ departure: '', arrival: '' });

    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1); // Reset to first page on search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchFlights(currentPage, debouncedSearch);
    }, [currentPage, debouncedSearch]);

    const fetchFlights = async (page: number, search: string = '') => {
        try {
            setLoading(true);
            const data = await getAdminFlights(page, search);
            setFlights(data.results);
            setTotalCount(data.count);
        } catch (error) {
            console.error('Failed to fetch flights', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await deleteFlight(id);
                fetchFlights(currentPage); // Refresh current page
                Swal.fire(
                    'Deleted!',
                    'The flight has been deleted.',
                    'success'
                );
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: 'Failed to delete flight.',
                });
            }
        }
    };

    const openModal = (flight?: Flight) => {
        if (flight) {
            setEditingFlight(flight);
            setFormData(flight);
            setModalDateStrings({
                departure: formatDateToDDMMYYYY(flight.departure_time),
                arrival: formatDateToDDMMYYYY(flight.arrival_time)
            });
            setModalTimeStrings({
                departure: getISOPart(flight.departure_time, 'time'),
                arrival: getISOPart(flight.arrival_time, 'time')
            });
            // Calculate booked count: Total - Available
            const available = flight.available_seats || 0;
            const total = flight.total_seats || 0;
            setBookedCount(total - available);
        } else {
            setEditingFlight(null);
            setBookedCount(0);
            setFormData({
                airline: '',
                flight_number: '',
                origin: '',
                destination: '',
                price: '',
                infant_price: '0',
                stops: 0,
                stop_details: '',
                total_seats: 150,
                available_seats: 150,
                is_hidden: false,
                pnr: '',
                baggage_allowance: '',
                layover_duration: ''
            });
            setModalDateStrings({ departure: '', arrival: '' });
            setModalTimeStrings({ departure: '', arrival: '' });
        }
        setIsModalOpen(true);
    };

    const isItineraryComplete = (stopInfo: string | null | undefined, stops: number): boolean => {
        if (stops === 0) return true;
        if (!stopInfo) return false;
        try {
            const legs = JSON.parse(stopInfo);
            if (!Array.isArray(legs) || legs.length !== stops + 1) return false;
            return legs.every(leg =>
                leg.flight_number?.trim() &&
                leg.origin?.trim() &&
                leg.destination?.trim() &&
                leg.date_departure?.trim() &&
                leg.time_departure?.trim() &&
                leg.date_arrival?.trim() &&
                leg.time_arrival?.trim()
            );
        } catch {
            return false;
        }
    };

    const toggleVisibility = async (flight: Flight) => {
        try {
            const newHiddenStatus = !flight.is_hidden;

            // Guard: Cannot show flight if itinerary is missing or incomplete
            if (!newHiddenStatus && flight.stops > 0 && !isItineraryComplete(flight.stop_info, flight.stops)) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Configuration Required',
                    text: 'This flight has incomplete or mismatched itinerary details. Please ensure all legs are fully configured before making it visible.',
                    confirmButtonText: 'Configure Now',
                    showCancelButton: true,
                    confirmButtonColor: '#16a34a',
                }).then((res) => {
                    if (res.isConfirmed) openStopModal(flight);
                });
                return;
            }

            await updateFlight(flight.id, { is_hidden: newHiddenStatus });
            setFlights(flights.map(f => f.id === flight.id ? { ...f, is_hidden: newHiddenStatus } : f));

            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true,
            });

            Toast.fire({
                icon: 'success',
                title: `Flight ${newHiddenStatus ? 'hidden' : 'visible'}`
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to update visibility.',
            });
        }
    };

    const handleTotalSeatsChange = (val: number) => {
        const total = Math.max(bookedCount, val);
        setFormData({
            ...formData,
            total_seats: total,
            available_seats: total - bookedCount
        });
    };

    const handleAvailableSeatsChange = (val: number) => {
        const available = Math.max(0, val);
        setFormData({
            ...formData,
            available_seats: available,
            total_seats: available + bookedCount
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = await Swal.fire({
            title: `Are you sure you want to ${editingFlight ? 'update' : 'create'} this flight?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: editingFlight ? 'Yes, update' : 'Yes, create',
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#64748b',
        });

        if (!result.isConfirmed) return;

        try {
            const dataToSave = { ...formData };
            const currentStops = dataToSave.stops || 0;

            // Strictly enforce: if stops > 0, check if the EXISTING stop_info is complete
            // Note: We use editingFlight.stop_info because stop_info isn't in formData
            let hasValidItinerary = isItineraryComplete(editingFlight?.stop_info, currentStops);

            if (currentStops > 0 && !hasValidItinerary) {
                dataToSave.is_hidden = true;
            }

            if (editingFlight) {
                await updateFlight(editingFlight.id, dataToSave);
            } else {
                await createFlight(dataToSave);
            }

            setIsModalOpen(false);
            fetchFlights(currentPage);

            const isActuallyHidden = dataToSave.is_hidden === true;
            const needsSetup = currentStops > 0 && !hasValidItinerary;

            Swal.fire({
                icon: 'success',
                title: editingFlight
                    ? `Flight Updated (${isActuallyHidden ? 'Hidden' : 'Visible'})`
                    : `Flight Created (${isActuallyHidden ? 'Hidden' : 'Visible'})`,
                text: needsSetup
                    ? 'Flight is forcibly hidden until the itinerary matches the stop count and all fields are filled.'
                    : (isActuallyHidden ? 'Flight is manually set to hidden.' : 'Flight is now visible for bookings.'),
                timer: 3000,
                showConfirmButton: true
            });
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Save Failed',
                text: error.message || 'Failed to save flight details.',
            });
        }
    };

    const updateLegInput = (idx: number, field: string, value: any) => {
        const newLegs = [...legInputs];
        newLegs[idx][field] = value;

        // Propagation logic: Source fields update dependent fields in the next leg
        if (newLegs[idx + 1]) {
            if (field === 'destination') newLegs[idx + 1].origin = value;
            if (field === 'arrival_terminal') newLegs[idx + 1].departure_terminal = value;
            if (field === 'date_arrival') newLegs[idx + 1].date_departure = value;
            if (field === 'time_arrival') newLegs[idx + 1].time_departure = value;
        }

        setLegInputs(newLegs);
    };

    const openStopModal = (flight: Flight) => {
        setStopFlightId(flight.id);
        const numStops = flight.stops || 0;
        const numLegs = numStops + 1;

        let existingLegs: any[] = [];
        try {
            if (flight.stop_info && flight.stop_info.startsWith('[')) {
                existingLegs = JSON.parse(flight.stop_info);
            } else if (flight.stop_details && flight.stop_details.startsWith('[')) {
                existingLegs = JSON.parse(flight.stop_details);
            }
        } catch (e) {
            console.error("Failed to parse existing stop info", e);
        }

        const stopAirports = flight.stop_details ? flight.stop_details.split(',').map(s => s.trim()).filter(Boolean) : [];
        const fullRoute = [flight.origin, ...stopAirports, flight.destination];

        // Initialize legs with strict Master Flight enforcement for start/end
        const initialLegs = Array(numLegs).fill(0).map((_, i) => {
            const existing = existingLegs[i] || {};

            let origin = existing.origin || '';
            let destination = existing.destination || '';

            if (!origin && i < fullRoute.length) origin = fullRoute[i];
            if (!destination && (i + 1) < fullRoute.length) destination = fullRoute[i + 1];

            // Pinned fields: Leg 1 start and Leg Last end MUST match master flight
            const isFirst = i === 0;
            const isLast = i === numLegs - 1;

            return {
                flight_number: isFirst ? flight.flight_number : (existing.flight_number || ''),
                airline: existing.airline || flight.airline,
                origin: isFirst ? flight.origin : origin,
                destination: isLast ? flight.destination : destination,
                departure_time: isFirst ? flight.departure_time : (existing.departure_time || ''),
                arrival_time: isLast ? flight.arrival_time : (existing.arrival_time || ''),
                departure_terminal: isFirst ? flight.departure_terminal : (existing.departure_terminal || ''),
                arrival_terminal: isLast ? flight.arrival_terminal : (existing.arrival_terminal || ''),

                date_departure: formatDateToDDMMYYYY(isFirst ? flight.departure_time : (existing.departure_time || '')),
                time_departure: getISOPart(isFirst ? flight.departure_time : (existing.departure_time || ''), 'time'),
                date_arrival: formatDateToDDMMYYYY(isLast ? flight.arrival_time : (existing.arrival_time || '')),
                time_arrival: getISOPart(isLast ? flight.arrival_time : (existing.arrival_time || ''), 'time')
            };
        });

        setLegInputs(initialLegs);
        setIsStopModalOpen(true);
    };

    const handleSaveStops = async () => {
        if (!stopFlightId) return;

        // Validation: Verify all fields for all legs
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
            Swal.fire({
                icon: 'error',
                title: 'Incomplete Details',
                text: 'Please fill all flight numbers, airports, dates, and times for all legs.'
            });
            return;
        }

        try {
            // Reconcile date/time strings back to ISO for each leg
            const finishedLegs = legInputs.map(leg => {
                const depDate = parseDDMMYYYYToYYYYMMDD(leg.date_departure);
                const arrDate = parseDDMMYYYYToYYYYMMDD(leg.date_arrival);

                // Keep existing ISO if date/time hasn't changed or is invalid
                const departure_time = (depDate && leg.time_departure) ? `${depDate}T${leg.time_departure}:00.000Z` : leg.departure_time;
                const arrival_time = (arrDate && leg.time_arrival) ? `${arrDate}T${leg.time_arrival}:00.000Z` : leg.arrival_time;

                return {
                    ...leg,
                    departure_time,
                    arrival_time
                };
            });

            const legData = JSON.stringify(finishedLegs);
            // Comma separated list for stop_details (compatible with old fields)
            const stopAirports = finishedLegs.slice(0, -1).map(leg => leg.destination).join(', ');

            await updateFlight(stopFlightId, {
                stop_details: stopAirports,
                stop_info: legData,
                is_hidden: false
            });
            setIsStopModalOpen(false);
            fetchFlights(currentPage);
            Swal.fire({
                icon: 'success',
                title: 'Itinerary Updated',
                text: 'The full flight itinerary and airport list have been saved.',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error: any) {
            Swal.fire({
                icon: 'error',
                title: 'Failed to update stops',
                text: error.message
            });
        }
    };


    const downloadSampleExcel = () => {
        const sampleData = [
            {
                airline: 'INDIGO',
                flight_number: '6E 2134',
                origin: 'DEL',
                destination: 'BOM',
                departure_date: '25/10/2026',
                departure_time: '14:30',
                arrival_date: '25/10/2026',
                arrival_time: '16:45',
                duration: '02:15',
                price: 5500,
                infant_price: 500,
                stops: 0,
                stop_details: '',
                total_seats: 180,
                pnr: 'DELBOM123',
                baggage_allowance: '15kg Cabin / 7kg Hand',
                layover_duration: '',
                'Departure Terminal': '3',
                'Arrival Terminal': '1'
            },
            {
                airline: 'AIR INDIA',
                flight_number: 'AI101',
                origin: 'BOM',
                destination: 'LHR',
                departure_date: '26/10/2026',
                departure_time: '02:00',
                arrival_date: '26/10/2026',
                arrival_time: '07:30',
                duration: '09:00',
                price: 45000,
                infant_price: 4500,
                stops: 1,
                stop_details: 'DXB',
                total_seats: 250,
                pnr: 'BOMLHR999',
                baggage_allowance: '25kg Cabin / 7kg Hand',
                layover_duration: '2h 30m',
                'Departure Terminal': '2',
                'Arrival Terminal': '4'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(sampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Flights Template");
        XLSX.writeFile(wb, `${BRAND.name.toLowerCase()}_flights_template.xlsx`);
    };

    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { raw: false });

                if (data.length === 0) {
                    throw new Error('Excel file is empty');
                }

                // Parse any date value (Excel serial, Date object, or string) to yyyy-mm-dd
                const parseDate = (val: any): string => {
                    if (!val) return '';
                    if (val instanceof Date) {
                        const y = val.getFullYear();
                        const m = String(val.getMonth() + 1).padStart(2, '0');
                        const d = String(val.getDate()).padStart(2, '0');
                        return `${y}-${m}-${d}`;
                    }
                    if (typeof val === 'number') {
                        // Excel serial date
                        const d = XLSX.SSF.parse_date_code(val);
                        if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
                    }
                    const str = String(val).trim();
                    // dd/mm/yyyy or dd-mm-yyyy
                    const dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
                    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
                    // yyyy-mm-dd
                    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
                    // mm/dd/yyyy (US fallback)
                    const mdy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                    if (mdy && parseInt(mdy[1]) > 12) return `${mdy[3]}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}`;
                    const parsed = new Date(str);
                    if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
                    return str;
                };

                // Parse any time value (fraction, Date object, or string) to HH:mm:ss
                const parseTime = (val: any): string => {
                    if (!val) return '';
                    if (val instanceof Date) return val.toTimeString().slice(0, 8);
                    if (typeof val === 'number' && val < 1) {
                        const total = Math.round(val * 86400);
                        const h = Math.floor(total / 3600);
                        const m = Math.floor((total % 3600) / 60);
                        const s = total % 60;
                        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
                    }
                    const str = String(val).trim();
                    // HH:mm or HH:mm:ss
                    const hms = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
                    if (hms) return `${hms[1].padStart(2,'0')}:${hms[2]}:${hms[3] || '00'}`;
                    // HH:mm AM/PM
                    const ampm = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                    if (ampm) {
                        let h = parseInt(ampm[1]);
                        const period = ampm[3].toUpperCase();
                        if (period === 'AM' && h === 12) h = 0;
                        if (period === 'PM' && h !== 12) h += 12;
                        return `${String(h).padStart(2,'0')}:${ampm[2]}:00`;
                    }
                    return str;
                };

                // Map Excel data to Flight fields
                const flightsToCreate = data.map((item: any) => {
                    const depDate = parseDate(item.departure_date);
                    const depTime = parseTime(item.departure_time);
                    const arrDate = parseDate(item.arrival_date);
                    const arrTime = parseTime(item.arrival_time);

                    return {
                        airline: (item.airline || '').toString().trim().toUpperCase(),
                        flight_number: (item.flight_number || '').toString().replace(/[\s\-]/g, '').toUpperCase(),
                        origin: (item.origin || '').toString().trim().toUpperCase(),
                        destination: (item.destination || '').toString().trim().toUpperCase(),
                        departure_time: (depDate && depTime) ? `${depDate}T${depTime}Z` : '',
                        arrival_time: (arrDate && arrTime) ? `${arrDate}T${arrTime}Z` : '',
                        duration: item.duration || '',
                        price: item.price || 0,
                        infant_price: item.infant_price ?? 0,
                        stops: item.stops || 0,
                        stop_details: item.stop_details || '',
                        total_seats: item.total_seats || 150,
                        pnr: item.pnr || '',
                        baggage_allowance: item.baggage_allowance || '',
                        layover_duration: item.layover_duration || '',
                        departure_terminal: item['Departure Terminal'] || item.departure_terminal || '',
                        arrival_terminal: item['Arrival Terminal'] || item.arrival_terminal || ''
                    };
                });

                const responseData = await bulkCreateFlights(flightsToCreate);
                fetchFlights(currentPage, debouncedSearch);

                if (responseData.duplicate_details.length > 0 && responseData.created.length > 0) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Partially Successful',
                        html: `Created ${responseData.created.length} flights.<br/><br/><b>${responseData.duplicate_details.length} flights skipped:</b><br/><div class="text-sm mt-2 max-h-32 overflow-y-auto text-left pl-4">${responseData.duplicate_details.join('<br/>')}</div>`
                    });
                } else if (responseData.duplicate_details.length > 0 && responseData.created.length === 0) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Upload Failed',
                        html: `All flights were skipped/invalid:<br/><div class="text-sm mt-2 max-h-32 overflow-y-auto text-left pl-4">${responseData.duplicate_details.join('<br/>')}</div>`,
                    });
                } else {
                    Swal.fire({
                        icon: 'success',
                        title: 'Upload Successful',
                        text: `Created ${responseData.created.length} flights!`,
                        timer: 3000
                    });
                }
            } catch (error: any) {
                console.error('Excel parse failed', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Upload Failed',
                    text: error.message || 'Error processing Excel file'
                });
            } finally {
                // Reset file input
                e.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const totalPages = Math.ceil(totalCount / pageSize);
    const filteredAirlineOptions = PREDEFINED_AIRLINES.filter(a => a.toLowerCase().includes((formData.airline || '').toLowerCase()));

    return (
        <>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, marginBottom: 24 }}>
                <div>
                    <h2>Flight Management</h2>
                    <p className="sub" style={{ margin: '6px 0 0' }}>{totalCount} flight{totalCount !== 1 ? 's' : ''} in inventory.</p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                    <div className="admin-search" style={{ width: 240 }}>
                        <Search size={14} color="var(--muted)" />
                        <input
                            type="text"
                            placeholder="Search flights…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', background: 'transparent', font: 'inherit', color: 'inherit', width: '100%' }}
                        />
                    </div>
                    <button onClick={downloadSampleExcel} className="btn btn-ghost btn-sm">
                        <Download size={14} /> Sample
                    </button>
                    <input
                        type="file"
                        id="excel-upload"
                        accept=".xlsx, .xls"
                        style={{ display: 'none' }}
                        onChange={handleExcelUpload}
                    />
                    <button onClick={() => document.getElementById('excel-upload')?.click()} className="btn btn-ghost btn-sm">
                        <FileDigit size={14} /> Upload Excel
                    </button>
                    <button onClick={() => openModal()} className="btn btn-primary btn-sm">
                        <Plus size={14} /> Add Flight
                    </button>
                </div>
            </div>

            <div className="panel">
                <div style={{ overflowX: 'auto' }}>
                    <table className="dtable" style={{ whiteSpace: 'nowrap' }}>
                        <thead>
                            <tr>
                                <th>Airline</th>
                                <th>Route</th>
                                <th>Dep. Date</th>
                                <th>Dep. Time</th>
                                <th style={{ textAlign: 'right' }}>Price</th>
                                <th style={{ textAlign: 'center' }}>Seats</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                                        Searching flights…
                                    </td>
                                </tr>
                            ) : flights.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                                        No flights found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                flights.map((flight) => (
                                    <tr key={flight.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                {getAirlineLogo(flight.airline) ? (
                                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                                        <img src={getAirlineLogo(flight.airline)!} alt={flight.airline} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    </div>
                                                ) : (
                                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--sand)', color: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 12, flexShrink: 0 }}>
                                                        {flight.airline[0]}
                                                    </div>
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{flight.airline}</div>
                                                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                                                        {flight.flight_number}{flight.departure_terminal ? ` · T${flight.departure_terminal}` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--ink-2)' }}>
                                            <div>{flight.origin} → {flight.destination}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                                                    {flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop(s)`}
                                                </span>
                                                {flight.stops > 0 && (flight.stop_info || flight.stop_details) ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--clay)' }}>
                                                        <Map size={10} /> via {flight.stop_details || 'itinerary'}
                                                    </span>
                                                ) : flight.stops > 0 ? (
                                                    <span className="status pending"><span className="d"></span>Pending itinerary</span>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--ink-2)' }}>
                                            {formatDateToDDMMYYYY(flight.departure_time)}
                                        </td>
                                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--ink-2)' }}>
                                            {new Date(flight.departure_time).toLocaleTimeString([], { hour12: false })}
                                        </td>
                                        <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                                            ₹{parseFloat(flight.price).toLocaleString('en-IN')}
                                        </td>
                                        <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--ink-2)' }}>
                                            {flight.available_seats !== undefined ? flight.available_seats : '-'} / {flight.total_seats || 0}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', gap: 4 }}>
                                                <button
                                                    onClick={() => toggleVisibility(flight)}
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ padding: 6, color: flight.is_hidden ? '#97712a' : 'var(--forest)' }}
                                                    title={flight.is_hidden ? 'Show Flight' : 'Hide Flight'}
                                                >
                                                    {flight.is_hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                                {flight.stops > 0 && (
                                                    <button
                                                        onClick={() => openStopModal(flight)}
                                                        className="btn btn-ghost btn-sm"
                                                        style={{ padding: 6, color: !(flight.stop_info || flight.stop_details) ? '#97712a' : 'var(--ink)' }}
                                                        title="Manage Itinerary/Stops"
                                                    >
                                                        <Map size={14} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openModal(flight)}
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ padding: 6 }}
                                                    title="Edit flight"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(flight.id)}
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ padding: 6, color: '#b8443a' }}
                                                    title="Delete flight"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
                        Page {currentPage} of {Math.max(1, totalPages)} ({totalCount} flights)
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="btn btn-ghost btn-sm"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            className="btn btn-ghost btn-sm"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Add/Edit Flight Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={16} /></button>
                        <h3>{editingFlight ? 'Edit Flight' : 'Add New Flight'}</h3>
                        <p className="modal-sub">Inventory, pricing, seats and itinerary details for this flight.</p>

                        <form onSubmit={handleSubmit}>
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
                                                            e.preventDefault(); // Prevent input onBlur from firing first
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
                                    <label>Departure Date (dd/mm/yyyy)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="dd/mm/yyyy"
                                        value={modalDateStrings.departure}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setModalDateStrings({ ...modalDateStrings, departure: val });
                                            const parsed = parseDDMMYYYYToYYYYMMDD(val);
                                            if (parsed) {
                                                const time = getISOPart(formData.departure_time, 'time');
                                                setFormData({ ...formData, departure_time: `${parsed}T${time}:00.000Z` });
                                            }
                                        }}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Departure Time (HH:mm — 24h)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="HH:mm"
                                        value={modalTimeStrings.departure}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setModalTimeStrings({ ...modalTimeStrings, departure: val });

                                            if (/^\d{2}:\d{2}$/.test(val)) {
                                                const manualDate = parseDDMMYYYYToYYYYMMDD(modalDateStrings.departure);
                                                const date = manualDate || getISOPart(formData.departure_time, 'date');
                                                setFormData({ ...formData, departure_time: `${date}T${val}:00.000Z` });
                                            }
                                        }}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Arrival Date (dd/mm/yyyy)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="dd/mm/yyyy"
                                        value={modalDateStrings.arrival}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setModalDateStrings({ ...modalDateStrings, arrival: val });
                                            const parsed = parseDDMMYYYYToYYYYMMDD(val);
                                            if (parsed) {
                                                const time = getISOPart(formData.arrival_time, 'time');
                                                setFormData({ ...formData, arrival_time: `${parsed}T${time}:00.000Z` });
                                            }
                                        }}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Arrival Time (HH:mm — 24h)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="HH:mm"
                                        value={modalTimeStrings.arrival}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setModalTimeStrings({ ...modalTimeStrings, arrival: val });

                                            if (/^\d{2}:\d{2}$/.test(val)) {
                                                const manualDate = parseDDMMYYYYToYYYYMMDD(modalDateStrings.arrival);
                                                const date = manualDate || getISOPart(formData.arrival_time, 'date');
                                                setFormData({ ...formData, arrival_time: `${date}T${val}:00.000Z` });
                                            }
                                        }}
                                    />
                                </div>

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

                                <div className="field-group" style={{ display: 'none' }}>
                                    <label>Duration (hh:mm:ss)</label>
                                    <input
                                        type="text"
                                        disabled
                                        placeholder="Auto-calculated"
                                        title="Duration is automatically computed by the system"
                                        value={(() => {
                                            if (formData.departure_time && formData.arrival_time) {
                                                const start = new Date(formData.departure_time).getTime();
                                                const end = new Date(formData.arrival_time).getTime();
                                                if (!isNaN(start) && !isNaN(end) && end > start) {
                                                    const diffSecs = Math.floor((end - start) / 1000);
                                                    const h = Math.floor(diffSecs / 3600).toString().padStart(2, '0');
                                                    const m = Math.floor((diffSecs % 3600) / 60).toString().padStart(2, '0');
                                                    const s = (diffSecs % 60).toString().padStart(2, '0');
                                                    return `${h}:${m}:${s}`;
                                                }
                                            }
                                            return formData.duration || '';
                                        })()}
                                        onChange={() => {}}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Stops</label>
                                    <input
                                        type="number"
                                        value={formData.stops || 0}
                                        onChange={e => setFormData({ ...formData, stops: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Stop Details (Airports)</label>
                                    <input
                                        type="text"
                                        placeholder="DXB, AUH"
                                        value={formData.stop_details || ''}
                                        onChange={e => {
                                            const val = e.target.value;
                                            const newStops = (val && formData.stops === 0) ? 1 : formData.stops;
                                            setFormData({ ...formData, stop_details: val, stops: newStops });
                                        }}
                                    />
                                </div>

                                <div className="field-group">
                                    <label>Total Seats</label>
                                    <input
                                        type="number"
                                        required
                                        min={bookedCount}
                                        value={formData.total_seats || ''}
                                        onChange={e => handleTotalSeatsChange(parseInt(e.target.value) || 0)}
                                    />
                                    {bookedCount > 0 && (
                                        <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
                                            Minimum {bookedCount} seats required (already booked)
                                        </p>
                                    )}
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

                                <div className="full">
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
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28 }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Save Flight
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Itinerary / Stop Details Modal */}
            {isStopModalOpen && (
                <div className="modal-overlay" onClick={() => setIsStopModalOpen(false)}>
                    <div
                        className="modal modal-wide"
                        style={{ maxWidth: 900, padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
                            <div>
                                <h3 style={{ margin: 0 }}>Configure Detailed Itinerary</h3>
                                <p className="modal-sub" style={{ margin: '4px 0 0' }}>Define details for each leg of the journey.</p>
                            </div>
                            <button className="modal-close" style={{ position: 'static' }} onClick={() => setIsStopModalOpen(false)}>
                                <X size={16} />
                            </button>
                        </div>

                        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 28, background: '#fbf8f1' }}>
                            {legInputs.map((leg, idx) => {
                                const isFirst = idx === 0;
                                const isLast = idx === legInputs.length - 1;
                                return (
                                    <div key={idx} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '22px 20px 20px', position: 'relative' }}>
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
                                                    readOnly
                                                    style={{ ...lockedFieldStyle, fontWeight: 500, textTransform: 'uppercase' }}
                                                    placeholder="Airport Code"
                                                    value={leg.origin}
                                                    tabIndex={-1}
                                                />
                                            </div>
                                            <div className="field-group">
                                                <label>Destination</label>
                                                <input
                                                    type="text"
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
                                                        readOnly
                                                        style={lockedFieldStyle}
                                                        placeholder="T3"
                                                        value={leg.departure_terminal}
                                                        tabIndex={-1}
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
                                                    readOnly
                                                    style={lockedFieldStyle}
                                                    placeholder="DD/MM/YYYY"
                                                    value={leg.date_departure}
                                                    tabIndex={-1}
                                                />
                                            </div>
                                            <div className="field-group">
                                                <label>Dep. Time</label>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    style={lockedFieldStyle}
                                                    placeholder="HH:mm"
                                                    value={leg.time_departure}
                                                    tabIndex={-1}
                                                />
                                            </div>
                                            <div className="field-group">
                                                <label>Arr. Date</label>
                                                <input
                                                    type="text"
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

                        <div style={{ padding: '20px 28px', background: 'var(--paper)', borderTop: '1px solid var(--line)', display: 'flex', gap: 12, flexShrink: 0 }}>
                            <button onClick={() => setIsStopModalOpen(false)} className="btn btn-ghost">
                                Back
                            </button>
                            <button onClick={handleSaveStops} className="btn btn-primary" style={{ flex: 1 }}>
                                Save Complete Itinerary
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
