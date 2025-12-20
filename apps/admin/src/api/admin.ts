import { http } from './http';

export type AdminLoginReq = {
  email: string;
  password: string;
};

export type AdminLoginRes = {
  accessToken: string;
};

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
  status: 'ORDERED' | 'SETTLED' | 'CANCELLED';
  spiceLevel: 'NONE' | 'MILD' | 'MEDIUM' | 'HOT';
  remark: string | null;
  amount: number;
  storeId: string;
  tableId: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
};

export const adminApi = {
  async login(req: AdminLoginReq) {
    const { data } = await http.post<AdminLoginRes>('/admin/login', req);
    return data;
  },

  async updateStore(req: { name: string; address?: string }) {
    const { data } = await http.put<{ store: Store }>('/admin/store', req);
    return data;
  },

  async listTables() {
    const { data } = await http.get<{ tables: Table[] }>('/admin/table');
    return data;
  },
  async createTable(req: { name: string; isActive?: boolean }) {
    const { data } = await http.post<{ table: Table }>('/admin/table', req);
    return data;
  },
  async updateTable(id: string, req: { name?: string; isActive?: boolean }) {
    const { data } = await http.put<{ table: Table }>(`/admin/table/${id}`, req);
    return data;
  },
  async deleteTable(id: string) {
    const { data } = await http.delete<{ ok: true }>(`/admin/table/${id}`);
    return data;
  },
  async tableQrcode(id: string) {
    const { data } = await http.get<{ content: string; base64: string }>(`/admin/table/${id}/qrcode`);
    return data;
  },

  async listCategories() {
    const { data } = await http.get<{ categories: Category[] }>('/admin/category');
    return data;
  },
  async createCategory(req: { name: string; sort?: number }) {
    const { data } = await http.post<{ category: Category }>('/admin/category', req);
    return data;
  },
  async updateCategory(id: string, req: { name?: string; sort?: number }) {
    const { data } = await http.put<{ category: Category }>(`/admin/category/${id}`, req);
    return data;
  },
  async deleteCategory(id: string) {
    const { data } = await http.delete<{ ok: true }>(`/admin/category/${id}`);
    return data;
  },

  async listProducts() {
    const { data } = await http.get<{ products: Product[] }>('/admin/product');
    return data;
  },
  async createProduct(req: {
    name: string;
    price: number;
    categoryId: string;
    imageUrl?: string;
    isOnSale?: boolean;
    isSoldOut?: boolean;
    sort?: number;
  }) {
    const { data } = await http.post<{ product: Product }>('/admin/product', req);
    return data;
  },
  async updateProduct(
    id: string,
    req: {
      name?: string;
      price?: number;
      categoryId?: string;
      imageUrl?: string;
      isOnSale?: boolean;
      isSoldOut?: boolean;
      sort?: number;
    }
  ) {
    const { data } = await http.put<{ product: Product }>(`/admin/product/${id}`, req);
    return data;
  },
  async deleteProduct(id: string) {
    const { data } = await http.delete<{ ok: true }>(`/admin/product/${id}`);
    return data;
  },

  async uploadImage(file: File) {
    const form = new FormData();
    form.append('file', file);
    const { data } = await http.post<{ url: string }>('/admin/upload/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },

  async listOrders(status?: 'ORDERED' | 'SETTLED') {
    const { data } = await http.get<{ orders: Order[] }>('/admin/order/list', { params: status ? { status } : {} });
    return data;
  },
  async getOrder(id: string) {
    const { data } = await http.get<{ order: Order }>(`/admin/order/${id}`);
    return data;
  },
  async settleOrder(id: string) {
    const { data } = await http.put<{ ok: true }>(`/admin/order/${id}/settle`);
    return data;
  },

  async getStoreInfo(storeId: string) {
    const { data } = await http.get<{ store: Store }>(`/store/${storeId}/info`);
    return data;
  }
};
