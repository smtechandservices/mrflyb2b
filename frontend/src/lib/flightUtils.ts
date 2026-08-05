// Helper function to check if a flight is international
// Based on common Indian airport codes (domestic) vs international codes

const INDIAN_AIRPORT_CODES = [
    'DEL', 'BOM', 'BLR', 'MAA', 'HYD', 'CCU', 'AMD', 'COK', 'PNQ', 'GOI',
    'JAI', 'LKO', 'TRV', 'VNS', 'IXC', 'ATQ', 'BBI', 'CJB', 'IXB', 'IXE',
    'IXJ', 'IXL', 'IXM', 'IXR', 'IXU', 'IXW', 'IXZ', 'JDH', 'JLR', 'JSA',
    'KNU', 'NAG', 'PAT', 'RPR', 'SHL', 'STV', 'SXR', 'TRZ', 'UDR', 'VGA'
];

export function isInternationalFlight(origin: string, destination: string): boolean {
    const originIsIndian = INDIAN_AIRPORT_CODES.includes(origin.toUpperCase());
    const destinationIsIndian = INDIAN_AIRPORT_CODES.includes(destination.toUpperCase());

    // If any is not Indian, it's international
    return !originIsIndian || !destinationIsIndian;
}

export interface FlightLeg {
    flight_number: string;
    origin: string;
    destination: string;
    departure_time: string;
    arrival_time: string;
    departure_terminal?: string;
    arrival_terminal?: string;
    airline?: string;
    duration?: string;
}

export function formatDuration(duration: string): string {
    const match = duration.match(/^(?:(\d+) days?, )?(\d+):(\d+):\d+$/);
    if (!match) return duration;
    const days = match[1] ? parseInt(match[1], 10) : 0;
    const hours = days * 24 + parseInt(match[2], 10);
    const minutes = parseInt(match[3], 10);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function parseFlightLegs(stop_info: string | undefined, stop_details: string | undefined): FlightLeg[] | null {
    const data = stop_info || stop_details;
    if (!data) return null;
    try {
        if (data.trim().startsWith('[')) {
            const legs = JSON.parse(data);
            if (Array.isArray(legs) && legs.length > 0) {
                return legs;
            }
        }
    } catch (e) {
        console.error("Failed to parse flight legs", e);
    }
    return null;
}
