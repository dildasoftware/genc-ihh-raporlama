'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export function WeeklyTrendChart({ data }: { data: { weekNo: number, count: number, participants: number }[] }) {
  if (!data || data.length === 0) return <p className="text-sm text-slate-500">Veri yok</p>

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis 
            dataKey="weekNo" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#64748B' }} 
            tickFormatter={(val) => `H${val}`} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#64748B' }} 
          />
          <Tooltip 
            cursor={{ fill: '#F1F5F9' }} 
            contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
            labelFormatter={(label) => `Hafta ${label}`} 
          />
          <Bar dataKey="participants" name="Katılımcı" fill="#1B4E6B" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function UnitPieChart({ data }: { data: { name: string, count: number, participants: number }[] }) {
  if (!data || data.length === 0) return <p className="text-sm text-slate-500">Veri yok</p>

  const COLORS = ['#1B4E6B', '#16A34A', '#D97706', '#BE185D', '#7C3AED', '#0891B2']

  return (
    <div className="h-64 w-full flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="participants"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
