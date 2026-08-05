'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Calendar, X, Users, ArrowRightLeft } from 'lucide-react';
import airports from '@/assets/airports.json';
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

    const parseDate = (d?: string) => {
        if (!d) return null;
        const [y, m, day] = d.split('-').map(Number);
        return new Date(y, m - 1, day);
    };

    const [departureDate, setDepartureDate] = useState<Date | null>(parseDate(initialDate));
    const [returnDate, setReturnDate] = useState<Date | null>(parseDate(initialReturnDate));

    const [availableOrigins, setAvailableOrigins] = useState<string[]>([]);
    const [availableDestinations, setAvailableDestinations] = useState<string[]>([]);
    const [availableDates, setAvailableDates] = useState<Date[]>([]);
    const [availableReturnDates, setAvailableReturnDates] = useState<Date[]>([]);

    const fetchMetadata = (origin?: string, dest?: string) => {
        const passCount = adults + children;
        getSearchMeta(origin, dest, passCount).then(data => {
            if (!origin) setAvailableOrigins(data.origins);
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

    useEffect(() => {
        if (departureDate && availableDates.length > 0) {
            const isValid = availableDates.some(d => d.toDateString() === departureDate.toDateString());
            if (!isValid) {
                setDepartureDate(null);
                setReturnDate(null);
            }
        }
    }, [availableDates, departureDate]);

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
            .filter(a => availableCodes.includes(a.code))
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

    const handleSelectOrigin = (code: string) => {
        setOriginQuery(code);
        setShowOriginSuggestions(false);
        setDestQuery('');
        setDepartureDate(null);
        setReturnDate(null);
        fetchMetadata(code, '');
    };

    const handleSelectDest = (code: string) => {
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
        fetchMetadata();
    };

    const handleSwap = (e: React.MouseEvent) => {
        e.preventDefault();
        const temp = originQuery;
        setOriginQuery(destQuery);
        setDestQuery(temp);
        fetchMetadata(destQuery, temp);
    };

    const closeAllDropdowns = () => {
        setShowOriginSuggestions(false);
        setShowDestSuggestions(false);
        setShowDepartureOptions(false);
        setShowReturnOptions(false);
        setShowPassengerDropdown(false);
    };

    const stepperBtn: React.CSSProperties = {
        width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--line-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)', color: 'var(--ink)',
    };

    return (
        <div style={{
            pointerEvents: 'all',
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: 6,
            boxShadow: 'var(--shadow-lg)',
            padding: '8px 0',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
                <button type="button" onClick={() => setTripType('one-way')} className={`btn btn-sm ${tripType === 'one-way' ? 'btn-primary' : 'btn-ghost'}`}>
                    One Way
                </button>
                <button type="button" onClick={() => setTripType('round-trip')} className={`btn btn-sm ${tripType === 'round-trip' ? 'btn-primary' : 'btn-ghost'}`}>
                    Round Trip
                </button>
                {(initialOrigin || initialDestination || initialDate) && (
                    <button type="button" onClick={handleClear} className="btn btn-ghost btn-sm" style={{ color: 'var(--clay)', marginLeft: 'auto' }}>
                        <X className="w-3.5 h-3.5" /> Clear
                    </button>
                )}
            </div>

            <form onSubmit={handleSearch} className="searchbar" style={{ position: 'relative', background: 'transparent', border: 0, boxShadow: 'none', borderRadius: 0, width: '100%' }}>
                {(showDepartureOptions || showReturnOptions || showPassengerDropdown || showOriginSuggestions || showDestSuggestions) && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'transparent' }} onClick={closeAllDropdowns} />
                )}

                <div className={`searchbar-field ${showOriginSuggestions ? 'sb-active' : ''}`}>
                    <label><MapPin size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />From</label>
                    <div className="val">
                        <input
                            type="text"
                            placeholder="City or Airport"
                            value={originQuery}
                            onChange={(e) => { setOriginQuery(e.target.value); setShowOriginSuggestions(true); }}
                            onFocus={() => setShowOriginSuggestions(true)}
                            style={{ border: 0, outline: 'none', background: 'transparent', font: 'inherit', color: 'inherit', width: '100%' }}
                        />
                    </div>
                    {showOriginSuggestions && originSuggestions.length > 0 && (
                        <div className="sb-drop sb-drop-wide" onClick={e => e.stopPropagation()}>
                            {originSuggestions.map((airport: Airport) => (
                                <div key={airport.code} className="sb-opt" onClick={() => handleSelectOrigin(airport.code)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong>{airport.city} ({airport.code})</strong>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{airport.name}, {airport.country}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleSwap}
                    type="button"
                    title="Swap"
                    className="sb-swap"
                >
                    <ArrowRightLeft size={14} />
                </button>

                <div className={`searchbar-field ${showDestSuggestions ? 'sb-active' : ''}`}>
                    <label><MapPin size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />To</label>
                    <div className="val">
                        <input
                            type="text"
                            placeholder="City or Airport"
                            value={destQuery}
                            onChange={(e) => { setDestQuery(e.target.value); setShowDestSuggestions(true); }}
                            onFocus={() => setShowDestSuggestions(true)}
                            style={{ border: 0, outline: 'none', background: 'transparent', font: 'inherit', color: 'inherit', width: '100%' }}
                        />
                    </div>
                    {showDestSuggestions && destSuggestions.length > 0 && (
                        <div className="sb-drop sb-drop-wide" onClick={e => e.stopPropagation()}>
                            {destSuggestions.map((airport: Airport) => (
                                <div key={airport.code} className="sb-opt" onClick={() => handleSelectDest(airport.code)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong>{airport.city} ({airport.code})</strong>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{airport.name}, {airport.country}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div
                    className={`searchbar-field ${showDepartureOptions ? 'sb-active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); closeAllDropdowns(); setShowDepartureOptions(true); }}
                >
                    <label><Calendar size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />Departure</label>
                    <div className="val">
                        {departureDate
                            ? departureDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                            : <span className="sb-placeholder">{availableDates.length > 0 ? 'Select date' : 'No dates'}</span>}
                    </div>
                    {showDepartureOptions && (
                        <div className="sb-drop" onClick={e => e.stopPropagation()}>
                            {filteredDepartureDates.length > 0 ? filteredDepartureDates.map(date => {
                                const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                                const isSelected = departureDate?.toDateString() === date.toDateString();
                                return (
                                    <div
                                        key={date.toISOString()}
                                        className={`sb-opt ${isSelected ? 'sb-opt-on' : ''}`}
                                        onClick={() => { setDepartureDate(date); setShowDepartureOptions(false); }}
                                    >
                                        {dateStr}
                                    </div>
                                );
                            }) : (
                                <div style={{ padding: 12, fontSize: 12, color: 'var(--muted)' }}>
                                    {availableDates.length > 0 ? 'No dates before return date' : 'No flights available'}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {tripType === 'round-trip' && (
                    <div
                        className={`searchbar-field ${showReturnOptions ? 'sb-active' : ''}`}
                        style={!departureDate ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                        onClick={(e) => { e.stopPropagation(); if (!departureDate) return; closeAllDropdowns(); setShowReturnOptions(true); }}
                    >
                        <label><Calendar size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />Return</label>
                        <div className="val">
                            {returnDate
                                ? returnDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                : <span className="sb-placeholder">Select date</span>}
                        </div>
                        {showReturnOptions && (
                            <div className="sb-drop" onClick={e => e.stopPropagation()}>
                                {filteredReturnDates.length > 0 ? filteredReturnDates.map(date => {
                                    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                                    const isSelected = returnDate?.toDateString() === date.toDateString();
                                    return (
                                        <div
                                            key={date.toISOString()}
                                            className={`sb-opt ${isSelected ? 'sb-opt-on' : ''}`}
                                            onClick={() => { setReturnDate(date); setShowReturnOptions(false); }}
                                        >
                                            {dateStr}
                                        </div>
                                    );
                                }) : (
                                    <div style={{ padding: 12, fontSize: 12, color: 'var(--muted)' }}>No return flights available</div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div
                    className={`searchbar-field ${showPassengerDropdown ? 'sb-active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); closeAllDropdowns(); setShowPassengerDropdown(true); }}
                >
                    <label><Users size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />Travelers</label>
                    <div className="val">{adults + children} Traveler{(adults + children) !== 1 ? 's' : ''}</div>
                    {showPassengerDropdown && (
                        <div className="sb-drop sb-drop-wide" onClick={e => e.stopPropagation()}>
                            <div className="row between" style={{ padding: '8px 4px' }}>
                                <div>
                                    <div style={{ fontWeight: 500, fontSize: 13 }}>Adults</div>
                                    <div className="eyebrow" style={{ fontSize: 9 }}>12+ years</div>
                                </div>
                                <div className="row" style={{ gap: 10 }}>
                                    <button type="button" style={stepperBtn} onClick={() => setAdults(Math.max(1, adults - 1))} disabled={adults <= 1}>−</button>
                                    <span className="mono" style={{ width: 16, textAlign: 'center' }}>{adults}</span>
                                    <button type="button" style={stepperBtn} onClick={() => setAdults(Math.min(9 - children, adults + 1))} disabled={adults + children >= 9}>+</button>
                                </div>
                            </div>
                            <div className="row between" style={{ padding: '8px 4px' }}>
                                <div>
                                    <div style={{ fontWeight: 500, fontSize: 13 }}>Children</div>
                                    <div className="eyebrow" style={{ fontSize: 9 }}>2-12 years</div>
                                </div>
                                <div className="row" style={{ gap: 10 }}>
                                    <button type="button" style={stepperBtn} onClick={() => setChildren(Math.max(0, children - 1))} disabled={children <= 0}>−</button>
                                    <span className="mono" style={{ width: 16, textAlign: 'center' }}>{children}</span>
                                    <button type="button" style={stepperBtn} onClick={() => setChildren(Math.min(9 - adults, children + 1))} disabled={adults + children >= 9}>+</button>
                                </div>
                            </div>
                            <div style={{ paddingTop: 8, marginTop: 4, borderTop: '1px solid var(--line)', fontSize: 11, color: 'var(--muted)' }}>
                                Max 9 travelers. Infants can be added during booking.
                            </div>
                        </div>
                    )}
                </div>

                <button type="submit" className="sb-submit">
                    <Search size={16} />
                    <span>Search</span>
                </button>
            </form>
        </div>
    );
}
