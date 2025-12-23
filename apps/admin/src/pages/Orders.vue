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

  <el-dialog v-model="detailVisible" title="订单详情" width="900px">
    <div v-if="detail">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="桌台">{{ detail.session.tableName || detail.session.tableId }}</el-descriptions-item>
        <el-descriptions-item label="人数">{{ detail.session.dinersCount ? `${detail.session.dinersCount}人` : '-' }}</el-descriptions-item>
        <el-descriptions-item label="订单次数">{{ detail.session.orderCount }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ statusLabel(detail.session.status) }}</el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ detail.session.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="最后加菜时间">{{ detail.session.lastOrderAt }}</el-descriptions-item>
        <el-descriptions-item label="结账时间">{{ detail.session.settledAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="合计金额(元)">￥{{ yuan(detail.totalAmount) }}</el-descriptions-item>
      </el-descriptions>

      <div style="margin-top: 16px; font-weight: 700">分次明细</div>
      <div
        v-for="order in detail.orders"
        :key="order.orderId"
        style="margin-top: 12px; padding: 12px; border: 1px solid #ebeef5; border-radius: 8px"
      >
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">
          <div style="font-weight: 700">第{{ order.seqNo }}次下单</div>
          <div style="color: #606266">{{ order.createdAt }}</div>
          <div style="font-weight: 700">￥{{ yuan(order.amount) }}</div>
        </div>
        <el-table :data="order.items" style="width: 100%; margin-top: 8px">
          <el-table-column prop="nameSnapshot" label="名称" />
          <el-table-column label="单价(元)" width="120">
            <template #default="{ row }">￥{{ yuan(row.priceSnapshot) }}</template>
          </el-table-column>
          <el-table-column prop="qty" label="数量" width="100" />
          <el-table-column label="小计(元)" width="140">
            <template #default="{ row }">￥{{ yuan(row.lineTotal) }}</template>
          </el-table-column>
        </el-table>
      </div>

      <div style="margin-top: 12px; font-weight: 700">合并清单</div>
      <el-table :data="detail.mergedItems" style="width: 100%; margin-top: 8px">
        <el-table-column prop="nameSnapshot" label="名称" />
        <el-table-column label="单价(元)" width="120">
          <template #default="{ row }">￥{{ yuan(row.priceSnapshot) }}</template>
        </el-table-column>
        <el-table-column prop="totalQty" label="数量" width="100" />
        <el-table-column label="小计(元)" width="140">
          <template #default="{ row }">￥{{ yuan(row.lineTotal) }}</template>
        </el-table-column>
      </el-table>

      <div style="display: flex; justify-content: flex-end; margin-top: 10px; font-weight: 700">
        合计：￥{{ yuan(detail.totalAmount) }}
      </div>

    </div>
    <div v-else style="color: #909399">加载中</div>
    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 8px">
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button v-if="detail?.session.status === 'ACTIVE'" type="primary" @click="settleCurrent">结账</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi, type OrderSessionDetail, type OrderSessionRow, type OrderSessionStatus } from '../api/admin';

const loading = ref(false);
const orders = ref<OrderSessionRow[]>([]);
const statusFilter = ref<'ALL' | OrderSessionStatus>('ALL');
const timeRange = ref<[Date, Date] | null>(null);

const detailVisible = ref(false);
const detail = ref<OrderSessionDetail | null>(null);

function yuan(cents: number) {
  return (cents / 100).toFixed(2);
}

function statusLabel(s: OrderSessionStatus) {
  return s === 'ACTIVE' ? '已下单' : '已结账';
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
  detailVisible.value = true;
  detail.value = null;
  try {
    const res = await adminApi.getOrderDetail(sessionId);
    detail.value = res;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '加载详情失败');
  }
}

async function settleCurrent() {
  if (!detail.value) return;
  try {
    await ElMessageBox.confirm('确认结账？', '确认', { type: 'warning' });
    await adminApi.settleSession(detail.value.session.sessionId);
    ElMessage.success('已结账');
    detailVisible.value = false;
    await reload();
  } catch (e: any) {
    if (e === 'cancel') return;
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

watch(
  () => timeRange.value,
  () => {
    reload();
  }
);
</script>
