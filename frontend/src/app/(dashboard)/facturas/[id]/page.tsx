'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle, XCircle, CreditCard,
  FileText, Calendar, User, MessageSquare, Clock, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { invoicesApi, paymentsApi, collectionNotesApi } from '@/lib/api';
import {
  cn, formatCurrency, formatDate,
  INVOICE_STATUS_CONFIG, PAYMENT_METHOD_LABELS,
} from '@/lib/utils';
import type { Invoice, Payment, CollectionNote, PaginatedResult } from '@/types';

const PAYMENT_METHODS = [
  { value: 'TRANSFERENCIA_ELECTRONICA', label: 'Transferencia Electrónica' },
  { value: 'BANK_TRANSFER',             label: 'Transferencia Bancaria' },
  { value: 'CASH',                      label: 'Efectivo' },
  { value: 'CHECK',                     label: 'Cheque' },
  { value: 'CREDIT_CARD',               label: 'Tarjeta de Crédito' },
  { value: 'DEBIT_CARD',                label: 'Tarjeta de Débito' },
  { value: 'WEBPAY',                    label: 'WebPay' },
  { value: 'OTHER',                     label: 'Otro' },
];

export default function FacturaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [paymentModal, setPaymentModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [promiseDate, setPromiseDate] = useState('');
  const [promiseComment, setPromiseComment] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'TRANSFERENCIA_ELECTRONICA',
    paymentDate: new Date().toISOString().slice(0, 10),
    reference: '',
  });

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.getById(id).then((r) => r.data.data),
    enabled: !!id,
  });

  const { data: paymentsResult } = useQuery<PaginatedResult<Payment>>({
    queryKey: ['payments', 'invoice', id],
    queryFn: () =>
      paymentsApi.getAll({ invoiceId: id, limit: 100 }).then((r) => r.data.data),
    enabled: !!id,
  });

  const { data: notes = [], refetch: refetchNotes } = useQuery<CollectionNote[]>({
    queryKey: ['collection-notes', id],
    queryFn: () =>
      collectionNotesApi.getByInvoice(id).then((r) => r.data.data),
    enabled: !!id,
  });

  const registerPaymentMutation = useMutation({
    mutationFn: (data: any) => paymentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      qc.invalidateQueries({ queryKey: ['payments', 'invoice', id] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setPaymentModal(false);
      setPaymentForm({
        amount: '',
        method: 'TRANSFERENCIA_ELECTRONICA',
        paymentDate: new Date().toISOString().slice(0, 10),
        reference: '',
      });
      toast.success('Pago registrado exitosamente');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al registrar pago'),
  });

  const addNoteMutation = useMutation({
    mutationFn: (note: string) =>
      collectionNotesApi.create({ invoiceId: id, clientId: invoice!.clientId, note }),
    onSuccess: () => {
      refetchNotes();
      setNoteText('');
      toast.success('Nota agregada');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const updatePromiseMutation = useMutation({
    mutationFn: (data: any) => collectionNotesApi.updatePromise(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      toast.success('Promesa guardada');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const changeStatusMutation = useMutation({
    mutationFn: (status: string) => invoicesApi.changeStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Estado actualizado');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-6 animate-pulse h-32" />
        ))}
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-5xl mx-auto card p-12 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Factura no encontrada</p>
        <button onClick={() => router.back()} className="btn-secondary mt-4">
          Volver
        </button>
      </div>
    );
  }

  const payments: Payment[] = paymentsResult?.data ?? [];
  const cfg = INVOICE_STATUS_CONFIG[invoice.status];

  const totalPaid = payments
    .filter((p) => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Math.max(0, Number(invoice.total) - totalPaid);
  const canEdit = !['PAID', 'CANCELLED'].includes(invoice.status);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) return toast.error('Ingrese un monto válido');
    if (amount > remaining + 0.01)
      return toast.error(
        `El monto supera el saldo pendiente (${formatCurrency(remaining, invoice.currency)})`,
      );
    registerPaymentMutation.mutate({
      invoiceId: id,
      clientId: invoice.clientId,
      amount,
      paymentDate: paymentForm.paymentDate,
      method: paymentForm.method,
      reference: paymentForm.reference || undefined,
    });
  };

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
              <h1 className="text-xl font-bold text-gray-900 font-mono">
                {invoice.invoiceNumber}
              </h1>
              <span className={`badge ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
            </div>
            <p className="text-sm text-gray-500">
              {invoice.tipoDocumento}
              {invoice.folio ? ` · Folio ${invoice.folio}` : ''}
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setPaymentModal(true)} className="btn-primary">
              <CreditCard className="w-4 h-4" /> Registrar pago
            </button>
            <button
              onClick={() => {
                if (confirm('¿Anular esta factura?')) changeStatusMutation.mutate('CANCELLED');
              }}
              className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4" /> Anular
            </button>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total factura</p>
          <p className="text-lg font-bold text-gray-900">
            {formatCurrency(Number(invoice.total), invoice.currency)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Pagado</p>
          <p className="text-lg font-bold text-green-600">
            {formatCurrency(totalPaid, invoice.currency)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Saldo pendiente</p>
          <p className={cn('text-lg font-bold', remaining > 0 ? 'text-red-600' : 'text-gray-400')}>
            {formatCurrency(remaining, invoice.currency)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Vencimiento</p>
          <p
            className={cn(
              'text-base font-semibold',
              invoice.status === 'OVERDUE' ? 'text-red-600' : 'text-gray-700',
            )}
          >
            {formatDate(invoice.dueDate)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Client */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" /> Cliente
            </h2>
            {invoice.client ? (
              <>
                <Link
                  href={`/clientes/${invoice.clientId}`}
                  className="font-semibold text-brand-600 hover:underline"
                >
                  {invoice.client.firstName} {invoice.client.lastName}
                </Link>
                <p className="text-sm text-gray-500">{invoice.client.email}</p>
              </>
            ) : (
              <p className="text-gray-400 text-sm">Sin información de cliente</p>
            )}
          </div>

          {/* Detail + items */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" /> Detalle de factura
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm mb-5">
              <div>
                <p className="text-gray-500">Fecha emisión</p>
                <p className="font-medium text-gray-800">{formatDate(invoice.issueDate)}</p>
              </div>
              <div>
                <p className="text-gray-500">Fecha vencimiento</p>
                <p className="font-medium text-gray-800">{formatDate(invoice.dueDate)}</p>
              </div>
              <div>
                <p className="text-gray-500">Moneda</p>
                <p className="font-medium text-gray-800">{invoice.currency}</p>
              </div>
              <div>
                <p className="text-gray-500">IVA</p>
                <p className="font-medium text-gray-800">{invoice.ivaRate ?? 19}%</p>
              </div>
            </div>

            {invoice.items && invoice.items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="pb-2 text-xs font-medium text-gray-500">Descripción</th>
                      <th className="pb-2 text-xs font-medium text-gray-500 text-right">Cant.</th>
                      <th className="pb-2 text-xs font-medium text-gray-500 text-right">P. Unit.</th>
                      <th className="pb-2 text-xs font-medium text-gray-500 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {invoice.items.map((item, i) => (
                      <tr key={item.id ?? i}>
                        <td className="py-2 text-gray-700">{item.description}</td>
                        <td className="py-2 text-right text-gray-600">{item.quantity}</td>
                        <td className="py-2 text-right text-gray-600">
                          {formatCurrency(Number(item.unitPrice), invoice.currency)}
                        </td>
                        <td className="py-2 text-right font-medium text-gray-800">
                          {formatCurrency(Number(item.amount), invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td colSpan={3} className="pt-2 text-right text-xs text-gray-500">
                        Neto
                      </td>
                      <td className="pt-2 text-right text-sm text-gray-700">
                        {formatCurrency(Number(invoice.neto), invoice.currency)}
                      </td>
                    </tr>
                    {Number(invoice.discount) > 0 && (
                      <tr>
                        <td colSpan={3} className="text-right text-xs text-gray-500">
                          Descuento
                        </td>
                        <td className="text-right text-sm text-red-500">
                          -{formatCurrency(Number(invoice.discount), invoice.currency)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={3} className="text-right text-xs text-gray-500">
                        IVA ({invoice.ivaRate ?? 19}%)
                      </td>
                      <td className="text-right text-sm text-gray-700">
                        {formatCurrency(Number(invoice.iva), invoice.currency)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="text-right text-sm font-semibold text-gray-800">
                        Total
                      </td>
                      <td className="text-right text-sm font-bold text-gray-900">
                        {formatCurrency(Number(invoice.total), invoice.currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {invoice.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Notas</p>
                <p className="text-sm text-gray-700">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Payment history */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-400" /> Historial de pagos
            </h2>
            {payments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sin pagos registrados</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      'flex items-center justify-between py-2 px-3 rounded-lg text-sm',
                      p.status === 'VOIDED' ? 'bg-gray-50 opacity-60' : 'bg-green-50',
                    )}
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                        {p.status === 'VOIDED' && (
                          <span className="ml-2 text-xs text-red-500">(Anulado)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(p.paymentDate)}
                        {p.reference ? ` · Ref: ${p.reference}` : ''}
                      </p>
                    </div>
                    <p
                      className={cn(
                        'font-semibold',
                        p.status === 'VOIDED' ? 'text-gray-400 line-through' : 'text-green-700',
                      )}
                    >
                      {formatCurrency(Number(p.amount), invoice.currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Promise of payment */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" /> Promesa de pago
            </h2>
            {invoice.fechaPromesaPago && (
              <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 font-medium">Fecha prometida</p>
                <p className="text-sm font-semibold text-blue-800">
                  {formatDate(invoice.fechaPromesaPago)}
                </p>
                {invoice.comentarioPromesa && (
                  <p className="text-xs text-blue-600 mt-1">{invoice.comentarioPromesa}</p>
                )}
                {invoice.estadoPromesa && (
                  <p className="text-xs mt-1 font-medium text-blue-700">
                    Estado: {invoice.estadoPromesa}
                  </p>
                )}
              </div>
            )}
            {canEdit && (
              <div className="space-y-2">
                <div>
                  <label className="label">Fecha prometida</label>
                  <input
                    type="date"
                    value={promiseDate}
                    onChange={(e) => setPromiseDate(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Comentario (opcional)</label>
                  <textarea
                    value={promiseComment}
                    onChange={(e) => setPromiseComment(e.target.value)}
                    rows={2}
                    className="input resize-none"
                    placeholder="Acuerdo con el cliente..."
                  />
                </div>
                <button
                  onClick={() => {
                    if (!promiseDate) return toast.error('Seleccione una fecha');
                    updatePromiseMutation.mutate({
                      fechaPromesaPago: promiseDate,
                      comentarioPromesa: promiseComment || undefined,
                    });
                  }}
                  disabled={updatePromiseMutation.isPending}
                  className="btn-primary w-full justify-center"
                >
                  {updatePromiseMutation.isPending ? 'Guardando...' : 'Guardar promesa'}
                </button>
              </div>
            )}
          </div>

          {/* Collection notes */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-400" /> Notas de cobranza
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
              {notes.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">Sin notas</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{note.note}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-400">
                        {formatDate(note.createdAt)}
                        {note.user
                          ? ` · ${note.user.firstName} ${note.user.lastName}`
                          : ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={2}
              className="input resize-none mb-2"
              placeholder="Agregar nota de cobranza..."
            />
            <button
              onClick={() => {
                if (noteText.trim()) addNoteMutation.mutate(noteText.trim());
              }}
              disabled={!noteText.trim() || addNoteMutation.isPending}
              className="btn-primary w-full justify-center"
            >
              {addNoteMutation.isPending ? 'Guardando...' : 'Agregar nota'}
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Registrar pago</h2>
              <button
                onClick={() => setPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg text-sm flex justify-between text-gray-600">
                <span>Saldo pendiente:</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(remaining, invoice.currency)}
                </span>
              </div>
              <div>
                <label className="label">Monto *</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  className="input"
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="label">Método de pago *</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, method: e.target.value }))
                  }
                  className="select"
                  required
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Fecha de pago *</label>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, paymentDate: e.target.value }))
                  }
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Referencia (opcional)</label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, reference: e.target.value }))
                  }
                  className="input"
                  placeholder="N° transferencia, boleta..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModal(false)}
                  className="btn-secondary flex-1 justify-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={registerPaymentMutation.isPending}
                  className="btn-primary flex-1 justify-center"
                >
                  {registerPaymentMutation.isPending ? 'Registrando...' : 'Registrar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
