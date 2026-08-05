'use client';

import { Check } from 'lucide-react';

interface FlightFiltersProps {
    onFilterChange?: (filters: FilterState) => void;
    availableAirlines?: string[];
    /** Adds the `is-open` class so the panel expands on the mobile collapsed layout. */
    mobileOpen?: boolean;
}

export interface FilterState {
    stops: string[];
    airlines: string[];
    departureTime: string[];
    arrivalTime: string[];
}

export const STOP_OPTIONS = [
    { value: 'non-stop', label: 'Non-stop' },
    { value: '1-stop', label: '1 Stop' },
    { value: '2-plus-stops', label: '2+ Stops' },
];

export const TIME_SLOTS = [
    { value: 'early-morning', label: 'Early Morning', time: '12 AM - 6 AM' },
    { value: 'morning', label: 'Morning', time: '6 AM - 12 PM' },
    { value: 'afternoon', label: 'Afternoon', time: '12 PM - 6 PM' },
    { value: 'evening', label: 'Evening', time: '6 PM - 12 AM' },
];

export function FlightFilters({ filters, onFilterChange, availableAirlines = [], mobileOpen = false }: FlightFiltersProps & { filters: FilterState }) {

    const handleCheckboxChange = (category: keyof FilterState, value: string) => {
        if (!onFilterChange) return;

        const currentValues = filters[category];
        const newValues = currentValues.includes(value)
            ? currentValues.filter((v) => v !== value)
            : [...currentValues, value];

        onFilterChange({ ...filters, [category]: newValues });
    };

    const clearAllFilters = () => {
        if (!onFilterChange) return;

        const emptyFilters: FilterState = {
            stops: [],
            airlines: [],
            departureTime: [],
            arrivalTime: [],
        };
        onFilterChange(emptyFilters);
    };

    const hasActiveFilters = Object.values(filters).some((arr) => arr.length > 0);

    return (
        <aside className={`filters${mobileOpen ? ' is-open' : ''}`}>
            <div className="filter-group">
                <h5>
                    Filters
                    {hasActiveFilters && (
                        <button onClick={clearAllFilters}>Clear all</button>
                    )}
                </h5>
            </div>

            <div className="filter-group">
                <h5>Stops</h5>
                {STOP_OPTIONS.map((option) => {
                    const on = filters.stops.includes(option.value);
                    return (
                        <div
                            key={option.value}
                            className={`fopt fopt-check ${on ? 'on' : ''}`}
                            onClick={() => handleCheckboxChange('stops', option.value)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span className="box">{on && <Check size={9} strokeWidth={3} />}</span>
                                <span>{option.label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="filter-group">
                <h5>Departure Time</h5>
                {TIME_SLOTS.map((slot) => {
                    const on = filters.departureTime.includes(slot.value);
                    return (
                        <div
                            key={slot.value}
                            className={`fopt fopt-check ${on ? 'on' : ''}`}
                            onClick={() => handleCheckboxChange('departureTime', slot.value)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span className="box">{on && <Check size={9} strokeWidth={3} />}</span>
                                <span>{slot.label}</span>
                            </div>
                            <span className="fopt-count">{slot.time}</span>
                        </div>
                    );
                })}
            </div>

            <div className="filter-group">
                <h5>Arrival Time</h5>
                {TIME_SLOTS.map((slot) => {
                    const on = filters.arrivalTime.includes(slot.value);
                    return (
                        <div
                            key={slot.value}
                            className={`fopt fopt-check ${on ? 'on' : ''}`}
                            onClick={() => handleCheckboxChange('arrivalTime', slot.value)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span className="box">{on && <Check size={9} strokeWidth={3} />}</span>
                                <span>{slot.label}</span>
                            </div>
                            <span className="fopt-count">{slot.time}</span>
                        </div>
                    );
                })}
            </div>

            <div className="filter-group" style={{ borderBottom: 0 }}>
                <h5>Airlines</h5>
                {availableAirlines.length > 0 ? (
                    availableAirlines.map((airline) => {
                        const on = filters.airlines.includes(airline);
                        return (
                            <div
                                key={airline}
                                className={`fopt fopt-check ${on ? 'on' : ''}`}
                                onClick={() => handleCheckboxChange('airlines', airline)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span className="box">{on && <Check size={9} strokeWidth={3} />}</span>
                                    <span>{airline}</span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>No airlines available</p>
                )}
            </div>
        </aside>
    );
}
