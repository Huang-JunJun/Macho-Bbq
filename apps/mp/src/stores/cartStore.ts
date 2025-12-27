import { defineStore } from 'pinia';
import { api, type CartRes } from '../api';
import { useTableStore } from './tableStore';

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  unit?: string | null;
  imageUrl?: string | null;
  qty: number;
};

export type ProductMeta = {
  productId: string;
  name: string;
  price: number;
  unit?: string | null;
  imageUrl?: string | null;
  isOnSale: boolean;
  isSoldOut: boolean;
};

export type CartViewItem = CartItem & {
  isOnSale: boolean;
  isSoldOut: boolean;
  isInvalid: boolean;
  statusTag: '' | '售罄' | '已下架';
};

type CartState = {
  items: Record<string, CartItem>;
  productMap: Record<string, ProductMeta>;
  cartVersion: number;
};

function toViewItem(item: CartItem, meta?: ProductMeta): CartViewItem {
  const isOnSale = meta ? !!meta.isOnSale : false;
  const isSoldOut = meta ? !!meta.isSoldOut : false;
  const isInvalid = !isOnSale || isSoldOut;
  const statusTag = !isOnSale ? '已下架' : isSoldOut ? '售罄' : '';
  const merged: CartItem = {
    productId: item.productId,
    name: meta?.name ?? item.name,
    price: meta?.price ?? item.price,
    unit: meta?.unit ?? item.unit ?? '',
    imageUrl: meta?.imageUrl ?? item.imageUrl ?? null,
    qty: item.qty
  };
  return { ...merged, isOnSale, isSoldOut, isInvalid, statusTag };
}

export const useCartStore = defineStore('cart', {
  state: (): CartState => ({
    items: {},
    productMap: {},
    cartVersion: 0
  }),
  getters: {
    list: (s): CartViewItem[] =>
      Object.values(s.items)
        .filter((i) => i.qty > 0)
        .map((i) => toViewItem(i, s.productMap[i.productId])),
    totalQty: (s) => Object.values(s.items).reduce((sum, it) => sum + it.qty, 0),
    totalAmount: (s) => Object.values(s.items).reduce((sum, it) => sum + it.price * it.qty, 0),
    invalidItems(): CartViewItem[] {
      return this.list.filter((i) => i.qty > 0 && i.isInvalid);
    },
    hasInvalid(): boolean {
      return this.invalidItems.length > 0;
    },
    invalidMessage(): string {
      return '购物车中存在已售罄/已下架商品，请先移除后再下单';
    },
    validList(): CartViewItem[] {
      return this.list.filter((i) => i.qty > 0 && !i.isInvalid);
    }
  },
  actions: {
    setFromServer(res: CartRes) {
      const next: Record<string, CartItem> = {};
      for (const it of res.items) {
        next[it.productId] = {
          productId: it.productId,
          name: it.nameSnapshot,
          price: it.priceSnapshot / 100,
          imageUrl: it.imageUrlSnapshot ?? null,
          qty: it.qty
        };
      }
      this.items = next;
      this.cartVersion = res.cartVersion ?? this.cartVersion;
    },
    async fetchRemote() {
      const tableStore = useTableStore();
      if (!tableStore.isReady) {
        this.clearLocal();
        return null;
      }
      const res = await api.getCart({
        storeId: tableStore.storeId,
        tableId: tableStore.tableId,
        sessionId: tableStore.sessionId
      });
      this.setFromServer(res);
      return res;
    },
    updateProductMap(metas: ProductMeta[]) {
      const next: Record<string, ProductMeta> = {};
      for (const m of metas) next[m.productId] = m;
      this.productMap = next;
    },
    async add(p: { productId: string; name: string; price: number; imageUrl?: string | null }) {
      const meta = this.productMap[p.productId];
      if (meta && (!meta.isOnSale || meta.isSoldOut)) return;
      const current = this.items[p.productId]?.qty ?? 0;
      await this.setQtyRemote(p.productId, current + 1);
    },
    async minus(productId: string) {
      const current = this.items[productId]?.qty ?? 0;
      if (current <= 0) return;
      await this.setQtyRemote(productId, current - 1);
    },
    async setQtyRemote(productId: string, qty: number) {
      const nextQty = Math.max(0, Math.floor(qty));
      const meta = this.productMap[productId];
      const isOnSale = meta ? !!meta.isOnSale : false;
      const isSoldOut = meta ? !!meta.isSoldOut : false;
      const isInvalid = !isOnSale || isSoldOut;
      if (isInvalid && nextQty !== 0) return;

      const tableStore = useTableStore();
      if (!tableStore.isReady) throw new Error('请先扫码桌贴开始点单');
      const res = await api.setCartItemQty({
        storeId: tableStore.storeId,
        tableId: tableStore.tableId,
        sessionId: tableStore.sessionId,
        productId,
        qty: nextQty
      });
      this.setFromServer(res);
    },
    async remove(productId: string) {
      await this.setQtyRemote(productId, 0);
    },
    async clearRemote() {
      const tableStore = useTableStore();
      if (!tableStore.isReady) {
        this.clearLocal();
        return;
      }
      const res = await api.clearCart({
        storeId: tableStore.storeId,
        tableId: tableStore.tableId,
        sessionId: tableStore.sessionId
      });
      this.setFromServer(res);
    },
    clearLocal() {
      this.items = {};
      this.cartVersion = 0;
    }
  }
});
