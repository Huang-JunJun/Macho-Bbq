import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useMenuStore } from '../stores/menu';
import LoginPage from '../pages/Login.vue';
import ForbiddenPage from '../pages/Forbidden.vue';
import AdminLayout from '../layouts/AdminLayout.vue';
import TablesPage from '../pages/Tables.vue';
import CategoriesPage from '../pages/Categories.vue';
import ProductsPage from '../pages/Products.vue';
import OrdersPage from '../pages/Orders.vue';
import StorePage from '../pages/Store.vue';
import FeedbackPage from '../pages/Feedback.vue';
import TableDashboardPage from '../pages/TableDashboard.vue';
import StaffPage from '../pages/Staff.vue';
import PrintPage from '../pages/Print.vue';
import RolesPage from '../pages/Roles.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginPage, meta: { public: true } },
    { path: '/403', component: ForbiddenPage, meta: { public: true } },
    {
      path: '/',
      component: AdminLayout,
      children: [
        { path: '', redirect: '/orders' },
        { path: 'tables', component: TablesPage, meta: { menuKey: 'tables' } },
        { path: 'table-dashboard', component: TableDashboardPage, meta: { menuKey: 'table-dashboard' } },
        { path: 'categories', component: CategoriesPage, meta: { menuKey: 'categories' } },
        { path: 'products', component: ProductsPage, meta: { menuKey: 'products' } },
        { path: 'orders', component: OrdersPage, meta: { menuKey: 'orders' } },
        { path: 'feedback', component: FeedbackPage, meta: { menuKey: 'feedback' } },
        { path: 'store', component: StorePage, meta: { menuKey: 'store' } },
        { path: 'staff', component: StaffPage, meta: { menuKey: 'staff' } },
        { path: 'roles', component: RolesPage, meta: { menuKey: 'roles' } },
        { path: 'print', component: PrintPage, meta: { menuKey: 'print' } }
      ]
    },
    { path: '/:pathMatch(.*)*', redirect: '/orders' }
  ]
});

router.beforeEach(async (to) => {
  const isPublic = Boolean(to.meta.public);
  const auth = useAuthStore();
  const menu = useMenuStore();
  if (isPublic) {
    if (to.path === '/login' && auth.isAuthed) return '/orders';
    return true;
  }
  if (!auth.isAuthed) return { path: '/login', query: { redirect: to.fullPath } };
  if (!menu.loaded) {
    try {
      await menu.loadMenus();
    } catch {
      return { path: '/login', query: { redirect: to.fullPath } };
    }
  }
  const key = String((to.meta as any)?.menuKey ?? '').trim();
  if (key && !menu.allowedKeys.has(key)) {
    return menu.firstPath || '/403';
  }
  return true;
});

export default router;
