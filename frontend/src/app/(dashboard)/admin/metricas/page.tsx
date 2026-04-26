'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Building2, Users, FileText, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';

export default function AdminMetricasPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => adminApi.getMetrics().then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card h-28 animate-pulse bg-gray-100" />
        ))}
      </div>
    );
  }

  const kpis = [
    { label: 'Empresas totales', value: data?.companies?.total ?? 0, icon: Building2, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { label: 'Empresas activas', value: data?.companies?.active ?? 0, icon: TrendingUp, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
    { label: 'Suspendidas', value: data?.companies?.suspended ?? 0, icon: AlertCircle, iconBg: 'bg-red-100', iconColor: 'text-red-600' },
    { label: 'Usuarios totales', value: data?.users?.total ?? 0, icon: Users, iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
    { label: 'Clientes totales', value: data?.clients?.total ?? 0, icon: Users, iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
    { label: 'Facturas totales', value: data?.invoices?.total ?? 0, icon: FileText, iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600' },
    { label: 'Suscripciones activas', value: data?.subscriptions?.active ?? 0, icon: CreditCard, iconBg: 'bg-teal-100', iconColor: 'text-teal-600' },
    { label: 'Total cobrado', value: formatCurrency(data?.payments?.totalCollected ?? 0), icon: CreditCard, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Métricas globales</h1>
        <p className="text-gray-500 text-sm mt-1">Vista consolidada de toda la plataforma</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
