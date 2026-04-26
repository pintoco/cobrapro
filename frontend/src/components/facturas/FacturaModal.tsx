'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn, formatCurrency } from '@/lib/utils';
import { clientsApi } from '@/lib/api';
import type { Client } from '@/types';

const itemSchema = z.object({
  description: z.string().min(1, 'Requerido'),
  quantity:    z.coerce.number().min(1, 'Mín 1'),
  unitPrice:   z.coerce.number().min(1, 'Mín 1'),
});

const schema = z.object({
  clientId:      z.string().min(1, 'Selecciona un cliente'),
  tipoDocumento: z.enum(['FACTURA', 'BOLETA', 'NOTA_COBRO', 'OTRO']).default('FACTURA'),
  folio:         z.string().optional(),
  issueDate:     z.string().min(1, 'Requerido'),
  dueDate:       z.string().min(1, 'Requerido'),
  currency:      z.string().default('CLP'),
  ivaRate:       z.coerce.number().min(0).max(100).default(19),
  discount:      z.coerce.number().min(0).default(0),
  notes:         z.string().optional(),
  items:         z.array(itemSchema).min(1, 'Agrega al menos un ítem'),
});

export type FacturaFormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FacturaFormData) => Promise<void>;
  loading?: boolean;
}

function today() { return new Date().toISOString().slice(0, 10); }
function inDays(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function FacturaModal({ open, onClose, onSubmit, loading }: Props) {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FacturaFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: '', tipoDocumento: 'FACTURA', folio: '',
      issueDate: today(), dueDate: inDays(30),
      currency: 'CLP', ivaRate: 19, discount: 0, notes: '',
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems    = useWatch({ control, name: 'items' });
  const watchedIvaRate  = useWatch({ control, name: 'ivaRate' });
  const watchedDiscount = useWatch({ control, name: 'discount' });

  // Cálculo al estilo chileno: neto + IVA
  const subtotal = (watchedItems ?? []).reduce(
    (s, item) => s + (Number(item?.quantity ?? 0) * Number(item?.unitPrice ?? 0)), 0,
  );
  const disc    = Number(watchedDiscount ?? 0);
  const neto    = Math.max(0, subtotal - disc);
  const iva     = Math.round(neto * (Number(watchedIvaRate ?? 19) / 100) * 100) / 100;
  const total   = neto + iva;

  const { data: clientsData } = useQuery({
    queryKey: ['clients-select'],
    queryFn: () => clientsApi.getAll({ limit: 200, status: 'ACTIVE' }).then((r) => r.data.data.data as Client[]),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    reset({
      clientId: '', tipoDocumento: 'FACTURA', folio: '',
      issueDate: today(), dueDate: inDays(30),
      currency: 'CLP', ivaRate: 19, discount: 0, notes: '',
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
    });
  }, [open, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">Nueva factura</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Cliente */}
          <div>
            <label className="label">Cliente *</label>
            <select {...register('clientId')} className={cn('select', errors.clientId && 'border-red-400')}>
              <option value="">Seleccionar cliente...</option>
              {(clientsData ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razonSocial ?? `${c.firstName} ${c.lastName}`}
                  {c.rut ? ` — ${c.rut}` : c.documentNumber ? ` — ${c.documentNumber}` : ''}
                </option>
              ))}
            </select>
            {errors.clientId && <p className="text-red-500 text-xs mt-1">{errors.clientId.message}</p>}
          </div>

          {/* Tipo documento + Folio */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo documento</label>
              <select {...register('tipoDocumento')} className="select">
                <option value="FACTURA">Factura</option>
                <option value="BOLETA">Boleta</option>
                <option value="NOTA_COBRO">Nota de Cobro</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label className="label">Folio (opcional)</label>
              <input {...register('folio')} className="input" placeholder="000123" />
            </div>
          </div>

          {/* Fechas + Moneda */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Fecha emisión</label>
              <input {...register('issueDate')} type="date" className={cn('input', errors.issueDate && 'border-red-400')} />
            </div>
            <div>
              <label className="label">Fecha vencimiento</label>
              <input {...register('dueDate')} type="date" className={cn('input', errors.dueDate && 'border-red-400')} />
            </div>
            <div>
              <label className="label">Moneda</label>
              <select {...register('currency')} className="select">
                <option value="CLP">CLP ($)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          {/* Ítems */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Ítems *</label>
              <button
                type="button"
                onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
                className="btn-secondary py-1 px-3 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>

            {errors.items && !Array.isArray(errors.items) && (
              <p className="text-red-500 text-xs mb-2">{errors.items.message}</p>
            )}

            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5">
                    {idx === 0 && <p className="text-xs text-gray-500 mb-1">Descripción</p>}
                    <input
                      {...register(`items.${idx}.description`)}
                      placeholder="Servicio / producto"
                      className={cn('input text-xs', errors.items?.[idx]?.description && 'border-red-400')}
                    />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <p className="text-xs text-gray-500 mb-1">Cant.</p>}
                    <input {...register(`items.${idx}.quantity`)} type="number" min="1"
                      className={cn('input text-xs', errors.items?.[idx]?.quantity && 'border-red-400')} />
                  </div>
                  <div className="col-span-3">
                    {idx === 0 && <p className="text-xs text-gray-500 mb-1">Precio unit. (CLP)</p>}
                    <input {...register(`items.${idx}.unitPrice`)} type="number" step="1" min="0"
                      className={cn('input text-xs', errors.items?.[idx]?.unitPrice && 'border-red-400')} />
                  </div>
                  <div className="col-span-1 flex items-end justify-center pb-0.5">
                    {idx === 0 && <div className="mb-1 h-4" />}
                    <p className="text-xs text-gray-500 font-medium text-right">
                      {formatCurrency(Number(watchedItems?.[idx]?.quantity ?? 0) * Number(watchedItems?.[idx]?.unitPrice ?? 0))}
                    </p>
                  </div>
                  <div className="col-span-1 flex items-end justify-center">
                    {idx === 0 && <div className="mb-1 h-4" />}
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* IVA + Descuento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">IVA (%)</label>
              <input {...register('ivaRate')} type="number" step="0.01" min="0" max="100" className="input" />
              <p className="text-xs text-gray-400 mt-1">19% estándar Chile</p>
            </div>
            <div>
              <label className="label">Descuento (CLP)</label>
              <input {...register('discount')} type="number" step="1" min="0" className="input" />
            </div>
          </div>

          {/* Totales al estilo chileno */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
            </div>
            {disc > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Descuento</span><span className="text-red-600">- {formatCurrency(disc)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Neto</span><span>{formatCurrency(neto)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>IVA ({watchedIvaRate}%)</span><span>{formatCurrency(iva)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>Total</span><span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="label">Notas</label>
            <textarea {...register('notes')} rows={2} className="input resize-none" placeholder="Condiciones de pago, referencias..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando...</>
              ) : (
                'Crear documento'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
