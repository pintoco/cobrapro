'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Building2, ChevronLeft, ChevronRight, Ban, CheckCircle } from 'lucide-react';

export default function AdminEmpresasPage() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-companies', page],
    queryFn: () => adminApi.listCompanies({ page, limit: 20 }).then((r) => r.data.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.changeCompanyStatus(id, status),
    onSuccess: () => {
      toast.success('Estado actualizado');
      qc.invalidateQueries({ queryKey: ['admin-companies'] });
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const companies = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
        <p className="text-gray-500 text-sm mt-1">Gestión de todas las empresas del sistema</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Empresa</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">RUT</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Plan</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Usuarios</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Creada</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}><td colSpan={7} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
            ))}
            {companies.map((c: any) => (
              <tr key={c.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{c.rutEmpresa ?? '—'}</td>
                <td className="px-4 py-3">
                  {c.subscription ? (
                    <span className="badge bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                      {c.subscription.plan?.name ?? '—'}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Sin plan</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{c._count?.users ?? 0}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    c.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    c.status === 'SUSPENDED' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {c.status === 'ACTIVE' ? 'Activa' : c.status === 'SUSPENDED' ? 'Suspendida' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(c.createdAt)}</td>
                <td className="px-4 py-3">
                  {c.status === 'ACTIVE' ? (
                    <button
                      onClick={() => statusMutation.mutate({ id: c.id, status: 'SUSPENDED' })}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Suspender"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => statusMutation.mutate({ id: c.id, status: 'ACTIVE' })}
                      className="text-green-500 hover:text-green-700 p-1"
                      title="Activar"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginación */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              {meta.total} empresas · Página {meta.page} de {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!meta.hasPrevPage}
                className="btn-secondary py-1 px-2 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!meta.hasNextPage}
                className="btn-secondary py-1 px-2 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
