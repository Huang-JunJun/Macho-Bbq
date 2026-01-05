import { defineStore } from 'pinia';
import { adminApi, type MenuGroup } from '../api/admin';

type MenuState = {
  groups: MenuGroup[];
  loaded: boolean;
};

export const useMenuStore = defineStore('menu', {
  state: (): MenuState => ({
    groups: [],
    loaded: false
  }),
  getters: {
    allowedKeys: (s) => {
      const groups = Array.isArray(s.groups) ? s.groups : [];
      return new Set(groups.flatMap((g) => g.items.map((i) => i.key)));
    },
    allowedPaths: (s) => {
      const groups = Array.isArray(s.groups) ? s.groups : [];
      return groups.flatMap((g) => g.items.map((i) => i.path));
    },
    firstPath(): string {
      return this.allowedPaths[0] || '/403';
    }
  },
  actions: {
    async loadMenus(force = false) {
      if (this.loaded && !force) return;
      const res = await adminApi.listMenus();
      this.groups = Array.isArray(res?.groups) ? res.groups : [];
      this.loaded = true;
    },
    reset() {
      this.groups = [];
      this.loaded = false;
    }
  }
});
