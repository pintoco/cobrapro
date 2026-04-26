'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { DollarSign, AlertTriangle, TrendingUp, Users, Clock } from 'lucide-react';
import { dashboardApi } from '@/lib/api';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { MonthlyChart } from '@/components/dashboard/MonthlyChart';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { DashboardSummary, OverdueInvoice, DelinquentClient, MonthlyCollection } from '@/types';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export default function DashboardPage() {
  const { data: summary, isLoading: loadingSummary } = useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary().then((r) => r.data.data),
  });

  const { data: overdueList = [], isLoading: loadingOverdue } = useQuery<OverdueInvoice[]>({
    queryKey: ['dashboard', 'overdue'],
    queryFn: () => dashboardApi.getOverdueInvoices(8).then((r) => r.data.data),
  });

  const { data: delinquentList = [], isLoading: loadingDelinquent } = useQuery<DelinquentClient[]>({
    queryKey: ['dashboard', 'delinquent'],
    queryFn: () => dashboardApi.getDelinquentClients(6).then((r) => r.data.data),
  });

  const { data: monthly = [] } = useQuery<MonthlyCollection[]>({
    queryKey: ['dashboard', 'monthly'],
    queryFn: () => dashboardApi.getMonthlyCollections(12).then((r) => r.data.data),
  });

  const growthPercent = summary?.collections.growthPercent;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loadingSummary ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <KpiCard
              title="Total por cobrar"
              value={formatCurrency(summary?.receivables.total ?? 0)}
              subtitle={`${summary?.invoiceCounts.openTotal ?? 0} facturas abiertas`}
              icon={DollarSign}
              iconBg="bg-brand-100"
              iconColor="text-brand-600"
            />
            <KpiCard
              title="Facturas vencidas"
              value={formatCurrency(summary?.receivables.overdue ?? 0)}
              subtitle={`${summary?.invoiceCounts.overdue ?? 0} facturas`}
              icon={AlertTriangle}
              iconBg="bg-red-100"
              iconColor="text-red-600"
            />
            <KpiCard
              title="Cobrado este mes"
              value={formatCurrency(summary?.collections.collectedThisMonth ?? 0)}
              subtitle={`${summary?.collections.paidInvoicesThisMonth ?? 0} facturas pagadas`}
              icon={TrendingUp}
              iconBg="bg-green-100"
              iconColor="text-green-600"
              trend={
                growthPercent !== null && growthPercent !== undefined
                  ? { value: `${Math.abs(growthPercent)}% vs mes anterior`, positive: growthPercent >= 0 }
                  : null
              }
            />
            <KpiCard
              title="Clientes morosos"
              value={String(summary?.clients.delinquent ?? 0)}
              subtitle={`de ${summary?.clients.active ?? 0} clientes activos`}
              icon={Users}
              iconBg="bg-orange-100"
              iconColor="text-orange-600"
            />
          </>
        )}
      </div>

      {/* Chart + Delinquent Clients */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Monthly Chart */}
        <div className="card p-5 xl:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Cobrado vs Facturado — últimos 12 meses</h2>
          {monthly.length > 0 ? (
            <MonthlyChart data={monthly} />
          ) : (
            <Skeleton className="h-64" />
          )}
        </div>

        {/* Delinquent Clients */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Clientes morosos</h2>
          {loadingDelinquent ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : delinquentList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin clientes morosos 🎉</p>
          ) : (
            <div className="space-y-3">
              {delinquentList.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/clientes/${c.id}`}
                      className="text-sm font-medium text-brand-600 hover:underline truncate block"
                    >
                      {c.firstName} {c.lastName}
                    </Link>
                    <p className="text-xs text-gray-400">
                      {c.overdueInvoicesCount} factura{c.overdueInvoicesCount !== 1 ? 's' : ''} · {c.maxDaysOverdue}d
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-red-600 flex-shrink-0">
                    {formatCurrency(c.totalDebt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overdue Invoices */}
      <div className="card">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Facturas vencidas</h2>
          <span className="badge bg-red-100 text-red-700">{overdueList.length}</span>
        </div>

        {loadingOverdue ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : overdueList.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin facturas vencidas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Factura</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cliente</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Vencimiento</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Días</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {overdueList.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/facturas/${inv.id}`}
                        className="font-mono text-xs text-brand-600 hover:underline font-medium"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{inv.client.firstName} {inv.client.lastName}</p>
                      <p className="text-xs text-gray-400">{inv.client.email}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{formatDate(inv.dueDate)}</td>
                    <td className="px-5 py-3">
                      <span className="badge bg-red-100 text-red-700 flex items-center gap-1 w-fit">
                        <Clock className="w-3 h-3" />
                        {inv.daysOverdue}d
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-red-600">
                      {formatCurrency(inv.remaining)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
