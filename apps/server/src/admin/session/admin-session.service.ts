import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminSessionService {
  constructor(private prisma: PrismaService) {}

  async settleSession(storeId: string, sessionId: string) {
    const session = await this.prisma.dining_session.findFirst({
      where: { id: sessionId, storeId }
    });
    if (!session) throw new NotFoundException('session not found');
    if (session.status !== 'ACTIVE') throw new BadRequestException('session already closed');
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.order.updateMany({
        where: { sessionId, storeId, status: 'ORDERED' },
        data: { status: 'SETTLED', settledAt: now }
      }),
      this.prisma.dining_session.update({
        where: { id: sessionId },
        data: { status: 'CLOSED', closedAt: now }
      }),
      this.prisma.table.updateMany({
        where: { id: session.tableId, storeId },
        data: { currentSessionId: null }
      }),
      this.prisma.cart_item.deleteMany({ where: { sessionId } })
    ]);
    return { ok: true };
  }
}
