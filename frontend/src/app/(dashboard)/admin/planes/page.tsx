'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Check, X } from 'lucide-react';

export default function AdminPlanesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => adminApi.listPlans().then((r) => r.data.data),
  });

  const plans = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Planes SaaS</h1>
        <p className="text-gray-500 text-sm mt-1">Configuración de planes y suscripciones</p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card h-80 animate-pulse bg-gray-100" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan: any) => (
          <div
            key={plan.id}
            className={`card relative overflow-hidden ${
              plan.name === 'Pro' ? 'ring-2 ring-brand-500' : ''
            }`}
          >
            {plan.name === 'Pro' && (
              <div className="absolute top-0 right-0 bg-brand-600 text-white text-xs px-3 py-1 rounded-bl-lg font-medium">
                Más popular
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900">
                  {formatCurrency(plan.priceCLP)}
                </span>
                <span className="text-gray-500 text-sm">/mes</span>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {[
                { label: `${plan.maxUsers} usuarios`, ok: true },
                { label: `${plan.maxClients} clientes`, ok: true },
                { label: `${plan.maxInvoicesPerMonth} facturas/mes`, ok: true },
                { label: 'WhatsApp Business', ok: plan.allowWhatsApp },
                { label: 'Importar Excel', ok: plan.allowExcelImport },
                { label: 'Reportes avanzados', ok: plan.allowAdvancedReports },
              ].map(({ label, ok }) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  {ok ? (
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  )}
                  <span className={ok ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                {plan._count?.subscriptions ?? 0} suscriptores
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {plan.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
