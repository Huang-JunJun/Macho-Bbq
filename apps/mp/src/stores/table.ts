import { defineStore } from 'pinia';

export type TableState = {
  storeId: string;
  tableId: string;
  tableName: string;
};

const KEY = 'bbq_mp_table';

function load(): TableState {
  try {
    const raw = uni.getStorageSync(KEY);
    if (!raw) return { storeId: '', tableId: '', tableName: '' };
    return JSON.parse(String(raw)) as TableState;
  } catch {
    return { storeId: '', tableId: '', tableName: '' };
  }
}

function persist(s: TableState) {
  uni.setStorageSync(KEY, JSON.stringify(s));
}

export const useTableStore = defineStore('table', {
  state: (): TableState => load(),
  getters: {
    ready: (s) => !!s.storeId && !!s.tableId
  },
  actions: {
    setTable(payload: Partial<TableState>) {
      this.storeId = payload.storeId ?? this.storeId;
      this.tableId = payload.tableId ?? this.tableId;
      this.tableName = payload.tableName ?? this.tableName;
      persist({ storeId: this.storeId, tableId: this.tableId, tableName: this.tableName });
    },
    clear() {
      this.storeId = '';
      this.tableId = '';
      this.tableName = '';
      persist({ storeId: '', tableId: '', tableName: '' });
    }
  }
});

