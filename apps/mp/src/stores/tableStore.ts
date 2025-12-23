import { defineStore } from 'pinia';

export type TableState = {
  storeId: string;
  tableId: string;
  tableName: string;
  dinersCount: number;
  sessionId: string;
  lastActiveAt: number;
};

const KEY = 'bbq_mp_table';

const EMPTY: TableState = { storeId: '', tableId: '', tableName: '', dinersCount: 0, sessionId: '', lastActiveAt: 0 };

function load(): TableState {
  try {
    const raw = uni.getStorageSync(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(String(raw)) as Partial<TableState>;
    return {
      storeId: String(parsed.storeId ?? ''),
      tableId: String(parsed.tableId ?? ''),
      tableName: String(parsed.tableName ?? ''),
      dinersCount: Number(parsed.dinersCount ?? 0) || 0,
      sessionId: String(parsed.sessionId ?? ''),
      lastActiveAt: Number(parsed.lastActiveAt ?? 0) || 0
    };
  } catch {
    return { ...EMPTY };
  }
}

function persist(s: TableState) {
  uni.setStorageSync(KEY, JSON.stringify(s));
}

export const useTableStore = defineStore('table', {
  state: (): TableState => load(),
  getters: {
    isReady: (s) => !!s.storeId && !!s.tableId && !!s.sessionId && s.dinersCount >= 1,
    ready: (s) => !!s.storeId && !!s.tableId && !!s.sessionId && s.dinersCount >= 1
  },
  actions: {
    setTable(payload: Partial<TableState>) {
      this.storeId = payload.storeId ?? this.storeId;
      this.tableId = payload.tableId ?? this.tableId;
      this.tableName = payload.tableName ?? this.tableName;
      this.dinersCount = payload.dinersCount ?? this.dinersCount;
      this.sessionId = payload.sessionId ?? this.sessionId;
      this.lastActiveAt = Date.now();
      persist({
        storeId: this.storeId,
        tableId: this.tableId,
        tableName: this.tableName,
        dinersCount: this.dinersCount,
        sessionId: this.sessionId,
        lastActiveAt: this.lastActiveAt
      });
    },
    touch() {
      this.lastActiveAt = Date.now();
      persist({
        storeId: this.storeId,
        tableId: this.tableId,
        tableName: this.tableName,
        dinersCount: this.dinersCount,
        sessionId: this.sessionId,
        lastActiveAt: this.lastActiveAt
      });
    },
    clear() {
      this.storeId = '';
      this.tableId = '';
      this.tableName = '';
      this.dinersCount = 0;
      this.sessionId = '';
      this.lastActiveAt = 0;
      persist({ ...EMPTY });
    }
  }
});
