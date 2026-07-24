'use client';

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FlightCard } from '@/components/FlightCard';
import { SearchForm } from '@/components/SearchForm';
import { FlightFilters, FilterState } from '@/components/FlightFilters';
import { Plane, Filter, X } from 'lucide-react';

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

    return (
        <div className="min-h-screen bg-slate-50">

            {/* Fixed background image */}
            <div className="fixed top-0 left-0 w-full h-[85vh] bg-slate-900 overflow-hidden z-0">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: 'url(/hero-search.png)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/30 via-slate-900/20 to-slate-900/40" />
            </div>

            {/* Content */}
            <div className="relative z-10">
                <div className="pb-20 pt-24 lg:pt-32 px-4">
                    <div className="max-w-9xl md:px-10 mx-auto w-full flex flex-col justify-end items-center text-left min-h-[40vh] md:min-h-[50vh]">
                        <h1 className="max-w-2xl text-4xl md:text-5xl font-extrabold text-white mb-32 tracking-tight text-center">
                            Find Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">Perfect Flight</span>
                        </h1>

                        <div className="w-full">
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

                {/* Results section */}
                <div className="relative bg-white pb-20">
                    <div className="max-w-9xl mx-auto px-4 md:px-12 pt-8 md:pt-12">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Plane className="text-blue-600" />
                                {totalCount} Flights Found
                            </h2>
                            <div className="text-sm text-slate-500">
                                {returnDate ? (
                                    <span className="flex items-center flex-wrap gap-1">
                                        Round Trip:
                                        <span className="font-semibold text-slate-800">{origin}</span>
                                        <span className="mx-1">↔</span>
                                        <span className="font-semibold text-slate-800">{destination}</span>
                                    </span>
                                ) : (
                                    <span>Showing results for <span className="font-semibold text-slate-800">{origin || 'Anywhere'}</span> to <span className="font-semibold text-slate-800">{destination || 'Anywhere'}</span></span>
                                )}
                            </div>
                        </div>

                        {/* Mobile Filter Toggle Button */}
                        <div className="lg:hidden mb-6 z-30 px-2 leading-none relative">
                            <button
                                onClick={() => setIsMobileFilterOpen(true)}
                                className="w-full py-4 shadow-xl bg-slate-900 border border-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform"
                            >
                                <Filter className="w-5 h-5 text-sky-400" />
                                Filters & Sorting
                            </button>
                        </div>

                        {/* Mobile Filter Overlay */}
                        {isMobileFilterOpen && (
                            <div className="fixed inset-0 z-[1000] bg-white flex flex-col lg:hidden">
                                <div className="h-20 px-4 flex items-center justify-between border-b border-slate-200 bg-white">
                                    <div className="flex items-center gap-2">
                                        <Filter className="text-blue-600" size={20} />
                                        <h2 className="text-xl font-bold text-slate-800">Filters</h2>
                                    </div>
                                    <button
                                        onClick={() => setIsMobileFilterOpen(false)}
                                        className="p-3 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 pb-32">
                                    <FlightFilters
                                        filters={currentFilters}
                                        onFilterChange={handleFilterChange}
                                        availableAirlines={availableAirlines}
                                    />
                                </div>
                                <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-[210]">
                                    <button
                                        onClick={() => setIsMobileFilterOpen(false)}
                                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all"
                                    >
                                        Show Results
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Grid layout: Filters on left, Results on right */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                            {/* Desktop Filters Sidebar */}
                            <div className="hidden lg:block lg:col-span-1">
                                <FlightFilters
                                    filters={currentFilters}
                                    onFilterChange={handleFilterChange}
                                    availableAirlines={availableAirlines}
                                />
                            </div>

                            {/* Flight Results */}
                            <div className="lg:col-span-3 space-y-12">
                                {loading ? (
                                    <div className="text-center py-20">
                                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                        <p className="mt-4 text-slate-600">Loading flights...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Outbound Flights */}
                                        <section>
                                            {returnDate && (
                                                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-200">
                                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                                        <Plane className="w-5 h-5 rotate-45" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-800">Outbound Flight</h3>
                                                        <p className="text-sm text-slate-500">
                                                            {origin} to {destination} • {date ? new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Any Date'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="space-y-6">
                                                {outboundFlights.length > 0 ? (
                                                    outboundFlights.map((flight) => (
                                                        <FlightCard key={flight.id} flight={flight} passengers={passengers} />
                                                    ))
                                                ) : (
                                                    <div className="text-center py-10 bg-white rounded-3xl border border-slate-100 shadow-sm">
                                                        <div className="flex justify-center mb-2 text-slate-300">
                                                            <Plane className="w-8 h-8" />
                                                        </div>
                                                        <p className="text-slate-500">No flights match your filters.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </section>

                                        {/* Return Flights */}
                                        {returnDate && (
                                            <section>
                                                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-200">
                                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                                        <Plane className="w-5 h-5 -rotate-45" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-800">Return Flight</h3>
                                                        <p className="text-sm text-slate-500">
                                                            {destination} to {origin} • {new Date(returnDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="space-y-6">
                                                    {returnFlights.length > 0 ? (
                                                        returnFlights.map((flight) => (
                                                            <FlightCard key={flight.id} flight={flight} passengers={passengers} />
                                                        ))
                                                    ) : (
                                                        <div className="text-center py-10 bg-white rounded-3xl border border-slate-100 shadow-sm">
                                                            <div className="flex justify-center mb-2 text-slate-300">
                                                                <Plane className="w-8 h-8 rotate-180" />
                                                            </div>
                                                            <p className="text-slate-500">No return flights match your filters.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </section>
                                        )}

                                        {/* Pagination Controls */}
                                        {!loading && !returnDate && totalPages > 1 && (
                                            <div className="flex justify-center gap-4 mt-8">
                                                <button
                                                    onClick={() => handlePageChange(currentPage - 1)}
                                                    disabled={currentPage <= 1}
                                                    className={`px-4 py-2 rounded-lg font-semibold ${currentPage > 1 ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                                >
                                                    Previous
                                                </button>
                                                <span className="flex items-center text-slate-600">
                                                    Page {currentPage} of {totalPages}
                                                </span>
                                                <button
                                                    onClick={() => handlePageChange(currentPage + 1)}
                                                    disabled={currentPage >= totalPages}
                                                    className={`px-4 py-2 rounded-lg font-semibold ${currentPage < totalPages ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
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
                </div>
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-slate-600 font-medium tracking-tight">Loading Search results...</p>
                </div>
            </div>
        }>
            <SearchPageContent />
        </Suspense>
    );
}
