import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { InvoiceStatus, ClientStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'PEN'): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
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

export const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, { label: string; bg: string; color: string }> = {
  PENDING:   { label: 'Pendiente',  bg: 'bg-yellow-100', color: 'text-yellow-800' },
  PAID:      { label: 'Pagada',     bg: 'bg-green-100',  color: 'text-green-800'  },
  OVERDUE:   { label: 'Vencida',    bg: 'bg-red-100',    color: 'text-red-800'    },
  CANCELLED: { label: 'Anulada',    bg: 'bg-gray-100',   color: 'text-gray-600'   },
  PARTIAL:   { label: 'Parcial',    bg: 'bg-blue-100',   color: 'text-blue-800'   },
};

export const CLIENT_STATUS_CONFIG: Record<ClientStatus, { label: string; bg: string; color: string }> = {
  ACTIVE:   { label: 'Activo',   bg: 'bg-green-100', color: 'text-green-800' },
  INACTIVE: { label: 'Inactivo', bg: 'bg-gray-100',  color: 'text-gray-600'  },
  BLOCKED:  { label: 'Bloqueado',bg: 'bg-red-100',   color: 'text-red-800'   },
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH:          'Efectivo',
  BANK_TRANSFER: 'Transferencia',
  CHECK:         'Cheque',
  CREDIT_CARD:   'Tarjeta crédito',
  DEBIT_CARD:    'Tarjeta débito',
  YAPE:          'Yape',
  PLIN:          'Plin',
  OTHER:         'Otro',
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  DNI:      'DNI',
  RUC:      'RUC',
  CE:       'Carne extranjería',
  PASSPORT: 'Pasaporte',
};
