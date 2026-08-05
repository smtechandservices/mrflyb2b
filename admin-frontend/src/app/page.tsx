'use client';

import { useState, useEffect } from 'react';
import { getAdminStats, AdminStats } from '@/lib/api';
import { getAirlineLogo } from '@/lib/airlines';
import { ArrowRight, Plus, TrendingUp, Users, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const FOREST = '#1f3b30';
// Earthy fallback series — leads with forest/clay before falling back to
// the other accent tones already used for status pills elsewhere.
const CLAY_TONES = ['#1f3b30', '#c79a4a', '#b8443a', '#41584f', '#97712a', '#756e63'];

const STATUS_HEX: Record<string, string> = {
  CONFIRMED: '#1f7a4d',
  PENDING: '#c79a4a',
  CANCELLED: '#b8443a',
  REJECTED: '#b8443a',
  REFUND_REQUESTED: '#97712a',
  REFUNDED: '#41584f',
};

function statusVariant(status: string): 'confirmed' | 'pending' | 'cancelled' {
  switch (status) {
    case 'CONFIRMED':
      return 'confirmed';
    case 'PENDING':
    case 'REFUND_REQUESTED':
      return 'pending';
    default:
      return 'cancelled';
  }
}

const AXIS_TICK = { fill: '#756e63', fontSize: 11, fontFamily: 'var(--mono)' };

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const router = useRouter();

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch(() => router.push('/login'));
  }, [router]);

  if (!stats) return (
    <div style={{ display: 'flex', height: '70vh', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid var(--line)', borderTopColor: 'var(--forest)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p className="mono" style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Loading analysis…
        </p>
      </div>
    </div>
  );

  const cards: { label: string; value: string | number; trend: 'up' | 'down' }[] = [
    { label: 'Total Revenue', value: `₹${stats.total_revenue.toLocaleString('en-IN')}`, trend: 'up' },
    { label: 'Pending Top-ups', value: stats.pending_topups, trend: stats.pending_topups > 5 ? 'down' : 'up' },
    { label: 'Pending Refunds', value: stats.pending_refunds, trend: stats.pending_refunds > 0 ? 'down' : 'up' },
    { label: 'Active Bookings', value: stats.active_bookings, trend: 'up' },
    { label: 'Total Agents', value: stats.total_users, trend: 'up' },
    { label: 'Future Flights', value: stats.total_flights, trend: 'up' },
  ];

  const chartData = stats.revenue_chart.labels.map((label, index) => ({
    name: label,
    revenue: stats.revenue_chart.values[index],
  }));

  const pieData = Object.entries(stats.booking_distribution).map(([status, count], i) => ({
    name: status.charAt(0) + status.slice(1).toLowerCase(),
    value: count,
    color: STATUS_HEX[status] || CLAY_TONES[i % CLAY_TONES.length],
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Admin overview</h2>
          <p className="sub" style={{ margin: '6px 0 0' }}>Real-time platform analytics and system health.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => router.push('/bookings')} className="btn btn-ghost btn-sm">
            Manage bookings
          </button>
          <button onClick={() => router.push('/flights')} className="btn btn-primary btn-sm">
            <Plus size={14} /> New flight
          </button>
        </div>
      </div>

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {cards.map((card) => (
          <div className="kpi" key={card.label}>
            <div className="lbl">{card.label}</div>
            <div className="v">{card.value}</div>
            <div className={`delta ${card.trend}`}>
              {card.trend === 'up' ? <TrendingUp size={12} /> : <TrendingUp size={12} style={{ transform: 'rotate(180deg)' }} />}
              {card.trend === 'up' ? '+12%' : '-2%'}
            </div>
          </div>
        ))}
      </div>

      <div className="admin-grid">
        <div className="panel">
          <div className="panel-head">
            <h4>Revenue growth</h4>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Last 7 days</span>
          </div>
          <div className="panel-body">
            <div style={{ height: 280, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={FOREST} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={FOREST} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={64} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 4, border: '1px solid var(--line)', boxShadow: 'var(--shadow-md)', fontFamily: 'var(--sans)', fontSize: 13 }}
                    formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke={FOREST} strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h4>Booking status</h4>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Distribution</span>
          </div>
          <div className="panel-body">
            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={58} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 4, border: '1px solid var(--line)', boxShadow: 'var(--shadow-md)', fontFamily: 'var(--sans)', fontSize: 13 }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: 16, fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-2)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-grid">
        <div className="panel">
          <div className="panel-head">
            <h4>Recent bookings</h4>
            <button onClick={() => router.push('/bookings')} className="btn btn-ghost btn-sm">
              View all <ArrowRight size={13} />
            </button>
          </div>
          <table className="dtable">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Passenger</th>
                <th>Flight</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_bookings.map((booking) => {
                const logo = getAirlineLogo(booking.flight_details.airline);
                return (
                  <tr key={booking.id}>
                    <td><span className="mono" style={{ fontSize: 12 }}>#{booking.booking_id}</span></td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{booking.first_name} {booking.last_name}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{booking.passenger_email}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--sand)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                          {logo ? (
                            <img src={logo} alt={booking.flight_details.airline} style={{ width: 18, height: 18, objectFit: 'contain' }} />
                          ) : (
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--line-2)' }} />
                          )}
                        </div>
                        <span style={{ color: 'var(--ink-2)' }}>{booking.flight_details.airline}</span>
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>{new Date(booking.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`status ${statusVariant(booking.status)}`}><span className="d" />{booking.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="panel" style={{ background: 'var(--ink)', border: '1px solid var(--ink)', display: 'flex', flexDirection: 'column' }}>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1, color: 'var(--sand)' }}>
            <h4 className="serif" style={{ fontSize: 20, color: 'var(--paper)', margin: 0 }}>Platform insights</h4>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(244,237,224,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TrendingUp size={16} color="var(--sand)" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--paper)' }}>Weekly performance</p>
                <p className="mono" style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(244,237,224,0.6)' }}>
                  ₹{stats.revenue_chart.values.reduce((a, b) => a + b, 0).toLocaleString()} generated this week.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(244,237,224,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users size={16} color="var(--sand)" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--paper)' }}>Agent growth</p>
                <p className="mono" style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(244,237,224,0.6)' }}>
                  {stats.new_users_30d} new agents joined in the last 30 days.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(244,237,224,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={16} color="var(--sand)" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--paper)' }}>Pending actions</p>
                <p className="mono" style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(244,237,224,0.6)' }}>
                  {stats.pending_topups + stats.pending_refunds} requests awaiting your review.
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push('/topups')}
              className="btn btn-primary"
              style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}
            >
              Review pending requests <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
