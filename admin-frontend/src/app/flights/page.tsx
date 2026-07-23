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

    return (
        <div className='pt-8'>
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Flight Management</h2>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search flights..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="text-slate-700 pl-10 pr-4 py-2 border border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={downloadSampleExcel}
                            className="cursor-pointer flex items-center gap-2 border border-slate-400 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition"
                        >
                            <Download className="w-5 h-5" />
                            Download Sample
                        </button>
                        <input
                            type="file"
                            id="excel-upload"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={handleExcelUpload}
                        />
                        <button
                            onClick={() => document.getElementById('excel-upload')?.click()}
                            className="cursor-pointer flex items-center gap-2 border border-slate-400 text-green-600 px-4 py-2 rounded-lg hover:bg-green-50 transition"
                        >
                            <FileDigit className="w-5 h-5" />
                            Upload Excel
                        </button>
                        <button
                            onClick={() => openModal()}
                            className="cursor-pointer flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition border border-slate-400"
                        >
                            <Plus className="w-5 h-5" />
                            Add Flight
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 font-medium text-slate-500">Airline</th>
                            <th className="px-6 py-4 font-medium text-slate-500">Route</th>
                            <th className="px-6 py-4 font-medium text-slate-500">Dep. Date</th>
                            <th className="px-6 py-4 font-medium text-slate-500">Dep. Time</th>
                            <th className="px-6 py-4 font-medium text-slate-500">Price</th>
                            <th className="px-6 py-4 font-medium text-slate-500">Seats</th>
                            <th className="px-6 py-4 font-medium text-slate-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span>Searching flights...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : flights.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    No flights found matching your search.
                                </td>
                            </tr>
                        ) : (
                            flights.map((flight) => (
                                <tr key={flight.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        {getAirlineLogo(flight.airline) ? (
                                            <div className="h-8 w-8">
                                                <img src={getAirlineLogo(flight.airline)!} alt={flight.airline} className="w-full h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="h-8 w-8 bg-green-50 rounded flex items-center justify-center text-green-600 font-bold text-sm flex-shrink-0">
                                                {flight.airline[0]}
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-medium text-slate-900 leading-tight">{flight.airline}</div>
                                            <div className="text-slate-500 text-[11px] mt-0.5">{flight.flight_number}</div>
                                            {flight.departure_terminal && <div className="text-[10px] text-blue-500 mt-0.5">T{flight.departure_terminal}</div>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        <div className="flex flex-col">
                                            <span>{flight.origin} → {flight.destination}</span>
                                            <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                                {flight.stops === 0 ? 'Non-stop' : `${flight.stops} Stop(s)`}
                                                {flight.stops > 0 && (flight.stop_info || flight.stop_details) ? (
                                                    <span className="text-blue-600 font-medium flex items-center gap-1">
                                                        <Map className="w-3 h-3" /> via {flight.stop_details || 'Detailed Itinerary'}
                                                    </span>
                                                ) : flight.stops > 0 ? (
                                                    <span className="text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-full border border-amber-200 flex items-center gap-1.5 animate-pulse text-[10px] uppercase tracking-wider">
                                                        <X className="w-3 h-3" /> Pending Itinerary
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {formatDateToDDMMYYYY(flight.departure_time)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {new Date(flight.departure_time).toLocaleTimeString([], { hour12: false })}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        ₹{parseFloat(flight.price).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {flight.available_seats !== undefined ? flight.available_seats : '-'} / {flight.total_seats || 0}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => toggleVisibility(flight)}
                                            className={`p-1 rounded mr-2 transition-colors ${flight.is_hidden ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50' : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'}`}
                                            title={flight.is_hidden ? "Show Flight" : "Hide Flight"}
                                        >
                                            {flight.is_hidden ? <EyeOff className="cursor-pointer w-4 h-4" /> : <Eye className="cursor-pointer w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => openModal(flight)}
                                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 mr-2"
                                        >
                                            <Edit2 className="cursor-pointer w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(flight.id)}
                                            className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="cursor-pointer w-4 h-4" />
                                        </button>
                                        {flight.stops > 0 && (
                                            <button
                                                onClick={() => openStopModal(flight)}
                                                className={`ml-2 p-1 rounded transition-colors ${!(flight.stop_info || flight.stop_details) ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'}`}
                                                title="Manage Itinerary/Stops"
                                            >
                                                <Map className="cursor-pointer w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                        Page {currentPage} of {Math.max(1, totalPages)} ({totalCount} flights)
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
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
                            <h3 className="text-xl font-bold text-slate-800">
                                {editingFlight ? 'Edit Flight' : 'Add New Flight'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="cursor-pointerw-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Airline</label>
                                    <input
                                        type="text"
                                        required
                                        className="text-slate-700 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition shadow-sm outline-none"
                                        placeholder="Type or select airline..."
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
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] shadow-green-900/10 max-h-60 overflow-y-auto overflow-x-hidden p-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                                            {PREDEFINED_AIRLINES.filter(a => a.toLowerCase().includes((formData.airline || '').toLowerCase())).length > 0 ? (
                                                PREDEFINED_AIRLINES
                                                    .filter(a => a.toLowerCase().includes((formData.airline || '').toLowerCase()))
                                                    .map((airline) => (
                                                        <div
                                                            key={airline}
                                                            className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-green-50 hover:text-green-800 rounded-lg text-slate-700 transition duration-150"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault(); // Prevent input onBlur from firing first
                                                                setFormData({ ...formData, airline });
                                                                setIsAirlineDropdownOpen(false);
                                                            }}
                                                        >
                                                            {getAirlineLogo(airline) ? (
                                                                <div className="h-7 w-7 bg-white rounded border border-slate-100 flex items-center justify-center p-0.5 shadow-sm flex-shrink-0">
                                                                    <img src={getAirlineLogo(airline)!} alt={airline} className="w-full h-full object-contain" />
                                                                </div>
                                                            ) : (
                                                                <div className="h-7 w-7 bg-green-100/50 border border-green-100 rounded flex items-center justify-center text-green-700 font-bold text-xs flex-shrink-0">
                                                                    {airline[0]}
                                                                </div>
                                                            )}
                                                            <span className="font-medium text-[13px]">{airline}</span>
                                                        </div>
                                                    ))
                                            ) : (
                                                <div className="px-3 py-4 text-xs text-slate-400 italic text-center rounded-lg bg-slate-50/50">
                                                    Will be created as a custom airline
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Flight Number</label>
                                    <input
                                        type="text"
                                        required
                                        className="text-slate-700 w-full px-3 py-2 border border-slate-300 rounded-lg"
                                        placeholder="AI101"
                                        value={formData.flight_number || ''}
                                        onChange={e => setFormData({ ...formData, flight_number: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Origin</label>
                                    <input
                                        type="text"
                                        required
                                        className="text-slate-700 w-full px-3 py-2 border border-slate-300 rounded-lg"
                                        placeholder="DEL"
                                        value={formData.origin || ''}
                                        onChange={e => setFormData({ ...formData, origin: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
                                    <input
                                        type="text"
                                        required
                                        className="text-slate-700 w-full px-3 py-2 border border-slate-300 rounded-lg"
                                        placeholder="BOM"
                                        value={formData.destination || ''}
                                        onChange={e => setFormData({ ...formData, destination: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Departure Date (dd/mm/yyyy)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="dd/mm/yyyy"
                                        className="text-slate-700 w-full px-3 py-2 border border-slate-300 rounded-lg"
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
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Departure Time (HH:mm - 24h)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="HH:mm"
                                        className="text-slate-700 w-full px-3 py-2 border border-slate-300 rounded-lg"
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
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Arrival Date (dd/mm/yyyy)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="dd/mm/yyyy"
                                        className="text-slate-700 w-full px-3 py-2 border border-slate-300 rounded-lg"
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
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Arrival Time (HH:mm - 24h)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="HH:mm"
                                        className="text-slate-700 w-full px-3 py-2 border border-slate-300 rounded-lg"
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
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Price (Adult)</label>
                                    <input
                                        type="number"
                                        required
                                        className="text-slate-700 w-full px-3 py-2 border border-slate-300 rounded-lg"
                                        placeholder="12345"
                                        value={formData.price || ''}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Infant Price (0-2 Yrs)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0 for free"
                                        className="text-slate-700 w-full px-3 py-2 border border-slate-300 rounded-lg"
                                        value={formData.infant_price ?? ''}
                                        onChange={e => setFormData({ ...formData, infant_price: e.target.value })}
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Leave 0 for free infant seats</p>
                                </div>
                                <div className='hidden'>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration (hh:mm:ss)</label>
                                    <input
                                        type="text"
                                        disabled
                                        placeholder="Auto-calculated"
                                        className="text-slate-500 bg-slate-100 w-full px-3 py-2 border border-slate-300 rounded-lg cursor-not-allowed"
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
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Stops</label>
                                    <input
                                        type="number"
                                        className="text-slate-700 w-full px-3 py-2 border border-slate-300 rounded-lg"
                                        value={formData.stops || 0}
                                        onChange={e => setFormData({ ...formData, stops: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Stop Details (Airports)</label>
                                    <input
                                        type="text"
                                        placeholder="DXB, AUH"
                                        className="text-slate-700 w-full px-3 py-2 border border-slate-300 rounded-lg"
                                        value={formData.stop_details || ''}
                                        onChange={e => {
                                            const val = e.target.value;
                                            const newStops = (val && formData.stops === 0) ? 1 : formData.stops;
                                            setFormData({ ...formData, stop_details: val, stops: newStops });
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Total Seats</label>
                                    <input
                                        type="number"
                                        required
                                        min={bookedCount}
                                        className="text-slate-700 w-full px-3 py-2 border border-slate-300 rounded-lg"
                                        value={formData.total_seats || ''}
                                        onChange={e => handleTotalSeatsChange(parseInt(e.target.value) || 0)}
                                    />
                                    {bookedCount > 0 && (
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            Minimum {bookedCount} seats required (already booked)
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Available Seats</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        className="text-slate-700 w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-green-700"
                                        value={formData.available_seats !== undefined ? formData.available_seats : ''}
                                        onChange={e => handleAvailableSeatsChange(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Baggage Allowance</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 15kg / 7kg"
                                        className="text-slate-700 w-full px-3 py-2 border border-slate-300 rounded-lg"
                                        value={formData.baggage_allowance || ''}
                                        onChange={e => setFormData({ ...formData, baggage_allowance: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Layover Duration</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 2h 30m"
                                        className="text-slate-700 w-full px-3 py-2 border border-slate-300 rounded-lg"
                                        value={formData.layover_duration || ''}
                                        onChange={e => setFormData({ ...formData, layover_duration: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2 grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Departure Terminal</label>
                                        <input
                                            type="text"
                                            placeholder="T3"
                                            className="text-slate-700 w-full px-3 py-2 border border-slate-300 rounded-lg"
                                            value={formData.departure_terminal || ''}
                                            onChange={e => setFormData({ ...formData, departure_terminal: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Arrival Terminal</label>
                                        <input
                                            type="text"
                                            placeholder="T1"
                                            className="text-slate-700 w-full px-3 py-2 border border-slate-300 rounded-lg"
                                            value={formData.arrival_terminal || ''}
                                            onChange={e => setFormData({ ...formData, arrival_terminal: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Flight PNR</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. INDBOM001"
                                        className="text-slate-700 w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase bg-slate-50 focus:bg-white"
                                        value={formData.pnr || ''}
                                        onChange={e => setFormData({ ...formData, pnr: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500"
                                            checked={formData.is_hidden || false}
                                            onChange={e => setFormData({ ...formData, is_hidden: e.target.checked })}
                                        />
                                        <span className="text-sm font-medium text-slate-700">Temporarily hide this flight from users</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="cursor-pointer px-4 py-2 text-slate-600 hover:text-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="cursor-pointer px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                                >
                                    Save Flight
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Stop Details Modal */}
            {isStopModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-white/20 overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
                        <div className="bg-gradient-to-r from-green-600 to-emerald-800 p-6 text-white flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold">Configure Detailed Itinerary</h3>
                                    <p className="text-green-50 text-xs mt-1">Define details for each leg of the journey</p>
                                </div>
                                <button onClick={() => setIsStopModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-8 bg-slate-50/50">
                            {legInputs.map((leg, idx) => (
                                <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative group">
                                    <div className="absolute -top-3 left-6 px-3 bg-green-600 text-white text-[10px] font-bold rounded-full py-0.5 shadow-sm">
                                        LEG #{idx + 1}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-2">
                                        <div className="md:col-span-1">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Airline</label>
                                            <input 
                                                type="text" 
                                                list={`airline-options-${idx}`}
                                                className="text-slate-800 w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm transition-all"
                                                placeholder="e.g. Air India" 
                                                value={leg.airline} 
                                                onChange={e => updateLegInput(idx, 'airline', e.target.value)} 
                                            />
                                            <datalist id={`airline-options-${idx}`}>
                                                {PREDEFINED_AIRLINES.map(a => <option key={a} value={a} />)}
                                            </datalist>
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Flight Number</label>
                                            <input
                                                type="text"
                                                readOnly={idx === 0}
                                                className={`text-slate-800 w-full px-3 py-2 border rounded-lg outline-none font-semibold uppercase transition-all ${
                                                    idx === 0 
                                                    ? 'bg-slate-200/60 border-slate-300 cursor-not-allowed text-slate-500 shadow-inner' 
                                                    : 'bg-white border-slate-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm'
                                                }`}
                                                placeholder="e.g. 6E 123"
                                                value={leg.flight_number}
                                                onChange={e => updateLegInput(idx, 'flight_number', e.target.value.toUpperCase())}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Origin</label>
                                            <input
                                                type="text"
                                                readOnly={idx >= 0} // Always readonly as it's either master start or previous leg's destination
                                                className="text-slate-800 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-semibold uppercase transition-all bg-slate-200/60 cursor-not-allowed text-slate-500 shadow-inner"
                                                placeholder="Airport Code"
                                                value={leg.origin}
                                                tabIndex={-1}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Destination</label>
                                            <input
                                                type="text"
                                                readOnly={idx === legInputs.length - 1}
                                                className={`text-slate-800 w-full px-3 py-2 border rounded-lg outline-none font-semibold uppercase transition-all ${
                                                    idx === legInputs.length - 1 
                                                    ? 'bg-slate-200/60 border-slate-300 cursor-not-allowed text-slate-500 shadow-inner' 
                                                    : 'bg-white border-slate-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm'
                                                }`}
                                                placeholder="Airport Code"
                                                value={leg.destination}
                                                onChange={e => updateLegInput(idx, 'destination', e.target.value.toUpperCase())}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Dep. Tml</label>
                                                <input 
                                                    type="text" 
                                                    className={`w-full px-2 py-2 border rounded-lg text-sm transition-all focus:outline-none ${
                                                        idx > 0 || idx === 0 // All origins are either master or synced
                                                        ? 'bg-slate-200/60 border-slate-300 cursor-not-allowed text-slate-500 shadow-inner' 
                                                        : 'bg-white border-slate-200 text-slate-700 focus:ring-2 focus:ring-green-500 shadow-sm'
                                                    }`} 
                                                    placeholder="T3" 
                                                    value={leg.departure_terminal} 
                                                    readOnly={idx >= 0}
                                                    tabIndex={-1}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Arr. Tml</label>
                                                <input 
                                                    type="text" 
                                                    readOnly={idx === legInputs.length - 1}
                                                    className={`w-full px-2 py-2 border rounded-lg text-sm transition-all focus:outline-none ${
                                                        idx === legInputs.length - 1 
                                                        ? 'bg-slate-200/60 border-slate-300 cursor-not-allowed text-slate-500 shadow-inner' 
                                                        : 'bg-white border-slate-200 text-slate-700 focus:ring-2 focus:ring-green-500 shadow-sm'
                                                    }`} 
                                                    placeholder="T1" 
                                                    value={leg.arrival_terminal} 
                                                    onChange={e => updateLegInput(idx, 'arrival_terminal', e.target.value)} 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Dep. Date</label>
                                            <input
                                                type="text"
                                                readOnly={idx >= 0}
                                                className="text-slate-800 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none transition-all bg-slate-200/60 cursor-not-allowed text-slate-500 shadow-inner"
                                                placeholder="DD/MM/YYYY"
                                                value={leg.date_departure}
                                                tabIndex={-1}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Dep. Time</label>
                                            <input
                                                type="text"
                                                readOnly={idx >= 0}
                                                className="text-slate-800 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none transition-all bg-slate-200/60 cursor-not-allowed text-slate-500 shadow-inner"
                                                placeholder="HH:mm"
                                                value={leg.time_departure}
                                                tabIndex={-1}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Arr. Date</label>
                                            <input
                                                type="text"
                                                readOnly={idx === legInputs.length - 1}
                                                className={`text-slate-800 w-full px-3 py-2 border rounded-lg outline-none transition-all ${
                                                    idx === legInputs.length - 1 
                                                    ? 'bg-slate-200/60 border-slate-300 cursor-not-allowed text-slate-500 shadow-inner' 
                                                    : 'bg-white border-slate-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm'
                                                }`}
                                                placeholder="DD/MM/YYYY"
                                                value={leg.date_arrival}
                                                onChange={e => updateLegInput(idx, 'date_arrival', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Arr. Time</label>
                                            <input
                                                type="text"
                                                readOnly={idx === legInputs.length - 1}
                                                className={`text-slate-800 w-full px-3 py-2 border rounded-lg outline-none transition-all ${
                                                    idx === legInputs.length - 1 
                                                    ? 'bg-slate-200/60 border-slate-300 cursor-not-allowed text-slate-500 shadow-inner' 
                                                    : 'bg-white border-slate-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm'
                                                }`}
                                                placeholder="HH:mm"
                                                value={leg.time_arrival}
                                                onChange={e => updateLegInput(idx, 'time_arrival', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {idx < legInputs.length - 1 && (
                                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
                                            <div className="w-[1px] h-8 bg-dashed bg-slate-300 border-l border-dashed"></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        <div className="p-6 bg-white border-t border-slate-100 flex gap-4 shrink-0">
                            <button 
                                onClick={() => setIsStopModalOpen(false)}
                                className="px-6 py-3 border border-slate-200 text-slate-500 font-semibold rounded-xl hover:bg-slate-50 transition"
                            >
                                Back
                            </button>
                            <button 
                                onClick={handleSaveStops}
                                className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition transform active:scale-95"
                            >
                                Save Complete Itinerary
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
