'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Calendar, ChevronDown, X, Users, ArrowRightLeft } from 'lucide-react';
import airports from '@/assets/airports.json';
import DatePicker from 'react-datepicker';
import { getSearchMeta } from '@/lib/api';

interface SearchFormProps {
    initialOrigin?: string;
    initialDestination?: string;
    initialDate?: string;
    initialReturnDate?: string;
    initialTripType?: 'one-way' | 'round-trip';
    initialPassengers?: number;
    initialAdults?: number;
    initialChildren?: number;
}

export function SearchForm({
    initialOrigin = '',
    initialDestination = '',
    initialDate,
    initialReturnDate,
    initialTripType = 'one-way',
    initialPassengers = 1,
    initialAdults,
    initialChildren
}: SearchFormProps) {
    const router = useRouter();
    const [originQuery, setOriginQuery] = useState(initialOrigin);
    const [destQuery, setDestQuery] = useState(initialDestination);
    const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
    const [showDestSuggestions, setShowDestSuggestions] = useState(false);
    const [showDepartureOptions, setShowDepartureOptions] = useState(false);
    const [showReturnOptions, setShowReturnOptions] = useState(false);
    const [tripType, setTripType] = useState<'one-way' | 'round-trip'>(initialTripType);
    const [adults, setAdults] = useState<number>(initialAdults || initialPassengers || 1);
    const [children, setChildren] = useState<number>(initialChildren || 0);
    const [showPassengerDropdown, setShowPassengerDropdown] = useState(false);

    // Parse initial dates
    const parseDate = (d?: string) => {
        if (!d) return null;
        const [y, m, day] = d.split('-').map(Number);
        return new Date(y, m - 1, day);
    };

    const [departureDate, setDepartureDate] = useState<Date | null>(parseDate(initialDate));
    const [returnDate, setReturnDate] = useState<Date | null>(parseDate(initialReturnDate));

    // Metadata for filtering
    const [availableOrigins, setAvailableOrigins] = useState<string[]>([]);
    const [availableDestinations, setAvailableDestinations] = useState<string[]>([]);
    const [availableDates, setAvailableDates] = useState<Date[]>([]);
    const [availableReturnDates, setAvailableReturnDates] = useState<Date[]>([]);

    const fetchMetadata = (origin?: string, dest?: string) => {
        const passCount = adults + children;
        getSearchMeta(origin, dest, passCount).then(data => {
            // Only update what we need based on context to avoid clearing user's current valid selection view
            // actually, we should update everything that is downstream.

            if (!origin) setAvailableOrigins(data.origins);
            // Always update destinations if origin changes or on load
            setAvailableDestinations(data.destinations);

            const dates = data.dates.map(d => {
                const [y, m, dstr] = d.split('-').map(Number);
                return new Date(y, m - 1, dstr);
            });
            setAvailableDates(dates);

            const returnDates = data.return_dates.map(d => {
                const [y, m, dstr] = d.split('-').map(Number);
                return new Date(y, m - 1, dstr);
            });
            setAvailableReturnDates(returnDates);
        }).catch(err => console.error(err));
    };

    // Validate selected dates when available dates change
    useEffect(() => {
        if (departureDate && availableDates.length > 0) {
            const isValid = availableDates.some(d => d.toDateString() === departureDate.toDateString());
            if (!isValid) {
                setDepartureDate(null);
                setReturnDate(null);
            }
        }
    }, [availableDates, departureDate]);

    // Ensure return date is not before departure date
    useEffect(() => {
        if (departureDate && returnDate && returnDate < departureDate) {
            setReturnDate(null);
        }
    }, [departureDate, returnDate]);

    useEffect(() => {
        fetchMetadata(originQuery, destQuery);
    }, [adults, children]);

    useEffect(() => {
        fetchMetadata(initialOrigin, initialDestination);
    }, []);

    interface Airport {
        code: string;
        name: string;
        city: string;
        country: string;
    }

    const filterAirports = (query: string, availableCodes: string[]): Airport[] => {
        if (!query) return [];
        const lower = query.toLowerCase();
        return (airports as Airport[])
            .filter(a => availableCodes.includes(a.code)) // Filter by availability
            .filter((a) =>
                a.city.toLowerCase().includes(lower) ||
                a.code.toLowerCase().includes(lower) ||
                a.name.toLowerCase().includes(lower)
            );
    };

    const originSuggestions = filterAirports(originQuery, availableOrigins);
    const destSuggestions = filterAirports(destQuery, availableDestinations);

    const filteredReturnDates = availableReturnDates.filter(d => !departureDate || d >= departureDate);
    const filteredDepartureDates = availableDates.filter(d => !returnDate || d <= returnDate);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (originQuery) params.append('origin', originQuery);
        if (destQuery) params.append('destination', destQuery);
        params.append('passengers', (adults + children).toString());
        params.append('adults', adults.toString());
        params.append('children', children.toString());

        if (departureDate) {
            // Format as YYYY-MM-DD manually to avoid timezone issues with toISOString
            const year = departureDate.getFullYear();
            const month = String(departureDate.getMonth() + 1).padStart(2, '0');
            const day = String(departureDate.getDate()).padStart(2, '0');
            params.append('date', `${year}-${month}-${day}`);
        }

        if (tripType === 'round-trip' && returnDate) {
            const year = returnDate.getFullYear();
            const month = String(returnDate.getMonth() + 1).padStart(2, '0');
            const day = String(returnDate.getDate()).padStart(2, '0');
            params.append('returnDate', `${year}-${month}-${day}`);
        }

        router.push(`/search?${params.toString()}`);
    };

    const handleSelectOrigin = (code: string, city: string) => {
        setOriginQuery(code);
        setShowOriginSuggestions(false);
        // Reset downstream selections
        setDestQuery('');
        setDepartureDate(null);
        setReturnDate(null);

        // Cascading update: When origin is selected, fetch compatible destinations and dates
        fetchMetadata(code, '');
    };

    const handleSelectDest = (code: string, city: string) => {
        setDestQuery(code);
        setShowDestSuggestions(false);
        fetchMetadata(originQuery, code);
    };

    const handleClear = () => {
        setOriginQuery('');
        setDestQuery('');
        setDepartureDate(null);
        setReturnDate(null);
        setTripType('one-way');
        router.push('/search');
        fetchMetadata(); // Reset metadata to show all available options
    };

    const handleSwap = (e: React.MouseEvent) => {
        e.preventDefault();
        const temp = originQuery;
        setOriginQuery(destQuery);
        setDestQuery(temp);
        fetchMetadata(destQuery, temp);
    };

    const clearOrigin = (e: React.MouseEvent) => {
        e.stopPropagation();
        setOriginQuery('');
        fetchMetadata('', destQuery);
    };

    const clearDest = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDestQuery('');
        fetchMetadata(originQuery, '');
    };

    const clearDeparture = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDepartureDate(null);
        setReturnDate(null);
    };

    const clearReturn = (e: React.MouseEvent) => {
        e.stopPropagation();
        setReturnDate(null);
    };

    return (
        <form onSubmit={handleSearch} className="bg-white p-6 md:p-12 rounded-3xl shadow-xl flex flex-col md:flex-row items-center gap-4 md:gap-8 max-w-9xl mx-auto -mt-16 relative z-10 border border-slate-700">
            {/* Trip Type and Clear Button Container - Top on mobile, absolute on desktop */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 md:absolute md:-top-14 md:left-0 md:px-4 mb-2 md:mb-0">
                <div className="flex space-x-2 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => setTripType('one-way')}
                        className={`flex-1 sm:flex-none px-6 md:px-8 py-3 rounded-t-xl md:rounded-t-xl rounded-xl md:rounded-b-none font-bold text-sm md:text-base transition-colors cursor-pointer ${tripType === 'one-way'
                            ? 'bg-white text-blue-600 shadow-lg border border-slate-100'
                            : 'bg-slate-100 md:bg-white/10 text-slate-600 md:text-white hover:bg-slate-200 md:hover:bg-white/20 backdrop-blur-sm'
                            }`}
                    >
                        One Way
                    </button>
                    <button
                        type="button"
                        onClick={() => setTripType('round-trip')}
                        className={`flex-1 sm:flex-none px-6 md:px-8 py-3 rounded-t-xl md:rounded-t-xl rounded-xl md:rounded-b-none font-bold text-sm md:text-base transition-colors cursor-pointer ${tripType === 'round-trip'
                            ? 'bg-white text-blue-600 shadow-lg border border-slate-100'
                            : 'bg-slate-100 md:bg-white/10 text-slate-600 md:text-white hover:bg-slate-200 md:hover:bg-white/20 backdrop-blur-sm'
                            }`}
                    >
                        Round Trip
                    </button>
                </div>

                {/* Clear Search Button */}
                {(initialOrigin || initialDestination || initialDate) && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl md:rounded-t-xl md:rounded-b-none font-bold text-sm md:text-base transition-colors cursor-pointer bg-red-500 text-white hover:bg-red-600 shadow-lg flex items-center justify-center gap-2"
                        title="Clear search and start over"
                    >
                        <X className="w-4 h-4" />
                        Clear Search
                    </button>
                )}
            </div>

            {/* Inputs Container */}
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full">
                {/* Origin Input */}
                <div className="w-full md:flex-1 relative">
                    <div className="bg-slate-50 p-4 md:p-6 rounded-2xl flex items-center space-x-3 border border-slate-200 focus-within:border-sky-400 transition-colors">
                        <MapPin className="text-slate-400 shrink-0" />
                        <div className="flex-1">
                            <label className="block text-xs md:text-base font-semibold text-slate-400 uppercase tracking-wider">From</label>
                            <input
                                type="text"
                                placeholder="City or Airport"
                                className="w-full bg-transparent outline-none text-slate-800 font-medium text-lg md:text-xl"
                                value={originQuery}
                                onChange={(e) => { setOriginQuery(e.target.value); setShowOriginSuggestions(true); }}
                                onFocus={() => setShowOriginSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowOriginSuggestions(false), 200)}
                            />
                        </div>
                    </div>
                    {showOriginSuggestions && originSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 mt-2 max-h-72 overflow-y-auto z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
                            {originSuggestions.map((airport: Airport) => (
                                <div
                                    key={airport.code}
                                    className="px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-all mx-2 rounded-xl mb-1 last:mb-0 hover:translate-x-1"
                                    onMouseDown={(e) => { e.preventDefault(); handleSelectOrigin(airport.code, airport.city); }}
                                >
                                    <div className="font-bold text-slate-800 flex items-center justify-between">
                                        <span>{airport.city} ({airport.code})</span>
                                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">{airport.code}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">{airport.name}, {airport.country}</div>
                                </div>
                            ))}
                            <div className="h-1 shrink-0"></div>
                        </div>
                    )}
                </div>

                {/* Swap Button (Desktop and Mobile) */}
                <button
                    onClick={handleSwap}
                    className="absolute md:static left-1/2 -translate-x-1/2 md:translate-x-0 md:-ml-8 md:-mr-8 z-20 w-8 h-8 bg-white border border-slate-200 rounded-full shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-500 hover:text-blue-600 focus:outline-none"
                    style={{ top: 'calc(50% - 20px)' }}
                    type="button"
                    title="Swap Origin and Destination"
                >
                    <ArrowRightLeft className="w-5 h-5 md:rotate-0 rotate-90" />
                </button>

                {/* Destination Input */}
                <div className="w-full md:flex-1 relative">
                    <div className="bg-slate-50 p-4 md:p-6 rounded-2xl flex items-center space-x-3 border border-slate-200 focus-within:border-blue-400 transition-colors">
                        <MapPin className="text-slate-400 shrink-0" />
                        <div className="flex-1">
                            <label className="block text-xs md:text-base font-semibold text-slate-400 uppercase tracking-wider">To</label>
                            <input
                                type="text"
                                placeholder="City or Airport"
                                className="w-full bg-transparent outline-none text-slate-800 font-medium text-lg md:text-xl"
                                value={destQuery}
                                onChange={(e) => { setDestQuery(e.target.value); setShowDestSuggestions(true); }}
                                onFocus={() => setShowDestSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowDestSuggestions(false), 200)}
                            />
                        </div>
                    </div>
                    {showDestSuggestions && destSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 mt-2 max-h-72 overflow-y-auto z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
                            {destSuggestions.map((airport: Airport) => (
                                <div
                                    key={airport.code}
                                    className="px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-all mx-2 rounded-xl mb-1 last:mb-0 hover:translate-x-1"
                                    onMouseDown={(e) => { e.preventDefault(); handleSelectDest(airport.code, airport.city); }}
                                >
                                    <div className="font-bold text-slate-800 flex items-center justify-between">
                                        <span>{airport.city} ({airport.code})</span>
                                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">{airport.code}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">{airport.name}, {airport.country}</div>
                                </div>
                            ))}
                            <div className="h-1 shrink-0"></div>
                        </div>
                    )}
                </div>

                {/* Date Inputs */}
                <div className="w-full md:flex-[1.5] flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <div
                            className="bg-slate-50 p-4 md:p-6 rounded-2xl flex items-center space-x-3 border border-slate-200 focus-within:border-sky-400 transition-colors cursor-pointer group"
                            onClick={() => { setShowDestSuggestions(false); setShowOriginSuggestions(false); setShowDepartureOptions(!showDepartureOptions); }}
                        >
                            <Calendar className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" size={20} />
                            <div className="flex-1 min-w-0">
                                <label className="block text-xs md:text-base font-semibold text-slate-400 uppercase tracking-wider cursor-pointer">Departure</label>
                                <div className="text-slate-800 font-medium truncate text-lg md:text-xl">
                                    {departureDate
                                        ? departureDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                        : <span className="text-slate-400">{availableDates.length > 0 ? "Select Date" : "No dates"}</span>
                                    }
                                </div>
                            </div>
                            {departureDate && (
                                <button
                                    type="button"
                                    onClick={clearDeparture}
                                    className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                                    title="Clear departure date"
                                >
                                    <X size={16} className="text-slate-400 hover:text-red-500" />
                                </button>
                            )}
                            <ChevronDown className={`text-slate-400 w-4 h-4 transition-transform shrink-0 ${showDepartureOptions ? 'rotate-180' : ''}`} />
                        </div>

                        {showDepartureOptions && (
                            <div className="absolute top-full left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 mt-2 max-h-72 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-200 py-2">
                                {filteredDepartureDates.length > 0 ? (
                                    filteredDepartureDates.map(date => {
                                        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                                        const isSelected = departureDate?.toDateString() === date.toDateString();
                                        return (
                                            <div
                                                key={date.toISOString()}
                                                className={`px-5 py-3.5 cursor-pointer transition-all flex items-center justify-between mx-2 rounded-xl mb-1 last:mb-0 ${isSelected ? 'bg-blue-50 text-blue-700 shadow-sm' : 'hover:bg-slate-50 text-slate-700 hover:translate-x-1'
                                                    }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDepartureDate(date);
                                                    setShowDepartureOptions(false);
                                                }}
                                            >
                                                <span className={`font-semibold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{dateStr}</span>
                                                {isSelected && (
                                                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/30">
                                                        <div className="w-2 h-2 rounded-full bg-white"></div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-8 text-center text-slate-400 text-sm italic">
                                        {availableDates.length > 0
                                            ? "No departure dates available before return date"
                                            : "No departure flights available"
                                        }
                                    </div>
                                )}
                                <div className="h-1 shrink-0"></div> {/* Bottom spacing buffer */}
                            </div>
                        )}
                    </div>

                    {tripType === 'round-trip' && (
                        <div className="flex-1 relative animate-in fade-in zoom-in duration-200">
                            <div
                                className={`bg-slate-50 p-4 md:p-6 rounded-2xl flex items-center space-x-3 border border-slate-200 transition-colors cursor-pointer group ${!departureDate ? 'opacity-50 cursor-not-allowed' : 'focus-within:border-sky-400'}`}
                                onClick={() => {
                                    if (!departureDate) return;
                                    setShowDestSuggestions(false);
                                    setShowOriginSuggestions(false);
                                    setShowReturnOptions(!showReturnOptions);
                                }}
                            >
                                <Calendar className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" size={20} />
                                <div className="flex-1 min-w-0">
                                    <label className="block text-xs md:text-base font-semibold text-slate-400 uppercase tracking-wider cursor-pointer">Return</label>
                                    <div className="text-slate-800 font-medium truncate text-lg md:text-xl">
                                        {returnDate
                                            ? returnDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                            : <span className="text-slate-400">Select Date</span>
                                        }
                                    </div>
                                </div>
                                {returnDate && (
                                    <button
                                        type="button"
                                        onClick={clearReturn}
                                        className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                                        title="Clear return date"
                                    >
                                        <X size={16} className="text-slate-400 hover:text-red-500" />
                                    </button>
                                )}
                                <ChevronDown className={`text-slate-400 w-4 h-4 transition-transform shrink-0 ${showReturnOptions ? 'rotate-180' : ''}`} />
                            </div>

                            {showReturnOptions && (
                                <div className="absolute top-full left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 mt-2 max-h-72 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-200 py-2">
                                    {filteredReturnDates.length > 0 ? (
                                        filteredReturnDates.map(date => {
                                            const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                                            const isSelected = returnDate?.toDateString() === date.toDateString();
                                            return (
                                                <div
                                                    key={date.toISOString()}
                                                    className={`px-5 py-3.5 cursor-pointer transition-all flex items-center justify-between mx-2 rounded-xl mb-1 last:mb-0 ${isSelected ? 'bg-blue-50 text-blue-700 shadow-sm' : 'hover:bg-slate-50 text-slate-700 hover:translate-x-1'
                                                        }`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setReturnDate(date);
                                                        setShowReturnOptions(false);
                                                    }}
                                                >
                                                    <span className={`font-semibold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{dateStr}</span>
                                                    {isSelected && (
                                                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/30">
                                                            <div className="w-2 h-2 rounded-full bg-white"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-8 text-center text-slate-400 text-sm italic">
                                            {availableReturnDates.length > 0
                                                ? "No return flights available after departure date"
                                                : "No return flights available for this route"
                                            }
                                        </div>
                                    )}
                                    <div className="h-1 shrink-0"></div> {/* Bottom spacing buffer */}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="w-full md:w-56 relative">
                    <div
                        className="bg-slate-50 p-4 md:p-6 rounded-2xl flex items-center space-x-3 border border-slate-200 focus-within:border-sky-400 transition-colors cursor-pointer"
                        onClick={() => { setShowDestSuggestions(false); setShowOriginSuggestions(false); setShowDepartureOptions(false); setShowReturnOptions(false); setShowPassengerDropdown(!showPassengerDropdown); }}
                    >
                        <Users className="text-slate-400 shrink-0" />
                        <div className="flex-1">
                            <label className="block text-xs md:text-base font-semibold text-slate-400 uppercase tracking-wider">Travelers</label>
                            <div className="text-slate-800 font-medium text-md">
                                {adults + children} Traveler{(adults + children) !== 1 ? 's' : ''}
                            </div>
                        </div>
                        <ChevronDown className={`text-slate-400 w-4 h-4 transition-transform shrink-0 ${showPassengerDropdown ? 'rotate-180' : ''}`} />
                    </div>

                    {showPassengerDropdown && (
                        <div className="absolute top-full left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 mt-2 z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-slate-800">Adults</div>
                                        <div className="text-[10px] text-slate-400 font-semibold uppercase">12+ years</div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setAdults(Math.max(1, adults - 1)); }}
                                            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 disabled:opacity-30"
                                            disabled={adults <= 1}
                                        >
                                            -
                                        </button>
                                        <span className="font-bold text-slate-800 w-4 text-center">{adults}</span>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setAdults(Math.min(9 - children, adults + 1)); }}
                                            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 disabled:opacity-30"
                                            disabled={adults + children >= 9}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-slate-800">Children</div>
                                        <div className="text-[10px] text-slate-400 font-semibold uppercase">2-12 years</div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setChildren(Math.max(0, children - 1)); }}
                                            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 disabled:opacity-30"
                                            disabled={children <= 0}
                                        >
                                            -
                                        </button>
                                        <span className="font-bold text-slate-800 w-4 text-center">{children}</span>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setChildren(Math.min(9 - adults, children + 1)); }}
                                            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 disabled:opacity-30"
                                            disabled={adults + children >= 9}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium italic">
                                    Max 9 travelers total. Infants (0-2 yrs) can be added during booking.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                { (showDepartureOptions || showReturnOptions || showPassengerDropdown) && (
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => { setShowDepartureOptions(false); setShowReturnOptions(false); setShowPassengerDropdown(false); }} />
                )}

                <button type="submit" className="cursor-pointer w-full md:w-auto h-20 md:h-24 px-8 md:px-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xl md:text-2xl hover:shadow-lg hover:shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 shrink-0">
                    <Search size={24} />
                    <span>Search</span>
                </button>
            </div>
        </form>
    );
}
