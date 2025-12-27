import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WsService } from '../../ws/ws.service';

type SessionParams = { storeId: string; tableId: string; sessionId: string };

@Injectable()
export class MiniCartService {
  constructor(
    private prisma: PrismaService,
    private ws: WsService
  ) {}

  private async assertSession(params: SessionParams) {
    const table = await this.prisma.table.findFirst({
      where: { id: params.tableId, storeId: params.storeId, isActive: true, isDeleted: false }
    });
    if (!table || !table.currentSessionId || table.currentSessionId !== params.sessionId) {
      throw new BadRequestException('本桌已结账，请重新扫码开桌');
    }

    const session = await this.prisma.dining_session.findFirst({
      where: { id: params.sessionId, storeId: params.storeId, tableId: params.tableId, status: 'ACTIVE', isDeleted: false }
    });
    if (!session) throw new BadRequestException('本桌已结账，请重新扫码开桌');
    return session;
  }

  private build(
    items: Array<{ productId: string; nameSnapshot: string; priceSnapshot: number; imageUrlSnapshot: string | null; qty: number }>,
    cartVersion: number
  ) {
    const totalQty = items.reduce((sum, it) => sum + it.qty, 0);
    const totalAmount = items.reduce((sum, it) => sum + it.priceSnapshot * it.qty, 0);
    return {
      items: items.map((it) => ({
        productId: it.productId,
        nameSnapshot: it.nameSnapshot,
        priceSnapshot: it.priceSnapshot,
        imageUrlSnapshot: it.imageUrlSnapshot,
        qty: it.qty,
        lineTotal: it.priceSnapshot * it.qty
      })),
      totalQty,
      totalAmount,
      cartVersion
    };
  }

  async getCart(params: SessionParams) {
    const session = await this.assertSession(params);
    const items = await this.prisma.cart_item.findMany({
      where: { sessionId: params.sessionId },
      orderBy: { updatedAt: 'desc' }
    });
    return this.build(items, session.cartVersion ?? 0);
  }

  async setQty(params: SessionParams & { productId: string; qty: number }) {
    await this.assertSession(params);
    const qty = Math.max(0, Math.floor(params.qty));
    const product = qty === 0 ? null : await this.prisma.product.findFirst({ where: { id: params.productId, storeId: params.storeId } });
    if (qty !== 0) {
      if (!product) throw new BadRequestException('该商品已下架或已售罄');
      if (!product.isOnSale || product.isSoldOut) throw new BadRequestException('该商品已下架或已售罄');
    }

    await this.prisma.$transaction(async (tx) => {
      if (qty === 0) {
        await tx.cart_item.deleteMany({ where: { sessionId: params.sessionId, productId: params.productId } });
      } else {
        await tx.cart_item.upsert({
          where: { sessionId_productId: { sessionId: params.sessionId, productId: params.productId } },
          update: {
            qty,
            nameSnapshot: product!.name,
            priceSnapshot: product!.price,
            imageUrlSnapshot: product!.imageUrl
          },
          create: {
            sessionId: params.sessionId,
            productId: params.productId,
            qty,
            nameSnapshot: product!.name,
            priceSnapshot: product!.price,
            imageUrlSnapshot: product!.imageUrl
          }
        });
      }
      await tx.dining_session.update({
        where: { id: params.sessionId },
        data: { cartVersion: { increment: 1 } }
      });
    });

    const res = await this.getCart(params);
    await this.ws.emitCartUpdated(params.sessionId);
    return res;
  }

  async clear(params: SessionParams) {
    await this.assertSession(params);
    await this.prisma.$transaction([
      this.prisma.cart_item.deleteMany({ where: { sessionId: params.sessionId } }),
      this.prisma.dining_session.update({ where: { id: params.sessionId }, data: { cartVersion: { increment: 1 } } })
    ]);
    const res = await this.getCart(params);
    await this.ws.emitCartUpdated(params.sessionId);
    return res;
  }
}
