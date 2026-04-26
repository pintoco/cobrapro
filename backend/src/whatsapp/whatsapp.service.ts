import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

export interface WhatsAppMessage {
  to: string;
  templateName: string;
  variables: Record<string, string>;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async sendMessage(companyId: string, message: WhatsAppMessage): Promise<void> {
    await this.subscriptions.validateWhatsAppAccess(companyId);

    // TODO: Integrar con WhatsApp Business API (Meta)
    // Opciones: Twilio, 360dialog, WATI, Cloud API oficial de Meta
    this.logger.log(`[WhatsApp STUB] → ${message.to}: ${message.templateName}`);

    // Registrar en historial
    await this.prisma.notification.create({
      data: {
        type: 'REMINDER_CUSTOM',
        status: 'SENT',
        channel: 'WHATSAPP',
        recipientEmail: '',
        recipientPhone: message.to,
        subject: message.templateName,
        body: JSON.stringify(message.variables),
        sentAt: new Date(),
        companyId,
        ...(message.variables.invoiceId && { invoiceId: message.variables.invoiceId }),
        ...(message.variables.clientId && { clientId: message.variables.clientId }),
      },
    }).catch(() => {
      // No bloquear si el log falla
    });
  }

  async getTemplates(companyId: string) {
    const templates = await this.prisma.messageTemplate.findMany({
      where: { companyId, channel: 'WHATSAPP', isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return { data: templates };
  }

  async createTemplate(
    companyId: string,
    data: {
      name: string;
      type: any;
      subject?: string;
      body: string;
    },
  ) {
    const template = await this.prisma.messageTemplate.create({
      data: {
        companyId,
        channel: 'WHATSAPP',
        name: data.name,
        type: data.type,
        subject: data.subject,
        body: data.body,
      },
    });
    return { data: template, message: 'Plantilla WhatsApp creada' };
  }
}
