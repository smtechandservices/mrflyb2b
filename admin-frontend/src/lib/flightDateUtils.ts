// Shared date/time helpers for flight forms (add-flight wizard + edit modal).
// Flight times are stored as ISO strings; the UI edits them as separate
// dd/mm/yyyy date + HH:mm time text inputs, recombined into ISO (UTC) on change.
import type { CSSProperties } from 'react';

export const formatDateToDDMMYYYY = (isoString: string | undefined) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
};

export const parseDDMMYYYYToYYYYMMDD = (dateStr: string) => {
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

// dd/mm/yyyy -> local Date (for react-datepicker's `selected` prop). Built from
// parts rather than `new Date(string)` so it isn't shifted by ISO/UTC parsing.
export const parseDDMMYYYYToDate = (dateStr: string): Date | null => {
    const iso = parseDDMMYYYYToYYYYMMDD(dateStr);
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? null : date;
};

// HH:mm -> local Date carrying just an hour/minute (for react-datepicker's
// time-only `selected` prop) — the calendar date part is irrelevant.
export const parseHHMMToDate = (timeStr: string): Date | null => {
    if (!timeStr || !/^\d{1,2}:\d{2}$/.test(timeStr)) return null;
    const [h, m] = timeStr.split(':').map(Number);
    if (h > 23 || m > 59) return null;
    const date = new Date();
    date.setHours(h, m, 0, 0);
    return date;
};

// Safely get parts from ISO string without throwing RangeError
export const getISOPart = (isoString: string | undefined, part: 'date' | 'time') => {
    if (!isoString) return part === 'date' ? new Date().toISOString().split('T')[0] : '00:00';

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

// Shared input style for read-only/locked itinerary-leg fields (values pinned
// to the master flight or propagated from the previous leg).
export const lockedFieldStyle: CSSProperties = {
    background: 'var(--sand)',
    color: 'var(--muted)',
    cursor: 'not-allowed',
};
