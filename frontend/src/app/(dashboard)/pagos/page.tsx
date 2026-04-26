'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { paymentsApi } from '@/lib/api';
import { formatDate, formatCurrency, PAYMENT_METHOD_LABELS } from '@/lib/utils';
import type { Payment, PaginatedResult } from '@/types';

export default function PagosPage() {
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<PaginatedResult<Payment>>({
    queryKey: ['payments', page, search],
    queryFn: () =>
      paymentsApi.getAll({ page, limit: 15, search: search || undefined })
        .then((r) => r.data.data),
  });

  const payments = data?.data ?? [];
  const meta     = data?.meta;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="relative max-w-xs">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar referencia..."
          className="input pl-9"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left bg-gray-50/50">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Método</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Referencia</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : payments.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-sm">Sin pagos registrados</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 text-gray-600 text-xs">{formatDate(p.paymentDate)}</td>
                    <td className="px-5 py-4 text-gray-700">{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</td>
                    <td className="px-5 py-4 text-gray-500 font-mono text-xs">{p.reference ?? '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`badge ${p.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {p.status === 'COMPLETED' ? 'Completado' : 'Anulado'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-gray-900">{formatCurrency(Number(p.amount))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {meta && meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-gray-500 text-xs">{meta.total} pagos · pág {meta.page}/{meta.totalPages}</span>
            <div className="flex gap-2">
              <button disabled={!meta.hasPrevPage} onClick={() => setPage(page - 1)} className="btn-secondary py-1.5 px-3 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={!meta.hasNextPage} onClick={() => setPage(page + 1)} className="btn-secondary py-1.5 px-3 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
