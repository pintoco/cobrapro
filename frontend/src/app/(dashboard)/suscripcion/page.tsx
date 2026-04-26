'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, AlertCircle, Users, FileText, Zap, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { subscriptionsApi, invoicesApi } from '@/lib/api';
import { cn, formatCurrency, formatDate, SUBSCRIPTION_STATUS_CONFIG } from '@/lib/utils';
import type { CompanySubscription, SubscriptionPlan } from '@/types';

export default function SuscripcionPage() {
  const qc = useQueryClient();

  const { data: subscription, isLoading } = useQuery<CompanySubscription | null>({
    queryKey: ['subscription'],
    queryFn: () => subscriptionsApi.getMy().then((r) => r.data.data),
  });

  const { data: plans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ['plans'],
    queryFn: () => subscriptionsApi.getPlans().then((r) => r.data.data),
  });

  const { data: invoiceStats } = useQuery<any>({
    queryKey: ['invoice-stats'],
    queryFn: () => invoicesApi.getStats().then((r) => r.data.data),
  });

  const subscribeMutation = useMutation({
    mutationFn: (planId: string) => subscriptionsApi.subscribe(planId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription'] });
      toast.success('Plan actualizado exitosamente');
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message || 'Error al cambiar plan'),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="card p-6 animate-pulse h-40" />
        ))}
      </div>
    );
  }

  const currentPlan = subscription?.plan;
  const statusCfg = subscription
    ? SUBSCRIPTION_STATUS_CONFIG[subscription.status]
    : null;

  const totalInvoiceCount = invoiceStats
    ? (invoiceStats.counts?.pending ?? 0) +
      (invoiceStats.counts?.overdue ?? 0) +
      (invoiceStats.counts?.paid ?? 0)
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Current subscription */}
      {subscription && currentPlan ? (
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Plan actual</p>
              <h2 className="text-2xl font-bold text-gray-900">{currentPlan.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {statusCfg && (
                  <span className={`badge ${statusCfg.bg} ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                )}
                {subscription.currentPeriodEnd && (
                  <span className="text-xs text-gray-500">
                    Vence: {formatDate(subscription.currentPeriodEnd)}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-brand-600">
                {formatCurrency(Number(currentPlan.priceCLP))}
              </p>
              <p className="text-xs text-gray-500">/ mes</p>
            </div>
          </div>

          {subscription.status === 'TRIAL' && subscription.trialEndsAt && (
            <div className="p-3 bg-purple-50 rounded-lg flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <p className="text-sm text-purple-700">
                Período de prueba activo hasta el{' '}
                <strong>{formatDate(subscription.trialEndsAt)}</strong>
              </p>
            </div>
          )}

          {/* Limits */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-xs text-gray-500 font-medium">Clientes</p>
              </div>
              <p className="text-xs text-gray-600">
                Máximo{' '}
                <span className="font-bold text-gray-900">{currentPlan.maxClients}</span>
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-xs text-gray-500 font-medium">Facturas/mes</p>
              </div>
              <p className="text-xs text-gray-600">
                {totalInvoiceCount !== null ? (
                  <>
                    <span className="font-bold text-gray-900">{totalInvoiceCount}</span>
                    {' / '}
                  </>
                ) : null}
                Máximo{' '}
                <span className="font-bold text-gray-900">
                  {currentPlan.maxInvoicesPerMonth}
                </span>
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-xs text-gray-500 font-medium">Usuarios</p>
              </div>
              <p className="text-xs text-gray-600">
                Máximo{' '}
                <span className="font-bold text-gray-900">{currentPlan.maxUsers}</span>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-6 flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Sin suscripción activa</p>
            <p className="text-sm text-gray-500">
              Seleccione un plan para continuar usando CobranzaPro
            </p>
          </div>
        </div>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Planes disponibles</h2>
        {plans.length === 0 ? (
          <div className="card p-8 text-center text-gray-400 text-sm">
            No hay planes disponibles
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isCurrent = currentPlan?.id === plan.id;
              const isPopular = plan.name.toLowerCase().includes('pro');
              return (
                <div
                  key={plan.id}
                  className={cn(
                    'card p-5 relative flex flex-col',
                    isCurrent && 'ring-2 ring-brand-500',
                    isPopular && !isCurrent && 'ring-2 ring-amber-400',
                  )}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                        Más popular
                      </span>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 right-4">
                      <span className="bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                        Actual
                      </span>
                    </div>
                  )}

                  <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                  <p className="text-3xl font-bold text-gray-900 mt-2 mb-4">
                    {formatCurrency(Number(plan.priceCLP))}
                    <span className="text-sm font-normal text-gray-500">/mes</span>
                  </p>

                  <ul className="space-y-2 mb-5 text-sm flex-1">
                    <FeatureItem value={`${plan.maxClients} clientes`} />
                    <FeatureItem value={`${plan.maxUsers} usuarios`} />
                    <FeatureItem value={`${plan.maxInvoicesPerMonth} facturas/mes`} />
                    <FeatureItem value="Recordatorios automáticos" />
                    <FeatureItem value="Importación Excel" enabled={plan.allowExcelImport} />
                    <FeatureItem value="WhatsApp Business" enabled={plan.allowWhatsApp} />
                    <FeatureItem
                      value="Reportes avanzados"
                      enabled={plan.allowAdvancedReports}
                    />
                  </ul>

                  <button
                    onClick={() => subscribeMutation.mutate(plan.id)}
                    disabled={isCurrent || subscribeMutation.isPending}
                    className={cn(
                      'w-full justify-center mt-auto',
                      isCurrent ? 'btn-secondary opacity-60 cursor-default' : 'btn-primary',
                    )}
                  >
                    <Zap className="w-4 h-4" />
                    {isCurrent ? 'Plan actual' : 'Seleccionar plan'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureItem({ value, enabled = true }: { value: string; enabled?: boolean }) {
  return (
    <li className={cn('flex items-center gap-2', !enabled && 'opacity-40')}>
      {enabled ? (
        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
      ) : (
        <X className="w-4 h-4 text-gray-300 flex-shrink-0" />
      )}
      <span className="text-gray-700">{value}</span>
    </li>
  );
}
