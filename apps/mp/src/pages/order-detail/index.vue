<template>
  <view class="page">
    <view class="card">
      <view class="title">订单详情</view>
      <view class="row">
        <text class="label">状态</text>
        <text class="value">{{ statusText(order?.status) }}</text>
      </view>
      <view class="row">
        <text class="label">桌号</text>
        <text class="value">{{ tableStore.tableName || order?.tableId || '-' }}</text>
      </view>
      <view class="row">
        <text class="label">人数</text>
        <text class="value">{{ order?.dinersCount ? `${order?.dinersCount}人` : '-' }}</text>
      </view>
      <view class="row">
        <text class="label">辣度</text>
        <text class="value">{{ order?.spiceLevel || '-' }}</text>
      </view>
      <view class="row">
        <text class="label">备注</text>
        <text class="value">{{ order?.remark || '-' }}</text>
      </view>
    </view>

    <view class="card" style="margin-top: 16rpx">
      <view class="section-title">明细</view>
      <view v-if="loading" class="muted">加载中</view>
      <view v-else-if="!order" class="muted">未找到订单</view>
      <view v-else>
        <view v-for="it in order.items" :key="it.id" class="line">
          <view class="lname">{{ it.nameSnapshot }}</view>
          <view class="lqty">x{{ it.qty }}</view>
          <view class="lprice">￥{{ ((it.priceSnapshot * it.qty) / 100).toFixed(2) }}</view>
        </view>
        <view class="total">
          <text>合计</text>
          <text class="amount">￥{{ (order.amount / 100).toFixed(2) }}</text>
        </view>
      </view>
    </view>

    <view class="footer">
      <button class="btn ghost" @click="addMore">加菜</button>
      <button class="btn" @click="goList">查看订单列表</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { api, type Order } from '../../api';
import { useTableStore } from '../../stores/table';

const tableStore = useTableStore();
const id = ref('');
const order = ref<Order | null>(null);
const loading = ref(false);

function toast(msg: string) {
  uni.showToast({ title: msg, icon: 'none' });
}

function statusText(s?: Order['status']) {
  if (s === 'SETTLED') return '已结账';
  if (s === 'ORDERED') return '已下单';
  return '-';
}

async function reload() {
  if (!id.value) return;
  loading.value = true;
  try {
    const res = await api.getOrder(id.value);
    order.value = res.order;
  } catch (e: any) {
    order.value = null;
    toast(e?.message ?? '加载失败');
  } finally {
    loading.value = false;
  }
}

function goList() {
  uni.switchTab({ url: '/pages/order-list/index' });
}

async function addMore() {
  if (!tableStore.isReady) {
    toast('请重新扫码开桌');
    return;
  }
  try {
    const res = await api.checkTableSession({
      storeId: tableStore.storeId,
      tableId: tableStore.tableId,
      sessionId: tableStore.sessionId
    });
    if (!res.valid) {
      toast('本桌已结账，请重新扫码开桌');
      return;
    }
    uni.switchTab({ url: '/pages/menu/index' });
  } catch {
    toast('本桌已结账，请重新扫码开桌');
  }
}

onLoad((options) => {
  id.value = String(options?.id ?? '');
  reload();
});

onShow(() => {
  reload();
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
  margin-bottom: 10rpx;
}
.row {
  display: flex;
  justify-content: space-between;
  padding: 10rpx 0;
  border-bottom: 1px solid #f0f0f0;
}
.label {
  color: #666;
}
.value {
  color: #111;
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
.muted {
  color: #666;
}
.footer {
  margin-top: 16rpx;
  display: flex;
  gap: 12rpx;
}
.btn {
  background: #111;
  color: #fff;
}
.btn.ghost {
  background: #fff;
  color: #111;
  border: 1px solid #e5e5e5;
}
</style>
