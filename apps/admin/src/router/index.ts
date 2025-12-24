import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LoginPage from '../pages/Login.vue';
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

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginPage, meta: { public: true } },
    {
      path: '/',
      component: AdminLayout,
      children: [
        { path: '', redirect: '/orders' },
        { path: 'tables', component: TablesPage },
        { path: 'table-dashboard', component: TableDashboardPage },
        { path: 'categories', component: CategoriesPage },
        { path: 'products', component: ProductsPage },
        { path: 'orders', component: OrdersPage },
        { path: 'feedback', component: FeedbackPage },
        { path: 'store', component: StorePage },
        { path: 'staff', component: StaffPage },
        { path: 'print', component: PrintPage }
      ]
    },
    { path: '/:pathMatch(.*)*', redirect: '/orders' }
  ]
});

router.beforeEach((to) => {
  const isPublic = Boolean(to.meta.public);
  const auth = useAuthStore();
  if (isPublic) {
    if (to.path === '/login' && auth.isAuthed) return '/orders';
    return true;
  }
  if (!auth.isAuthed) return { path: '/login', query: { redirect: to.fullPath } };
  return true;
});

export default router;
