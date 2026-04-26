'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft, Mail, Phone, MapPin, FileText,
  AlertCircle, UserCheck, UserX, Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsApi, invoicesApi } from '@/lib/api';
import {
  cn, formatCurrency, formatDate,
  CLIENT_STATUS_CONFIG, INVOICE_STATUS_CONFIG,
} from '@/lib/utils';
import type { Client, Invoice, PaginatedResult } from '@/types';

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: client, isLoading } = useQuery<Client>({
    queryKey: ['client', id],
    queryFn: () => clientsApi.getById(id).then((r) => r.data.data),
    enabled: !!id,
  });

  const { data: invoicesResult } = useQuery<PaginatedResult<Invoice>>({
    queryKey: ['invoices', 'client', id],
    queryFn: () =>
      invoicesApi.getAll({ clientId: id, limit: 50 }).then((r) => r.data.data),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => clientsApi.changeStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', id] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Estado actualizado');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="card p-6 animate-pulse h-40" />
        ))}
      </div>
    );
  }

  if (!client) {
    return (
      <div className="max-w-5xl mx-auto card p-12 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Cliente no encontrado</p>
        <button onClick={() => router.back()} className="btn-secondary mt-4">
          Volver
        </button>
      </div>
    );
  }

  const invoices: Invoice[] = invoicesResult?.data ?? [];
  const cfg = CLIENT_STATUS_CONFIG[client.status];

  const totalDebt = invoices
    .filter((i) => ['PENDING', 'OVERDUE', 'PARTIAL'].includes(i.status))
    .reduce((sum, i) => sum + Number(i.total), 0);

  const overdueCount = invoices.filter((i) => i.status === 'OVERDUE').length;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn-secondary py-1.5 px-3">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">
                {client.firstName} {client.lastName}
              </h1>
              <span className={`badge ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
            </div>
            {client.razonSocial && (
              <p className="text-sm text-gray-500">{client.razonSocial}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {client.status !== 'ACTIVE' && (
            <button
              onClick={() => statusMutation.mutate('ACTIVE')}
              disabled={statusMutation.isPending}
              className="btn-secondary text-green-700 border-green-200 hover:bg-green-50"
            >
              <UserCheck className="w-4 h-4" /> Activar
            </button>
          )}
          {client.status !== 'BLOCKED' && (
            <button
              onClick={() => {
                if (confirm('¿Bloquear este cliente?')) statusMutation.mutate('BLOCKED');
              }}
              disabled={statusMutation.isPending}
              className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
            >
              <UserX className="w-4 h-4" /> Bloquear
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total facturas</p>
          <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Deuda pendiente</p>
          <p className={cn('text-lg font-bold', totalDebt > 0 ? 'text-red-600' : 'text-gray-400')}>
            {formatCurrency(totalDebt)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Vencidas</p>
          <p
            className={cn(
              'text-2xl font-bold',
              overdueCount > 0 ? 'text-red-600' : 'text-gray-400',
            )}
          >
            {overdueCount}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Cliente desde</p>
          <p className="text-sm font-semibold text-gray-700">{formatDate(client.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Client info */}
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" /> Información
            </h2>
            <dl className="space-y-3 text-sm">
              {client.rut && (
                <div>
                  <dt className="text-xs text-gray-500">RUT</dt>
                  <dd className="font-medium text-gray-800">{client.rut}</dd>
                </div>
              )}
              {client.giro && (
                <div>
                  <dt className="text-xs text-gray-500">Giro</dt>
                  <dd className="font-medium text-gray-800">{client.giro}</dd>
                </div>
              )}
              {client.contactoPrincipal && (
                <div>
                  <dt className="text-xs text-gray-500">Contacto</dt>
                  <dd className="font-medium text-gray-800">{client.contactoPrincipal}</dd>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Mail className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 break-all">{client.email}</span>
              </div>
              {client.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700">{client.phone}</span>
                </div>
              )}
              {(client.ciudad || client.comuna) && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    {[client.comuna, client.ciudad].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {client.address && (
                <div>
                  <dt className="text-xs text-gray-500">Dirección</dt>
                  <dd className="text-gray-700">{client.address}</dd>
                </div>
              )}
              {client.notes && (
                <div>
                  <dt className="text-xs text-gray-500">Notas</dt>
                  <dd className="text-gray-700">{client.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Invoices */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700">Facturas</h2>
              </div>
              <Link href={`/facturas?clientId=${client.id}`} className="text-xs text-brand-600 hover:underline">
                Ver todas
              </Link>
            </div>
            {invoices.length === 0 ? (
              <div className="px-5 py-10 text-center text-gray-400 text-sm">
                Sin facturas registradas
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                      <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        N° Factura
                      </th>
                      <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Vencimiento
                      </th>
                      <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Estado
                      </th>
                      <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {invoices.map((inv) => {
                      const invCfg = INVOICE_STATUS_CONFIG[inv.status];
                      return (
                        <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3">
                            <Link
                              href={`/facturas/${inv.id}`}
                              className="font-mono text-xs text-brand-600 hover:underline font-medium"
                            >
                              {inv.invoiceNumber}
                            </Link>
                          </td>
                          <td
                            className={cn(
                              'px-5 py-3 text-xs',
                              inv.status === 'OVERDUE'
                                ? 'text-red-600 font-medium'
                                : 'text-gray-600',
                            )}
                          >
                            {formatDate(inv.dueDate)}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`badge ${invCfg.bg} ${invCfg.color}`}>
                              {invCfg.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-gray-900">
                            {formatCurrency(Number(inv.total), inv.currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
