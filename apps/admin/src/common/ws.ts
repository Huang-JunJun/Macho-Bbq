type WsHandler = (payload: any) => void;

class AdminWsClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<WsHandler>>();
  private openHandlers = new Set<() => void>();
  private closeHandlers = new Set<() => void>();
  private reconnectTimer: number | null = null;
  private reconnectDelay = 1000;
  private url = '';
  private token = '';

  connect(url: string, token: string) {
    this.url = url;
    this.token = token;
    this.open();
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }
    this.ws = null;
  }

  on(type: string, handler: WsHandler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
  }

  off(type: string, handler: WsHandler) {
    this.handlers.get(type)?.delete(handler);
  }

  onOpen(handler: () => void) {
    this.openHandlers.add(handler);
  }

  offOpen(handler: () => void) {
    this.openHandlers.delete(handler);
  }

  onClose(handler: () => void) {
    this.closeHandlers.add(handler);
  }

  offClose(handler: () => void) {
    this.closeHandlers.delete(handler);
  }

  private open() {
    if (!this.url || !this.token) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    const sep = this.url.includes('?') ? '&' : '?';
    const fullUrl = `${this.url}${sep}token=${encodeURIComponent(this.token)}`;
    this.ws = new WebSocket(fullUrl);
    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      for (const h of this.openHandlers) h();
    };
    this.ws.onclose = () => {
      for (const h of this.closeHandlers) h();
      this.scheduleReconnect();
    };
    this.ws.onerror = () => {
      for (const h of this.closeHandlers) h();
      this.scheduleReconnect();
    };
    this.ws.onmessage = (evt) => {
      let payload: any = null;
      try {
        payload = JSON.parse(String(evt.data));
      } catch {
        return;
      }
      if (!payload || !payload.type) return;
      const set = this.handlers.get(payload.type);
      if (!set) return;
      for (const h of set) h(payload);
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(this.reconnectDelay, 30000);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      this.open();
    }, delay);
  }
}

export const adminWs = new AdminWsClient();
