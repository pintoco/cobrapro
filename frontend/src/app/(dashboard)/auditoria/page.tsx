'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Clock, Filter } from 'lucide-react';
import { auditApi } from '@/lib/api';
import { formatDate, formatRelativeDate } from '@/lib/utils';
import type { AuditLog, PaginatedResult } from '@/types';

const ACTION_LABELS: Record<string, string> = {
  CREATE:            'Creó',
  UPDATE:            'Actualizó',
  DELETE:            'Eliminó',
  STATUS_CHANGE:     'Cambió estado',
  LOGIN:             'Inició sesión',
  LOGOUT:            'Cerró sesión',
  SEND_NOTIFICATION: 'Notificación',
  IMPORT:            'Importó',
};

const ACTION_COLORS: Record<string, string> = {
  CREATE:            'bg-green-100 text-green-800',
  UPDATE:            'bg-blue-100 text-blue-800',
  DELETE:            'bg-red-100 text-red-800',
  STATUS_CHANGE:     'bg-amber-100 text-amber-800',
  LOGIN:             'bg-gray-100 text-gray-600',
  LOGOUT:            'bg-gray-100 text-gray-600',
  SEND_NOTIFICATION: 'bg-purple-100 text-purple-800',
  IMPORT:            'bg-teal-100 text-teal-800',
};

const ENTITY_LABELS: Record<string, string> = {
  Client:       'Cliente',
  Invoice:      'Factura',
  Payment:      'Pago',
  User:         'Usuario',
  Company:      'Empresa',
  Notification: 'Notificación',
};

export default function AuditoriaPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');

  const { data, isLoading } = useQuery<PaginatedResult<AuditLog>>({
    queryKey: ['audit-logs', page, action, entity],
    queryFn: () =>
      auditApi
        .getAll({
          page,
          limit: 20,
          action: action || undefined,
          entity: entity || undefined,
        })
        .then((r) => r.data.data),
  });

  const logs = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter className="w-4 h-4" /> Filtrar:
        </div>
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="select max-w-[180px]"
        >
          <option value="">Todas las acciones</option>
          {Object.entries(ACTION_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={entity}
          onChange={(e) => {
            setEntity(e.target.value);
            setPage(1);
          }}
          className="select max-w-[180px]"
        >
          <option value="">Todas las entidades</option>
          {Object.entries(ENTITY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        {(action || entity) && (
          <button
            onClick={() => {
              setAction('');
              setEntity('');
              setPage(1);
            }}
            className="btn-secondary py-1.5 px-3 text-xs"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left bg-gray-50/50">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Fecha
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Usuario
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Acción
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Entidad
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  ID Registro
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-gray-400 text-sm"
                  >
                    No hay registros de auditoría
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-700">{formatDate(log.createdAt)}</p>
                          <p className="text-xs text-gray-400">
                            {formatRelativeDate(log.createdAt)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {log.user ? (
                        <p className="text-gray-700">
                          {log.user.firstName} {log.user.lastName}
                        </p>
                      ) : (
                        <span className="text-gray-400 text-xs">Sistema</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`badge ${
                          ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {ENTITY_LABELS[log.entity] ?? log.entity}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-gray-400">
                        {log.entityId?.slice(0, 8) ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500 text-xs">
              {meta.total} registros · página {meta.page} de {meta.totalPages}
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
