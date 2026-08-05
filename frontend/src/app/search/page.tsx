'use client';

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FlightCard } from '@/components/FlightCard';
import { SearchForm } from '@/components/SearchForm';
import { RipplesBackground } from '@/components/RipplesBackground';
import { FlightFilters, FilterState, STOP_OPTIONS, TIME_SLOTS } from '@/components/FlightFilters';
import { Plane, Filter, X, SearchX } from 'lucide-react';
import { BRAND } from '@/config/brand';

interface Flight {
    id: number;
    airline: string;
    flight_number: string;
    origin: string;
    destination: string;
    departure_time: string;
    arrival_time: string;
    duration: string;
    price: string;
    stops: number;
    departure_terminal?: string;
    arrival_terminal?: string;
    stop_details?: string;
    layover_duration?: string;
    baggage_allowance?: string;
}

function SearchPageContent() {
    const searchParams = useSearchParams();
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const date = searchParams.get('date');
    const returnDate = searchParams.get('returnDate');
    const passengers = Number(searchParams.get('passengers')) || 1;
    const adults = Number(searchParams.get('adults')) || (searchParams.get('children') ? 0 : passengers);
    const children = Number(searchParams.get('children')) || 0;
    const currentPage = Number(searchParams.get('page')) || 1;

    const [outboundFlights, setOutboundFlights] = useState<Flight[]>([]);
    const [returnFlights, setReturnFlights] = useState<Flight[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [availableAirlines, setAvailableAirlines] = useState<string[]>([]);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

    const router = useRouter();

    // Derived state from URL - Single Source of Truth
    const currentFilters = useMemo<FilterState>(() => ({
        stops: searchParams.getAll('stops'),
        airlines: searchParams.getAll('airlines'),
        departureTime: searchParams.getAll('departure_time'),
        arrivalTime: searchParams.getAll('arrival_time'),
    }), [searchParams]);

    // Fetch available airlines when search params change
    useEffect(() => {
        const fetchAirlines = async () => {
            try {
                const { getAvailableAirlines } = await import('@/lib/api');
                const data = await getAvailableAirlines(
                    origin || undefined,
                    destination || undefined,
                    date || undefined
                );
                setAvailableAirlines(data.airlines);
            } catch (error) {
                console.error('Error fetching airlines:', error);
                setAvailableAirlines([]);
            }
        };

        fetchAirlines();
    }, [origin, destination, date]);

    // Fetch flights whenever search params or filters change
    useEffect(() => {
        const fetchFlights = async () => {
            setLoading(true);
            try {
                // Import the API function dynamically
                const { getFlights } = await import('@/lib/api');

                // Convert filter state to API format
                const apiFilters = {
                    stops: currentFilters.stops,
                    airlines: currentFilters.airlines,
                    departure_time: currentFilters.departureTime,
                    arrival_time: currentFilters.arrivalTime,
                };

                // Fetch outbound flights with filters
                const outboundData = await getFlights(
                    origin || undefined,
                    destination || undefined,
                    date || undefined,
                    undefined,
                    currentPage,
                    apiFilters,
                    passengers
                ).catch(() => ({ count: 0, results: [], next: null, previous: null }));

                setOutboundFlights(outboundData.results || []);

                let returnCount = 0;
                let returnPageCount = 0;

                // Fetch return flights if returnDate exists
                if (returnDate) {
                    const returnData = await getFlights(
                        destination || undefined,
                        origin || undefined,
                        returnDate || undefined,
                        undefined,
                        currentPage,
                        apiFilters,
                        passengers
                    ).catch(() => ({ count: 0, results: [], next: null, previous: null }));

                    setReturnFlights(returnData.results || []);
                    returnCount = returnData.count || 0;
                    returnPageCount = Math.ceil(returnCount / 10);
                }

                // Set total count and pages
                const outboundCount = outboundData.count || 0;
                const outboundPageCount = Math.ceil(outboundCount / 10);

                setTotalCount(outboundCount + returnCount);
                setTotalPages(Math.max(outboundPageCount, returnPageCount));
            } catch (error) {
                console.error('Error fetching flights:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchFlights();
    }, [origin, destination, date, returnDate, currentPage, currentFilters, passengers]);

    // Helper to update URL without page reload
    const updateUrl = useCallback((newParams: Record<string, string | string[] | undefined>) => {
        const params = new URLSearchParams(searchParams.toString());

        Object.entries(newParams).forEach(([key, value]) => {
            if (value === undefined || value === null) {
                params.delete(key);
            } else if (Array.isArray(value)) {
                params.delete(key);
                value.forEach(v => params.append(key, v));
            } else {
                params.set(key, value);
            }
        });

        router.push(`?${params.toString()}`);
    }, [router, searchParams]);

    // Update filters and trigger refetch
    const handleFilterChange = useCallback((filters: FilterState) => {
        updateUrl({
            stops: filters.stops,
            airlines: filters.airlines,
            departure_time: filters.departureTime,
            arrival_time: filters.arrivalTime,
            page: '1' // Reset to page 1
        });
    }, [updateUrl]);

    const handlePageChange = (newPage: number) => {
        updateUrl({ page: newPage.toString() });
    };

    const clearAllFilters = useCallback(() => {
        handleFilterChange({ stops: [], airlines: [], departureTime: [], arrivalTime: [] });
    }, [handleFilterChange]);

    const removeFilterValue = useCallback((category: keyof FilterState, value: string) => {
        handleFilterChange({ ...currentFilters, [category]: currentFilters[category].filter(v => v !== value) });
    }, [currentFilters, handleFilterChange]);

    const hasActiveFilters = Object.values(currentFilters).some(arr => arr.length > 0);
    const activeFilterCount = Object.values(currentFilters).reduce((n, arr) => n + arr.length, 0);

    const activeTags: { key: string; label: string; remove: () => void }[] = [
        ...currentFilters.stops.map(v => ({
            key: `stops-${v}`,
            label: STOP_OPTIONS.find(o => o.value === v)?.label ?? v,
            remove: () => removeFilterValue('stops', v),
        })),
        ...currentFilters.departureTime.map(v => ({
            key: `dep-${v}`,
            label: `Departs: ${TIME_SLOTS.find(o => o.value === v)?.label ?? v}`,
            remove: () => removeFilterValue('departureTime', v),
        })),
        ...currentFilters.arrivalTime.map(v => ({
            key: `arr-${v}`,
            label: `Arrives: ${TIME_SLOTS.find(o => o.value === v)?.label ?? v}`,
            remove: () => removeFilterValue('arrivalTime', v),
        })),
        ...currentFilters.airlines.map(v => ({
            key: `air-${v}`,
            label: v,
            remove: () => removeFilterValue('airlines', v),
        })),
    ];

    return (
        <>
            <div className="page-head page-head-search">
                <div className="page-head-search-ripples">
                    <RipplesBackground imageUrl="/hero-search.png" />
                </div>
                <div className="container">
                    <div className="crumbs">{BRAND.name} / <span>Flight Search</span></div>
                    <h1>Search results</h1>
                    <p style={{ color: 'rgba(244,237,224,0.85)', marginTop: 14, maxWidth: 540, fontSize: 15 }}>
                        {returnDate ? (
                            <>Round trip: <strong style={{ color: 'var(--paper)' }}>{origin || 'Anywhere'}</strong> ↔ <strong style={{ color: 'var(--paper)' }}>{destination || 'Anywhere'}</strong></>
                        ) : (
                            <>Showing flights from <strong style={{ color: 'var(--paper)' }}>{origin || 'Anywhere'}</strong> to <strong style={{ color: 'var(--paper)' }}>{destination || 'Anywhere'}</strong></>
                        )}
                    </p>
                    <div style={{ marginTop: 28 }}>
                        <SearchForm
                            initialOrigin={origin || undefined}
                            initialDestination={destination || undefined}
                            initialDate={date || undefined}
                            initialReturnDate={returnDate || undefined}
                            initialTripType={returnDate ? 'round-trip' : 'one-way'}
                            initialPassengers={passengers}
                            initialAdults={adults}
                            initialChildren={children}
                        />
                    </div>
                </div>
            </div>

            <div className="container">
                <div className="listing">
                    <button
                        type="button"
                        className="filters-toggle-btn"
                        onClick={() => setIsMobileFilterOpen(o => !o)}
                    >
                        <Filter size={13} />
                        Filters{hasActiveFilters ? ` (${activeFilterCount})` : ''}
                        {isMobileFilterOpen ? <X size={14} style={{ marginLeft: 'auto' }} /> : null}
                    </button>

                    <FlightFilters
                        filters={currentFilters}
                        onFilterChange={handleFilterChange}
                        availableAirlines={availableAirlines}
                        mobileOpen={isMobileFilterOpen}
                    />

                    <div className="listing-results">
                        <div className="listing-toolbar">
                            <span className="listing-count">
                                <strong>{totalCount}</strong> flight{totalCount !== 1 ? 's' : ''} found
                            </span>
                        </div>

                        {activeTags.length > 0 && (
                            <div className="listing-tags">
                                {activeTags.map(t => (
                                    <span key={t.key} className="tag">
                                        {t.label}
                                        <button onClick={t.remove} aria-label={`Remove ${t.label}`}><X size={12} /></button>
                                    </span>
                                ))}
                                <button
                                    onClick={clearAllFilters}
                                    className="mono"
                                    style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', textDecoration: 'underline' }}
                                >
                                    Clear all
                                </button>
                            </div>
                        )}

                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="placeholder" style={{ height: 128, borderRadius: 'var(--radius-md)' }} />
                                ))}
                            </div>
                        ) : (
                            <>
                                {/* Outbound Flights */}
                                <section>
                                    {returnDate && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
                                            <Plane size={16} style={{ color: 'var(--clay)', transform: 'rotate(45deg)' }} />
                                            <div>
                                                <h4 style={{ margin: 0 }}>Outbound Flight</h4>
                                                <p className="mono" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 4 }}>
                                                    {origin} to {destination} • {date ? new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Any Date'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {outboundFlights.length > 0 ? (
                                            outboundFlights.map((flight) => (
                                                <FlightCard key={flight.id} flight={flight} passengers={passengers} />
                                            ))
                                        ) : (
                                            <EmptyState
                                                message="No flights match your filters."
                                                sub="Try adjusting your filters to see more options."
                                                showClear={hasActiveFilters}
                                                onClear={clearAllFilters}
                                            />
                                        )}
                                    </div>
                                </section>

                                {/* Return Flights */}
                                {returnDate && (
                                    <section style={{ marginTop: 48 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
                                            <Plane size={16} style={{ color: 'var(--clay)', transform: 'rotate(-135deg)' }} />
                                            <div>
                                                <h4 style={{ margin: 0 }}>Return Flight</h4>
                                                <p className="mono" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 4 }}>
                                                    {destination} to {origin} • {new Date(returnDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                            {returnFlights.length > 0 ? (
                                                returnFlights.map((flight) => (
                                                    <FlightCard key={flight.id} flight={flight} passengers={passengers} />
                                                ))
                                            ) : (
                                                <EmptyState
                                                    message="No return flights match your filters."
                                                    sub="Try adjusting your filters to see more options."
                                                    showClear={hasActiveFilters}
                                                    onClear={clearAllFilters}
                                                />
                                            )}
                                        </div>
                                    </section>
                                )}

                                {/* Pagination Controls */}
                                {!loading && !returnDate && totalPages > 1 && (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 48 }}>
                                        <button
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage <= 1}
                                            className="btn btn-ghost btn-sm"
                                            style={{ opacity: currentPage <= 1 ? 0.4 : 1 }}
                                        >
                                            Previous
                                        </button>
                                        <span className="mono" style={{ fontSize: 12, color: 'var(--muted)', padding: '0 8px' }}>
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage >= totalPages}
                                            className="btn btn-ghost btn-sm"
                                            style={{ opacity: currentPage >= totalPages ? 0.4 : 1 }}
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function EmptyState({ message, sub, showClear, onClear }: { message: string; sub: string; showClear: boolean; onClear: () => void }) {
    return (
        <div style={{ padding: '64px 0', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--muted)' }}>
                <SearchX size={32} />
            </div>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 19 }}>{message}</p>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>{sub}</p>
            {showClear && (
                <button className="btn btn-ghost" style={{ marginTop: 20 }} onClick={onClear}>
                    Clear filters
                </button>
            )}
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div style={{ padding: '120px 40px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--clay)' }}>
                    <Plane size={32} />
                </div>
                <p className="mono" style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    Loading search results…
                </p>
            </div>
        }>
            <SearchPageContent />
        </Suspense>
    );
}
