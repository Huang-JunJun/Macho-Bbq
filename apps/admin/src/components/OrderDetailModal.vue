<template>
  <el-dialog v-model="visible" title="订单详情" width="1000px" @closed="resetDetail">
    <div v-if="detail">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="桌台">{{ detail.session.tableName || detail.session.tableId }}</el-descriptions-item>
        <el-descriptions-item label="人数">{{ detail.session.dinersCount ? `${detail.session.dinersCount}人` : '-' }}</el-descriptions-item>
        <el-descriptions-item label="订单次数">{{ detail.session.orderCount }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ statusLabel(detail.session.status) }}</el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ formatDateTime(detail.session.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="最后加菜时间">{{ formatDateTime(detail.session.lastOrderAt) }}</el-descriptions-item>
        <el-descriptions-item label="结账时间">{{ detail.session.settledAt ? formatDateTime(detail.session.settledAt) : '-' }}</el-descriptions-item>
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
          <div style="color: #606266">{{ formatDateTime(order.createdAt) }}</div>
          <div style="font-weight: 700">￥{{ yuan(order.amount) }}</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 8px; color: #606266">
          <div>辣度：{{ order.spiceLabel || '-' }}</div>
          <div>备注：{{ order.remark || '-' }}</div>
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
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" :disabled="detail?.session.status !== 'ACTIVE'" @click="openRefund(row)">退菜</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="display: flex; justify-content: flex-end; margin-top: 10px; font-weight: 700">
        合计：￥{{ yuan(detail.totalAmount) }}
      </div>
    </div>
    <div v-else style="color: #909399">加载中</div>
    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 8px">
        <el-button @click="visible = false">关闭</el-button>
        <el-button v-if="detail?.session.status === 'ACTIVE'" @click="printBill">打印清单</el-button>
        <el-button v-if="detail?.session.status === 'CLOSED'" @click="printReceipt">补打凭证</el-button>
        <el-button v-if="detail?.session.status === 'ACTIVE' && isOwner" @click="openMove">换桌</el-button>
        <el-button v-if="detail?.session.status === 'ACTIVE'" @click="openAddItems">加菜</el-button>
        <el-button v-if="detail?.session.status === 'ACTIVE'" type="primary" @click="settleCurrent">结账</el-button>
      </div>
    </template>
  </el-dialog>

  <el-dialog v-model="moveVisible" title="换桌" width="420px">
    <div style="display: flex; flex-direction: column; gap: 12px">
      <div>选择目标桌台</div>
      <el-select v-model="moveTargetId" placeholder="请选择桌台" filterable>
        <el-option v-for="t in availableTables" :key="t.id" :label="t.name" :value="t.id" />
      </el-select>
    </div>
    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 8px">
        <el-button @click="moveVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!moveTargetId" @click="confirmMove">确认换桌</el-button>
      </div>
    </template>
  </el-dialog>

  <el-dialog v-model="addVisible" title="加菜" width="900px" @closed="resetAddItems">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px">
      <el-select v-model="addCategoryId" style="width: 180px" placeholder="全部类目">
        <el-option label="全部类目" value="ALL" />
        <el-option v-for="c in addCategories" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
      <el-input v-model="addKeyword" placeholder="搜索菜品名称" clearable style="width: 240px" />
      <div style="color: #909399; font-size: 12px">数量为追加数量，提交后会生成新的下单记录</div>
    </div>
    <el-table :data="filteredProducts" v-loading="addLoading" size="small" style="width: 100%">
      <el-table-column label="图片" width="90">
        <template #default="{ row }">
          <div class="add-item-thumb">
            <img v-if="row.imageUrl" :src="resolvePublicUrl(row.imageUrl)" alt="" />
            <div v-else class="add-item-empty">无图</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="名称" min-width="160" />
      <el-table-column label="价格/单位" width="160">
        <template #default="{ row }">￥{{ yuan(row.price) }} / {{ row.unit || '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag v-if="!row.isOnSale" type="info">已下架</el-tag>
          <el-tag v-else-if="row.isSoldOut" type="warning">售罄</el-tag>
          <el-tag v-else type="success">可加</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="数量" width="140">
        <template #default="{ row }">
          <el-input-number
            v-model="qtyMap[row.id]"
            style="width: 100%"
            :min="0"
            :max="99"
            :disabled="!row.isOnSale || row.isSoldOut"
          />
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 8px">
        <el-button @click="addVisible = false">取消</el-button>
        <el-button type="primary" :loading="addSubmitting" @click="submitAddItems">确认加菜</el-button>
      </div>
    </template>
  </el-dialog>

  <el-dialog v-model="refundVisible" title="退菜" width="420px" @closed="resetRefund">
    <div style="display: flex; flex-direction: column; gap: 12px">
      <div>菜品：{{ refundTarget?.nameSnapshot || '-' }}</div>
      <div>可退数量：{{ refundTarget?.maxQty || 0 }}</div>
      <el-input-number v-model="refundQty" :min="1" :max="refundTarget?.maxQty || 1" />
      <div style="color: #909399; font-size: 12px">退菜只影响合并清单，不会修改历史下单明细</div>
    </div>
    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 8px">
        <el-button @click="refundVisible = false">取消</el-button>
        <el-button type="primary" :loading="refundSubmitting" @click="submitRefund">确认退菜</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi, type Category, type OrderSessionDetail, type OrderSessionStatus, type Product, type Table } from '../api/admin';
