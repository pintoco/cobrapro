export interface EmailTemplateData {
  clientName: string;
  invoiceNumber: string;
  invoiceTotal: number;
  currency: string;
  dueDate: string;
  companyName: string;
  companyEmail: string;
  daysOverdue?: number;
  daysUntilDue?: number;
}

function baseLayout(content: string, companyName: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recordatorio de Pago</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f6f9; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: #1e40af; padding: 32px 40px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header p { color: #bfdbfe; margin: 4px 0 0; font-size: 13px; }
    .body { padding: 36px 40px; }
    .body p { color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
    .alert { border-radius: 6px; padding: 16px 20px; margin: 20px 0; }
    .alert-yellow { background: #fef9c3; border-left: 4px solid #eab308; }
    .alert-red    { background: #fee2e2; border-left: 4px solid #dc2626; }
    .alert-blue   { background: #dbeafe; border-left: 4px solid #2563eb; }
    .alert p { margin: 0; font-size: 14px; font-weight: 600; }
    .invoice-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px 24px; margin: 20px 0; }
    .invoice-box table { width: 100%; border-collapse: collapse; }
    .invoice-box td { padding: 6px 0; font-size: 14px; color: #475569; }
    .invoice-box td:last-child { text-align: right; font-weight: 600; color: #1e293b; }
    .total-row td { padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 16px; color: #1e293b; font-weight: 700; }
    .cta { text-align: center; margin: 28px 0 8px; }
    .footer { background: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${companyName}</h1>
      <p>Sistema de Gestión de Cobranzas</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>Este es un mensaje automático de <strong>${companyName}</strong>.<br/>
      Por favor no responda a este correo directamente.</p>
    </div>
  </div>
</body>
</html>`.trim();
}

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = { PEN: 'S/', USD: '$', EUR: '€' };
  const symbol = symbols[currency] ?? currency;
  return `${symbol} ${amount.toFixed(2)}`;
}

// ─── TEMPLATE 1: 3 días antes del vencimiento ───────────────────────────────

export function reminderBeforeTemplate(data: EmailTemplateData): { subject: string; html: string } {
  const subject = `[Recordatorio] Factura ${data.invoiceNumber} vence en ${data.daysUntilDue} días`;

  const content = `
    <p>Estimado/a <strong>${data.clientName}</strong>,</p>
    <p>Le recordamos que tiene una factura próxima a vencer.</p>

    <div class="alert alert-blue">
      <p>⏰ Vence en <strong>${data.daysUntilDue} día${data.daysUntilDue !== 1 ? 's' : ''}</strong> — ${data.dueDate}</p>
    </div>

    <div class="invoice-box">
      <table>
        <tr><td>N° Factura</td><td>${data.invoiceNumber}</td></tr>
        <tr><td>Fecha de vencimiento</td><td>${data.dueDate}</td></tr>
        <tr class="total-row"><td>Total a pagar</td><td>${formatCurrency(data.invoiceTotal, data.currency)}</td></tr>
      </table>
    </div>

    <p>Para evitar recargos o inconvenientes, le solicitamos realizar el pago antes de la fecha indicada.</p>
    <p>Si ya realizó el pago, por favor ignore este mensaje o contáctenos a <strong>${data.companyEmail}</strong>.</p>
  `;

  return { subject, html: baseLayout(content, data.companyName) };
}

// ─── TEMPLATE 2: 1 día antes del vencimiento ────────────────────────────────

export function reminderOneDayBeforeTemplate(data: EmailTemplateData): { subject: string; html: string } {
  const subject = `[URGENTE] Factura ${data.invoiceNumber} vence mañana`;

  const content = `
    <p>Estimado/a <strong>${data.clientName}</strong>,</p>
    <p>Le informamos que su factura vence <strong>mañana</strong>.</p>

    <div class="alert alert-yellow">
      <p>⚠️ Su factura vence <strong>mañana ${data.dueDate}</strong></p>
    </div>

    <div class="invoice-box">
      <table>
        <tr><td>N° Factura</td><td>${data.invoiceNumber}</td></tr>
        <tr><td>Fecha de vencimiento</td><td>${data.dueDate}</td></tr>
        <tr class="total-row"><td>Total a pagar</td><td>${formatCurrency(data.invoiceTotal, data.currency)}</td></tr>
      </table>
    </div>

    <p>Realice su pago hoy para evitar que su cuenta entre en mora.</p>
    <p>Ante cualquier consulta comuníquese con nosotros a <strong>${data.companyEmail}</strong>.</p>
  `;

  return { subject, html: baseLayout(content, data.companyName) };
}

// ─── TEMPLATE 3: Día de vencimiento ─────────────────────────────────────────

export function reminderDueTodayTemplate(data: EmailTemplateData): { subject: string; html: string } {
  const subject = `[HOY] Factura ${data.invoiceNumber} vence hoy`;

  const content = `
    <p>Estimado/a <strong>${data.clientName}</strong>,</p>
    <p>Su factura vence <strong>hoy</strong>. Por favor realice su pago a la brevedad.</p>

    <div class="alert alert-yellow">
      <p>📅 Fecha límite de pago: <strong>HOY ${data.dueDate}</strong></p>
    </div>

    <div class="invoice-box">
      <table>
        <tr><td>N° Factura</td><td>${data.invoiceNumber}</td></tr>
        <tr><td>Fecha de vencimiento</td><td>${data.dueDate}</td></tr>
        <tr class="total-row"><td>Total a pagar</td><td>${formatCurrency(data.invoiceTotal, data.currency)}</td></tr>
      </table>
    </div>

    <p>Si ya realizó el pago el día de hoy, ignore este correo. De lo contrario, realice su pago antes que finalice el día.</p>
    <p>Contacto: <strong>${data.companyEmail}</strong></p>
  `;

  return { subject, html: baseLayout(content, data.companyName) };
}

// ─── TEMPLATE 4: Factura vencida ─────────────────────────────────────────────

export function reminderOverdueTemplate(data: EmailTemplateData): { subject: string; html: string } {
  const subject = `[MORA] Factura ${data.invoiceNumber} lleva ${data.daysOverdue} días vencida`;

  const content = `
    <p>Estimado/a <strong>${data.clientName}</strong>,</p>
    <p>Le notificamos que la siguiente factura se encuentra <strong>vencida</strong> y pendiente de pago.</p>

    <div class="alert alert-red">
      <p>🔴 Factura vencida hace <strong>${data.daysOverdue} día${data.daysOverdue !== 1 ? 's' : ''}</strong></p>
    </div>

    <div class="invoice-box">
      <table>
        <tr><td>N° Factura</td><td>${data.invoiceNumber}</td></tr>
        <tr><td>Venció el</td><td>${data.dueDate}</td></tr>
        <tr><td>Días en mora</td><td>${data.daysOverdue} días</td></tr>
        <tr class="total-row"><td>Total pendiente</td><td>${formatCurrency(data.invoiceTotal, data.currency)}</td></tr>
      </table>
    </div>

    <p>Le solicitamos regularizar su situación a la brevedad para evitar acciones de cobranza adicionales.</p>
    <p>Para coordinar el pago o acordar un plan de pagos, contáctenos a <strong>${data.companyEmail}</strong>.</p>
  `;

  return { subject, html: baseLayout(content, data.companyName) };
}
