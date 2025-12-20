import { request } from './request';

export type SpiceLevel = 'NONE' | 'MILD' | 'MEDIUM' | 'HOT';
export type OrderStatus = 'ORDERED' | 'SETTLED' | 'CANCELLED';

export type Store = {
  id: string;
  name: string;
  address: string | null;
};

export type Table = {
  id: string;
  name: string;
  isActive: boolean;
  storeId: string;
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
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

export const api = {
  getStoreInfo(storeId: string) {
    return request<{ store: Store }>({ path: `/store/${storeId}/info`, method: 'GET' });
  },
  resolveTable(params: { storeId: string; tableId: string; sign: string }) {
    return request<{ ok: true; table: Table }>({ path: '/table/resolve', method: 'GET', query: params });
  },
  getMenu(storeId: string) {
    return request<{ categories: Category[] }>({ path: '/menu', method: 'GET', query: { storeId } });
  },
  createOrder(req: {
    storeId: string;
    tableId: string;
    spiceLevel: SpiceLevel;
    remark?: string;
    items: Array<{ productId: string; qty: number }>;
  }) {
    return request<{ orderId: string }>({ path: '/order/create', method: 'POST', data: req });
  },
  listOrders(params: { storeId: string; tableId: string }) {
    return request<{ orders: Order[] }>({ path: '/order/list', method: 'GET', query: params });
  },
  getOrder(id: string) {
    return request<{ order: Order }>({ path: `/order/${id}`, method: 'GET' });
  }
};

