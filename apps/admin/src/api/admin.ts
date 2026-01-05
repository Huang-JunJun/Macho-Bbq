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
  businessHours?: string | null;
  phone?: string | null;
  spiceOptions?: SpiceOption[] | null;
  autoPrintReceiptOnSettle?: boolean;
};

export type SpiceOption = {
  key: string;
  label: string;
  sort: number;
  enabled: boolean;
};

export type Table = {
  id: string;
  name: string;
  isActive: boolean;
  isDeleted?: boolean;
  currentSessionId?: string | null;
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
  unit?: string | null;
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

export type OrderSessionStatus = 'ACTIVE' | 'CLOSED';

export type AdminRole = 'OWNER' | 'STAFF';

export type Staff = {
  id: string;
  email: string;
  role: AdminRole;
  roleId?: string | null;
  roleName?: string | null;
  roleKey?: string | null;
  isActive: boolean;
  storeId: string;
  createdAt: string;
  updatedAt: string;
};

export type MenuItem = {
  key: string;
  label: string;
  path: string;
  sort: number;
};

export type MenuGroup = {
  id: string;
  label: string;
  sort: number;
  items: MenuItem[];
};

export type Role = {
  id: string;
  storeId: string;
  name: string;
  key?: string | null;
  menuKeys?: string[] | null;
  createdAt: string;
  updatedAt: string;
  _count?: { admins: number };
};

export type TableDashboardStatus = 'IDLE' | 'DINING' | 'WAIT_SETTLE';

export type TableDashboardRow = {
  tableId: string;
  tableName: string;
  isEnabled: boolean;
  status: TableDashboardStatus;
  sessionId?: string;
  dinersCount?: number;
  orderCount?: number;
  totalAmount?: number;
  firstOrderAt?: string;
  lastOrderAt?: string;
};

export type Printer = {
  id: string;
  storeId: string;
  name: string;
  isActive: boolean;
  provider: 'USB_AGENT';
  agentKey: string;
  createdAt: string;
  updatedAt: string;
};

export type PrintJob = {
  id: string;
  type: 'KITCHEN_TICKET' | 'BILL_TICKET' | 'RECEIPT_TICKET';
  status: 'PENDING' | 'PICKED' | 'SENT' | 'FAILED';
  sessionId: string;
  orderId?: string | null;
  printerName: string;
  tableName: string;
  operatorEmail: string;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderSessionRow = {
  sessionId: string;
  tableId: string;
  tableName: string | null;
  dinersCount: number;
  status: OrderSessionStatus;
  orderCount: number;
  totalAmount: number;
  createdAt: string;
  lastOrderAt: string;
  settledAt: string | null;
};

export type OrderSessionDetail = {
  session: {
    sessionId: string;
    tableId: string;
    tableName: string | null;
    dinersCount: number;
    status: OrderSessionStatus;
    createdAt: string;
    lastOrderAt: string;
    settledAt: string | null;
    orderCount: number;
  };
  totalAmount: number;
  mergedItems: Array<{
    productId: string;
    nameSnapshot: string;
    priceSnapshot: number;
    totalQty: number;
    lineTotal: number;
  }>;
  orders: Array<{
    orderId: string;
    seqNo: number;
    createdAt: string;
    amount: number;
    spiceLabel?: string;
    remark?: string;
    items: Array<{
      productId: string;
      nameSnapshot: string;
      priceSnapshot: number;
      qty: number;
      lineTotal: number;
    }>;
  }>;
};

export type Order = {
  id: string;
  status: 'ORDERED' | 'SETTLED' | 'CANCELLED';
  spiceKey?: string;
  spiceLabel?: string;
  remark: string | null;
  amount: number;
  storeId: string;
  tableId: string;
  dinersCount?: number;
  sessionId?: string | null;
  table?: Table;
  createdAt: string;
  updatedAt: string;
  settledAt?: string | null;
  items?: OrderItem[];
};

export type Feedback = {
  id: string;
  storeId: string;
  tableId: string | null;
  contact: string | null;
  type: 'DISH' | 'SERVICE' | 'ENV' | 'OTHER';
  content: string;
  images: string[] | null;
  mpUserId: string | null;
  createdAt: string;
  table?: Table | null;
};

export const adminApi = {
  async login(req: AdminLoginReq) {
    const { data } = await http.post<AdminLoginRes>('/admin/login', req);
    return data;
  },

  async listMenus() {
    const { data } = await http.get<{ groups: MenuGroup[] }>('/admin/menus');
    return data;
  },

  async updateStore(req: {
    name: string;
    address?: string;
    businessHours?: string;
    phone?: string;
    spiceOptions?: SpiceOption[];
    autoPrintReceiptOnSettle?: boolean;
  }) {
    const { data } = await http.put<{ store: Store }>('/admin/store', req);
    return data;
  },

  async getAdminStore() {
    const { data } = await http.get<{ store: Store }>('/admin/store');
    return data;
  },

  async listTables() {
    const { data } = await http.get<{ tables: Table[] }>('/admin/table');
    return data;
  },
  async listTableDashboard() {
    const { data } = await http.get<{ tables: TableDashboardRow[] }>('/admin/table/dashboard');
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
    unit?: string;
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
      unit?: string;
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
  async batchDeleteSessions(sessionIds: string[]) {
    const { data } = await http.post<{ ok: true; deletedCount: number }>(`/admin/session/batch-delete`, { sessionIds });
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

  async listOrders(params?: { status?: OrderSessionStatus; startAt?: string; endAt?: string }) {
    const { data } = await http.get<{ orders: OrderSessionRow[] }>('/admin/order/list', { params: params ?? {} });
    return data;
  },
  async getOrderDetail(sessionId: string) {
    const { data } = await http.get<OrderSessionDetail>('/admin/order/detail', { params: { sessionId } });
    return data;
  },
  async settleSession(sessionId: string) {
    const { data } = await http.put<{ ok: true }>(`/admin/session/${sessionId}/settle`);
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
  async deleteOrder(id: string) {
    const { data } = await http.delete<{ ok: true }>(`/admin/order/${id}`);
    return data;
  },
  async moveSessionTable(sessionId: string, req: { fromTableId: string; toTableId: string }) {
    const { data } = await http.post<{ ok: true; sessionId: string; fromTableId: string; toTableId: string }>(
      `/admin/session/${sessionId}/move-table`,
      req
    );
    return data;
  },
  async printBill(sessionId: string) {
    const { data } = await http.post<{ ok: true }>(`/admin/session/${sessionId}/print/bill`);
    return data;
  },
  async printReceipt(sessionId: string) {
    const { data } = await http.post<{ ok: true }>(`/admin/session/${sessionId}/print/receipt`);
    return data;
  },

  async getStoreInfo(storeId: string) {
    const { data } = await http.get<{ store: Store }>(`/store/${storeId}/info`);
    return data;
  },

  async listFeedback() {
    const { data } = await http.get<{ feedbacks: Feedback[] }>('/admin/feedback/list');
    return data;
  },

  async listStaff() {
    const { data } = await http.get<{ staff: Staff[] }>('/admin/staff/list');
    return data;
  },
  async createStaff(req: { email: string; password: string; roleId?: string }) {
    const { data } = await http.post<{ staff: Staff }>('/admin/staff/create', req);
    return data;
  },
  async updateStaffAccount(id: string, email: string) {
    const { data } = await http.put<{ staff: Staff }>(`/admin/staff/${id}/update-account`, { email });
    return data;
  },
  async updateStaffRole(id: string, roleId: string) {
    const { data } = await http.put<{ staff: Staff }>(`/admin/staff/${id}/update-role`, { roleId });
    return data;
  },
  async enableStaff(id: string) {
    const { data } = await http.put<{ staff: Staff }>(`/admin/staff/${id}/enable`);
    return data;
  },
  async disableStaff(id: string) {
    const { data } = await http.put<{ staff: Staff }>(`/admin/staff/${id}/disable`);
    return data;
  },
  async resetStaffPassword(id: string, password: string) {
    const { data } = await http.put<{ staff: Staff }>(`/admin/staff/${id}/reset-password`, { password });
    return data;
  },

  async listRoles() {
    const { data } = await http.get<{ roles: Role[] }>('/admin/role/list');
    return data;
  },
  async createRole(req: { name: string; key?: string }) {
    const { data } = await http.post<{ role: Role }>('/admin/role/create', req);
    return data;
  },
  async updateRole(id: string, req: { name?: string; key?: string | null }) {
    const { data } = await http.put<{ role: Role }>(`/admin/role/${id}/update`, req);
    return data;
  },
  async updateRoleMenus(id: string, menuKeys: string[]) {
    const { data } = await http.put<{ role: Role }>(`/admin/role/${id}/menus`, { menuKeys });
    return data;
  },
  async deleteRole(id: string) {
    const { data } = await http.delete<{ ok: true }>(`/admin/role/${id}`);
    return data;
  },

  async listPrinters() {
    const { data } = await http.get<{ printers: Printer[] }>('/admin/print/printers');
    return data;
  },
  async createPrinter(req: { name: string }) {
    const { data } = await http.post<{ printer: Printer }>('/admin/print/printers', req);
    return data;
  },
  async updatePrinter(id: string, req: { name?: string; isActive?: boolean }) {
    const { data } = await http.put<{ printer: Printer }>(`/admin/print/printers/${id}`, req);
    return data;
  },
  async listPrintJobs(params?: { type?: string; status?: string; startAt?: string; endAt?: string; keyword?: string }) {
    const { data } = await http.get<{ jobs: PrintJob[] }>('/admin/print/jobs', { params: params ?? {} });
    return data;
  },
  async retryPrintJob(id: string) {
    const { data } = await http.post<{ job: PrintJob }>(`/admin/print/jobs/${id}/retry`);
    return data;
  }
};
