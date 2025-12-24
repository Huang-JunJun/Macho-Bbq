<template>
  <el-card>
    <template #header>
      <div style="display: flex; align-items: center; gap: 12px">
        <div style="font-weight: 700; flex: 1">桌台状态</div>
        <el-button @click="reload" :loading="loading">刷新</el-button>
      </div>
    </template>

    <el-row :gutter="16">
      <el-col v-for="t in tables" :key="t.tableId" :span="6">
        <el-card style="margin-bottom: 16px">
          <div style="display: flex; align-items: center; justify-content: space-between">
            <div style="font-weight: 700">{{ t.tableName }}</div>
            <el-tag v-if="t.status === 'IDLE'" type="info">空闲</el-tag>
            <el-tag v-else-if="t.status === 'DINING'" type="warning">就餐中</el-tag>
            <el-tag v-else type="danger">待结账</el-tag>
          </div>
          <div v-if="t.status !== 'IDLE'" style="margin-top: 10px; color: #606266; font-size: 13px">
            <div>人数：{{ t.dinersCount || 0 }}人</div>
            <div>订单数：{{ t.orderCount || 0 }}</div>
            <div>合计：￥{{ yuan(t.totalAmount || 0) }}</div>
          </div>
          <div v-if="t.status !== 'IDLE'" style="margin-top: 12px; display: flex; gap: 8px">
            <el-button size="small" @click="openDetail(t.sessionId || '')">查看订单</el-button>
            <el-button v-if="t.status === 'WAIT_SETTLE'" size="small" type="primary" @click="openDetail(t.sessionId || '')">
              结账
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
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
import { onMounted, onUnmounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { adminApi, type TableDashboardRow } from '../api/admin';
import { adminWs } from '../common/ws';
import { useAuthStore } from '../stores/auth';
import OrderDetailModal from '../components/OrderDetailModal.vue';

const loading = ref(false);
const tables = ref<TableDashboardRow[]>([]);
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
    const res = await adminApi.listTableDashboard();
    tables.value = res.tables;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '加载失败');
  } finally {
    loading.value = false;
  }
}

async function openDetail(sessionId: string) {
  if (!sessionId) return;
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

function handleSettled() {
  detailVisible.value = false;
  reload();
}

function handleMoved() {
  reload();
  refreshDetail();
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
</script>
