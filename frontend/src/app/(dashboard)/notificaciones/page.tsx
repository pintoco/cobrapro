'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { PaginatedResult } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  REMINDER_3_DAYS_BEFORE: '3 días antes',
  REMINDER_1_DAY_BEFORE:  '1 día antes',
  REMINDER_DUE_TODAY:     'Vence hoy',
  REMINDER_1_DAY_OVERDUE: '1 día vencida',
  REMINDER_3_DAYS_OVERDUE:'3 días vencida',
  REMINDER_7_DAYS_OVERDUE:'7 días vencida',
};

export default function NotificacionesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<PaginatedResult<any>>({
    queryKey: ['notifications', page],
    queryFn: () => notificationsApi.getAll({ page, limit: 20 }).then((r) => r.data.data),
  });

  const triggerMutation = useMutation({
    mutationFn: () => notificationsApi.triggerReminders(),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(res.data.message ?? 'Recordatorios enviados');
    },
    onError: () => toast.error('Error al disparar recordatorios'),
  });

  const notifications = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex justify-end">
        <button
          onClick={() => triggerMutation.mutate()}
          disabled={triggerMutation.isPending}
          className="btn-primary"
        >
          <Play className="w-4 h-4" />
          {triggerMutation.isPending ? 'Enviando...' : 'Disparar recordatorios'}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <Bell className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Historial de notificaciones</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Tipo</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Destinatario</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Enviado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : notifications.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-gray-400 text-sm">Sin notificaciones enviadas</td></tr>
              ) : (
                notifications.map((n: any) => (
                  <tr key={n.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 text-gray-700 text-xs">
                      {TYPE_LABELS[n.type] ?? n.type}
                    </td>
                    <td className="px-5 py-4 text-gray-600 text-xs">{n.recipientEmail}</td>
                    <td className="px-5 py-4">
                      <span className={`badge ${n.status === 'SENT' ? 'bg-green-100 text-green-800' : n.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {n.status === 'SENT' ? 'Enviado' : n.status === 'FAILED' ? 'Fallido' : n.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      {n.sentAt ? formatDate(n.sentAt) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500 text-xs">
              {meta.total} notificaciones · página {meta.page} de {meta.totalPages}
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
    </div>
  );
}
