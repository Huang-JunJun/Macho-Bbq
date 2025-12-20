<template>
  <el-card>
    <template #header>
      <div style="display: flex; align-items: center; gap: 12px">
        <div style="font-weight: 700; flex: 1">订单列表</div>
        <el-select v-model="statusFilter" style="width: 160px">
          <el-option label="ORDERED" value="ORDERED" />
          <el-option label="SETTLED" value="SETTLED" />
        </el-select>
        <el-button @click="reload">刷新</el-button>
      </div>
    </template>

    <el-table :data="orders" style="width: 100%" v-loading="loading">
      <el-table-column prop="id" label="订单号" min-width="220" />
      <el-table-column prop="tableId" label="桌台" min-width="160" />
      <el-table-column prop="status" label="状态" width="120" />
      <el-table-column prop="spiceLevel" label="辣度" width="120" />
      <el-table-column prop="amount" label="金额(分)" width="120" />
      <el-table-column prop="createdAt" label="创建时间" min-width="180" />
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button size="small" @click="openDetail(row.id)">详情</el-button>
          <el-button v-if="row.status === 'ORDERED'" size="small" type="primary" @click="settle(row.id)">已结账</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="detailVisible" title="订单详情" width="720px">
    <div v-if="detail">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="订单号">{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detail.status }}</el-descriptions-item>
        <el-descriptions-item label="桌台">{{ detail.tableId }}</el-descriptions-item>
        <el-descriptions-item label="辣度">{{ detail.spiceLevel }}</el-descriptions-item>
        <el-descriptions-item label="金额(分)">{{ detail.amount }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ detail.remark || '-' }}</el-descriptions-item>
      </el-descriptions>

      <div style="margin-top: 12px; font-weight: 700">明细</div>
      <el-table :data="detail.items || []" style="width: 100%; margin-top: 8px">
        <el-table-column prop="nameSnapshot" label="名称" />
        <el-table-column prop="priceSnapshot" label="单价(分)" width="120" />
        <el-table-column prop="qty" label="数量" width="100" />
      </el-table>
    </div>
    <div v-else style="color: #909399">加载中</div>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { adminApi, type Order } from '../api/admin';

const loading = ref(false);
const orders = ref<Order[]>([]);
const statusFilter = ref<'ORDERED' | 'SETTLED'>('ORDERED');

const detailVisible = ref(false);
const detail = ref<Order | null>(null);

async function reload() {
  loading.value = true;
  try {
    const res = await adminApi.listOrders(statusFilter.value);
    orders.value = res.orders;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '加载失败');
  } finally {
    loading.value = false;
  }
}

async function openDetail(id: string) {
  detailVisible.value = true;
  detail.value = null;
  try {
    const res = await adminApi.getOrder(id);
    detail.value = res.order;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '加载详情失败');
  }
}

async function settle(id: string) {
  try {
    await adminApi.settleOrder(id);
    ElMessage.success('已结账');
    await reload();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '结账失败');
  }
}

onMounted(reload);

watch(
  () => statusFilter.value,
  () => {
    reload();
  }
);
</script>
