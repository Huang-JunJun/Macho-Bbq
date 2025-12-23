import { request } from './request';

export type SpiceLevel = 'NONE' | 'MILD' | 'MEDIUM' | 'HOT';
export type OrderStatus = 'ORDERED' | 'SETTLED' | 'CANCELLED';
export type OrderChannel = 'DINE_IN' | 'PICKUP' | 'DELIVERY';

export type Store = {
  id: string;
  name: string;
  address: string | null;
  businessHours?: string | null;
  phone?: string | null;
  spiceLabels?: Record<string, string> | null;
};

export type Table = {
  id: string;
  name: string;
  isActive: boolean;
  storeId: string;
};

export type TableResolveRes = {
  ok: true;
  storeName?: string;
  tableName?: string;
  store?: Store;
  table: Table;
};

export type TableSessionStartRes = {
  sessionId: string;
  storeId: string;
  tableId: string;
  storeName: string;
  tableName: string;
  dinersCount: number;
};

export type Category = {
  id: string;
  name: string;
  sort: number;
  storeId: string;
  products: Product[];
};

export type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  isOnSale: boolean;
  isSoldOut: boolean;
  sort: number;
  storeId: string;
  categoryId: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  qty: number;
  orderId: string;
};

export type Order = {
  id: string;
  status: OrderStatus;
  spiceLevel: SpiceLevel;
  remark: string | null;
  amount: number;
  storeId: string;
  tableId: string;
  sessionId?: string;
  dinersCount?: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

export type CartItemServer = {
  productId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  imageUrlSnapshot?: string | null;
  qty: number;
  lineTotal: number;
};

export type CartRes = {
  items: CartItemServer[];
  totalQty: number;
  totalAmount: number;
};

export const api = {
  getStoreInfo(storeId: string) {
    return request<{ store: Store }>({ path: `/store/${storeId}/info`, method: 'GET' });
  },
  resolveTable(params: { storeId: string; tableId: string; sign: string }) {
    return request<TableResolveRes>({ path: '/table/resolve', method: 'GET', query: params });
  },
  startTableSession(req: { storeId: string; tableId: string; sign: string; dinersCount: number }) {
    return request<TableSessionStartRes>({ path: '/table/session/start', method: 'POST', data: req });
  },
  checkTableSession(params: { storeId: string; tableId: string; sessionId: string }) {
    return request<{ valid: boolean }>({ path: '/table/session/check', method: 'GET', query: params });
  },
  getCart(params: { storeId: string; tableId: string; sessionId: string }) {
    return request<CartRes>({ path: '/cart', method: 'GET', query: params });
  },
  setCartItemQty(req: { storeId: string; tableId: string; sessionId: string; productId: string; qty: number }) {
    return request<CartRes>({ path: '/cart/item/setQty', method: 'POST', data: req });
  },
  clearCart(req: { storeId: string; tableId: string; sessionId: string }) {
    return request<CartRes>({ path: '/cart/clear', method: 'POST', data: req });
  },
  getMenu(storeId: string) {
    return request<{ categories: Category[] }>({ path: '/menu', method: 'GET', query: { storeId } });
  },
  createOrder(req: {
    storeId: string;
    tableId: string;
    sessionId: string;
    dinersCount: number;
    spiceLevel: SpiceLevel;
    channel?: OrderChannel;
    remark?: string;
    items: Array<{ productId: string; qty: number }>;
  }) {
    return request<{ orderId: string }>({ path: '/order/create', method: 'POST', data: req });
  },
  listOrdersBySession(sessionId: string) {
    return request<{ orders: Order[] }>({ path: '/order/list', method: 'GET', query: { sessionId } });
  },
  getOrder(id: string) {
    return request<{ order: Order }>({ path: `/order/${id}`, method: 'GET' });
  },
  createFeedback(req: {
    storeId: string;
    tableId?: string;
    contact?: string;
    type: 'DISH' | 'SERVICE' | 'ENV' | 'OTHER';
    content: string;
    images?: string[];
  }) {
    return request<{ ok: true; id: string }>({ path: '/feedback/create', method: 'POST', data: req });
  }
};
