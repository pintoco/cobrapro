import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { InvoiceStatus, ClientStatus, InvoiceDocumentType, SubscriptionStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formato moneda chilena (CLP sin decimales)
export function formatCurrency(amount: number, currency = 'CLP'): string {
  const minimumFractionDigits = currency === 'CLP' ? 0 : 2;
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: es });
}

export function formatRelativeDate(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

// Formato RUT chileno: 12.345.678-9
export function formatRut(rut: string): string {
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return clean;
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1);
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
}

export const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, { label: string; bg: string; color: string }> = {
  PENDING:   { label: 'Pendiente', bg: 'bg-yellow-100', color: 'text-yellow-800' },
  PAID:      { label: 'Pagada',    bg: 'bg-green-100',  color: 'text-green-800'  },
  OVERDUE:   { label: 'Vencida',   bg: 'bg-red-100',    color: 'text-red-800'    },
  CANCELLED: { label: 'Anulada',   bg: 'bg-gray-100',   color: 'text-gray-600'   },
  PARTIAL:   { label: 'Parcial',   bg: 'bg-blue-100',   color: 'text-blue-800'   },
};

export const CLIENT_STATUS_CONFIG: Record<ClientStatus, { label: string; bg: string; color: string }> = {
  ACTIVE:   { label: 'Activo',    bg: 'bg-green-100', color: 'text-green-800' },
  INACTIVE: { label: 'Inactivo',  bg: 'bg-gray-100',  color: 'text-gray-600'  },
  BLOCKED:  { label: 'Bloqueado', bg: 'bg-red-100',   color: 'text-red-800'   },
};

export const INVOICE_DOCUMENT_TYPE_LABELS: Record<InvoiceDocumentType, string> = {
  FACTURA:    'Factura',
  BOLETA:     'Boleta',
  NOTA_COBRO: 'Nota de Cobro',
  OTRO:       'Otro',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH:                      'Efectivo',
  BANK_TRANSFER:             'Transferencia bancaria',
  CHECK:                     'Cheque',
  CREDIT_CARD:               'Tarjeta de crédito',
  DEBIT_CARD:                'Tarjeta de débito',
  WEBPAY:                    'WebPay',
  TRANSFERENCIA_ELECTRONICA: 'Transferencia electrónica',
  OTHER:                     'Otro',
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  RUT:       'RUT',
  PASAPORTE: 'Pasaporte',
  OTRO:      'Otro',
};

export const SUBSCRIPTION_STATUS_CONFIG: Record<SubscriptionStatus, { label: string; bg: string; color: string }> = {
  TRIAL:     { label: 'Prueba',    bg: 'bg-purple-100', color: 'text-purple-800' },
  ACTIVE:    { label: 'Activo',    bg: 'bg-green-100',  color: 'text-green-800'  },
  PAST_DUE:  { label: 'Vencido',   bg: 'bg-orange-100', color: 'text-orange-800' },
  SUSPENDED: { label: 'Suspendido',bg: 'bg-red-100',    color: 'text-red-800'    },
  CANCELLED: { label: 'Cancelado', bg: 'bg-gray-100',   color: 'text-gray-600'   },
};
