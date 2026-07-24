'use client';

import { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';

interface FlightFiltersProps {
    onFilterChange?: (filters: FilterState) => void;
    availableAirlines?: string[];
}

export interface FilterState {
    stops: string[];
    airlines: string[];
    departureTime: string[];
    arrivalTime: string[];
}

const STOP_OPTIONS = [
    { value: 'non-stop', label: 'Non-stop' },
    { value: '1-stop', label: '1 Stop' },
    { value: '2-plus-stops', label: '2+ Stops' },
];

const TIME_SLOTS = [
    { value: 'early-morning', label: 'Early Morning', time: '12 AM - 6 AM' },
    { value: 'morning', label: 'Morning', time: '6 AM - 12 PM' },
    { value: 'afternoon', label: 'Afternoon', time: '12 PM - 6 PM' },
    { value: 'evening', label: 'Evening', time: '6 PM - 12 AM' },
];

export function FlightFilters({ filters, onFilterChange, availableAirlines = [] }: FlightFiltersProps & { filters: FilterState }) {

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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-slate-800">Filters</h3>
                </div>
                {hasActiveFilters && (
                    <button
                        onClick={clearAllFilters}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                        <X className="w-4 h-4" />
                        Clear All
                    </button>
                )}
            </div>

            <div className="space-y-6">
                {/* Stops Filter */}
                <div>
                    <h4 className="font-semibold text-slate-800 mb-3">Stops</h4>
                    <div className="space-y-2">
                        {STOP_OPTIONS.map((option) => (
                            <label key={option.value} className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={filters.stops.includes(option.value)}
                                    onChange={() => handleCheckboxChange('stops', option.value)}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-700 group-hover:text-slate-900">{option.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Departure Time Filter */}
                <div className="pt-4 border-t border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-3">Departure Time</h4>
                    <div className="space-y-2">
                        {TIME_SLOTS.map((slot) => (
                            <label key={slot.value} className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={filters.departureTime.includes(slot.value)}
                                    onChange={() => handleCheckboxChange('departureTime', slot.value)}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm text-slate-700 group-hover:text-slate-900">{slot.label}</span>
                                    <span className="text-xs text-slate-500">{slot.time}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Arrival Time Filter */}
                <div className="pt-4 border-t border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-3">Arrival Time</h4>
                    <div className="space-y-2">
                        {TIME_SLOTS.map((slot) => (
                            <label key={slot.value} className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={filters.arrivalTime.includes(slot.value)}
                                    onChange={() => handleCheckboxChange('arrivalTime', slot.value)}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm text-slate-700 group-hover:text-slate-900">{slot.label}</span>
                                    <span className="text-xs text-slate-500">{slot.time}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Airlines Filter */}
                <div className="pt-4 border-t border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-3">Airlines</h4>
                    {availableAirlines.length > 0 ? (
                        <div className="space-y-2">
                            {availableAirlines.map((airline) => (
                                <label key={airline} className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={filters.airlines.includes(airline)}
                                        onChange={() => handleCheckboxChange('airlines', airline)}
                                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700 group-hover:text-slate-900">{airline}</span>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">No airlines available</p>
                    )}
                </div>
            </div>
        </div>
    );
}
