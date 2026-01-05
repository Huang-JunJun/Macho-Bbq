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
      <el-form-item label="角色">
        <el-select v-model="form.roleId" placeholder="请选择角色" style="width: 200px">
          <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :disabled="!isOwner" @click="create">新增员工</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="staff" style="width: 100%" v-loading="loading">
      <el-table-column prop="email" label="账号" min-width="220" />
      <el-table-column label="角色" width="120">
        <template #default="{ row }">{{ row.roleName || (row.role === 'OWNER' ? '店长' : '员工') }}</template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.isActive" type="success">启用</el-tag>
          <el-tag v-else type="info">禁用</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" min-width="180">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button v-if="isOwner" size="small" type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button
            size="small"
            :type="row.role === 'OWNER' ? 'info' : undefined"
            :plain="row.role === 'OWNER'"
            :disabled="!isOwner || row.role === 'OWNER'"
            @click="toggle(row)"
          >
            {{ row.isActive ? '禁用' : '启用' }}
          </el-button>
          <el-button size="small" :disabled="!isOwner" @click="resetPassword(row)">重置密码</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="editVisible" title="编辑员工" width="520px">
    <el-form :model="editForm" label-width="90px">
      <el-form-item label="账号">
        <el-input v-model="editForm.email" placeholder="账号" />
      </el-form-item>
      <el-form-item label="角色">
        <el-select v-model="editForm.roleId" placeholder="请选择角色" :disabled="editIsOwner">
          <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi, type Role, type Staff } from '../api/admin';
import { formatDateTime } from '../common/time';
import { useAuthStore } from '../stores/auth';

const staff = ref<Staff[]>([]);
const roles = ref<Role[]>([]);
const loading = ref(false);
const auth = useAuthStore();
const isOwner = computed(() => auth.role === 'OWNER');
const form = reactive({ email: '', password: '', roleId: '' });
const editVisible = ref(false);
const saving = ref(false);
const editForm = reactive({ id: '', email: '', roleId: '' });
const editIsOwner = computed(() => staff.value.find((s) => s.id === editForm.id)?.role === 'OWNER');

async function reload() {
  loading.value = true;
  try {
    const [res, roleRes] = await Promise.all([adminApi.listStaff(), adminApi.listRoles()]);
    staff.value = res.staff;
    roles.value = roleRes.roles;
    if (!form.roleId) {
      const fallback = roles.value.find((r) => r.key === 'STAFF') || roles.value[0];
      form.roleId = fallback?.id ?? '';
    }
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
  if (!form.roleId) {
    ElMessage.warning('请选择角色');
    return;
  }
  if (/[\u4e00-\u9fff]/.test(account)) {
    ElMessage.warning('账号不能包含中文');
    return;
  }
  try {
    await adminApi.createStaff({ email: account, password: form.password.trim(), roleId: form.roleId || undefined });
    form.email = '';
    form.password = '';
    form.roleId = roles.value.find((r) => r.key === 'STAFF')?.id ?? form.roleId;
    ElMessage.success('已创建');
    await reload();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '创建失败');
  }
}

async function toggle(row: Staff) {
  try {
    if (row.role === 'OWNER') {
      ElMessage.warning('店长账号不可禁用');
      return;
    }
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

function openEdit(row: Staff) {
  editForm.id = row.id;
  editForm.email = row.email;
  editForm.roleId = row.roleId ?? '';
  editVisible.value = true;
}

async function saveEdit() {
  const email = editForm.email.trim();
  if (!email) {
    ElMessage.warning('请输入账号');
    return;
  }
  if (/[\u4e00-\u9fff]/.test(email)) {
    ElMessage.warning('账号不能包含中文');
    return;
  }
  if (!editForm.roleId && !editIsOwner.value) {
    ElMessage.warning('请选择角色');
    return;
  }
  saving.value = true;
  try {
    const current = staff.value.find((s) => s.id === editForm.id);
    if (current && current.email !== email) {
      await adminApi.updateStaffAccount(editForm.id, email);
    }
    if (!editIsOwner.value && (!current || current.roleId !== editForm.roleId)) {
      await adminApi.updateStaffRole(editForm.id, editForm.roleId);
    }
    editVisible.value = false;
    await reload();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '保存失败');
  } finally {
    saving.value = false;
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
