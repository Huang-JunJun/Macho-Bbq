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

export const MENU_GROUPS: MenuGroup[] = [
  {
    id: 'orders',
    label: '订单管理',
    sort: 1,
    items: [{ key: 'orders', label: '订单', path: '/orders', sort: 1 }]
  },
  {
    id: 'tables',
    label: '桌台管理',
    sort: 2,
    items: [
      { key: 'table-dashboard', label: '桌台状态', path: '/table-dashboard', sort: 1 },
      { key: 'tables', label: '桌台', path: '/tables', sort: 2 }
    ]
  },
  {
    id: 'products',
    label: '商品管理',
    sort: 3,
    items: [
      { key: 'categories', label: '类目', path: '/categories', sort: 1 },
      { key: 'products', label: '商品', path: '/products', sort: 2 }
    ]
  },
  {
    id: 'ops',
    label: '运营',
    sort: 4,
    items: [{ key: 'feedback', label: '反馈', path: '/feedback', sort: 1 }]
  },
  {
    id: 'system',
    label: '系统管理',
    sort: 5,
    items: [
      { key: 'store', label: '门店', path: '/store', sort: 1 },
      { key: 'staff', label: '员工', path: '/staff', sort: 2 },
      { key: 'roles', label: '角色管理', path: '/roles', sort: 3 },
      { key: 'print', label: '打印', path: '/print', sort: 4 }
    ]
  }
];

export const ALL_MENU_KEYS = new Set(MENU_GROUPS.flatMap((group) => group.items.map((item) => item.key)));

export function filterMenuGroups(allowedKeys: Set<string>) {
  return MENU_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => allowedKeys.has(item.key)).sort((a, b) => a.sort - b.sort)
  }))
    .filter((group) => group.items.length > 0)
    .sort((a, b) => a.sort - b.sort);
}
