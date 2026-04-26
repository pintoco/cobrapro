// Auth
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'ADMIN_EMPRESA' | 'OPERADOR' | 'CLIENTE';
  isActive: boolean;
  companyId: string;
  company?: { id: string; name: string; slug: string };
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Clients
export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type DocumentType = 'DNI' | 'RUC' | 'CE' | 'PASSPORT';

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  documentType: DocumentType;
  documentNumber: string;
  address?: string;
  city?: string;
  country: string;
  status: ClientStatus;
  notes?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

// Invoices
export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'PARTIAL';

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  currency: string;
  notes?: string;
  paidAt?: string;
  cancelledAt?: string;
  overdueAt?: string;
  companyId: string;
  clientId: string;
  client?: Pick<Client, 'id' | 'firstName' | 'lastName' | 'email'>;
  items?: InvoiceItem[];
  createdAt: string;
}

// Payments
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'YAPE' | 'PLIN' | 'OTHER';

export interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  status: 'COMPLETED' | 'VOIDED';
  reference?: string;
  notes?: string;
  invoiceId: string;
  clientId: string;
  companyId: string;
  createdAt: string;
}

// Dashboard
export interface DashboardSummary {
  receivables: { total: number; overdue: number; pending: number; partial: number };
  invoiceCounts: { overdue: number; pending: number; partial: number; openTotal: number };
  collections: {
    paidInvoicesThisMonth: number;
    collectedThisMonth: number;
    collectedLastMonth: number;
    growthPercent: number | null;
  };
  clients: { active: number; delinquent: number };
}

export interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  dueDate: string;
  daysOverdue: number;
  total: number;
  paid: number;
  remaining: number;
  client: { id: string; firstName: string; lastName: string; email: string; phone?: string };
}

export interface UpcomingInvoice {
  id: string;
  invoiceNumber: string;
  dueDate: string;
  daysUntilDue: number;
  total: number;
  paid: number;
  remaining: number;
  client: { id: string; firstName: string; lastName: string; email: string };
}

export interface DelinquentClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  overdueInvoicesCount: number;
  totalDebt: number;
  maxDaysOverdue: number;
}

export interface MonthlyCollection {
  month: string;
  collected: number;
  invoiced: number;
}

// Pagination
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
