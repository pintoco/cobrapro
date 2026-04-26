'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import type { MonthlyCollection } from '@/types';

interface Props {
  data: MonthlyCollection[];
}

const formatMonth = (month: string) => {
  const [year, m] = month.split('-');
  const names = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${names[parseInt(m) - 1]} ${year.slice(2)}`;
};

const formatYAxis = (v: number) =>
  v >= 1000 ? `S/ ${(v / 1000).toFixed(0)}k` : `S/ ${v}`;

export function MonthlyChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonth}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            formatCurrency(value),
            name === 'collected' ? 'Cobrado' : 'Facturado',
          ]}
          labelFormatter={formatMonth}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Legend
          formatter={(v) => (v === 'collected' ? 'Cobrado' : 'Facturado')}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="invoiced"  fill="#bfdbfe" radius={[3,3,0,0]} name="invoiced"  />
        <Bar dataKey="collected" fill="#2563eb" radius={[3,3,0,0]} name="collected" />
      </BarChart>
    </ResponsiveContainer>
  );
}