import { useAuthStore } from '../stores/auth';
import { formatDateTime } from '../common/time';
import { resolvePublicUrl } from '../common/url';

const props = defineProps<{ modelValue: boolean; sessionId: string | null }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'settled', sessionId: string): void;
  (e: 'moved', sessionId: string): void;
}>();

const auth = useAuthStore();
const isOwner = computed(() => auth.role === 'OWNER');
const detail = ref<OrderSessionDetail | null>(null);
const moveVisible = ref(false);
const moveTargetId = ref('');
const tables = ref<Table[]>([]);
const addVisible = ref(false);
const addLoading = ref(false);
const addSubmitting = ref(false);
const addCategories = ref<Category[]>([]);
const addProducts = ref<Product[]>([]);
const addCategoryId = ref('ALL');
const addKeyword = ref('');
const qtyMap = reactive<Record<string, number>>({});
const refundVisible = ref(false);
const refundSubmitting = ref(false);
const refundQty = ref(1);
const refundTarget = ref<{ productId: string; nameSnapshot: string; maxQty: number } | null>(null);

const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
});

const availableTables = computed(() => {
  if (!detail.value) return tables.value;
  return tables.value.filter(
    (t) => t.isActive && !t.isDeleted && !t.currentSessionId && t.id !== detail.value?.session.tableId
  );
});

function yuan(cents: number) {
  return (cents / 100).toFixed(2);
}

function statusLabel(s: OrderSessionStatus) {
  return s === 'ACTIVE' ? '已下单' : '已结账';
}

const filteredProducts = computed(() => {
  const keyword = addKeyword.value.trim();
  const categoryId = addCategoryId.value;
  return addProducts.value.filter((p) => {
    if (categoryId !== 'ALL' && p.categoryId !== categoryId) return false;
    if (keyword && !p.name.includes(keyword)) return false;
    return true;
  });
});

async function loadDetail() {
  if (!props.sessionId) return;
  try {
    const res = await adminApi.getOrderDetail(props.sessionId);
    detail.value = res;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '加载详情失败');
  }
}

function resetDetail() {
  detail.value = null;
}

async function refresh() {
  if (!props.sessionId) return;
  await loadDetail();
}

async function printBill() {
  if (!detail.value) return;
  try {
    await adminApi.printBill(detail.value.session.sessionId);
    ElMessage.success('已发送打印任务');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '打印失败');
  }
}

async function printReceipt() {
  if (!detail.value) return;
  try {
    await adminApi.printReceipt(detail.value.session.sessionId);
    ElMessage.success('已发送打印任务');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '打印失败');
  }
}

async function loadTables() {
  const res = await adminApi.listTables();
  tables.value = res.tables;
}

async function openMove() {
  if (!detail.value) return;
  moveTargetId.value = '';
  moveVisible.value = true;
  try {
    await loadTables();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '加载桌台失败');
  }
}

