<template>
  <el-card>
    <template #header>
      <div style="display: flex; align-items: center; gap: 12px">
        <div style="font-weight: 700; flex: 1">角色管理</div>
        <el-button @click="reload">刷新</el-button>
        <el-button type="primary" @click="openCreate">新增角色</el-button>
      </div>
    </template>

    <el-table :data="roles" style="width: 100%" v-loading="loading">
      <el-table-column prop="name" label="角色名" min-width="200" />
      <el-table-column prop="key" label="标识" width="160">
        <template #default="{ row }">{{ row.key || '-' }}</template>
      </el-table-column>
      <el-table-column label="成员数" width="120">
        <template #default="{ row }">{{ row._count?.admins ?? 0 }}</template>
      </el-table-column>
      <el-table-column prop="updatedAt" label="更新时间" min-width="180">
        <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="260">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" @click="openMenus(row)">菜单权限</el-button>
          <el-button size="small" type="danger" @click="removeRole(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="editVisible" :title="editMode === 'create' ? '新增角色' : '编辑角色'" width="480px">
    <el-form :model="editForm" label-width="90px">
      <el-form-item label="角色名">
        <el-input v-model="editForm.name" placeholder="如 店长/员工/后厨" />
      </el-form-item>
      <el-form-item label="标识">
        <el-input v-model="editForm.key" placeholder="可选，如 OWNER/STAFF" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveRole">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="menuVisible" title="菜单权限" width="560px">
    <div v-if="menuTree.length" style="max-height: 420px; overflow: auto">
      <el-tree
        ref="treeRef"
        :data="menuTree"
        node-key="id"
        show-checkbox
        :default-expand-all="true"
        :props="{ label: 'label', children: 'children' }"
      />
    </div>
    <div v-else style="color: #909399">暂无菜单</div>
    <template #footer>
      <el-button @click="menuVisible = false">取消</el-button>
      <el-button type="primary" :loading="menuSaving" @click="saveMenus">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi, type MenuGroup, type Role } from '../api/admin';
import { formatDateTime } from '../common/time';

const loading = ref(false);
const roles = ref<Role[]>([]);
const menuGroups = ref<MenuGroup[]>([]);

const editVisible = ref(false);
const editMode = ref<'create' | 'edit'>('create');
const editForm = reactive({ id: '', name: '', key: '' });
const saving = ref(false);

const menuVisible = ref(false);
const menuSaving = ref(false);
const currentRole = ref<Role | null>(null);
const treeRef = ref<any>(null);

const menuKeySet = computed(() => new Set(menuGroups.value.flatMap((g) => g.items.map((i) => i.key))));
const menuTree = computed(() =>
  menuGroups.value.map((group) => ({
    id: `group:${group.id}`,
    label: group.label,
    children: group.items.map((item) => ({ id: item.key, label: item.label }))
  }))
);

async function reload() {
  loading.value = true;
  try {
    const [roleRes, menuRes] = await Promise.all([adminApi.listRoles(), adminApi.listMenus()]);
    roles.value = roleRes.roles;
    menuGroups.value = menuRes.groups;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '加载失败');
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editMode.value = 'create';
  editForm.id = '';
  editForm.name = '';
  editForm.key = '';
  editVisible.value = true;
}

function openEdit(role: Role) {
  editMode.value = 'edit';
  editForm.id = role.id;
  editForm.name = role.name;
  editForm.key = role.key ?? '';
  editVisible.value = true;
}

async function saveRole() {
  const name = editForm.name.trim();
  if (!name) {
    ElMessage.warning('请输入角色名');
    return;
  }
  saving.value = true;
  try {
    if (editMode.value === 'create') {
      await adminApi.createRole({ name, key: editForm.key.trim() || undefined });
    } else {
      await adminApi.updateRole(editForm.id, { name, key: editForm.key.trim() || null });
    }
    editVisible.value = false;
    await reload();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '保存失败');
  } finally {
    saving.value = false;
  }
}

async function removeRole(role: Role) {
  try {
    await ElMessageBox.confirm(`确认删除角色：${role.name}？`, '确认', { type: 'warning' });
    await adminApi.deleteRole(role.id);
    await reload();
  } catch (e: any) {
    if (e === 'cancel') return;
    ElMessage.error(e?.response?.data?.message ?? '删除失败');
  }
}

async function openMenus(role: Role) {
  currentRole.value = role;
  menuVisible.value = true;
  await nextTick();
  const keys = (role.menuKeys ?? []).filter((k) => menuKeySet.value.has(String(k)));
  treeRef.value?.setCheckedKeys(keys);
}

async function saveMenus() {
  if (!currentRole.value) return;
  menuSaving.value = true;
  try {
    const keys = (treeRef.value?.getCheckedKeys(false) ?? []) as string[];
    const allowed = keys.filter((k) => menuKeySet.value.has(String(k)));
    await adminApi.updateRoleMenus(currentRole.value.id, allowed);
    ElMessage.success('已保存');
    menuVisible.value = false;
    await reload();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '保存失败');
  } finally {
    menuSaving.value = false;
  }
}

onMounted(reload);
</script>
