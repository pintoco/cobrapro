'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ChevronLeft, ChevronRight, MoreVertical, Edit2, Trash2, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsApi } from '@/lib/api';
import { cn, formatDate, CLIENT_STATUS_CONFIG, getInitials, DOCUMENT_TYPE_LABELS } from '@/lib/utils';
import { ClienteModal, type ClienteFormData } from '@/components/clientes/ClienteModal';
import type { Client, PaginatedResult } from '@/types';

export default function ClientesPage() {
  const qc = useQueryClient();
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [modalOpen, setModal]   = useState(false);
  const [editing, setEditing]   = useState<Client | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  const { data, isLoading } = useQuery<PaginatedResult<Client>>({
    queryKey: ['clients', page, search, status],
    queryFn: () =>
      clientsApi.getAll({ page, limit: 15, search: search || undefined, status: status || undefined })
        .then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente eliminado');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al eliminar'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      clientsApi.changeStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Estado actualizado');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const handleSubmit = async (form: ClienteFormData) => {
    setSaving(true);
    try {
      if (editing) {
        await clientsApi.update(editing.id, form);
        toast.success('Cliente actualizado');
      } else {
        await clientsApi.create(form);
        toast.success('Cliente creado');
      }
      qc.invalidateQueries({ queryKey: ['clients'] });
      setModal(false);
      setEditing(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (c: Client) => { setEditing(c); setModal(true); setMenuOpen(null); };
  const openNew  = () => { setEditing(null); setModal(true); };

  const meta = data?.meta;
  const clients = data?.data ?? [];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar nombre, email, doc..."
              className="input pl-9"
            />
          </div>
          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="select w-36"
          >
            <option value="">Todos</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
            <option value="BLOCKED">Bloqueados</option>
          </select>
        </div>
        <button onClick={openNew} className="btn-primary flex-shrink-0">
          <Plus className="w-4 h-4" /> Nuevo cliente
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left bg-gray-50/50">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cliente</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Documento</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Teléfono</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Ciudad</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Creado</th>
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
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
                    No hay clientes que mostrar
                  </td>
                </tr>
              ) : (
                clients.map((c) => {
                  const cfg = CLIENT_STATUS_CONFIG[c.status];
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-brand-700">
                              {getInitials(c.firstName, c.lastName)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{c.firstName} {c.lastName}</p>
                            <p className="text-xs text-gray-400">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600 text-xs">
                        <span className="font-medium">{DOCUMENT_TYPE_LABELS[c.documentType]}</span>
                        <br />{c.documentNumber}
                      </td>
                      <td className="px-5 py-4 text-gray-600">{c.phone ?? '—'}</td>
                      <td className="px-5 py-4 text-gray-600">{c.city ?? '—'}</td>
                      <td className="px-5 py-4">
                        <span className={`badge ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="px-5 py-4 text-gray-500 text-xs">{formatDate(c.createdAt)}</td>
                      <td className="px-5 py-4 relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === c.id ? null : c.id)}
                          className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuOpen === c.id && (
                          <div className="absolute right-4 top-10 z-10 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]">
                            <button
                              onClick={() => openEdit(c)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Edit2 className="w-4 h-4" /> Editar
                            </button>
                            {c.status !== 'ACTIVE' && (
                              <button
                                onClick={() => { statusMutation.mutate({ id: c.id, status: 'ACTIVE' }); setMenuOpen(null); }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                              >
                                <UserCheck className="w-4 h-4" /> Activar
                              </button>
                            )}
                            {c.status !== 'BLOCKED' && (
                              <button
                                onClick={() => { statusMutation.mutate({ id: c.id, status: 'BLOCKED' }); setMenuOpen(null); }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-700 hover:bg-orange-50"
                              >
                                <UserX className="w-4 h-4" /> Bloquear
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (confirm('¿Eliminar este cliente?')) {
                                  deleteMutation.mutate(c.id);
                                }
                                setMenuOpen(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                          </div>
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
              {meta.total} clientes · página {meta.page} de {meta.totalPages}
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

      <ClienteModal
        open={modalOpen}
        onClose={() => { setModal(false); setEditing(null); }}
        onSubmit={handleSubmit}
        initial={editing}
        loading={saving}
      />

      {/* Close dropdown on outside click */}
      {menuOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(null)} />
      )}
    </div>
  );
}
