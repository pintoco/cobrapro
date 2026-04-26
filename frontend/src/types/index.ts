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
export type DocumentType = 'RUT' | 'PASAPORTE' | 'OTRO';

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  // Campos Chile
  rut?: string;
  razonSocial?: string;
  nombreFantasia?: string;
  giro?: string;
  contactoPrincipal?: string;
  // Contacto
  email: string;
  phone?: string;
  documentType: DocumentType;
  documentNumber?: string;
  address?: string;
  ciudad?: string;
  comuna?: string;
  country: string;
  status: ClientStatus;
  notes?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

// Invoices
export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'PARTIAL';
export type InvoiceDocumentType = 'FACTURA' | 'BOLETA' | 'NOTA_COBRO' | 'OTRO';
export type PaymentPromiseStatus = 'PENDIENTE' | 'CUMPLIDA' | 'INCUMPLIDA';

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
  folio?: string;
  tipoDocumento: InvoiceDocumentType;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  ivaRate: number;
  neto: number;
  iva: number;
  // Legacy
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  currency: string;
  notes?: string;
  // Promesa de pago
  fechaPromesaPago?: string;
  comentarioPromesa?: string;
  estadoPromesa?: PaymentPromiseStatus;
  // Timestamps
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
export type PaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'CHECK'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'WEBPAY'
  | 'TRANSFERENCIA_ELECTRONICA'
  | 'OTHER';

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

// Subscriptions
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceCLP: number;
  maxUsers: number;
  maxClients: number;
  maxInvoicesPerMonth: number;
  allowWhatsApp: boolean;
  allowExcelImport: boolean;
  allowAdvancedReports: boolean;
  isActive: boolean;
}

export interface CompanySubscription {
  id: string;
  status: SubscriptionStatus;
  trialEndsAt?: string;
  currentPeriodStart: string;
  currentPeriodEnd?: string;
  plan: SubscriptionPlan;
}

// Collection Notes
export interface CollectionNote {
  id: string;
  note: string;
  invoiceId: string;
  clientId: string;
  companyId: string;
  userId?: string;
  user?: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

// Audit
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'SEND_NOTIFICATION'
  | 'IMPORT';

export interface AuditLog {
  id: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  companyId: string;
  userId?: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
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
