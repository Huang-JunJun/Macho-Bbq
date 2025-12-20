import { defineStore } from 'pinia';

type OrderState = {
  lastOrderId: string;
};

const KEY = 'bbq_mp_order';

function load(): OrderState {
  try {
    const raw = uni.getStorageSync(KEY);
    if (!raw) return { lastOrderId: '' };
    return JSON.parse(String(raw)) as OrderState;
  } catch {
    return { lastOrderId: '' };
  }
}

function persist(s: OrderState) {
  uni.setStorageSync(KEY, JSON.stringify(s));
}

export const useOrderStore = defineStore('order', {
  state: (): OrderState => load(),
  actions: {
    setLastOrderId(id: string) {
      this.lastOrderId = id;
      persist({ lastOrderId: id });
    }
  }
});

