'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, ChevronLeft, ChevronRight,
  MoreVertical, XCircle, CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { invoicesApi } from '@/lib/api';
import { cn, formatDate, formatCurrency, INVOICE_STATUS_CONFIG } from '@/lib/utils';
import { FacturaModal, type FacturaFormData } from '@/components/facturas/FacturaModal';
import type { Invoice, PaginatedResult } from '@/types';

const STATUS_OPTIONS = [
  { value: '',          label: 'Todos' },
  { value: 'PENDING',   label: 'Pendientes' },
  { value: 'OVERDUE',   label: 'Vencidas' },
  { value: 'PARTIAL',   label: 'Parciales' },
  { value: 'PAID',      label: 'Pagadas' },
  { value: 'CANCELLED', label: 'Anuladas' },
];

export default function FacturasPage() {
  const qc = useQueryClient();
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [modalOpen, setModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);

  const { data, isLoading } = useQuery<PaginatedResult<Invoice>>({
    queryKey: ['invoices', page, search, status],
    queryFn: () =>
      invoicesApi.getAll({ page, limit: 15, search: search || undefined, status: status || undefined })
        .then((r) => r.data.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Factura anulada');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al anular'),
  });

  const handleSubmit = async (form: FacturaFormData) => {
    setSaving(true);
    try {
      await invoicesApi.create({
        clientId:  form.clientId,
        issueDate: form.issueDate,
        dueDate:   form.dueDate,
        currency:  form.currency,
        taxRate:   form.taxRate,
        discount:  form.discount,
        notes:     form.notes || undefined,
        items: form.items.map((item) => ({
          description: item.description,
          quantity:    item.quantity,
          unitPrice:   item.unitPrice,
        })),
      });
      toast.success('Factura creada');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setModal(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al crear factura');
    } finally {
      setSaving(false);
    }
  };

  const invoices = data?.data ?? [];
  const meta     = data?.meta;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="N° factura, cliente..."
              className="input pl-9"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setStatus(value); setPage(1); }}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                  status === value
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex-shrink-0">
          <Plus className="w-4 h-4" /> Nueva factura
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left bg-gray-50/50">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">N° Factura</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cliente</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Emisión</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Vencimiento</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Total</th>
                <th className="px-5 py-3 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
                    No hay facturas que mostrar
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const cfg = INVOICE_STATUS_CONFIG[inv.status];
                  const isOverdue = inv.status === 'OVERDUE';
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-gray-700 font-medium">{inv.invoiceNumber}</span>
                      </td>
                      <td className="px-5 py-4">
                        {inv.client ? (
                          <>
                            <p className="font-medium text-gray-800">{inv.client.firstName} {inv.client.lastName}</p>
                            <p className="text-xs text-gray-400">{inv.client.email}</p>
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-600 text-xs">{formatDate(inv.issueDate)}</td>
                      <td className={cn('px-5 py-4 text-xs', isOverdue ? 'text-red-600 font-medium' : 'text-gray-600')}>
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`badge ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-gray-900">
                        {formatCurrency(Number(inv.total), inv.currency)}
                      </td>
                      <td className="px-5 py-4 relative">
                        {!['PAID', 'CANCELLED'].includes(inv.status) && (
                          <>
                            <button
                              onClick={() => setMenuOpen(menuOpen === inv.id ? null : inv.id)}
                              className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {menuOpen === inv.id && (
                              <div className="absolute right-4 top-10 z-10 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[150px]">
                                {inv.status !== 'PAID' && (
                                  <button
                                    onClick={() => {
                                      invoicesApi.changeStatus(inv.id, 'PAID').then(() => {
                                        qc.invalidateQueries({ queryKey: ['invoices'] });
                                        qc.invalidateQueries({ queryKey: ['dashboard'] });
                                        toast.success('Factura marcada como pagada');
                                      }).catch((e: any) => toast.error(e.response?.data?.message || 'Error'));
                                      setMenuOpen(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                                  >
                                    <CheckCircle className="w-4 h-4" /> Marcar pagada
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    if (confirm('¿Anular esta factura?')) {
                                      cancelMutation.mutate(inv.id);
                                    }
                                    setMenuOpen(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <XCircle className="w-4 h-4" /> Anular
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500 text-xs">
              {meta.total} facturas · página {meta.page} de {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={!meta.hasPrevPage}
                onClick={() => setPage(page - 1)}
                className="btn-secondary py-1.5 px-3 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={!meta.hasNextPage}
                onClick={() => setPage(page + 1)}
                className="btn-secondary py-1.5 px-3 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <FacturaModal open={modalOpen} onClose={() => setModal(false)} onSubmit={handleSubmit} loading={saving} />

      {menuOpen && <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(null)} />}
    </div>
  );
}
