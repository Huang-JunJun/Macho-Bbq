<template>
  <el-card>
    <template #header>
      <div style="display: flex; align-items: center; gap: 12px">
        <div style="font-weight: 700; flex: 1">员工管理</div>
        <el-button @click="reload">刷新</el-button>
      </div>
    </template>

    <el-form :inline="true" :model="form" style="margin-bottom: 16px">
      <el-form-item label="账号">
        <el-input v-model="form.email" placeholder="账号" style="width: 220px" />
      </el-form-item>
      <el-form-item label="初始密码">
        <el-input v-model="form.password" type="password" placeholder="至少 6 位" style="width: 220px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="create">新增员工</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="staff" style="width: 100%" v-loading="loading">
      <el-table-column prop="email" label="账号" min-width="220" />
      <el-table-column label="角色" width="120">
        <template #default="{ row }">{{ row.role === 'OWNER' ? '店长' : '员工' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.isActive" type="success">启用</el-tag>
          <el-tag v-else type="info">禁用</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" min-width="180" />
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button size="small" @click="toggle(row)">{{ row.isActive ? '禁用' : '启用' }}</el-button>
          <el-button size="small" @click="resetPassword(row)">重置密码</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi, type Staff } from '../api/admin';

const staff = ref<Staff[]>([]);
const loading = ref(false);
const form = reactive({ email: '', password: '' });

async function reload() {
  loading.value = true;
  try {
    const res = await adminApi.listStaff();
    staff.value = res.staff;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '加载失败');
  } finally {
    loading.value = false;
  }
}

async function create() {
  const account = form.email.trim();
  if (!account || !form.password.trim()) {
    ElMessage.warning('请输入账号与初始密码');
    return;
  }
  if (/[\u4e00-\u9fff]/.test(account)) {
    ElMessage.warning('账号不能包含中文');
    return;
  }
  try {
    await adminApi.createStaff({ email: account, password: form.password.trim() });
    form.email = '';
    form.password = '';
    ElMessage.success('已创建');
    await reload();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '创建失败');
  }
}

async function toggle(row: Staff) {
  try {
    if (row.isActive) {
      await adminApi.disableStaff(row.id);
    } else {
      await adminApi.enableStaff(row.id);
    }
    await reload();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '操作失败');
  }
}

async function resetPassword(row: Staff) {
  try {
    const res = await ElMessageBox.prompt('请输入新密码', '重置密码', {
      inputType: 'password',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    });
    if (!res.value) return;
    await adminApi.resetStaffPassword(row.id, res.value);
    ElMessage.success('已重置');
  } catch (e: any) {
    if (e === 'cancel') return;
    ElMessage.error(e?.response?.data?.message ?? '重置失败');
  }
}

onMounted(reload);
</script>
