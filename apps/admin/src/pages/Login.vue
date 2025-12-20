<template>
  <div style="height: 100%; display: flex; align-items: center; justify-content: center">
    <el-card style="width: 380px">
      <div style="font-size: 18px; font-weight: 700; margin-bottom: 12px">后台登录</div>
      <el-form :model="form" label-width="90px" @submit.prevent>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="admin@example.com" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" style="width: 100%" @click="onSubmit">登录</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { adminApi } from '../api/admin';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const form = reactive({
  email: 'admin@example.com',
  password: 'admin123'
});
const loading = ref(false);

async function onSubmit() {
  loading.value = true;
  try {
    const res = await adminApi.login({ email: form.email, password: form.password });
    auth.setToken(res.accessToken);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/orders';
    await router.replace(redirect);
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '登录失败');
  } finally {
    loading.value = false;
  }
}
</script>

