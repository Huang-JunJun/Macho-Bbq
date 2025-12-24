import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

type AdminClient = { ws: WebSocket; storeId: string; adminUserId: string };
type MpClient = { ws: WebSocket; storeId: string; tableId: string; sessionId: string };

@Injectable()
export class WsService {
  private adminWssList: WebSocketServer[] = [];
  private mpWss?: WebSocketServer;
  private adminClients = new Set<AdminClient>();
  private mpClients = new Set<MpClient>();

  constructor(
    private jwt: JwtService,
    private prisma: PrismaService
  ) {}

  init(server: any) {
    const adminPaths = ['/admin/ws', '/ws/admin'];
    for (const path of adminPaths) {
      const wss = new WebSocketServer({ server, path });
      wss.on('connection', (ws, req) => {
        this.handleAdminConnection(ws, req).catch(() => {
          try {
            ws.close();
          } catch {}
        });
      });
      this.adminWssList.push(wss);
    }

    this.mpWss = new WebSocketServer({ server, path: '/mp/ws' });
    this.mpWss.on('connection', (ws, req) => {
      this.handleMpConnection(ws, req).catch(() => {
        try {
          ws.close();
        } catch {}
      });
    });
  }

  private parseUrl(req: IncomingMessage) {
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url ?? '/', `http://${host}`);
    return url.searchParams;
  }

  private extractToken(req: IncomingMessage) {
    const params = this.parseUrl(req);
    const tokenParam = params.get('token');
    if (tokenParam) return tokenParam.replace(/^Bearer\s+/i, '');
    const auth = req.headers.authorization || (req.headers as any).Authorization;
    if (!auth) return '';
    return String(auth).replace(/^Bearer\s+/i, '');
  }

  private async handleAdminConnection(ws: WebSocket, req: IncomingMessage) {
    const token = this.extractToken(req);
    if (!token) {
      ws.close();
      return;
    }
    let payload: any;
    try {
      payload = this.jwt.verify(token);
    } catch {
      ws.close();
      return;
    }
    const storeId = String(payload?.storeId ?? '');
    const adminUserId = String(payload?.sub ?? '');
    if (!storeId || !adminUserId) {
      ws.close();
      return;
    }
    const client: AdminClient = { ws, storeId, adminUserId };
    this.adminClients.add(client);
    ws.on('close', () => this.adminClients.delete(client));
    ws.on('error', () => this.adminClients.delete(client));
  }

  private async handleMpConnection(ws: WebSocket, req: IncomingMessage) {
    const params = this.parseUrl(req);
    const storeId = String(params.get('storeId') ?? '');
    const tableId = String(params.get('tableId') ?? '');
    const sessionId = String(params.get('sessionId') ?? '');
    if (!storeId || !tableId || !sessionId) {
      ws.close();
      return;
    }
    const valid = await this.checkMpSession(storeId, tableId, sessionId);
    if (!valid) {
      this.safeSend(ws, { type: 'session.invalid', message: '本桌已结账，请重新扫码开桌' });
      ws.close();
      return;
    }
    const client: MpClient = { ws, storeId, tableId, sessionId };
    this.mpClients.add(client);
    ws.on('close', () => this.mpClients.delete(client));
    ws.on('error', () => this.mpClients.delete(client));
    const snapshot = await this.buildCartSnapshot(sessionId);
    this.safeSend(ws, { type: 'cart.snapshot', ...snapshot });
  }

  private async checkMpSession(storeId: string, tableId: string, sessionId: string) {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, storeId, isActive: true, isDeleted: false, currentSessionId: sessionId }
    });
    if (!table) return false;
    const session = await this.prisma.dining_session.findFirst({
      where: { id: sessionId, storeId, tableId, status: 'ACTIVE' }
    });
    if (!session) return false;
    return true;
  }

  private safeSend(ws: WebSocket, payload: any) {
    if (ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify(payload));
    } catch {}
  }

  private async buildCartSnapshot(sessionId: string) {
    const items = await this.prisma.cart_item.findMany({
      where: { sessionId },
      orderBy: { updatedAt: 'desc' }
    });
    const session = await this.prisma.dining_session.findFirst({
      where: { id: sessionId },
      select: { cartVersion: true }
    });
    const totalQty = items.reduce((sum, it) => sum + it.qty, 0);
    const totalAmount = items.reduce((sum, it) => sum + it.priceSnapshot * it.qty, 0);
    return {
      sessionId,
      cartVersion: session?.cartVersion ?? 0,
      totalQty,
      totalAmount,
      items: items.map((it) => ({
        productId: it.productId,
        nameSnapshot: it.nameSnapshot,
        priceSnapshot: it.priceSnapshot,
        imageUrlSnapshot: it.imageUrlSnapshot,
        qty: it.qty,
        lineTotal: it.priceSnapshot * it.qty
      }))
    };
  }

  async emitAdmin(storeId: string, payload: any) {
    const data = JSON.stringify(payload);
    for (const c of this.adminClients) {
      if (c.storeId !== storeId) continue;
      if (c.ws.readyState !== WebSocket.OPEN) continue;
      try {
        c.ws.send(data);
      } catch {}
    }
  }

  async emitMp(sessionId: string, payload: any) {
    const data = JSON.stringify(payload);
    for (const c of this.mpClients) {
      if (c.sessionId !== sessionId) continue;
      if (c.ws.readyState !== WebSocket.OPEN) continue;
      try {
        c.ws.send(data);
      } catch {}
    }
  }

  async emitCartUpdated(sessionId: string) {
    const snapshot = await this.buildCartSnapshot(sessionId);
    await this.emitMp(sessionId, { type: 'cart.updated', ...snapshot });
  }

  async emitSessionInvalid(sessionId: string) {
    await this.emitMp(sessionId, { type: 'session.invalid', sessionId, message: '本桌已结账，请重新扫码开桌' });
  }
}
