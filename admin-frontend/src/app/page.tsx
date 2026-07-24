'use client';

import { useState, useEffect } from 'react';
import { getAdminStats, AdminStats } from '@/lib/api';
import { getAirlineLogo } from '@/lib/airlines';
import { IndianRupee, BookOpen, Plane, Users, Wallet, Undo2, TrendingUp, TrendingDown, ArrowRight, Plus, CheckCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const router = useRouter();

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch(() => router.push('/login'));
  }, [router]);

  if (!stats) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Loading analysis...</p>
      </div>
    </div>
  );

  const cards = [
    { label: 'Total Revenue', value: `₹${stats.total_revenue.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'bg-green-500', subtext: 'Lifetime earnings', trend: 'up' },
    { label: 'Pending Top-ups', value: stats.pending_topups, icon: Wallet, color: 'bg-amber-500', subtext: 'Awaiting approval', trend: stats.pending_topups > 5 ? 'down' : 'up' },
    { label: 'Pending Refunds', value: stats.pending_refunds, icon: Undo2, color: 'bg-rose-500', subtext: 'Action required', trend: stats.pending_refunds > 0 ? 'down' : 'up' },
    { label: 'Active Bookings', value: stats.active_bookings, icon: BookOpen, color: 'bg-blue-500', subtext: 'Upcoming travel', trend: 'up' },
    { label: 'Total Users', value: stats.total_users, icon: Users, color: 'bg-purple-500', subtext: `${stats.new_users_30d} new this month`, trend: 'up' },
    { label: 'Future Flights', value: stats.total_flights, icon: Plane, color: 'bg-orange-500', subtext: 'Scheduled trips', trend: 'up' },
  ];

  const chartData = stats.revenue_chart.labels.map((label, index) => ({
    name: label,
    revenue: stats.revenue_chart.values[index]
  }));

  const pieData = Object.entries(stats.booking_distribution).map(([status, count]) => ({
    name: status.charAt(0) + status.slice(1).toLowerCase(),
    value: count
  }));

  return (
    <div className='py-8 space-y-10'>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Overview</h2>
          <p className="text-slate-500 mt-1">Real-time platform analytics and system health.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/bookings')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            Manage Bookings
          </button>
          <button 
             onClick={() => router.push('/flights')}
             className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" /> New Flight
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div 
            key={card.label} 
            className={`group bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1`}
          >
            {/* Top Accent Line */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${card.color} opacity-80`} />
            
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.15em]">{card.label}</h3>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${card.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} text-[10px] font-bold`}>
                  {card.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {card.trend === 'up' ? '+12%' : '-2%'} 
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                <p className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">
                  {card.value}
                </p>
                <p className="text-slate-400 text-[10px] font-medium">{card.subtext}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Revenue Growth</h3>
              <p className="text-sm text-slate-500 font-medium">Daily revenue trends for the past 7 days</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full">
               <TrendingUp className="w-3 h-3" /> Live
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Booking Distribution */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Booking Status</h3>
          <p className="text-sm text-slate-500 mb-6 font-medium">Distribution by current status</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Recent Bookings</h3>
            <button 
              onClick={() => router.push('/bookings')}
              className="text-sm text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                <tr>
                  <th className="px-6 py-4">Booking ID</th>
                  <th className="px-6 py-4">Passenger</th>
                  <th className="px-6 py-4">Flight</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recent_bookings.map((booking) => (
                  <tr key={booking.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-600">#{booking.booking_id}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{booking.first_name} {booking.last_name}</div>
                      <div className="text-[10px] text-slate-400">{booking.passenger_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {getAirlineLogo(booking.flight_details.airline) ? (
                            <img 
                              src={getAirlineLogo(booking.flight_details.airline) || ''} 
                              alt={booking.flight_details.airline}
                              className="w-6 h-6 object-contain"
                            />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                          )}
                        </div>
                        <span className="text-slate-600 font-semibold">{booking.flight_details.airline}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{new Date(booking.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold tracking-tighter ${
                        booking.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' :
                        booking.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {booking.status === 'CONFIRMED' ? <CheckCircle className="w-2.5 h-2.5 mr-1" /> : <Clock className="w-2.5 h-2.5 mr-1" />}
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Messages / Stats Summary */}
        <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-4">Platform Insights</h3>
            <div className="space-y-6 mt-8">
               <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                     <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                     <p className="text-sm font-bold">Weekly Performance</p>
                     <p className="text-xs text-white/60 mt-1">
                        Total revenue of ₹{stats.revenue_chart.values.reduce((a, b) => a + b, 0).toLocaleString()} generated this week.
                     </p>
                  </div>
               </div>
               <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                     <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                     <p className="text-sm font-bold">User Growth</p>
                     <p className="text-xs text-white/60 mt-1">{stats.new_users_30d} new users joined in the last 30 days.</p>
                  </div>
               </div>
               <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                     <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                     <p className="text-sm font-bold">Pending Actions</p>
                     <p className="text-xs text-white/60 mt-1">There are {stats.pending_topups + stats.pending_refunds} requests awaiting your review.</p>
                  </div>
               </div>
            </div>
          </div>
          
          <div className="mt-8">
             <button 
               onClick={() => router.push('/topups')}
               className="w-full py-4 bg-white text-slate-900 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
             >
                Review Pending Requests <ArrowRight className="w-4 h-4" />
             </button>
          </div>

          {/* Decorative circles */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-green-500/10 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  );
}
