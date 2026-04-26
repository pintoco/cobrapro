import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionNoteDto } from './dto/create-collection-note.dto';

@Injectable()
export class CollectionNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCollectionNoteDto, companyId: string, userId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, companyId },
      select: { id: true, clientId: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Factura ${dto.invoiceId} no encontrada`);
    }

    const note = await this.prisma.collectionNote.create({
      data: {
        note: dto.note,
        invoiceId: invoice.id,
        clientId: invoice.clientId,
        companyId,
        userId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return { data: note, message: 'Nota creada exitosamente' };
  }

  async findByInvoice(invoiceId: string, companyId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      select: { id: true },
    });

    if (!invoice) throw new NotFoundException(`Factura ${invoiceId} no encontrada`);

    const notes = await this.prisma.collectionNote.findMany({
      where: { invoiceId, companyId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: notes };
  }

  async remove(id: string, companyId: string) {
    const note = await this.prisma.collectionNote.findFirst({
      where: { id, companyId },
    });

    if (!note) throw new NotFoundException(`Nota ${id} no encontrada`);

    await this.prisma.collectionNote.delete({ where: { id } });
    return { data: null, message: 'Nota eliminada' };
  }

  // Actualizar promesa de pago en una factura
  async updatePaymentPromise(
    invoiceId: string,
    companyId: string,
    data: {
      fechaPromesaPago?: string;
      comentarioPromesa?: string;
      estadoPromesa?: 'PENDIENTE' | 'CUMPLIDA' | 'INCUMPLIDA';
    },
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      select: { id: true },
    });

    if (!invoice) throw new NotFoundException(`Factura ${invoiceId} no encontrada`);

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        ...(data.fechaPromesaPago && { fechaPromesaPago: new Date(data.fechaPromesaPago) }),
        ...(data.comentarioPromesa !== undefined && { comentarioPromesa: data.comentarioPromesa }),
        ...(data.estadoPromesa && { estadoPromesa: data.estadoPromesa }),
      },
      select: {
        id: true,
        invoiceNumber: true,
        fechaPromesaPago: true,
        comentarioPromesa: true,
        estadoPromesa: true,
      },
    });

    return { data: updated, message: 'Promesa de pago actualizada' };
  }
}
