<template>
  <el-card>
    <template #header>
      <div style="display: flex; align-items: center">
        <div style="font-weight: 700; flex: 1">门店配置</div>
        <el-button @click="prefill" :loading="loading">从服务端读取</el-button>
      </div>
    </template>

    <el-form :model="form" label-width="110px" style="max-width: 620px">
      <el-form-item label="storeId">
        <el-input :model-value="storeId" readonly />
      </el-form-item>
      <el-form-item label="名称">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="营业时间">
        <el-input v-model="form.businessHours" placeholder="如：18:00-次日 01:45" />
      </el-form-item>
      <el-form-item label="地址">
        <el-input v-model="form.address" />
      </el-form-item>
      <el-form-item label="电话">
        <el-input v-model="form.phone" />
      </el-form-item>
      <el-form-item label="辣度配置">
        <div style="width: 100%">
          <el-button size="small" @click="addSpice">新增辣度</el-button>
          <el-table :data="spiceOptions" style="width: 100%; margin-top: 12px">
            <el-table-column label="名称" min-width="240">
              <template #default="{ row }">
                <el-input v-model="row.label" placeholder="如 不辣" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ $index }">
                <el-button size="small" type="danger" @click="removeSpice($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-form-item>
      <el-form-item label="结账自动打印">
        <el-switch v-model="form.autoPrintReceiptOnSettle" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { adminApi, type SpiceOption } from '../api/admin';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const storeId = computed(() => auth.storeId);

const form = reactive({
  name: '',
  businessHours: '',
  address: '',
  phone: '',
  autoPrintReceiptOnSettle: false
});
const spiceOptions = ref<Array<SpiceOption & { _uid?: string }>>([]);
const loading = ref(false);
const saving = ref(false);

function normalizeOptions(raw: any) {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((o: any, idx: number) => ({
      key: String(o?.key ?? '').trim() || genKey(),
      label: String(o?.label ?? '').trim(),
      sort: Number(o?.sort ?? idx + 1) || idx + 1,
      enabled: o?.enabled !== false
    }));
  }
  return [
    { key: genKey(), label: '不辣', sort: 1, enabled: true },
    { key: genKey(), label: '微辣', sort: 2, enabled: true },
    { key: genKey(), label: '中辣', sort: 3, enabled: true },
    { key: genKey(), label: '特辣', sort: 4, enabled: true }
  ];
}

function genKey() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SPICE_${Date.now().toString(36).toUpperCase()}_${rand}`;
}

async function prefill() {
  if (!storeId.value) {
    ElMessage.warning('token 中缺少 storeId');
    return;
  }
  loading.value = true;
  try {
    const res = await adminApi.getAdminStore();
    form.name = res.store.name;
    form.businessHours = (res.store.businessHours as any) ?? '';
    form.address = res.store.address ?? '';
    form.phone = (res.store.phone as any) ?? '';
    spiceOptions.value = normalizeOptions((res.store as any).spiceOptions ?? []);
    form.autoPrintReceiptOnSettle = Boolean((res.store as any).autoPrintReceiptOnSettle);
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '读取失败');
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    if (!form.name.trim()) {
      ElMessage.warning('请输入名称');
      return;
    }
    if (spiceOptions.value.length === 0) {
      ElMessage.warning('至少保留一个辣度');
      return;
    }
    const opts = spiceOptions.value.map((o, idx) => ({
      key: String(o.key ?? '').trim() || genKey(),
      label: String(o.label ?? '').trim(),
      sort: idx + 1,
      enabled: true
    }));
    if (opts.some((o) => !o.label)) {
      ElMessage.warning('请填写辣度名称');
      return;
    }
    await adminApi.updateStore({
      name: form.name.trim(),
      businessHours: form.businessHours.trim() || undefined,
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
      spiceOptions: opts,
      autoPrintReceiptOnSettle: form.autoPrintReceiptOnSettle
    });
    ElMessage.success('已保存');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(prefill);

function addSpice() {
  spiceOptions.value.push({ key: genKey(), label: '', sort: spiceOptions.value.length + 1, enabled: true });
}

function removeSpice(index: number) {
  spiceOptions.value.splice(index, 1);
}
</script>
