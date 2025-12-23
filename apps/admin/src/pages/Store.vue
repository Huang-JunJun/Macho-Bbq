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
      <el-form-item label="辣度名称">
        <el-row :gutter="12" style="width: 100%">
          <el-col :span="12">
            <el-input v-model="form.spiceLabels.NONE" placeholder="不辣" />
          </el-col>
          <el-col :span="12">
            <el-input v-model="form.spiceLabels.MILD" placeholder="微辣" />
          </el-col>
          <el-col :span="12" style="margin-top: 12px">
            <el-input v-model="form.spiceLabels.MEDIUM" placeholder="中辣" />
          </el-col>
          <el-col :span="12" style="margin-top: 12px">
            <el-input v-model="form.spiceLabels.HOT" placeholder="特辣" />
          </el-col>
        </el-row>
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
import { adminApi } from '../api/admin';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const storeId = computed(() => auth.storeId);

const form = reactive({
  name: '',
  businessHours: '',
  address: '',
  phone: '',
  spiceLabels: { NONE: '', MILD: '', MEDIUM: '', HOT: '' }
});
const loading = ref(false);
const saving = ref(false);

async function prefill() {
  if (!storeId.value) {
    ElMessage.warning('token 中缺少 storeId');
    return;
  }
  loading.value = true;
  try {
    const res = await adminApi.getStoreInfo(storeId.value);
    form.name = res.store.name;
    form.businessHours = (res.store.businessHours as any) ?? '';
    form.address = res.store.address ?? '';
    form.phone = (res.store.phone as any) ?? '';
    const labels: any = (res.store as any).spiceLabels ?? {};
    form.spiceLabels.NONE = String(labels.NONE ?? '不辣');
    form.spiceLabels.MILD = String(labels.MILD ?? '微辣');
    form.spiceLabels.MEDIUM = String(labels.MEDIUM ?? '中辣');
    form.spiceLabels.HOT = String(labels.HOT ?? '特辣');
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
    await adminApi.updateStore({
      name: form.name.trim(),
      businessHours: form.businessHours.trim() || undefined,
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
      spiceLabels: {
        NONE: form.spiceLabels.NONE.trim(),
        MILD: form.spiceLabels.MILD.trim(),
        MEDIUM: form.spiceLabels.MEDIUM.trim(),
        HOT: form.spiceLabels.HOT.trim()
      }
    });
    ElMessage.success('已保存');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(prefill);
</script>
