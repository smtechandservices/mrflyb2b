import { Plane } from 'lucide-react';

const ROUTES = [
  { from: 'Delhi', fromCode: 'DEL', to: 'Mumbai', toCode: 'BOM' },
  { from: 'Delhi', fromCode: 'DEL', to: 'Bengaluru', toCode: 'BLR' },
  { from: 'Mumbai', fromCode: 'BOM', to: 'Goa', toCode: 'GOI' },
  { from: 'Delhi', fromCode: 'DEL', to: 'Dubai', toCode: 'DXB' },
  { from: 'Delhi', fromCode: 'DEL', to: 'Hyderabad', toCode: 'HYD' },
  { from: 'Bengaluru', fromCode: 'BLR', to: 'Chennai', toCode: 'MAA' },
  { from: 'Delhi', fromCode: 'DEL', to: 'Kolkata', toCode: 'CCU' },
  { from: 'Mumbai', fromCode: 'BOM', to: 'Singapore', toCode: 'SIN' },
  { from: 'Delhi', fromCode: 'DEL', to: 'Srinagar', toCode: 'SXR' },
  { from: 'Delhi', fromCode: 'DEL', to: 'Bangkok', toCode: 'BKK' },
];

function RouteChip({ route }: { route: (typeof ROUTES)[number] }) {
  return (
    <span className="recent-flight-chip">
      <span className="recent-flight-city">{route.from}</span>
      <span className="recent-flight-code">{route.fromCode}</span>
      <Plane size={13} className="recent-flight-plane" />
      <span className="recent-flight-code">{route.toCode}</span>
      <span className="recent-flight-city">{route.to}</span>
    </span>
  );
}

export default function RecentFlights() {
  return (
    <section className="recent-flights">
      <div className="recent-flights-head container">
        <span className="eyebrow">— On the radar</span>
        <h2 style={{ marginTop: 8 }}>Recently booked routes</h2>
      </div>

      <div className="recent-flights-marquee">
        <div className="recent-flights-track">
          {ROUTES.map((route, i) => (
            <RouteChip route={route} key={`a-${i}`} />
          ))}
          {ROUTES.map((route, i) => (
            <RouteChip route={route} key={`b-${i}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
