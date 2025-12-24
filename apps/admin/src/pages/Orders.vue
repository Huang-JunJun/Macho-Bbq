<template>
  <el-card>
    <template #header>
      <div style="display: flex; align-items: center; gap: 12px">
        <div style="font-weight: 700; flex: 1">订单列表</div>
        <el-select v-model="statusFilter" style="width: 160px">
          <el-option label="全部" value="ALL" />
          <el-option label="已下单" value="ACTIVE" />
          <el-option label="已结账" value="CLOSED" />
        </el-select>
        <el-date-picker
          v-model="timeRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          style="width: 360px"
        />
        <el-button @click="reload">刷新</el-button>
      </div>
    </template>

    <el-table :data="orders" style="width: 100%" v-loading="loading">
      <el-table-column label="桌台" min-width="160">
        <template #default="{ row }">{{ row.tableName || row.tableId }}</template>
      </el-table-column>
      <el-table-column prop="dinersCount" label="人数" width="90">
        <template #default="{ row }">{{ row.dinersCount ? `${row.dinersCount}人` : '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.status === 'ACTIVE'" type="info">已下单</el-tag>
          <el-tag v-else type="success">已结账</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="金额(元)" width="140">
        <template #default="{ row }">￥{{ yuan(row.totalAmount) }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="下单时间" min-width="180" />
      <el-table-column prop="lastOrderAt" label="最后加菜时间" min-width="180" />
      <el-table-column prop="settledAt" label="结账时间" min-width="180">
        <template #default="{ row }">{{ row.settledAt || '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button size="small" @click="openDetail(row.sessionId)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
  <OrderDetailModal
    ref="detailRef"
    v-model="detailVisible"
    :session-id="detailSessionId"
    @settled="handleSettled"
    @moved="handleMoved"
  />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { adminApi, type OrderSessionRow, type OrderSessionStatus } from '../api/admin';
import { adminWs } from '../common/ws';
import { useAuthStore } from '../stores/auth';
import OrderDetailModal from '../components/OrderDetailModal.vue';

const loading = ref(false);
const orders = ref<OrderSessionRow[]>([]);
const statusFilter = ref<'ALL' | OrderSessionStatus>('ALL');
const timeRange = ref<[Date, Date] | null>(null);

const detailVisible = ref(false);
const detailSessionId = ref<string | null>(null);
const detailRef = ref<InstanceType<typeof OrderDetailModal> | null>(null);
const auth = useAuthStore();
let refreshTimer: number | null = null;
let detailRefreshTimer: number | null = null;
const wsHandler = (payload: any) => {
  scheduleRefresh();
  scheduleDetailRefresh(payload.sessionId);
};
const wsOpenHandler = () => {
  scheduleRefresh();
  scheduleDetailRefresh();
};

function yuan(cents: number) {
  return (cents / 100).toFixed(2);
}

async function reload() {
  loading.value = true;
  try {
    const [startAt, endAt] = timeRange.value ?? [];
    const res = await adminApi.listOrders({
      status: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
      startAt: startAt ? startAt.toISOString() : undefined,
      endAt: endAt ? endAt.toISOString() : undefined
    });
    orders.value = res.orders;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '加载失败');
  } finally {
    loading.value = false;
  }
}

async function openDetail(sessionId: string) {
  detailSessionId.value = sessionId;
  detailVisible.value = true;
}

async function refreshDetail() {
  if (!detailVisible.value || !detailSessionId.value) return;
  await detailRef.value?.refresh();
}

function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    reload();
  }, 300);
}

function scheduleDetailRefresh(sessionId?: string) {
  if (!detailVisible.value || !detailSessionId.value) return;
  if (sessionId && detailSessionId.value !== sessionId) return;
  if (detailRefreshTimer) clearTimeout(detailRefreshTimer);
  detailRefreshTimer = window.setTimeout(() => {
    refreshDetail();
  }, 300);
}

onMounted(reload);

onMounted(() => {
  const url = (import.meta.env as any).VITE_WS_URL || 'ws://localhost:3000/ws/admin';
  if (auth.token) {
    adminWs.connect(url, auth.token);
  }
  adminWs.on('order.created', wsHandler);
  adminWs.on('session.settled', wsHandler);
  adminWs.on('session.moved', wsHandler);
  adminWs.onOpen(wsOpenHandler);
  adminWs.onClose(() => {});
});

onUnmounted(() => {
  adminWs.off('order.created', wsHandler);
  adminWs.off('session.settled', wsHandler);
  adminWs.off('session.moved', wsHandler);
  adminWs.offOpen(wsOpenHandler);
  adminWs.disconnect();
});

watch(
  () => statusFilter.value,
  () => {
    reload();
  }
);

watch(
  () => timeRange.value,
  () => {
    reload();
  }
);

function handleSettled() {
  detailVisible.value = false;
  reload();
}

function handleMoved() {
  reload();
  refreshDetail();
}
</script>
