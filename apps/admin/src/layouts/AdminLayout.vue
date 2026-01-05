<template>
  <el-container style="height: 100%">
    <el-aside width="220px" style="background: #fff; border-right: 1px solid #ebeef5">
      <div style="padding: 16px; font-weight: 700">猛男烧烤管理后台</div>
      <el-menu
        :default-active="activePath"
        :default-openeds="openeds"
        router
        @open="handleOpen"
        @close="handleClose"
      >
        <el-sub-menu v-for="group in menuGroups" :key="group.id" :index="group.id">
          <template #title>{{ group.label }}</template>
          <el-menu-item v-for="item in group.items" :key="item.path" :index="item.path">{{ item.label }}</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header style="background: #fff; border-bottom: 1px solid #ebeef5; display: flex; align-items: center">
        <div style="flex: 1"></div>
        <div style="margin-right: 12px; color: #606266; font-size: 13px">
          {{ auth.email || 'admin' }} <span v-if="auth.role">({{ roleLabel }})</span>
        </div>
        <el-button text @click="logout">退出登录</el-button>
      </el-header>
      <el-main style="padding: 16px">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useMenuStore } from '../stores/menu';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const menu = useMenuStore();

const activePath = computed(() => (route.path === '/' ? '/orders' : route.path));
const roleLabel = computed(() => (auth.role === 'OWNER' ? '店长' : auth.role === 'STAFF' ? '员工' : auth.role));
const menuGroups = computed(() => menu.groups);

const activeGroup = computed(() => {
  const current = activePath.value;
  for (const g of menuGroups.value) {
    if (g.items.some((i) => i.path === current)) return g.id;
  }
  return menuGroups.value[0]?.id ?? '';
});

const openedGroups = ref<string[]>([]);
const openeds = computed(() => openedGroups.value);

watch(
  () => menuGroups.value,
  (groups) => {
    const ids = new Set(groups.map((g) => g.id));
    openedGroups.value = openedGroups.value.filter((id) => ids.has(id));
    if (activeGroup.value && !openedGroups.value.includes(activeGroup.value)) {
      openedGroups.value.push(activeGroup.value);
    }
  },
  { immediate: true }
);

watch(
  () => activeGroup.value,
  (id) => {
    if (id && !openedGroups.value.includes(id)) openedGroups.value.push(id);
  }
);

function handleOpen(index: string) {
  if (!openedGroups.value.includes(index)) openedGroups.value.push(index);
}

function handleClose(index: string) {
  openedGroups.value = openedGroups.value.filter((id) => id !== index);
}

function logout() {
  auth.logout();
  menu.reset();
  router.replace('/login');
}
</script>
