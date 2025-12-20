import { defineStore } from 'pinia';

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  qty: number;
  imageUrl?: string | null;
};

type CartState = {
  items: Record<string, CartItem>;
};

const KEY = 'bbq_mp_cart';

function load(): CartState {
  try {
    const raw = uni.getStorageSync(KEY);
    if (!raw) return { items: {} };
    return JSON.parse(String(raw)) as CartState;
  } catch {
    return { items: {} };
  }
}

function persist(s: CartState) {
  uni.setStorageSync(KEY, JSON.stringify(s));
}

export const useCartStore = defineStore('cart', {
  state: (): CartState => load(),
  getters: {
    list: (s) => Object.values(s.items).filter((i) => i.qty > 0),
    totalQty: (s) => Object.values(s.items).reduce((sum, it) => sum + it.qty, 0),
    totalAmount: (s) => Object.values(s.items).reduce((sum, it) => sum + it.price * it.qty, 0)
  },
  actions: {
    setQty(payload: { productId: string; name: string; price: number; qty: number; imageUrl?: string | null }) {
      const nextQty = Math.max(0, payload.qty);
      if (nextQty === 0) {
        delete this.items[payload.productId];
      } else {
        this.items[payload.productId] = {
          productId: payload.productId,
          name: payload.name,
          price: payload.price,
          qty: nextQty,
          imageUrl: payload.imageUrl ?? null
        };
      }
      persist({ items: this.items });
    },
    inc(payload: { productId: string; name: string; price: number; imageUrl?: string | null }) {
      const current = this.items[payload.productId]?.qty ?? 0;
      this.setQty({ ...payload, qty: current + 1 });
    },
    dec(productId: string) {
      const current = this.items[productId]?.qty ?? 0;
      const item = this.items[productId];
      if (!item) return;
      this.setQty({ productId, name: item.name, price: item.price, qty: current - 1, imageUrl: item.imageUrl ?? null });
    },
    clear() {
      this.items = {};
      persist({ items: {} });
    }
  }
});

