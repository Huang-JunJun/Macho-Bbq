<template>
  <el-card>
    <template #header>
      <div style="display: flex; align-items: center">
        <div style="font-weight: 700; flex: 1">商品管理</div>
        <el-button type="primary" @click="openCreate">新增</el-button>
      </div>
    </template>

	    <el-table :data="products" style="width: 100%" v-loading="loading">
	      <el-table-column prop="name" label="名称" />
	      <el-table-column label="价格(元)" width="120">
	        <template #default="{ row }">￥{{ yuan(row.price) }}</template>
	      </el-table-column>
	      <el-table-column prop="categoryId" label="类目" width="180">
	        <template #default="{ row }">
	          {{ categoryName(row.categoryId) }}
	        </template>
	      </el-table-column>
      <el-table-column prop="isOnSale" label="上架" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.isOnSale" type="success">是</el-tag>
          <el-tag v-else type="info">否</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="isSoldOut" label="售罄" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.isSoldOut" type="warning">是</el-tag>
          <el-tag v-else type="success">否</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="100" />
      <el-table-column label="图片" width="120">
        <template #default="{ row }">
          <el-image v-if="row.imageUrl" :src="row.imageUrl" style="width: 60px; height: 60px" fit="cover" />
          <span v-else style="color: #909399">无</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="visible" :title="mode === 'create' ? '新增商品' : '编辑商品'" width="560px">
    <el-form :model="form" label-width="100px">
	      <el-form-item label="名称">
	        <el-input v-model="form.name" />
	      </el-form-item>
	      <el-form-item label="价格(元)">
	        <el-input-number v-model="form.priceYuan" :min="0" :precision="2" :step="1" />
	      </el-form-item>
      <el-form-item label="类目">
        <el-select v-model="form.categoryId" placeholder="请选择">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="上架">
        <el-switch v-model="form.isOnSale" />
      </el-form-item>
      <el-form-item label="售罄">
        <el-switch v-model="form.isSoldOut" />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number v-model="form.sort" :min="0" />
      </el-form-item>
      <el-form-item label="图片">
        <div style="display: flex; gap: 12px; align-items: center">
          <el-upload :show-file-list="false" :http-request="uploadRequest">
            <el-button :loading="uploading">上传</el-button>
          </el-upload>
          <el-input v-model="form.imageUrl" placeholder="imageUrl" />
        </div>
      </el-form-item>
      <el-form-item v-if="form.imageUrl" label="预览">
        <el-image :src="form.imageUrl" style="width: 120px; height: 120px" fit="cover" />
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
import { adminApi, type Category, type Product } from '../api/admin';

const loading = ref(false);
const saving = ref(false);
const uploading = ref(false);

const products = ref<Product[]>([]);
const categories = ref<Category[]>([]);

const visible = ref(false);
	const mode = ref<'create' | 'edit'>('create');
	const editId = ref('');
	const form = reactive({
	  name: '',
	  priceYuan: 0,
	  categoryId: '',
	  imageUrl: '',
	  isOnSale: true,
	  isSoldOut: false,
	  sort: 0
	});

	function categoryName(id: string) {
	  return categories.value.find((c) => c.id === id)?.name ?? id;
	}

	function yuan(cents: number) {
	  return (cents / 100).toFixed(2);
	}

	function toCents(v: number) {
	  return Math.round((Number.isFinite(v) ? v : 0) * 100);
	}

async function reload() {
  loading.value = true;
  try {
    const [c, p] = await Promise.all([adminApi.listCategories(), adminApi.listProducts()]);
    categories.value = c.categories;
    products.value = p.products;
  } finally {
    loading.value = false;
  }
}

	function openCreate() {
	  mode.value = 'create';
	  editId.value = '';
	  form.name = '';
	  form.priceYuan = 0;
	  form.categoryId = categories.value[0]?.id ?? '';
	  form.imageUrl = '';
	  form.isOnSale = true;
	  form.isSoldOut = false;
	  form.sort = 0;
	  visible.value = true;
	}

	function openEdit(row: Product) {
	  mode.value = 'edit';
	  editId.value = row.id;
	  form.name = row.name;
	  form.priceYuan = row.price / 100;
	  form.categoryId = row.categoryId;
	  form.imageUrl = row.imageUrl ?? '';
	  form.isOnSale = row.isOnSale;
	  form.isSoldOut = row.isSoldOut;
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
    if (!form.categoryId) {
      ElMessage.warning('请选择类目');
      return;
    }
	    if (mode.value === 'create') {
	      await adminApi.createProduct({
	        name: form.name.trim(),
	        price: toCents(form.priceYuan),
	        categoryId: form.categoryId,
	        imageUrl: form.imageUrl || undefined,
	        isOnSale: form.isOnSale,
	        isSoldOut: form.isSoldOut,
        sort: form.sort
      });
	    } else {
	      await adminApi.updateProduct(editId.value, {
	        name: form.name.trim(),
	        price: toCents(form.priceYuan),
	        categoryId: form.categoryId,
	        imageUrl: form.imageUrl || undefined,
	        isOnSale: form.isOnSale,
	        isSoldOut: form.isSoldOut,
        sort: form.sort
      });
    }
    visible.value = false;
    await reload();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '保存失败');
  } finally {
    saving.value = false;
  }
}

async function remove(row: Product) {
  try {
    await ElMessageBox.confirm(`删除商品：${row.name}？`, '确认', { type: 'warning' });
    await adminApi.deleteProduct(row.id);
    await reload();
  } catch (e: any) {
    if (e === 'cancel') return;
    ElMessage.error(e?.response?.data?.message ?? '删除失败');
  }
}

async function uploadRequest(options: any) {
  const file = options.file as File;
  uploading.value = true;
  try {
    const res = await adminApi.uploadImage(file);
    form.imageUrl = res.url;
    ElMessage.success('上传成功');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '上传失败');
  } finally {
    uploading.value = false;
  }
}

onMounted(reload);
</script>
