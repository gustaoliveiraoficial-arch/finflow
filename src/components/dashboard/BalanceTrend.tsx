'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface BalanceTrendProps {
  data: { date: string; balance: number }[]
}

export default function BalanceTrend({ data }: BalanceTrendProps) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-40 text-sm text-gray-500">Sem dados para exibir</div>
  )

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#35976b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#35976b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#252d3d" />
        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false}
               tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ background: '#161b24', border: '1px solid #252d3d', borderRadius: '12px', fontSize: '12px' }}
          formatter={(value: number) => [formatCurrency(value), 'Saldo']}
          labelStyle={{ color: '#9ca3af' }}
        />
        <Area type="monotone" dataKey="balance" stroke="#35976b" strokeWidth={2}
              fill="url(#balanceGrad)" dot={false} activeDot={{ r: 4, fill: '#35976b' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
