'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Client } from '@/types';

const schema = z.object({
  firstName:        z.string().min(1, 'Requerido'),
  lastName:         z.string().min(1, 'Requerido'),
  email:            z.string().email('Email inválido'),
  // Campos Chile
  rut:              z.string().optional(),
  razonSocial:      z.string().optional(),
  nombreFantasia:   z.string().optional(),
  giro:             z.string().optional(),
  contactoPrincipal:z.string().optional(),
  // Contacto
  phone:            z.string().optional(),
  documentType:     z.enum(['RUT', 'PASAPORTE', 'OTRO']).default('RUT'),
  documentNumber:   z.string().optional(),
  address:          z.string().optional(),
  comuna:           z.string().optional(),
  ciudad:           z.string().optional(),
  notes:            z.string().optional(),
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
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClienteFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '', lastName: '', email: '', rut: '', razonSocial: '',
      nombreFantasia: '', giro: '', contactoPrincipal: '', phone: '',
      documentType: 'RUT', documentNumber: '', address: '', comuna: '', ciudad: '', notes: '',
    },
  });

  useEffect(() => {
    if (initial) {
      reset({
        firstName:         initial.firstName,
        lastName:          initial.lastName,
        email:             initial.email,
        rut:               initial.rut ?? '',
        razonSocial:       initial.razonSocial ?? '',
        nombreFantasia:    initial.nombreFantasia ?? '',
        giro:              initial.giro ?? '',
        contactoPrincipal: initial.contactoPrincipal ?? '',
        phone:             initial.phone ?? '',
        documentType:      initial.documentType as 'RUT' | 'PASAPORTE' | 'OTRO',
        documentNumber:    initial.documentNumber ?? '',
        address:           initial.address ?? '',
        comuna:            initial.comuna ?? '',
        ciudad:            initial.ciudad ?? '',
        notes:             initial.notes ?? '',
      });
    } else {
      reset({
        firstName: '', lastName: '', email: '', rut: '', razonSocial: '',
        nombreFantasia: '', giro: '', contactoPrincipal: '', phone: '',
        documentType: 'RUT', documentNumber: '', address: '', comuna: '', ciudad: '', notes: '',
      });
    }
  }, [initial, reset, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {initial ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Datos básicos */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Datos personales</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre *</label>
                <input {...register('firstName')} className={cn('input', errors.firstName && 'border-red-400')} placeholder="Juan" />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="label">Apellido *</label>
                <input {...register('lastName')} className={cn('input', errors.lastName && 'border-red-400')} placeholder="Pérez" />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
              </div>
            </div>
          </div>

          {/* Datos empresa Chile */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Datos empresa (opcional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">RUT</label>
                <input {...register('rut')} className="input" placeholder="12.345.678-9" />
              </div>
              <div>
                <label className="label">Razón Social</label>
                <input {...register('razonSocial')} className="input" placeholder="Empresa SpA" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label className="label">Nombre Fantasía</label>
                <input {...register('nombreFantasia')} className="input" placeholder="Marca comercial" />
              </div>
              <div>
                <label className="label">Giro</label>
                <input {...register('giro')} className="input" placeholder="Servicios de TI" />
              </div>
            </div>
            <div className="mt-3">
              <label className="label">Contacto principal</label>
              <input {...register('contactoPrincipal')} className="input" placeholder="María González — Gerente" />
            </div>
          </div>

          {/* Contacto */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contacto</p>
            <div className="mb-3">
              <label className="label">Email *</label>
              <input {...register('email')} type="email" className={cn('input', errors.email && 'border-red-400')} placeholder="contacto@empresa.cl" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Teléfono</label>
                <input {...register('phone')} className="input" placeholder="+56 9 8765 4321" />
              </div>
              <div>
                <label className="label">Tipo documento</label>
                <select {...register('documentType')} className="select">
                  <option value="RUT">RUT</option>
                  <option value="PASAPORTE">Pasaporte</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="label">N° documento</label>
              <input {...register('documentNumber')} className="input" placeholder="12345678-9" />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dirección</p>
            <div className="mb-3">
              <label className="label">Dirección</label>
              <input {...register('address')} className="input" placeholder="Av. Apoquindo 4501" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Comuna</label>
                <input {...register('comuna')} className="input" placeholder="Las Condes" />
              </div>
              <div>
                <label className="label">Ciudad</label>
                <input {...register('ciudad')} className="input" placeholder="Santiago" />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="label">Notas internas</label>
            <textarea {...register('notes')} rows={2} className="input resize-none" placeholder="Observaciones, preferencias de pago..." />
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
