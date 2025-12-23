<template>
  <el-card>
    <template #header>
      <div style="display: flex; align-items: center">
        <div style="font-weight: 700; flex: 1">桌台管理</div>
        <el-button type="primary" @click="openCreate">新增</el-button>
      </div>
    </template>

    <el-table :data="tables" style="width: 100%" v-loading="loading">
      <el-table-column prop="name" label="桌号" />
      <el-table-column prop="isActive" label="启用" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.isActive" type="success">启用</el-tag>
          <el-tag v-else type="info">停用</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="320">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="warning" @click="toggleActive(row)">{{ row.isActive ? '停用' : '启用' }}</el-button>
          <el-button size="small" type="primary" @click="showQrcode(row)">二维码</el-button>
          <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="editVisible" :title="editMode === 'create' ? '新增桌台' : '编辑桌台'" width="420px">
    <el-form :model="editForm" label-width="90px">
      <el-form-item label="桌号">
        <el-input v-model="editForm.name" />
      </el-form-item>
      <el-form-item label="启用">
        <el-switch v-model="editForm.isActive" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="qrVisible" title="桌台二维码" width="520px">
    <div v-if="qr.base64" style="display: flex; gap: 16px; align-items: flex-start">
      <img :src="qr.base64" style="width: 220px; height: 220px; background: #fff; border: 1px solid #ebeef5" />
      <div style="flex: 1">
        <div style="font-weight: 700; margin-bottom: 8px">内容</div>
        <el-input type="textarea" :model-value="qr.content" :rows="6" readonly />
      </div>
    </div>
    <div v-else style="color: #909399">加载中</div>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi, type Table } from '../api/admin';

const loading = ref(false);
const saving = ref(false);
const tables = ref<Table[]>([]);

const editVisible = ref(false);
const editMode = ref<'create' | 'edit'>('create');
const editId = ref<string>('');
const editForm = reactive({ name: '', isActive: true });

const qrVisible = ref(false);
const qr = reactive({ base64: '', content: '' });

async function reload() {
  loading.value = true;
  try {
    const res = await adminApi.listTables();
    tables.value = res.tables;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editMode.value = 'create';
  editId.value = '';
  editForm.name = '';
  editForm.isActive = true;
  editVisible.value = true;
}

function openEdit(row: Table) {
  editMode.value = 'edit';
  editId.value = row.id;
  editForm.name = row.name;
  editForm.isActive = row.isActive;
  editVisible.value = true;
}

async function save() {
  saving.value = true;
  try {
    if (!editForm.name.trim()) {
      ElMessage.warning('请输入桌号');
      return;
    }
    if (editMode.value === 'create') {
      await adminApi.createTable({ name: editForm.name.trim(), isActive: editForm.isActive });
    } else {
      await adminApi.updateTable(editId.value, { name: editForm.name.trim(), isActive: editForm.isActive });
    }
    editVisible.value = false;
    await reload();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '保存失败');
  } finally {
    saving.value = false;
  }
}

async function toggleActive(row: Table) {
  try {
    await adminApi.updateTable(row.id, { isActive: !row.isActive });
    await reload();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '操作失败');
  }
}

async function showQrcode(row: Table) {
  qrVisible.value = true;
  qr.base64 = '';
  qr.content = '';
  try {
    const res = await adminApi.tableQrcode(row.id);
    qr.base64 = res.base64;
    qr.content = res.content;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '获取二维码失败');
  }
}

async function remove(row: Table) {
  try {
    await ElMessageBox.confirm(`删除桌台：${row.name}？`, '确认', { type: 'warning' });
    await adminApi.deleteTable(row.id);
    ElMessage.success('已删除');
    await reload();
  } catch (e: any) {
    if (e === 'cancel') return;
    ElMessage.error(e?.response?.data?.message ?? '删除失败');
  }
}

onMounted(reload);
</script>
