<template>
  <el-card>
    <template #header>
      <div style="display: flex; align-items: center">
        <div style="font-weight: 700; flex: 1">类目管理</div>
        <el-button type="primary" @click="openCreate">新增</el-button>
      </div>
    </template>

    <el-table :data="categories" style="width: 100%" v-loading="loading">
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="sort" label="排序" width="120" />
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="visible" :title="mode === 'create' ? '新增类目' : '编辑类目'" width="420px">
    <el-form :model="form" label-width="90px">
      <el-form-item label="名称">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number v-model="form.sort" :min="0" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi, type Category } from '../api/admin';

const loading = ref(false);
const saving = ref(false);
const categories = ref<Category[]>([]);

const visible = ref(false);
const mode = ref<'create' | 'edit'>('create');
const editId = ref('');
const form = reactive({ name: '', sort: 0 });

async function reload() {
  loading.value = true;
  try {
    const res = await adminApi.listCategories();
    categories.value = res.categories;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  mode.value = 'create';
  editId.value = '';
  form.name = '';
  form.sort = 0;
  visible.value = true;
}

function openEdit(row: Category) {
  mode.value = 'edit';
  editId.value = row.id;
  form.name = row.name;
  form.sort = row.sort;
  visible.value = true;
}

async function save() {
  saving.value = true;
  try {
    if (!form.name.trim()) {
      ElMessage.warning('请输入名称');
      return;
    }
    if (mode.value === 'create') {
      await adminApi.createCategory({ name: form.name.trim(), sort: form.sort });
    } else {
      await adminApi.updateCategory(editId.value, { name: form.name.trim(), sort: form.sort });
    }
    visible.value = false;
    await reload();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '保存失败');
  } finally {
    saving.value = false;
  }
}

async function remove(row: Category) {
  try {
    await ElMessageBox.confirm(`删除类目：${row.name}？`, '确认', { type: 'warning' });
    await adminApi.deleteCategory(row.id);
    await reload();
  } catch (e: any) {
    if (e === 'cancel') return;
    ElMessage.error(e?.response?.data?.message ?? '删除失败');
  }
}

onMounted(reload);
</script>