async function confirmMove() {
  if (!detail.value || !moveTargetId.value) return;
  try {
    await ElMessageBox.confirm('确认换桌？', '确认', { type: 'warning' });
    await adminApi.moveSessionTable(detail.value.session.sessionId, {
      fromTableId: detail.value.session.tableId,
      toTableId: moveTargetId.value
    });
    ElMessage.success('已换桌');
    moveVisible.value = false;
    await refresh();
    emit('moved', detail.value.session.sessionId);
  } catch (e: any) {
    if (e === 'cancel') return;
    ElMessage.error(e?.response?.data?.message ?? '换桌失败');
  }
}

function resetAddItems() {
  addSubmitting.value = false;
  addLoading.value = false;
  addKeyword.value = '';
  addCategoryId.value = 'ALL';
  for (const key of Object.keys(qtyMap)) {
    delete qtyMap[key];
  }
}

function resetQtyMap(products: Product[]) {
  for (const key of Object.keys(qtyMap)) {
    delete qtyMap[key];
  }
  for (const p of products) {
    qtyMap[p.id] = 0;
  }
}

async function openAddItems() {
  if (!detail.value) return;
  if (detail.value.session.status !== 'ACTIVE') {
    ElMessage.warning('该会话已结账，无法加菜');
    return;
  }
  addVisible.value = true;
  addLoading.value = true;
  try {
    const [c, p] = await Promise.all([adminApi.listCategories(), adminApi.listProducts()]);
    addCategories.value = c.categories;
    addProducts.value = p.products;
    resetQtyMap(addProducts.value);
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '加载菜品失败');
  } finally {
    addLoading.value = false;
  }
}

async function submitAddItems() {
  if (!detail.value) return;
  const items = Object.entries(qtyMap)
    .filter(([, qty]) => qty > 0)
    .map(([productId, qty]) => ({ productId, qty }));
  if (items.length === 0) {
    ElMessage.warning('请先选择要加的菜品');
    return;
  }
  addSubmitting.value = true;
  try {
    await adminApi.addSessionOrder(detail.value.session.sessionId, { items });
    ElMessage.success('加菜成功，已生成新的下单记录');
    addVisible.value = false;
    resetQtyMap(addProducts.value);
    await refresh();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '加菜失败');
  } finally {
    addSubmitting.value = false;
  }
}

function resetRefund() {
  refundSubmitting.value = false;
  refundTarget.value = null;
  refundQty.value = 1;
}

function openRefund(row: { productId: string; nameSnapshot: string; totalQty: number }) {
  if (!detail.value) return;
  if (detail.value.session.status !== 'ACTIVE') {
    ElMessage.warning('该会话已结账，无法退菜');
    return;
  }
  refundTarget.value = { productId: row.productId, nameSnapshot: row.nameSnapshot, maxQty: row.totalQty };
  refundQty.value = 1;
  refundVisible.value = true;
}

async function submitRefund() {
  if (!detail.value || !refundTarget.value) return;
  try {
    await ElMessageBox.confirm('确认退菜？', '确认', { type: 'warning' });
    refundSubmitting.value = true;
    await adminApi.refundSessionItem(detail.value.session.sessionId, {
      productId: refundTarget.value.productId,
      qty: refundQty.value
    });
    ElMessage.success('退菜成功');
    refundVisible.value = false;
    await refresh();
  } catch (e: any) {
    if (e === 'cancel') return;
    ElMessage.error(e?.response?.data?.message ?? '退菜失败');
  } finally {
    refundSubmitting.value = false;
  }
}

async function settleCurrent() {
  if (!detail.value) return;
  try {
    await ElMessageBox.confirm('确认结账？', '确认', { type: 'warning' });
    await adminApi.settleSession(detail.value.session.sessionId);
    ElMessage.success('已结账');
    emit('settled', detail.value.session.sessionId);
    visible.value = false;
  } catch (e: any) {
    if (e === 'cancel') return;
    ElMessage.error(e?.response?.data?.message ?? '结账失败');
  }
}

watch(
  () => [props.modelValue, props.sessionId],
  ([val, id]) => {
    if (val && id) loadDetail();
  }
);

defineExpose({ refresh });
</script>

<style scoped>
.add-item-thumb {
  width: 56px;
  height: 56px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.add-item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.add-item-empty {
  font-size: 12px;
  color: #c0c4cc;
}
</style>
