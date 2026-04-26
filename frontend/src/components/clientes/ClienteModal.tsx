'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Client } from '@/types';

const schema = z.object({
  firstName:      z.string().min(1, 'Requerido'),
  lastName:       z.string().min(1, 'Requerido'),
  email:          z.string().email('Email inválido'),
  phone:          z.string().optional(),
  documentType:   z.enum(['DNI', 'RUC', 'CE', 'PASSPORT']),
  documentNumber: z.string().min(1, 'Requerido'),
  address:        z.string().optional(),
  city:           z.string().optional(),
  notes:          z.string().optional(),
});

export type ClienteFormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ClienteFormData) => Promise<void>;
  initial?: Client | null;
  loading?: boolean;
}

export function ClienteModal({ open, onClose, onSubmit, initial, loading }: Props) {
  const {
    register, handleSubmit, reset,
    formState: { errors },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '', lastName: '', email: '', phone: '',
      documentType: 'DNI', documentNumber: '', address: '', city: '', notes: '',
    },
  });

  useEffect(() => {
    if (initial) {
      reset({
        firstName:      initial.firstName,
        lastName:       initial.lastName,
        email:          initial.email,
        phone:          initial.phone ?? '',
        documentType:   initial.documentType,
        documentNumber: initial.documentNumber,
        address:        initial.address ?? '',
        city:           initial.city ?? '',
        notes:          initial.notes ?? '',
      });
    } else {
      reset({ firstName: '', lastName: '', email: '', phone: '',
              documentType: 'DNI', documentNumber: '', address: '', city: '', notes: '' });
    }
  }, [initial, reset, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {initial ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre</label>
              <input {...register('firstName')} className={cn('input', errors.firstName && 'border-red-400')} placeholder="Juan" />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="label">Apellido</label>
              <input {...register('lastName')} className={cn('input', errors.lastName && 'border-red-400')} placeholder="Pérez" />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <input {...register('email')} type="email" className={cn('input', errors.email && 'border-red-400')} placeholder="cliente@empresa.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label">Teléfono</label>
            <input {...register('phone')} className="input" placeholder="+51 999 999 999" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo documento</label>
              <select {...register('documentType')} className="select">
                <option value="DNI">DNI</option>
                <option value="RUC">RUC</option>
                <option value="CE">Carne extranjería</option>
                <option value="PASSPORT">Pasaporte</option>
              </select>
            </div>
            <div>
              <label className="label">N° documento</label>
              <input {...register('documentNumber')} className={cn('input', errors.documentNumber && 'border-red-400')} placeholder="12345678" />
              {errors.documentNumber && <p className="text-red-500 text-xs mt-1">{errors.documentNumber.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Dirección</label>
              <input {...register('address')} className="input" placeholder="Av. Ejemplo 123" />
            </div>
            <div>
              <label className="label">Ciudad</label>
              <input {...register('city')} className="input" placeholder="Lima" />
            </div>
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea {...register('notes')} rows={2} className="input resize-none" placeholder="Observaciones..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
              ) : (
                initial ? 'Guardar cambios' : 'Crear cliente'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
