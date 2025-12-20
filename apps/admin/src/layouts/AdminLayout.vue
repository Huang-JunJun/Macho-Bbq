<template>
  <el-container style="height: 100%">
    <el-aside width="220px" style="background: #fff; border-right: 1px solid #ebeef5">
      <div style="padding: 16px; font-weight: 700">bbq admin</div>
      <el-menu :default-active="activePath" router>
        <el-menu-item index="/orders">订单</el-menu-item>
        <el-menu-item index="/tables">桌台</el-menu-item>
        <el-menu-item index="/categories">类目</el-menu-item>
        <el-menu-item index="/products">商品</el-menu-item>
        <el-menu-item index="/store">门店</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header style="background: #fff; border-bottom: 1px solid #ebeef5; display: flex; align-items: center">
        <div style="flex: 1"></div>
        <el-button text @click="logout">退出登录</el-button>
      </el-header>
      <el-main style="padding: 16px">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const activePath = computed(() => (route.path === '/' ? '/orders' : route.path));

function logout() {
  auth.logout();
  router.replace('/login');
}
</script>

