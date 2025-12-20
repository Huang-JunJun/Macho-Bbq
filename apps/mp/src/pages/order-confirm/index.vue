<template>
  <view class="page">
    <view class="card">
      <view class="title">确认下单</view>
      <view class="meta">桌号：{{ tableStore.tableName || tableStore.tableId || defaultTableId || '-' }}</view>
    </view>

    <view class="card" style="margin-top: 16rpx">
      <view class="section-title">清单</view>
      <view v-for="it in cart.list" :key="it.productId" class="line">
        <view class="lname">{{ it.name }}</view>
        <view class="lqty">x{{ it.qty }}</view>
        <view class="lprice">￥{{ ((it.price * it.qty) / 100).toFixed(2) }}</view>
      </view>
      <view class="total">
        <text>合计</text>
        <text class="amount">￥{{ (cart.totalAmount / 100).toFixed(2) }}</text>
      </view>
    </view>

    <view class="card" style="margin-top: 16rpx">
      <view class="section-title">必选辣度</view>
      <view class="spices">
        <view v-for="s in spiceOptions" :key="s" class="spice" :class="{ active: spiceLevel === s }" @click="spiceLevel = s">
          {{ s }}
        </view>
      </view>
      <view v-if="!spiceLevel" class="warn">请选择辣度后才能提交</view>
      <view class="section-title" style="margin-top: 12rpx">备注</view>
      <input v-model="remark" class="input" placeholder="可选" />
    </view>

    <view class="footer">
      <button class="btn" :disabled="submitting || cart.totalQty === 0 || !spiceLevel" @click="submit">提交订单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api, type SpiceLevel } from '../../api';
import { useTableStore } from '../../stores/table';
import { useCartStore } from '../../stores/cart';
import { useOrderStore } from '../../stores/order';

const tableStore = useTableStore();
const cart = useCartStore();
const orderStore = useOrderStore();

function getEnv(key: string) {
  const env = (import.meta as any)?.env ?? {};
  return String(env[key] ?? '');
}

const defaultStoreId = getEnv('VITE_DEFAULT_STORE_ID');
const defaultTableId = getEnv('VITE_DEFAULT_TABLE_ID');

const spiceOptions: SpiceLevel[] = ['NONE', 'MILD', 'MEDIUM', 'HOT'];
const spiceLevel = ref<SpiceLevel | ''>('');
const remark = ref('');
const submitting = ref(false);

function toast(msg: string) {
  uni.showToast({ title: msg, icon: 'none' });
}

async function submit() {
  const storeId = tableStore.storeId || defaultStoreId;
  const tableId = tableStore.tableId || defaultTableId;
  if (!storeId || !tableId) {
    toast('请先配置默认桌号');
    return;
  }
  if (!spiceLevel.value) {
    toast('请选择辣度');
    return;
  }
  if (cart.totalQty === 0) {
    toast('购物车为空');
    return;
  }

  if (!tableStore.ready) {
    tableStore.setTable({ storeId, tableId, tableName: tableStore.tableName || tableId });
  }

  submitting.value = true;
  try {
    const res = await api.createOrder({
      storeId,
      tableId,
      spiceLevel: spiceLevel.value as SpiceLevel,
      remark: remark.value.trim() || undefined,
      items: cart.list.map((i) => ({ productId: i.productId, qty: i.qty }))
    });
    orderStore.setLastOrderId(res.orderId);
    cart.clear();
    uni.redirectTo({ url: `/pages/order-detail/index?id=${encodeURIComponent(res.orderId)}` });
  } catch (e: any) {
    toast(e?.message ?? '提交失败');
  } finally {
    submitting.value = false;
  }
}

onShow(() => {
  if (cart.totalQty === 0) toast('购物车为空');
});
</script>

<style scoped>
.page {
  padding: 24rpx;
}
.card {
  border: 1px solid #e5e5e5;
  background: #fff;
  padding: 18rpx;
}
.title {
  font-size: 34rpx;
  font-weight: 700;
}
.meta {
  margin-top: 8rpx;
  color: #666;
}
.section-title {
  font-weight: 700;
  margin-bottom: 10rpx;
}
.line {
  display: flex;
  justify-content: space-between;
  padding: 10rpx 0;
  border-bottom: 1px solid #f0f0f0;
}
.lname {
  flex: 1;
}
.lqty {
  width: 120rpx;
  text-align: right;
  color: #666;
}
.lprice {
  width: 180rpx;
  text-align: right;
}
.total {
  display: flex;
  justify-content: space-between;
  margin-top: 12rpx;
  font-weight: 700;
}
.amount {
  font-weight: 800;
}
.spices {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}
.spice {
  padding: 10rpx 14rpx;
  border: 1px solid #111;
  color: #111;
}
.spice.active {
  background: #111;
  color: #fff;
}
.warn {
  margin-top: 10rpx;
  color: #b00020;
}
.input {
  border: 1px solid #e5e5e5;
  padding: 12rpx;
}
.footer {
  margin-top: 18rpx;
}
.btn {
  background: #111;
  color: #fff;
}
.btn[disabled] {
  opacity: 0.5;
}
</style>
